(() => {
    'use strict';

    const TAU = Math.PI * 2;
    const PHI = (1 + Math.sqrt(5)) / 2;
    const C36 = Math.cos(Math.PI / 5), S36 = Math.sin(Math.PI / 5);

    // =====================================================================
    // Curve generation. All 2D curve points live in the ground plane {x, z}.
    // =====================================================================

    const PRESETS = {
        heart: {
            kind: 'param',
            fn: t => {
                const a = TAU * t;
                return {
                    x: 16 * Math.pow(Math.sin(a), 3),
                    z: -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a))
                };
            }
        },
        eight: {
            kind: 'param',
            fn: t => {
                const a = TAU * t;
                return { x: Math.sin(a), z: -Math.sin(a) * Math.cos(a) };
            }
        },
        trefoil: {
            kind: 'param',
            fn: t => {
                const a = TAU * t;
                return {
                    x: Math.sin(a) + 2 * Math.sin(2 * a),
                    z: -(Math.cos(a) - 2 * Math.cos(2 * a))
                };
            }
        },
        egg: {
            kind: 'param',
            fn: t => {
                const a = TAU * t;
                return { x: 1.3 * Math.cos(a), z: 0.9 * Math.sin(a) * (1 + 0.22 * Math.cos(a)) };
            }
        },
        ellipse: {
            kind: 'param',
            fn: t => {
                const a = TAU * t;
                return { x: 1.5 * Math.cos(a), z: 0.9 * Math.sin(a) };
            }
        },
        square: {
            kind: 'poly',
            verts: [{ x: -1, z: -1 }, { x: 1, z: -1 }, { x: 1, z: 1 }, { x: -1, z: 1 }]
        },
        triangle: {
            kind: 'poly',
            verts: [0, 1, 2].map(k => {
                const a = -Math.PI / 2 + k * TAU / 3;
                return { x: Math.cos(a), z: Math.sin(a) };
            })
        },
        hexagon: {
            kind: 'poly',
            verts: [0, 1, 2, 3, 4, 5].map(k => {
                const a = k * TAU / 6;
                return { x: Math.cos(a), z: Math.sin(a) };
            })
        },
        kite: {
            kind: 'poly',
            verts: [
                { x: 0, z: 0 },
                { x: PHI * C36, z: -PHI * S36 },
                { x: PHI, z: 0 },
                { x: PHI * C36, z: PHI * S36 }
            ]
        },
        dart: {
            kind: 'poly',
            verts: [
                { x: 0, z: 0 },
                { x: PHI * C36, z: -PHI * S36 },
                { x: 1, z: 0 },
                { x: PHI * C36, z: PHI * S36 }
            ]
        }
    };

    // Koch-style subdivision: replace each edge with 4 edges, raising a peak
    // of an equilateral triangle. signFn returns +1 (outward, for CCW loops)
    // or -1 (inward) per segment.
    function kochFractal(base, depth, signFn) {
        let pts = base;
        for (let d = 0; d < depth; d++) {
            const next = [];
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i], b = pts[(i + 1) % pts.length];
                const dx = (b.x - a.x) / 3, dz = (b.z - a.z) / 3;
                const p = { x: a.x + dx, z: a.z + dz };
                const q = { x: a.x + 2 * dx, z: a.z + 2 * dz };
                const ang = -signFn(a, b) * Math.PI / 3;
                const c = Math.cos(ang), s = Math.sin(ang);
                const peak = { x: p.x + dx * c - dz * s, z: p.z + dx * s + dz * c };
                next.push(a, p, peak, q);
            }
            pts = next;
        }
        return pts;
    }

    // Deterministic pseudo-random flip from the segment's endpoints, so the
    // coastline keeps its shape when the subdivision depth changes.
    function hashSign(a, b) {
        const h = Math.sin(a.x * 12.9898 + a.z * 78.233 + b.x * 37.719 + b.z * 4.581) * 43758.5453;
        return (h - Math.floor(h)) < 0.5 ? 1 : -1;
    }

    const fractalDepth = N => (N >= 140 ? 3 : 2);

    // Moore curve: the closed-loop variant of the Hilbert curve (an L-system
    // over a 2^order x 2^order grid whose last point is adjacent to the first).
    function mooreCurve(order) {
        let s = 'LFL+F+LFL';
        const rules = { L: '-RF+LFL+FR-', R: '+LF-RFR-FL+' };
        for (let k = 1; k < order; k++) {
            let n = '';
            for (const c of s) n += rules[c] || c;
            s = n;
        }
        let x = 0, z = 0, dx = 1, dz = 0;
        const pts = [{ x, z }];
        for (const c of s) {
            if (c === 'F') { x += dx; z += dz; pts.push({ x, z }); }
            else if (c === '+') { const t = dx; dx = -dz; dz = t; }
            else if (c === '-') { const t = dx; dx = dz; dz = -t; }
        }
        const first = pts[0], last = pts[pts.length - 1];
        if (first.x === last.x && first.z === last.z) pts.pop();
        return pts;
    }

    // Moore-neighbor boundary tracing of a connected region in a binary grid.
    // Returns the boundary pixels in traversal order (a closed loop).
    function traceBoundary(inside, nx, ny) {
        const at = (x, y) => x >= 0 && x < nx && y >= 0 && y < ny && !!inside[y * nx + x];
        // 8-neighborhood ring in clockwise order, starting west
        const DX = [-1, -1, 0, 1, 1, 1, 0, -1];
        const DY = [0, -1, -1, -1, 0, 1, 1, 1];
        const dirOf = (dx, dy) => DX.findIndex((v, k) => v === dx && DY[k] === dy);
        const sy = Math.floor(ny / 2);
        let sx = -1;
        for (let x = 0; x < nx; x++) if (at(x, sy)) { sx = x; break; }
        if (sx < 0) return [];
        let px = sx, py = sy;       // current boundary pixel
        let bx = sx - 1, by = sy;   // backtrack: outside pixel we scanned last
        const pts = [];
        const maxSteps = 8 * nx * ny;
        for (let step = 0; step < maxSteps; step++) {
            pts.push({ x: px, z: py });
            const bdir = dirOf(bx - px, by - py);
            let next = -1;
            for (let k = 1; k <= 8; k++) {
                const d = (bdir + k) % 8;
                if (at(px + DX[d], py + DY[d])) { next = d; break; }
                bx = px + DX[d];
                by = py + DY[d];
            }
            if (next < 0) break; // isolated pixel
            px += DX[next];
            py += DY[next];
            if (px === sx && py === sy) break; // loop closed
        }
        return pts;
    }

    // Boundary of the Mandelbrot set, traced once from a moderate-resolution
    // escape-time grid and cached.
    let mandelCache = null;
    function mandelbrotContour() {
        if (mandelCache) return mandelCache;
        const nx = 288, ny = 241; // ny odd so the real axis (the antenna) is sampled
        const x0 = -2.1, x1 = 0.7, y0 = -1.2, y1 = 1.2;
        const maxIter = 100;
        const inside = new Uint8Array(nx * ny);
        for (let j = 0; j < ny; j++) {
            const ci = y0 + (y1 - y0) * j / (ny - 1);
            for (let i = 0; i < nx; i++) {
                const cr = x0 + (x1 - x0) * i / (nx - 1);
                let zr = 0, zi = 0, k = 0;
                while (k < maxIter && zr * zr + zi * zi <= 4) {
                    const t = zr * zr - zi * zi + cr;
                    zi = 2 * zr * zi + ci;
                    zr = t;
                    k++;
                }
                if (k === maxIter) inside[j * nx + i] = 1;
            }
        }
        const px = traceBoundary(inside, nx, ny);
        const sx = (x1 - x0) / (nx - 1), sz = (y1 - y0) / (ny - 1);
        mandelCache = smoothClosed(
            px.map(p => ({ x: x0 + p.x * sx, z: y0 + p.z * sz })), 3);
        return mandelCache;
    }

    PRESETS.hilbert = {
        kind: 'fractal',
        gen: N => mooreCurve(N >= 140 ? 4 : 3)
    };
    PRESETS.mandel = {
        kind: 'fractal',
        gen: N => resampleClosed(mandelbrotContour(), Math.min(2 * N, 480))
    };

    PRESETS.koch = {
        kind: 'fractal',
        gen: N => kochFractal(PRESETS.triangle.verts, fractalDepth(N), () => 1)
    };
    PRESETS.coast = {
        kind: 'fractal',
        gen: N => kochFractal(
            [{ x: -1.3, z: -0.9 }, { x: 1.1, z: -1.2 }, { x: 1.4, z: 0.8 }, { x: -0.8, z: 1.1 }],
            fractalDepth(N), hashSign)
    };

    function sampleParam(fn, M) {
        const pts = [];
        for (let k = 0; k < M; k++) pts.push(fn(k / M));
        return pts;
    }

    // Resample a closed polyline to N points uniformly spaced by arc length.
    function resampleClosed(pts, N) {
        const n = pts.length;
        const cum = [0];
        for (let i = 1; i <= n; i++) {
            const a = pts[i - 1], b = pts[i % n];
            cum.push(cum[i - 1] + Math.hypot(b.x - a.x, b.z - a.z));
        }
        const total = cum[n];
        if (total < 1e-9) return pts.slice(0, N);
        const out = [];
        let seg = 0;
        for (let k = 0; k < N; k++) {
            const d = total * k / N;
            while (seg < n - 1 && cum[seg + 1] < d) seg++;
            const a = pts[seg], b = pts[(seg + 1) % n];
            const t = (d - cum[seg]) / Math.max(cum[seg + 1] - cum[seg], 1e-12);
            out.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
        }
        return out;
    }

    // Sample polygon edges so that every corner is an exact sample point.
    function samplePolygon(verts, N) {
        const n = verts.length;
        const lens = verts.map((v, i) => {
            const w = verts[(i + 1) % n];
            return Math.hypot(w.x - v.x, w.z - v.z);
        });
        const total = lens.reduce((a, b) => a + b, 0);
        const pts = [];
        for (let i = 0; i < n; i++) {
            const a = verts[i], b = verts[(i + 1) % n];
            const k = Math.max(1, Math.round(N * lens[i] / total));
            for (let s = 0; s < k; s++) {
                const t = s / k;
                pts.push({ x: a.x + (b.x - a.x) * t, z: a.z + (b.z - a.z) * t });
            }
        }
        return pts;
    }

    function smoothClosed(pts, passes) {
        let cur = pts;
        for (let p = 0; p < passes; p++) {
            cur = cur.map((v, i, arr) => {
                const a = arr[(i - 1 + arr.length) % arr.length];
                const b = arr[(i + 1) % arr.length];
                return { x: (a.x + 2 * v.x + b.x) / 4, z: (a.z + 2 * v.z + b.z) / 4 };
            });
        }
        return cur;
    }

    // Center on bounding box and scale so the larger extent equals `size`.
    function normalizePoints(pts, size) {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.z < minZ) minZ = p.z;
            if (p.z > maxZ) maxZ = p.z;
        }
        const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;
        const s = size / Math.max(maxX - minX, maxZ - minZ, 1e-9);
        return pts.map(p => ({ x: (p.x - cx) * s, z: (p.z - cz) * s }));
    }

    // =====================================================================
    // Surface: triangulate the parameter triangle 0 <= x <= y <= 1 and map
    // each node (x, y) -> midpoint of (gamma(x), gamma(y)) lifted to height
    // |gamma(x) - gamma(y)|. Since gamma(0) = gamma(1) the identified edges
    // of the triangle land on the same 3D points and the Mobius band closes.
    // =====================================================================

    const PALETTE = [
        [13, 8, 135], [126, 3, 168], [204, 71, 120], [248, 149, 64], [240, 249, 33]
    ];

    function paletteColor(t) {
        const u = Math.min(Math.max(t, 0), 1) * (PALETTE.length - 1);
        const i = Math.min(Math.floor(u), PALETTE.length - 2);
        const f = u - i;
        const a = PALETTE[i], b = PALETTE[i + 1];
        return [
            (a[0] + (b[0] - a[0]) * f) / 255,
            (a[1] + (b[1] - a[1]) * f) / 255,
            (a[2] + (b[2] - a[2]) * f) / 255
        ];
    }

    function buildSurfaceGeometry(pts) {
        const N = pts.length;
        const P = i => pts[i % N];

        // offsets[i] = index of grid node (i, i); row i holds j = i..N
        const offsets = new Array(N + 2);
        offsets[0] = 0;
        for (let i = 1; i <= N + 1; i++) offsets[i] = offsets[i - 1] + (N - i + 2);
        const count = offsets[N + 1];

        const pos = new Float32Array(count * 3);
        const uv = new Float32Array(count * 2);
        const heights = new Float32Array(count);
        let maxH = 0;
        for (let i = 0; i <= N; i++) {
            const A = P(i);
            for (let j = i; j <= N; j++) {
                const B = P(j);
                const idx = offsets[i] + (j - i);
                const h = Math.hypot(B.x - A.x, B.z - A.z);
                pos[3 * idx] = (A.x + B.x) / 2;
                pos[3 * idx + 1] = h;
                pos[3 * idx + 2] = (A.z + B.z) / 2;
                // texture coords in the standard Mobius strip projection:
                // s along the strip (u / 2pi), t across its width. Textures
                // periodic in s and symmetric in t match the (s,t)~(s+1,1-t)
                // gluing, so they are seamless on the surface.
                uv[2 * idx] = (i + j) / N;
                uv[2 * idx + 1] = 1 - (j - i) / N;
                heights[idx] = h;
                if (h > maxH) maxH = h;
            }
        }

        const col = new Float32Array(count * 3);
        for (let k = 0; k < count; k++) {
            const c = paletteColor(Math.pow(heights[k] / (maxH || 1), 0.85));
            col[3 * k] = c[0];
            col[3 * k + 1] = c[1];
            col[3 * k + 2] = c[2];
        }

        const id = (i, j) => offsets[i] + (j - i);
        const indices = [];
        for (let i = 0; i < N; i++) {
            for (let j = i; j < N; j++) {
                const a = id(i, j), c = id(i + 1, j + 1), d = id(i, j + 1);
                if (j > i) {
                    const b = id(i + 1, j);
                    indices.push(a, b, c, a, c, d);
                } else {
                    // diagonal cell: only the half above x = y exists
                    indices.push(a, c, d);
                }
            }
        }

        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        geo.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
        geo.computeVertexNormals();

        // morph target: the same grid node (i, j) on the standard Mobius strip
        const tgt = new Float32Array(count * 3);
        for (let i = 0; i <= N; i++) {
            for (let j = i; j <= N; j++) {
                mobiusTarget(i / N, j / N, tgt, 3 * (offsets[i] + (j - i)));
            }
        }
        const tmp = new THREE.BufferGeometry();
        tmp.setAttribute('position', new THREE.BufferAttribute(tgt, 3));
        tmp.setIndex(geo.index);
        tmp.computeVertexNormals();
        geo.morphAttributes.position = [tmp.attributes.position];
        geo.morphAttributes.normal = [tmp.attributes.normal];

        return { geo, maxH, vertices: count, triangles: indices.length / 3 };
    }

    // =====================================================================
    // Morph target: the standard Mobius strip. Our parameter triangle maps
    // onto it via u = 2*pi*(x + y), v = 1 - 2*(y - x); the triangle's glued
    // edges (0,y) ~ (y,1) land on the same strip points, and the diagonal
    // x = y (the curve itself) lands on the strip's boundary circle.
    // =====================================================================

    const MOBIUS_R = 1.5, MOBIUS_W = 0.55, MOBIUS_H = 1.0;

    function mobiusTarget(ti, tj, out, k) {
        const u = TAU * (ti + tj);
        const v = 1 - 2 * (tj - ti);
        const r = MOBIUS_R + MOBIUS_W * v * Math.cos(u / 2);
        out[k] = r * Math.cos(u);
        out[k + 1] = MOBIUS_H + MOBIUS_W * v * Math.sin(u / 2);
        out[k + 2] = r * Math.sin(u);
    }

    class MobiusEdgeCurve extends THREE.Curve {
        getPoint(t, target = new THREE.Vector3()) {
            const u = 2 * TAU * t; // boundary = pairs (t, t), a double loop
            const r = MOBIUS_R + MOBIUS_W * Math.cos(u / 2);
            return target.set(
                r * Math.cos(u),
                MOBIUS_H + MOBIUS_W * Math.sin(u / 2),
                r * Math.sin(u));
        }
    }

    // Piecewise-linear closed curve for the boundary tube.
    class LoopCurve extends THREE.Curve {
        constructor(pts) {
            super();
            this.pts = pts;
        }
        getPoint(t, target = new THREE.Vector3()) {
            const n = this.pts.length;
            const u = (((t % 1) + 1) % 1) * n;
            const i = Math.floor(u) % n;
            const f = u - Math.floor(u);
            const a = this.pts[i], b = this.pts[(i + 1) % n];
            return target.set(a.x + (b.x - a.x) * f, 0, a.z + (b.z - a.z) * f);
        }
    }

    // =====================================================================
    // Three.js scene
    // =====================================================================

    let scene, camera, renderer, controls;
    let surfaceGroup, curveGroup;
    let surfaceMesh = null, backMesh = null, wireMesh = null, tubeMesh = null;

    const surfMat = new THREE.MeshPhongMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        shininess: 55,
        specular: 0x444455,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1,
        morphTargets: true,
        morphNormals: true
    });
    const wireMat = new THREE.MeshBasicMaterial({
        wireframe: true,
        color: 0xffffff,
        transparent: true,
        opacity: 0.10,
        morphTargets: true
    });
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0x7fe0ff, morphTargets: true });

    // ---------- surface textures (painted in strip coordinates) ----------

    let currentOpacity = 1;
    function styleSurfaceMaterial(mat) {
        mat.opacity = currentOpacity;
        mat.transparent = currentOpacity < 1;
        // skip depth writes when translucent so the self-intersecting band
        // doesn't occlude itself in draw order
        mat.depthWrite = currentOpacity >= 1;
        mat.needsUpdate = true;
    }

    // Bands of cycling color separated by thin lines orthogonal to the strip
    // (lines of constant u). Uniform across the width, so flip-symmetric.
    // Hue advances 180 degrees per loop ("double period"): the return trip
    // around the band carries the complementary colors, so the two faces of
    // the strip are rendered with a front canvas and a hue-shifted back one.
    // The canvas spans the FULL double period s in [0, 2] (sampled with
    // repeat.x = 0.5), so the hue is linear in s with no interior wrap —
    // otherwise a complementary-color seam appears along the glued edge.
    function makeStripesCanvas(hueOffset) {
        const w = 2048, h = 256;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        for (let x = 0; x < w; x++) {
            ctx.fillStyle = `hsl(${hueOffset + 360 * x / w}, 72%, 55%)`;
            ctx.fillRect(x, 0, 1, h);
        }
        const nLines = 72; // 36 per loop of the strip
        ctx.fillStyle = 'rgba(12, 12, 22, 0.92)';
        for (let k = 0; k < nLines; k++) {
            ctx.fillRect(Math.round(k * w / nLines) - 2, 0, 4, h);
        }
        ctx.fillRect(w - 2, 0, 2, h); // wrap of the k = 0 line
        return cv;
    }

    function drawAnt(ctx, cx, cy, L) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#141414';
        ctx.fillStyle = '#141414';
        ctx.lineWidth = Math.max(2, 0.04 * L);
        ctx.lineCap = 'round';
        // three leg pairs + antennae, mirrored across the walking axis
        const legs = [
            [-0.04, -0.14, 0.30, -0.24, 0.46],
            [0.04, 0.07, 0.32, 0.03, 0.48],
            [0.12, 0.20, 0.30, 0.30, 0.44]
        ];
        for (const sgn of [-1, 1]) {
            for (const [ax, mx, my, ex, ey] of legs) {
                ctx.beginPath();
                ctx.moveTo(ax * L, 0);
                ctx.lineTo(mx * L, sgn * my * L);
                ctx.lineTo(ex * L, sgn * ey * L);
                ctx.stroke();
            }
            ctx.beginPath();
            ctx.moveTo(0.34 * L, sgn * 0.02 * L);
            ctx.quadraticCurveTo(0.46 * L, sgn * 0.10 * L, 0.53 * L, sgn * 0.20 * L);
            ctx.stroke();
        }
        const ell = (x, rx, ry) => {
            ctx.beginPath();
            ctx.ellipse(x * L, 0, rx * L, ry * L, 0, 0, TAU);
            ctx.fill();
        };
        ell(-0.26, 0.22, 0.12); // abdomen
        ell(0.04, 0.13, 0.08);  // thorax
        ell(0.28, 0.09, 0.07);  // head
        ctx.restore();
    }

    // Grayscale square grid with ants marching single file along the strip's
    // center line, a la Escher's "Mobius Strip II".
    function makeAntsCanvas() {
        const w = 1024, h = 256;
        const cv = document.createElement('canvas');
        cv.width = w;
        cv.height = h;
        const ctx = cv.getContext('2d');
        ctx.fillStyle = '#e6e6e6';
        ctx.fillRect(0, 0, w, h);
        // grid cells are roughly square on the strip (length ~2*pi*R, width 2*w)
        const cols = 32, rows = 4;
        ctx.strokeStyle = '#8a8a8a';
        ctx.lineWidth = 2;
        for (let k = 0; k <= cols; k++) {
            const x = Math.round(k * w / cols);
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let k = 0; k <= rows; k++) {
            const y = Math.round(k * h / rows);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }
        const nAnts = 5;
        for (let k = 0; k < nAnts; k++) {
            drawAnt(ctx, (k + 0.5) * w / nAnts, h / 2, 85);
        }
        return cv;
    }

    const texMats = {};
    let currentTexName = 'plasma';

    function makeMapMaterial(cv, side, repeatX = 1) {
        const map = new THREE.CanvasTexture(cv);
        map.wrapS = THREE.RepeatWrapping;
        map.wrapT = THREE.ClampToEdgeWrapping;
        map.repeat.x = repeatX;
        map.anisotropy = renderer.capabilities.getMaxAnisotropy();
        const mat = new THREE.MeshPhongMaterial({
            map,
            side,
            shininess: 30,
            specular: 0x333340,
            polygonOffset: true,
            polygonOffsetFactor: 1,
            polygonOffsetUnits: 1,
            morphTargets: true,
            morphNormals: true
        });
        styleSurfaceMaterial(mat);
        return mat;
    }

    function allSurfaceMaterials() {
        const list = [surfMat];
        for (const v of Object.values(texMats)) {
            if (v.front) list.push(v.front, v.back);
            else list.push(v);
        }
        return list;
    }

    // The stripes coloring lives on the band's orientation double cover, so
    // it needs different (complementary) textures on the two render faces.
    function applySurfaceMaterials() {
        if (!surfaceMesh) return;
        if (currentTexName === 'stripes') {
            if (!texMats.stripes) {
                texMats.stripes = {
                    front: makeMapMaterial(makeStripesCanvas(0), THREE.FrontSide, 0.5),
                    back: makeMapMaterial(makeStripesCanvas(180), THREE.BackSide, 0.5)
                };
            }
            surfaceMesh.material = texMats.stripes.front;
            backMesh.material = texMats.stripes.back;
            backMesh.visible = true;
        } else {
            if (currentTexName === 'plasma') {
                surfaceMesh.material = surfMat;
            } else {
                if (!texMats.ants) texMats.ants = makeMapMaterial(makeAntsCanvas(), THREE.DoubleSide);
                surfaceMesh.material = texMats.ants;
            }
            backMesh.visible = false;
        }
    }

    const HOME_POS = new THREE.Vector3(6.8, 6.2, 8.8);
    const HOME_TARGET = new THREE.Vector3(0, 0.8, 0);

    // Center the figure in the part of the screen not covered by UI: on
    // mobile the bottom third holds the control sheet, on desktop the right
    // side holds the panel. A camera view offset shifts the projection.
    function updateViewOffset() {
        const w = window.innerWidth, h = window.innerHeight;
        if (window.matchMedia('(max-width: 640px)').matches) {
            camera.setViewOffset(w, h, 0, h / 6, w, h);
        } else {
            camera.setViewOffset(w, h, 161, 0, w, h);
        }
    }

    // Morph animation between the pair surface (0) and the Mobius strip (1)
    const morph = { p: 0, target: 0 };
    let morphFrames = 110; // frames for a full morph

    function easeInOutCubic(p) {
        return p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2;
    }

    function applyMorph() {
        const e = easeInOutCubic(morph.p);
        for (const m of [surfaceMesh, backMesh, wireMesh, tubeMesh]) {
            if (m && m.morphTargetInfluences) m.morphTargetInfluences[0] = e;
        }
    }

    function setMorphTarget(target, instant) {
        morph.target = target;
        if (instant) morph.p = target;
        document.getElementById('morph-btn').textContent =
            target === 1 ? '🌀 Morph back to pair surface' : '🌀 Morph to Möbius strip';
        applyMorph();
    }

    function initScene() {
        scene = new THREE.Scene();

        camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.05, 100);
        camera.position.copy(HOME_POS);
        updateViewOffset();

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        controls = new THREE.OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.08;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.0;
        controls.minDistance = 0.5;
        controls.maxDistance = 30;
        controls.target.copy(HOME_TARGET);

        scene.add(new THREE.AmbientLight(0x333344));
        scene.add(new THREE.HemisphereLight(0x9999bb, 0x222233, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 0.9);
        key.position.set(5, 8, 3);
        scene.add(key);
        const fill = new THREE.DirectionalLight(0x8899ff, 0.35);
        fill.position.set(-6, 4, -5);
        scene.add(fill);

        const grid = new THREE.GridHelper(10, 20, 0x39406a, 0x232741);
        grid.position.y = -0.002;
        scene.add(grid);

        surfaceGroup = new THREE.Group();
        curveGroup = new THREE.Group();
        scene.add(surfaceGroup, curveGroup);

        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            updateViewOffset();
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
            resizeDrawCanvas();
        });

        (function animate() {
            requestAnimationFrame(animate);
            if (morph.p !== morph.target) {
                const dir = morph.target > morph.p ? 1 : -1;
                morph.p = Math.min(1, Math.max(0, morph.p + dir / morphFrames));
                applyMorph();
            }
            controls.update();
            renderer.render(scene, camera);
        })();
    }

    // =====================================================================
    // Rebuild pipeline
    // =====================================================================

    let currentCurve = { kind: 'preset', name: 'heart' };
    let detail = 180;
    let surfRes = 1; // surface triangulation grid multiplier relative to detail

    function curveSamples(N) {
        if (currentCurve.kind === 'preset') {
            const p = PRESETS[currentCurve.name];
            if (p.kind === 'param') {
                return resampleClosed(sampleParam(p.fn, Math.max(4 * N, 1024)), N);
            }
            if (p.kind === 'fractal') return p.gen(N);
            return samplePolygon(p.verts, N);
        }
        return resampleClosed(currentCurve.pts, N);
    }

    function rebuild() {
        const pts = normalizePoints(curveSamples(detail), 3.0);
        // the surface grid resolution is independent of the boundary curve:
        // surfRes scales how finely the parameter triangle is triangulated.
        const surfN = Math.min(480, Math.max(20, Math.round(detail * surfRes)));
        const surfPts = surfN === detail ? pts : normalizePoints(curveSamples(surfN), 3.0);

        if (surfaceMesh) {
            surfaceGroup.remove(surfaceMesh, backMesh, wireMesh);
            surfaceMesh.geometry.dispose();
        }
        if (tubeMesh) {
            curveGroup.remove(tubeMesh);
            tubeMesh.geometry.dispose();
        }

        const { geo, maxH, vertices, triangles } = buildSurfaceGeometry(surfPts);
        surfaceMesh = new THREE.Mesh(geo, surfMat);
        backMesh = new THREE.Mesh(geo, surfMat);
        backMesh.visible = false;
        wireMesh = new THREE.Mesh(geo, wireMat);
        wireMesh.visible = document.getElementById('wireframe-check').checked;
        surfaceGroup.add(surfaceMesh, backMesh, wireMesh);
        applySurfaceMaterials();

        const tubeSegs = Math.min(2 * pts.length, 800);
        const tubeGeo = new THREE.TubeGeometry(new LoopCurve(pts), tubeSegs, 0.026, 10, true);
        // morph target: the boundary circle of the standard Mobius strip
        const tubeTgt = new THREE.TubeGeometry(new MobiusEdgeCurve(), tubeSegs, 0.026, 10, true);
        tubeGeo.morphAttributes.position = [tubeTgt.attributes.position];
        tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        tubeMesh.visible = document.getElementById('curve-check').checked;
        curveGroup.add(tubeMesh);

        setMorphTarget(0, true);

        document.getElementById('stat-vertices').textContent = vertices.toLocaleString();
        document.getElementById('stat-triangles').textContent = triangles.toLocaleString();
        currentMaxH = maxH;
        updateMaxHStat();
    }

    let currentMaxH = 0;

    function updateMaxHStat() {
        const s = surfaceGroup.scale.y;
        document.getElementById('stat-maxh').textContent = (currentMaxH * s).toFixed(2);
    }

    // =====================================================================
    // Drawing overlay
    // =====================================================================

    const overlay = document.getElementById('draw-overlay');
    const drawCanvas = document.getElementById('draw-canvas');
    const dctx = drawCanvas.getContext('2d');
    let stroke = [];
    let drawing = false;

    function resizeDrawCanvas() {
        const dpr = Math.min(window.devicePixelRatio, 2);
        drawCanvas.width = window.innerWidth * dpr;
        drawCanvas.height = window.innerHeight * dpr;
        drawCanvas.style.width = window.innerWidth + 'px';
        drawCanvas.style.height = window.innerHeight + 'px';
        dctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function renderStroke() {
        dctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
        if (stroke.length < 2) return;
        dctx.lineWidth = 3;
        dctx.lineJoin = dctx.lineCap = 'round';
        dctx.strokeStyle = '#7fe0ff';
        dctx.beginPath();
        dctx.moveTo(stroke[0].x, stroke[0].y);
        for (let i = 1; i < stroke.length; i++) dctx.lineTo(stroke[i].x, stroke[i].y);
        dctx.stroke();
        // dashed closing segment back to the start
        dctx.setLineDash([6, 8]);
        dctx.strokeStyle = 'rgba(127, 224, 255, 0.45)';
        dctx.beginPath();
        dctx.moveTo(stroke[stroke.length - 1].x, stroke[stroke.length - 1].y);
        dctx.lineTo(stroke[0].x, stroke[0].y);
        dctx.stroke();
        dctx.setLineDash([]);
    }

    function enterDrawMode() {
        overlay.classList.add('visible');
        resizeDrawCanvas();
        stroke = [];
        drawing = false;
        renderStroke();
        document.getElementById('draw-hint-text').textContent =
            'Click and drag to draw a closed curve — release to finish (it closes automatically).';
    }

    function exitDrawMode() {
        overlay.classList.remove('visible');
        drawing = false;
    }

    function strokeLength(pts) {
        let L = 0;
        for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        return L;
    }

    function finishStroke() {
        drawing = false;
        if (stroke.length < 8 || strokeLength(stroke) < 60) {
            document.getElementById('draw-hint-text').textContent =
                'Too short — draw a bigger loop, or press Cancel.';
            stroke = [];
            renderStroke();
            return;
        }
        // screen y-down maps directly to world z (toward the viewer from above)
        const pts = smoothClosed(stroke.map(p => ({ x: p.x, z: p.y })), 2);
        currentCurve = { kind: 'points', pts };
        document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
        exitDrawMode();
        rebuild();
    }

    drawCanvas.addEventListener('pointerdown', e => {
        drawing = true;
        stroke = [{ x: e.clientX, y: e.clientY }];
        drawCanvas.setPointerCapture(e.pointerId);
        e.preventDefault();
    });
    drawCanvas.addEventListener('pointermove', e => {
        if (!drawing) return;
        const last = stroke[stroke.length - 1];
        if (Math.hypot(e.clientX - last.x, e.clientY - last.y) > 2) {
            stroke.push({ x: e.clientX, y: e.clientY });
            renderStroke();
        }
    });
    drawCanvas.addEventListener('pointerup', () => {
        if (drawing) finishStroke();
    });
    window.addEventListener('keydown', e => {
        if (e.key === 'Escape' && overlay.classList.contains('visible')) exitDrawMode();
    });

    // =====================================================================
    // UI wiring
    // =====================================================================

    document.getElementById('draw-btn').addEventListener('click', enterDrawMode);
    document.getElementById('draw-cancel-btn').addEventListener('click', exitDrawMode);

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCurve = { kind: 'preset', name: btn.dataset.preset };
            rebuild();
        });
    });

    const detailInput = document.getElementById('detail-input');
    detailInput.addEventListener('input', () => {
        detail = parseInt(detailInput.value, 10);
        document.getElementById('detail-value').textContent = detail;
        rebuild();
    });

    const resInput = document.getElementById('res-input');
    resInput.addEventListener('input', () => {
        surfRes = parseFloat(resInput.value);
        document.getElementById('res-value').textContent = surfRes.toFixed(2) + '×';
        rebuild();
    });

    const heightInput = document.getElementById('height-input');
    heightInput.addEventListener('input', () => {
        const s = parseFloat(heightInput.value);
        document.getElementById('height-value').textContent = s.toFixed(2);
        surfaceGroup.scale.y = Math.max(s, 1e-4);
        updateMaxHStat();
    });

    const opacityInput = document.getElementById('opacity-input');
    opacityInput.addEventListener('input', () => {
        currentOpacity = parseFloat(opacityInput.value);
        document.getElementById('opacity-value').textContent = currentOpacity.toFixed(2);
        allSurfaceMaterials().forEach(styleSurfaceMaterial);
    });

    document.querySelectorAll('.texture-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.texture-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTexName = btn.dataset.texture;
            applySurfaceMaterials();
        });
    });

    document.getElementById('wireframe-check').addEventListener('change', e => {
        if (wireMesh) wireMesh.visible = e.target.checked;
    });
    document.getElementById('rotate-check').addEventListener('change', e => {
        controls.autoRotate = e.target.checked;
    });
    document.getElementById('curve-check').addEventListener('change', e => {
        if (tubeMesh) tubeMesh.visible = e.target.checked;
    });

    const morphFramesInput = document.getElementById('morph-frames-input');
    morphFramesInput.addEventListener('input', () => {
        morphFrames = parseInt(morphFramesInput.value, 10);
        document.getElementById('morph-frames-value').textContent = morphFrames + ' frames';
    });

    document.getElementById('morph-btn').addEventListener('click', () => {
        setMorphTarget(morph.target === 1 ? 0 : 1, false);
    });

    document.getElementById('reset-view-btn').addEventListener('click', () => {
        camera.position.copy(HOME_POS);
        controls.target.copy(HOME_TARGET);
    });

    document.getElementById('minimize-btn').addEventListener('click', () => {
        document.body.classList.add('ui-collapsed');
    });
    document.getElementById('panel-handle').addEventListener('click', () => {
        document.body.classList.toggle('panel-collapsed');
    });

    // mobile quick-action toolbar
    function cycleButtons(selector) {
        const btns = [...document.querySelectorAll(selector)];
        const i = btns.findIndex(b => b.classList.contains('active'));
        btns[(i + 1) % btns.length].click();
    }
    document.getElementById('mt-morph').addEventListener('click', () => {
        document.getElementById('morph-btn').click();
    });
    document.getElementById('mt-curve').addEventListener('click', () => cycleButtons('.preset-btn'));
    document.getElementById('mt-draw').addEventListener('click', enterDrawMode);
    document.getElementById('mt-texture').addEventListener('click', () => cycleButtons('.texture-btn'));
    document.getElementById('ui-toggle').addEventListener('click', () => {
        document.body.classList.remove('ui-collapsed');
    });

    const modal = document.getElementById('info-modal');
    document.getElementById('info-btn').addEventListener('click', () => modal.classList.add('visible'));
    modal.querySelector('.close-modal').addEventListener('click', () => modal.classList.remove('visible'));
    modal.addEventListener('click', e => {
        if (e.target === modal) modal.classList.remove('visible');
    });

    // =====================================================================

    initScene();
    rebuild();
})();
