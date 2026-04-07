// shaders.js — GLSL shader source code with double-double and perturbation support
window.Shaders = (function () {
  const VERT = `#version 300 es
  in vec2 a_position;
  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
  }`;

  // ---------- Double-double arithmetic helpers ----------
  const DD_LIB = `
vec2 ds_set(float a) { return vec2(a, 0.0); }

vec2 ds_add(vec2 a, vec2 b) {
  float t1 = a.x + b.x;
  float e  = t1 - a.x;
  float t2 = ((b.x - e) + (a.x - (t1 - e))) + a.y + b.y;
  float r  = t1 + t2;
  return vec2(r, t2 - (r - t1));
}

vec2 ds_sub(vec2 a, vec2 b) { return ds_add(a, vec2(-b.x, -b.y)); }

vec2 ds_mul(vec2 a, vec2 b) {
  float sp = 4097.0;
  float ca = a.x * sp; float a1 = ca - (ca - a.x); float a2 = a.x - a1;
  float cb = b.x * sp; float b1 = cb - (cb - b.x); float b2 = b.x - b1;
  float p  = a.x * b.x;
  float e  = ((a1*b1 - p) + a1*b2 + a2*b1) + a2*b2;
  float t  = a.x*b.y + a.y*b.x + e;
  float r  = p + t;
  return vec2(r, t - (r - p));
}

float ds_len2(vec2 re, vec2 im) {
  vec2 r2 = ds_mul(re, re);
  vec2 i2 = ds_mul(im, im);
  vec2 s  = ds_add(r2, i2);
  return s.x + s.y;
}
`;

  // ---------- Complex math ----------
  const COMPLEX_LIB = `
vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 csq(vec2 z)          { return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y); }
vec2 ccube(vec2 z)         { return cmul(csq(z), z); }
vec2 cpow4(vec2 z)         { vec2 z2 = csq(z); return csq(z2); }
vec2 cpow5(vec2 z)         { return cmul(cpow4(z), z); }
vec2 cpow6(vec2 z)         { vec2 z2 = csq(z); vec2 z3 = cmul(z2, z); return csq(z3); }
vec2 cconj(vec2 z)         { return vec2(z.x, -z.y); }
vec2 cabs(vec2 z)          { return abs(z); }

// sin(z) = sin(x)cosh(y) + i cos(x)sinh(y)
vec2 csin(vec2 z) {
  return vec2(sin(z.x) * cosh(z.y), cos(z.x) * sinh(z.y));
}

// exp(z) = exp(x)(cos(y) + i sin(y))
vec2 cexp(vec2 z) {
  float ex = exp(z.x);
  return vec2(ex * cos(z.y), ex * sin(z.y));
}
`;

  // Fractal iteration step for standard shader (returns new z)
  // Types: 0=z²+c, 1=z³+c, 2=z⁴+c, 3=Burning Ship, 4=Tricorn,
  //        5=z⁵+c, 6=z⁶+c, 7=Celtic, 8=Buffalo, 9=Perpendicular Burning Ship,
  //        10=sin(z)*c, 11=z²+z+c (Feather)
  const FRACTAL_ITER = `
vec2 fractalStep(vec2 z, vec2 c, int ft) {
  if (ft == 0)  return csq(z) + c;
  if (ft == 1)  return ccube(z) + c;
  if (ft == 2)  return cpow4(z) + c;
  if (ft == 3)  { z = cabs(z); return csq(z) + c; }        // Burning Ship
  if (ft == 4)  return csq(cconj(z)) + c;                   // Tricorn
  if (ft == 5)  return cpow5(z) + c;
  if (ft == 6)  return cpow6(z) + c;
  if (ft == 7)  { vec2 z2 = csq(z); z2.x = abs(z2.x); return z2 + c; }  // Celtic
  if (ft == 8)  { vec2 z2 = csq(z); return vec2(abs(z2.x) - abs(z2.y), -abs(2.0*z.x*z.y)) + c; } // Buffalo
  if (ft == 9)  { return vec2(z.x*z.x - z.y*z.y, -2.0*abs(z.x)*z.y) + c; } // Perp Burning Ship
  if (ft == 10) return cmul(csin(z), c) + c;                // sin(z)*c+c
  if (ft == 11) return csq(z) + z + c;                      // z²+z+c
  if (ft == 12) return cmul(csq(z), c) + c;                  // z²·c + c
  return csq(z) + c;
}
`;

  // Get the degree for smooth coloring
  const DEGREE_FUNC = `
float fractalDegree(int ft) {
  if (ft == 1) return 3.0;
  if (ft == 2) return 4.0;
  if (ft == 5) return 5.0;
  if (ft == 6) return 6.0;
  return 2.0;
}
`;

  // ---------- Standard fragment shader ----------
  function fragStandard() {
    return `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_center;
uniform float u_zoom;
uniform int u_maxIter;
uniform int u_fractalType;
uniform bool u_julia;
uniform vec2 u_juliaC;
uniform bool u_smooth;
uniform float u_paletteOffset;
uniform float u_bailout;
uniform sampler2D u_palette;
uniform bool u_showAxes;
out vec4 fragColor;

${COMPLEX_LIB}
${FRACTAL_ITER}
${DEGREE_FUNC}

void main() {
  vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
  vec2 pos = u_center + uv / u_zoom;

  vec2 z, c;
  if (u_julia) { z = pos; c = u_juliaC; }
  else         { z = vec2(0.0); c = pos; }

  float bail2 = u_bailout * u_bailout;
  int iter = 0;
  for (int i = 0; i < 10000; i++) {
    if (i >= u_maxIter) break;
    if (dot(z, z) > bail2) break;
    z = fractalStep(z, c, u_fractalType);
    iter++;
  }

  if (iter >= u_maxIter) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float fIter = float(iter);
    if (u_smooth) {
      float log_zn = log(dot(z, z)) * 0.5;
      float deg = fractalDegree(u_fractalType);
      float nu = log(log_zn / log(u_bailout)) / log(deg);
      fIter = fIter + 1.0 - nu;
    }
    float t = fract(fIter * 0.02 + u_paletteOffset);
    vec3 col = texture(u_palette, vec2(t, 0.5)).rgb;
    fragColor = vec4(col, 1.0);
  }

  if (u_showAxes) {
    float px = 1.5 / min(u_resolution.x, u_resolution.y) / u_zoom;
    if (abs(pos.x) < px || abs(pos.y) < px)
      fragColor = mix(fragColor, vec4(1.0, 1.0, 1.0, 1.0), 0.3);
  }
}`;
  }

  // ---------- Double-double fragment shader ----------
  function fragDoubleDouble() {
    return `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform vec2 u_center_hi;
uniform vec2 u_center_lo;
uniform float u_zoom;
uniform int u_maxIter;
uniform int u_fractalType;
uniform bool u_julia;
uniform vec2 u_juliaC;
uniform bool u_smooth;
uniform float u_paletteOffset;
uniform float u_bailout;
uniform sampler2D u_palette;
uniform bool u_showAxes;
out vec4 fragColor;

${DD_LIB}

void main() {
  vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
  vec2 offset = uv / u_zoom;

  vec2 cr = ds_add(vec2(u_center_hi.x, u_center_lo.x), ds_set(offset.x));
  vec2 ci = ds_add(vec2(u_center_hi.y, u_center_lo.y), ds_set(offset.y));
  vec2 zr, zi;

  if (u_julia) {
    zr = cr; zi = ci;
    cr = ds_set(u_juliaC.x); ci = ds_set(u_juliaC.y);
  } else {
    zr = ds_set(0.0); zi = ds_set(0.0);
  }

  float bail2 = u_bailout * u_bailout;
  int iter = 0;
  for (int i = 0; i < 10000; i++) {
    if (i >= u_maxIter) break;
    float len2 = ds_len2(zr, zi);
    if (len2 > bail2) break;

    vec2 zr2 = ds_mul(zr, zr);
    vec2 zi2 = ds_mul(zi, zi);
    vec2 zri = ds_mul(zr, zi);
    vec2 nzr, nzi;

    if (u_fractalType == 3) { // Burning Ship
      zr = vec2(abs(zr.x), zr.y * sign(zr.x));
      zi = vec2(abs(zi.x), zi.y * sign(zi.x));
      zr2 = ds_mul(zr, zr); zi2 = ds_mul(zi, zi); zri = ds_mul(zr, zi);
      nzr = ds_add(ds_sub(zr2, zi2), cr);
      nzi = ds_add(ds_add(zri, zri), ci);
    } else if (u_fractalType == 4) { // Tricorn
      nzr = ds_add(ds_sub(zr2, zi2), cr);
      nzi = ds_sub(ci, ds_add(zri, zri));
    } else if (u_fractalType == 7) { // Celtic
      vec2 realPart = ds_sub(zr2, zi2);
      realPart = vec2(abs(realPart.x), realPart.y * sign(realPart.x));
      nzr = ds_add(realPart, cr);
      nzi = ds_add(ds_add(zri, zri), ci);
    } else if (u_fractalType == 11) { // z²+z+c
      nzr = ds_add(ds_add(ds_sub(zr2, zi2), zr), cr);
      nzi = ds_add(ds_add(ds_add(zri, zri), zi), ci);
    } else if (u_fractalType == 12) { // z²·c + c
      vec2 z2r = ds_sub(zr2, zi2);
      vec2 z2i = ds_add(zri, zri);
      vec2 prod_r = ds_sub(ds_mul(z2r, cr), ds_mul(z2i, ci));
      vec2 prod_i = ds_add(ds_mul(z2r, ci), ds_mul(z2i, cr));
      nzr = ds_add(prod_r, cr);
      nzi = ds_add(prod_i, ci);
    } else { // z^2+c default
      nzr = ds_add(ds_sub(zr2, zi2), cr);
      nzi = ds_add(ds_add(zri, zri), ci);
    }
    zr = nzr; zi = nzi;
    iter++;
  }

  if (iter >= u_maxIter) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float fIter = float(iter);
    if (u_smooth) {
      float mag2 = ds_len2(zr, zi);
      float log_zn = log(mag2) * 0.5;
      float nu = log(log_zn / log(u_bailout)) / log(2.0);
      fIter = fIter + 1.0 - nu;
    }
    float t = fract(fIter * 0.02 + u_paletteOffset);
    fragColor = vec4(texture(u_palette, vec2(t, 0.5)).rgb, 1.0);
  }

  if (u_showAxes) {
    float px = 1.5 / min(u_resolution.x, u_resolution.y) / u_zoom;
    vec2 pos = vec2(cr.x + cr.y, ci.x + ci.y);
    if (u_julia) pos = vec2(zr.x + zr.y, zi.x + zi.y);
    if (abs(pos.x) < px || abs(pos.y) < px)
      fragColor = mix(fragColor, vec4(1.0), 0.3);
  }
}`;
  }

  // ---------- Perturbation fragment shader ----------
  function fragPerturbation() {
    return `#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_zoom;
uniform int u_maxIter;
uniform bool u_smooth;
uniform float u_paletteOffset;
uniform float u_bailout;
uniform sampler2D u_palette;
uniform sampler2D u_refOrbit;
uniform int u_refLen;
uniform vec2 u_deltaC_offset;
uniform bool u_showAxes;
out vec4 fragColor;

vec2 cmul(vec2 a, vec2 b) { return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x); }
vec2 csq(vec2 z)          { return vec2(z.x*z.x - z.y*z.y, 2.0*z.x*z.y); }

void main() {
  vec2 uv = (gl_FragCoord.xy - u_resolution * 0.5) / min(u_resolution.x, u_resolution.y);
  vec2 dc = uv / u_zoom + u_deltaC_offset;

  vec2 eps = vec2(0.0);
  float bail2 = u_bailout * u_bailout;
  int iter = 0;
  int refLen = min(u_refLen, u_maxIter);

  for (int i = 0; i < 10000; i++) {
    if (i >= refLen) break;
    vec2 Zn = texelFetch(u_refOrbit, ivec2(i, 0), 0).xy;
    vec2 fullZ = Zn + eps;
    if (dot(fullZ, fullZ) > bail2) break;

    eps = 2.0 * cmul(Zn, eps) + csq(eps) + dc;

    if (dot(eps, eps) > dot(Zn, Zn) * 1e6 + 1e-6) {
      eps = fullZ;
    }
    iter++;
  }

  if (iter >= refLen) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    float fIter = float(iter);
    if (u_smooth) {
      vec2 Zn = texelFetch(u_refOrbit, ivec2(min(iter, refLen-1), 0), 0).xy;
      vec2 fullZ = Zn + eps;
      float log_zn = log(dot(fullZ, fullZ)) * 0.5;
      float nu = log(log_zn / log(u_bailout)) / log(2.0);
      fIter = fIter + 1.0 - nu;
    }
    float t = fract(fIter * 0.02 + u_paletteOffset);
    fragColor = vec4(texture(u_palette, vec2(t, 0.5)).rgb, 1.0);
  }
}`;
  }

  return {
    VERT,
    fragStandard,
    fragDoubleDouble,
    fragPerturbation,
  };
})();
