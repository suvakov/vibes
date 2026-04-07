// renderer.js — WebGL2 fractal renderer
window.Renderer = (function () {
  function Renderer(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', { antialias: false, preserveDrawingBuffer: false });
    if (!gl) throw new Error('WebGL2 not supported');
    this.gl = gl;
    this.programs = {};
    this.paletteTex = null;
    this.refOrbitTex = null;
    // Enable float textures
    gl.getExtension('EXT_color_buffer_float');
    this._setupQuad();
    // Force initial sizing
    this.forceResize();
  }

  Renderer.prototype._setupQuad = function () {
    const gl = this.gl;
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, 1,1]), gl.STATIC_DRAW);
    this.quadBuf = buf;
  };

  Renderer.prototype._compile = function (vSrc, fSrc) {
    const gl = this.gl;
    function makeShader(type, src) {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(s));
        console.error(src);
        gl.deleteShader(s);
        return null;
      }
      return s;
    }
    const vs = makeShader(gl.VERTEX_SHADER, vSrc);
    const fs = makeShader(gl.FRAGMENT_SHADER, fSrc);
    if (!vs || !fs) return null;
    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(prog));
      return null;
    }
    return prog;
  };

  Renderer.prototype.getProgram = function (key, vSrc, fSrc) {
    if (!this.programs[key]) {
      this.programs[key] = this._compile(vSrc, fSrc);
    }
    return this.programs[key];
  };

  Renderer.prototype.invalidatePrograms = function () {
    const gl = this.gl;
    for (const k in this.programs) {
      if (this.programs[k]) gl.deleteProgram(this.programs[k]);
    }
    this.programs = {};
  };

  Renderer.prototype.uploadPalette = function (data, size) {
    const gl = this.gl;
    if (!this.paletteTex) this.paletteTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, data);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  Renderer.prototype.uploadRefOrbit = function (orbitData, len) {
    const gl = this.gl;
    if (!this.refOrbitTex) this.refOrbitTex = gl.createTexture();
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.refOrbitTex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, len, 1, 0, gl.RGBA, gl.FLOAT, orbitData);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  };

  Renderer.prototype.forceResize = function () {
    const dpr = window.devicePixelRatio || 1;
    // Use window dimensions as fallback if clientWidth/Height not ready
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    this.canvas.width = pw;
    this.canvas.height = ph;
  };

  Renderer.prototype.resize = function () {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    const pw = Math.round(w * dpr);
    const ph = Math.round(h * dpr);
    if (this.canvas.width !== pw || this.canvas.height !== ph) {
      this.canvas.width = pw;
      this.canvas.height = ph;
    }
  };

  Renderer.prototype.render = function (prog, uniforms) {
    const gl = this.gl;
    this.resize();
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(prog);

    // Bind quad
    gl.bindBuffer(gl.ARRAY_BUFFER, this.quadBuf);
    const aPos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    // Set uniforms
    for (const name in uniforms) {
      const loc = gl.getUniformLocation(prog, name);
      if (loc === null) continue;
      const val = uniforms[name];
      if (typeof val === 'boolean') gl.uniform1i(loc, val ? 1 : 0);
      else if (typeof val === 'number') {
        if (Number.isInteger(val) && name.indexOf('float') < 0 && (name.startsWith('u_max') || name.startsWith('u_fractal') || name.startsWith('u_ref')))
          gl.uniform1i(loc, val);
        else gl.uniform1f(loc, val);
      }
      else if (val.length === 2) gl.uniform2fv(loc, val);
      else if (val.length === 4) gl.uniform4fv(loc, val);
    }

    // Bind textures
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.paletteTex);
    gl.uniform1i(gl.getUniformLocation(prog, 'u_palette'), 0);

    if (this.refOrbitTex) {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.refOrbitTex);
      gl.uniform1i(gl.getUniformLocation(prog, 'u_refOrbit'), 1);
    }

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  Renderer.prototype.setIntUniforms = function(prog, intUniforms) {
    const gl = this.gl;
    gl.useProgram(prog);
    for (const name in intUniforms) {
      const loc = gl.getUniformLocation(prog, name);
      if (loc !== null) gl.uniform1i(loc, intUniforms[name]);
    }
  };

  return Renderer;
})();
