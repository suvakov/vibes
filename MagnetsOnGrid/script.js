'use strict';

/* Magnets on a Grid
 * Point dipoles pinned at lattice vertices, free to rotate in 2D.
 * Pair potential:  U = K/r^3 * [ mi.mj - 3 (mi.r^)(mj.r^) ]
 * Dynamics:        I th'' = tau - gamma th'   (semi-implicit Euler, substeps)
 */

const TAU = Math.PI * 2;

// ---------- physics parameters ----------
const K = 8;            // dipole-dipole coupling strength
const INERTIA = 1;      // moment of inertia of a rod
const DT = 0.012;       // physics timestep
const SUBSTEPS = 4;     // substeps per animation frame
const CUTOFF = 2.7;     // interaction cutoff (nearest-neighbour units)
const FIELD_R = 3.4;    // field contribution radius (lattice units)
const SOFT2 = 0.10;     // softening^2 for field singularity
const SLEEP_OMEGA = 8e-4;
const SLEEP_FRAMES = 90;

// ---------- DOM ----------
const canvas = document.getElementById('scene');
const ctx = canvas.getContext('2d');
const shapeSel = document.getElementById('shape');
const sizeInput = document.getElementById('size');
const sizeLabel = document.getElementById('size-label');
const frictionInput = document.getElementById('friction');
const frictionLabel = document.getElementById('friction-label');
const extDirInput = document.getElementById('ext-dir');
const extDirLabel = document.getElementById('ext-dir-label');
const extIntInput = document.getElementById('ext-int');
const extIntLabel = document.getElementById('ext-int-label');
const overlaySel = document.getElementById('overlay');
const colormapChk = document.getElementById('colormap');
const densityInput = document.getElementById('density');
const densityLabel = document.getElementById('density-label');
const randomizeBtn = document.getElementById('randomize');
const countEl = document.getElementById('count');
const energyEl = document.getElementById('energy');
const panel = document.getElementById('panel');
const panelToggle = document.getElementById('panel-toggle');

// ---------- state ----------
let n = 0;
let px, py;                       // positions, lattice units (nearest neighbour = 1)
let theta, omega, torque;         // angle, angular velocity, torque accumulator
let pairI, pairJ, pairPhi, pairC; // interacting pairs: indices, bond angle, K/r^3
let nPairs = 0;
let bonds = [];                   // nearest-neighbour index pairs (for faint lines)
let gamma = 1.0;
let extB = 0;                     // external field intensity (torque units)
let extAngle = -Math.PI / 2;      // external field direction, canvas angle (default north = up)

let W = 0, H = 0, dpr = 1;        // canvas size in CSS px
let scale = 40, offX = 0, offY = 0;

// field grid
let fw = 0, fh = 0, cell = 10;
let fBx, fBy, fImg, fCanvas, fCtx;
const magLUT = buildMagLUT();

// rod sprite
let rodSprite = null, rodW = 0, rodH = 0;

let asleep = false, stillFrames = 0, frame = 0;

// ---------- lattice generators (bond length = 1) ----------
function genSquare(N) {
    const pts = [];
    for (let j = 0; j < N; j++)
        for (let i = 0; i < N; i++) pts.push(i, j);
    return pts;
}

function genTriangular(N) {
    // triangle-shaped patch: N vertices along each edge
    const pts = [], dy = Math.sqrt(3) / 2;
    for (let j = 0; j < N; j++)
        for (let i = 0; i < N - j; i++)
            pts.push(i + j * 0.5, -j * dy); // apex up
    return pts;
}

function genHexagonal(N) {
    // honeycomb patch shaped like a hexagon, ~N cells across the diagonal
    const R = Math.max(0, Math.floor((N - 1) / 2));
    const seen = new Set();
    const pts = [];
    for (let q = -R; q <= R; q++) {
        for (let r = Math.max(-R, -q - R); r <= Math.min(R, -q + R); r++) {
            const cx = Math.sqrt(3) * (q + r / 2);
            const cy = 1.5 * r;
            for (let k = 0; k < 6; k++) {
                const a = (Math.PI / 180) * (60 * k - 30);
                const x = cx + Math.cos(a), y = cy + Math.sin(a);
                const key = Math.round(x * 512) + ':' + Math.round(y * 512);
                if (!seen.has(key)) { seen.add(key); pts.push(x, y); }
            }
        }
    }
    return pts;
}

// ---------- setup ----------
function rebuild() {
    const N = parseInt(sizeInput.value, 10);
    const shape = shapeSel.value;
    const raw = shape === 'triangular' ? genTriangular(N)
        : shape === 'hexagonal' ? genHexagonal(N)
            : genSquare(N);

    n = raw.length / 2;
    px = new Float32Array(n);
    py = new Float32Array(n);
    for (let i = 0; i < n; i++) { px[i] = raw[2 * i]; py[i] = raw[2 * i + 1]; }

    theta = new Float32Array(n);
    omega = new Float32Array(n);
    torque = new Float32Array(n);

    buildPairs();
    fit();
    randomizeAll();
    countEl.textContent = n;
    updateSizeLabel();
}

function updateSizeLabel() {
    const N = sizeInput.value;
    sizeLabel.textContent = shapeSel.value === 'square' ? `${N} × ${N}`
        : shapeSel.value === 'triangular' ? `edge ${N}`
            : `diag ${N}`;
}

function buildPairs() {
    const I = [], J = [], PHI = [], C = [];
    bonds = [];
    const cut2 = CUTOFF * CUTOFF;
    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            const dx = px[j] - px[i], dy = py[j] - py[i];
            const r2 = dx * dx + dy * dy;
            if (r2 > cut2) continue;
            const r = Math.sqrt(r2);
            I.push(i); J.push(j);
            PHI.push(Math.atan2(dy, dx));
            C.push(K / (r2 * r));
            if (r < 1.05) bonds.push(i, j);
        }
    }
    nPairs = I.length;
    pairI = Int32Array.from(I);
    pairJ = Int32Array.from(J);
    pairPhi = Float32Array.from(PHI);
    pairC = Float32Array.from(C);
}

function viewportRect() {
    // with the panel open on a phone, the lattice lives in the lower half
    const mobileOpen = window.matchMedia('(max-width: 720px)').matches && panel.classList.contains('open');
    if (mobileOpen) return { x: 0, y: H * 0.5, w: W, h: H * 0.5 - 60 }; // keep the gauge strip clear
    return { x: 0, y: 0, w: W, h: H };
}

function fit() {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
        if (px[i] < minX) minX = px[i];
        if (px[i] > maxX) maxX = px[i];
        if (py[i] < minY) minY = py[i];
        if (py[i] > maxY) maxY = py[i];
    }
    const bw = Math.max(maxX - minX, 1), bh = Math.max(maxY - minY, 1);
    const vp = viewportRect();
    const pad = Math.min(vp.w, vp.h) * 0.09 + 24;
    scale = Math.min((vp.w - pad * 2) / bw, (vp.h - pad * 2) / bh);
    scale = Math.max(8, Math.min(scale, 90));
    offX = vp.x + (vp.w - bw * scale) / 2 - minX * scale;
    offY = vp.y + (vp.h - bh * scale) / 2 - minY * scale;
    buildSprite();
    buildOccupancy();
}

// ---------- randomization ----------
function randomizeAll() {
    for (let i = 0; i < n; i++) {
        theta[i] = Math.random() * TAU;
        omega[i] = 0;
    }
    wake();
}

function kickOne(i) {
    theta[i] = Math.random() * TAU;
    omega[i] = 0;
    wake();
}

function wake() {
    asleep = false;
    stillFrames = 0;
}

// ---------- physics ----------
function step() {
    const damp = gamma;
    for (let s = 0; s < SUBSTEPS; s++) {
        torque.fill(0);
        for (let p = 0; p < nPairs; p++) {
            const i = pairI[p], j = pairJ[p];
            const phi = pairPhi[p], C = pairC[p];
            const ai = theta[i] - phi, aj = theta[j] - phi;
            const si = Math.sin(ai), ci = Math.cos(ai);
            const sj = Math.sin(aj), cj = Math.cos(aj);
            // tau_i = -dU/dth_i ,  U = C (si*sj - 2 ci*cj)
            torque[i] += C * (-2 * si * cj - ci * sj);
            torque[j] += C * (-2 * ci * sj - si * cj);
        }
        for (let i = 0; i < n; i++) {
            if (extB > 0) torque[i] += extB * Math.sin(extAngle - theta[i]); // tau = m x B
            omega[i] += (torque[i] / INERTIA - damp * omega[i]) * DT;
            theta[i] += omega[i] * DT;
        }
    }

    let maxW = 0;
    for (let i = 0; i < n; i++) {
        const a = Math.abs(omega[i]);
        if (a > maxW) maxW = a;
    }
    if (maxW < SLEEP_OMEGA) {
        if (++stillFrames > SLEEP_FRAMES) asleep = true;
    } else {
        stillFrames = 0;
    }
}

function totalEnergy() {
    let U = 0;
    for (let p = 0; p < nPairs; p++) {
        const phi = pairPhi[p];
        const ai = theta[pairI[p]] - phi, aj = theta[pairJ[p]] - phi;
        U += pairC[p] * (Math.sin(ai) * Math.sin(aj) - 2 * Math.cos(ai) * Math.cos(aj));
    }
    if (extB > 0)
        for (let i = 0; i < n; i++) U -= extB * Math.cos(theta[i] - extAngle); // Zeeman term
    return U;
}

// ---------- magnetic field ----------
function buildMagLUT() {
    // |B| colormap: deep indigo -> electric blue -> cyan -> near-white
    const stops = [
        [0.0, 24, 32, 80],
        [0.4, 62, 100, 220],
        [0.75, 110, 200, 255],
        [1.0, 235, 250, 255],
    ];
    const lut = new Uint8Array(256 * 3);
    for (let i = 0; i < 256; i++) {
        const t = i / 255;
        let a = stops[0], b = stops[stops.length - 1];
        for (let s = 0; s < stops.length - 1; s++) {
            if (t >= stops[s][0] && t <= stops[s + 1][0]) { a = stops[s]; b = stops[s + 1]; break; }
        }
        const f = (t - a[0]) / Math.max(1e-6, b[0] - a[0]);
        for (let c = 0; c < 3; c++) lut[i * 3 + c] = Math.round(a[c + 1] + (b[c + 1] - a[c + 1]) * f);
    }
    return lut;
}

function allocField() {
    cell = Math.max(7, Math.min(14, W / 130));
    fw = Math.ceil(W / cell);
    fh = Math.ceil(H / cell);
    fBx = new Float32Array(fw * fh);
    fBy = new Float32Array(fw * fh);
    fCanvas = document.createElement('canvas');
    fCanvas.width = fw;
    fCanvas.height = fh;
    fCtx = fCanvas.getContext('2d');
    fImg = fCtx.createImageData(fw, fh);
}

function computeField() {
    // uniform external field as the baseline (dipole-field units: torque units / K)
    fBx.fill((extB / K) * Math.cos(extAngle));
    fBy.fill((extB / K) * Math.sin(extAngle));
    const Rpx = FIELD_R * scale;
    const R2 = FIELD_R * FIELD_R;
    for (let d = 0; d < n; d++) {
        const sx = offX + px[d] * scale, sy = offY + py[d] * scale;
        const mx = Math.cos(theta[d]), my = Math.sin(theta[d]);
        const gx0 = Math.max(0, ((sx - Rpx) / cell) | 0);
        const gx1 = Math.min(fw - 1, ((sx + Rpx) / cell) | 0);
        const gy0 = Math.max(0, ((sy - Rpx) / cell) | 0);
        const gy1 = Math.min(fh - 1, ((sy + Rpx) / cell) | 0);
        for (let gy = gy0; gy <= gy1; gy++) {
            const dy = ((gy + 0.5) * cell - sy) / scale;
            let idx = gy * fw + gx0;
            for (let gx = gx0; gx <= gx1; gx++, idx++) {
                const dx = ((gx + 0.5) * cell - sx) / scale;
                const r2 = dx * dx + dy * dy;
                if (r2 > R2) continue;
                const rs = r2 + SOFT2;
                const inv = 1 / (rs * Math.sqrt(rs));
                const t = 3 * (mx * dx + my * dy) / rs;
                fBx[idx] += (t * dx - mx) * inv;
                fBy[idx] += (t * dy - my) * inv;
            }
        }
    }

    const data = fImg.data;
    const total = fw * fh;
    for (let i = 0; i < total; i++) {
        const bx = fBx[i], by = fBy[i];
        const m = Math.sqrt(bx * bx + by * by);
        const o = i * 4;
        if (m < 1e-4) { data[o + 3] = 0; continue; }
        const v = m / (m + 1.6);
        const idx = (v * 255) | 0;
        data[o] = magLUT[idx * 3];
        data[o + 1] = magLUT[idx * 3 + 1];
        data[o + 2] = magLUT[idx * 3 + 2];
        data[o + 3] = (v * 170) | 0;
    }
    fCtx.putImageData(fImg, 0, 0);
}

function fieldNeeded() {
    return colormapChk.checked || overlaySel.value !== 'off';
}

function drawFieldArrows() {
    const d = parseInt(densityInput.value, 10);
    const step = cell * (8 - d) * 0.5; // density 1..5 -> sparse..dense
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 1;
    ctx.lineCap = 'round';
    for (let ay = step / 2; ay < H; ay += step) {
        const gy = Math.min(fh - 1, (ay / cell) | 0);
        for (let ax = step / 2; ax < W; ax += step) {
            const gx = Math.min(fw - 1, (ax / cell) | 0);
            const i = gy * fw + gx;
            const bx = fBx[i], by = fBy[i];
            const m = Math.sqrt(bx * bx + by * by);
            if (m < 0.02) continue;
            const v = m / (m + 1.2);
            const len = step * 0.95 * v; // arrow length ~ field strength
            if (len < 2.5) continue;
            const ux = bx / m, uy = by / m;
            const hx = ax + ux * len / 2, hy = ay + uy * len / 2;
            ctx.globalAlpha = 0.2 + v * 0.55;
            ctx.beginPath();
            ctx.moveTo(ax - ux * len / 2, ay - uy * len / 2);
            ctx.lineTo(hx, hy);
            ctx.moveTo(hx - (ux * 0.35 - uy * 0.28) * len, hy - (uy * 0.35 + ux * 0.28) * len);
            ctx.lineTo(hx, hy);
            ctx.lineTo(hx - (ux * 0.35 + uy * 0.28) * len, hy - (uy * 0.35 - ux * 0.28) * len);
            ctx.stroke();
        }
    }
    ctx.globalAlpha = 1;
}

// ---------- field lines ----------
let occ = null; // field-grid cells occupied by a rod (line tracing stops here)

function buildOccupancy() {
    if (!fw || !n) { occ = null; return; }
    occ = new Uint8Array(fw * fh);
    const r = scale * 0.33;
    for (let i = 0; i < n; i++) {
        const sx = offX + px[i] * scale, sy = offY + py[i] * scale;
        const gx0 = Math.max(0, ((sx - r) / cell) | 0), gx1 = Math.min(fw - 1, ((sx + r) / cell) | 0);
        const gy0 = Math.max(0, ((sy - r) / cell) | 0), gy1 = Math.min(fh - 1, ((sy + r) / cell) | 0);
        for (let gy = gy0; gy <= gy1; gy++)
            for (let gx = gx0; gx <= gx1; gx++) occ[gy * fw + gx] = 1;
    }
}

const _B = new Float32Array(2);

function sampleB(x, y) {
    const gx = x / cell - 0.5, gy = y / cell - 0.5;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    if (x0 < 0 || y0 < 0 || x0 >= fw - 1 || y0 >= fh - 1) { _B[0] = 0; _B[1] = 0; return; }
    const tx = gx - x0, ty = gy - y0;
    const i00 = y0 * fw + x0, i01 = i00 + fw;
    const a = (1 - tx) * (1 - ty), b = tx * (1 - ty), c = (1 - tx) * ty, e = tx * ty;
    _B[0] = fBx[i00] * a + fBx[i00 + 1] * b + fBx[i01] * c + fBx[i01 + 1] * e;
    _B[1] = fBy[i00] * a + fBy[i00 + 1] * b + fBy[i01] * c + fBy[i01 + 1] * e;
}

function traceLine(x, y, dir, h, maxSteps) {
    ctx.moveTo(x, y);
    for (let s = 0; s < maxSteps; s++) {
        sampleB(x, y);
        let m = Math.hypot(_B[0], _B[1]);
        if (m < 0.015) break;
        // midpoint (RK2) step along the normalized field
        const mx = x + (_B[0] / m) * dir * h * 0.5;
        const my = y + (_B[1] / m) * dir * h * 0.5;
        sampleB(mx, my);
        m = Math.hypot(_B[0], _B[1]);
        if (m < 0.015) break;
        x += (_B[0] / m) * dir * h;
        y += (_B[1] / m) * dir * h;
        if (x < 0 || y < 0 || x > W || y > H) break;
        ctx.lineTo(x, y);
        if (s > 3 && occ[((y / cell) | 0) * fw + ((x / cell) | 0)]) break;
    }
}

function drawFieldLines() {
    if (!occ) return;
    const d = parseInt(densityInput.value, 10);
    let per = Math.max(1, Math.round(d * 0.8)); // lines per pole
    if (n > 260) per = Math.min(per, 2);
    const h = Math.max(3, cell * 0.6);
    const maxSteps = 400;
    ctx.strokeStyle = 'rgba(185, 212, 255, 1)';
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
        const x = offX + px[i] * scale, y = offY + py[i] * scale;
        for (let s = 0; s < per; s++) {
            const fan = per > 1 ? (s / (per - 1) - 0.5) * 1.9 : 0;
            // dir +1: outward from the north tip; dir -1: backward into the south tip
            for (let dir = -1; dir <= 1; dir += 2) {
                const a = theta[i] + (dir > 0 ? 0 : Math.PI) + fan;
                traceLine(x + Math.cos(a) * scale * 0.42, y + Math.sin(a) * scale * 0.42, dir, h, maxSteps);
            }
        }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// ---------- rod sprite ----------
function buildSprite() {
    const L = Math.max(11, scale * 0.62);
    const T = Math.max(4, scale * 0.17);
    const pad = Math.ceil(T * 0.9);
    rodW = Math.ceil(L + pad * 2);
    rodH = Math.ceil(T + pad * 2);
    const ss = Math.min(3, dpr * 1.5);
    const c = document.createElement('canvas');
    c.width = Math.ceil(rodW * ss);
    c.height = Math.ceil(rodH * ss);
    const g = c.getContext('2d');
    g.scale(ss, ss);

    const x0 = pad, y0 = pad, r = T / 2, cx = pad + L / 2, cy = pad + T / 2;

    // pole glows
    let gl = g.createRadialGradient(x0 + L - r, cy, 0, x0 + L - r, cy, pad + r);
    gl.addColorStop(0, 'rgba(255,90,110,0.55)');
    gl.addColorStop(1, 'rgba(255,90,110,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, rodW, rodH);
    gl = g.createRadialGradient(x0 + r, cy, 0, x0 + r, cy, pad + r);
    gl.addColorStop(0, 'rgba(90,140,255,0.5)');
    gl.addColorStop(1, 'rgba(90,140,255,0)');
    g.fillStyle = gl;
    g.fillRect(0, 0, rodW, rodH);

    // rod body: south (blue) tail, north (red) head
    const body = g.createLinearGradient(x0, 0, x0 + L, 0);
    body.addColorStop(0, '#3f6fe0');
    body.addColorStop(0.48, '#4d7dff');
    body.addColorStop(0.5, '#ff5a6e');
    body.addColorStop(1, '#e03f52');
    g.beginPath();
    g.roundRect(x0, y0, L, T, r);
    g.fillStyle = body;
    g.fill();

    // gloss highlight
    const gloss = g.createLinearGradient(0, y0, 0, y0 + T);
    gloss.addColorStop(0, 'rgba(255,255,255,0.45)');
    gloss.addColorStop(0.45, 'rgba(255,255,255,0.05)');
    gloss.addColorStop(1, 'rgba(0,0,0,0.25)');
    g.beginPath();
    g.roundRect(x0, y0, L, T, r);
    g.fillStyle = gloss;
    g.fill();

    // center seam + pivot
    g.fillStyle = 'rgba(10,12,20,0.55)';
    g.fillRect(cx - Math.max(0.6, T * 0.05), y0, Math.max(1.2, T * 0.1), T);
    g.beginPath();
    g.arc(cx, cy, Math.max(1, T * 0.14), 0, TAU);
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.fill();

    rodSprite = c;
}

// ---------- rendering ----------
function draw() {
    ctx.clearRect(0, 0, W, H);

    if (colormapChk.checked && fCanvas) ctx.drawImage(fCanvas, 0, 0, W, H);
    if (overlaySel.value === 'arrows') drawFieldArrows();
    else if (overlaySel.value === 'lines') drawFieldLines();

    // faint lattice bonds
    if (bonds.length) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let b = 0; b < bonds.length; b += 2) {
            const i = bonds[b], j = bonds[b + 1];
            ctx.moveTo(offX + px[i] * scale, offY + py[i] * scale);
            ctx.lineTo(offX + px[j] * scale, offY + py[j] * scale);
        }
        ctx.stroke();
    }

    // magnets
    const hw = rodW / 2, hh = rodH / 2;
    for (let i = 0; i < n; i++) {
        const x = offX + px[i] * scale, y = offY + py[i] * scale;
        const cos = Math.cos(theta[i]), sin = Math.sin(theta[i]);
        ctx.setTransform(dpr * cos, dpr * sin, -dpr * sin, dpr * cos, dpr * x, dpr * y);
        ctx.drawImage(rodSprite, -hw, -hh, rodW, rodH);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawGauges();
}

// ---------- compass gauges (external field + net magnetization) ----------
function drawGauges() {
    let mx = 0, my = 0;
    for (let i = 0; i < n; i++) { mx += Math.cos(theta[i]); my += Math.sin(theta[i]); }
    mx /= n; my /= n;
    const Mmag = Math.hypot(mx, my);
    const r = W < 520 ? 22 : 30;
    const cy = H - r - 26;
    drawDial(24 + r, cy, r, extAngle, Math.min(1, extB / 20), extB > 1e-6,
        'external field B', extB.toFixed(1));
    drawDial(24 + r + (W < 520 ? 130 : 156), cy, r, Math.atan2(my, mx), Mmag, Mmag > 0.02,
        'magnetization |M|', Mmag.toFixed(2));
}

function drawDial(cx, cy, r, ang, frac, active, label, valueText) {
    // glass disc
    const g = ctx.createRadialGradient(cx, cy - r * 0.5, r * 0.15, cx, cy, r);
    g.addColorStop(0, 'rgba(48, 54, 76, 0.9)');
    g.addColorStop(1, 'rgba(14, 16, 26, 0.88)');
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fillStyle = g;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // cardinal ticks, north emphasized
    ctx.lineCap = 'round';
    for (let k = 0; k < 8; k++) {
        const a = k * Math.PI / 4 - Math.PI / 2;
        const major = k % 2 === 0;
        const t0 = major ? r - 6 : r - 4;
        ctx.strokeStyle = k === 0 ? 'rgba(255,255,255,0.75)' : `rgba(255,255,255,${major ? 0.35 : 0.18})`;
        ctx.lineWidth = k === 0 ? 2 : 1;
        ctx.beginPath();
        ctx.moveTo(cx + Math.cos(a) * t0, cy + Math.sin(a) * t0);
        ctx.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2));
        ctx.stroke();
    }

    if (active) {
        // two-tone needle matching the rods: blue tail, red head = north pole
        const len = r * (0.32 + 0.56 * Math.min(1, frac));
        const ux = Math.cos(ang), uy = Math.sin(ang);
        const hx = cx + ux * len, hy = cy + uy * len;
        ctx.lineWidth = 3.5;
        ctx.strokeStyle = '#4d7dff';
        ctx.beginPath();
        ctx.moveTo(cx - ux * len, cy - uy * len);
        ctx.lineTo(cx, cy);
        ctx.stroke();
        ctx.strokeStyle = '#ff5a6e';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(hx, hy);
        ctx.moveTo(hx - (ux * 0.38 - uy * 0.3) * len, hy - (uy * 0.38 + ux * 0.3) * len);
        ctx.lineTo(hx, hy);
        ctx.lineTo(hx - (ux * 0.38 + uy * 0.3) * len, hy - (uy * 0.38 - ux * 0.3) * len);
        ctx.stroke();
    }
    // pivot
    ctx.beginPath();
    ctx.arc(cx, cy, 2.2, 0, TAU);
    ctx.fillStyle = active ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.35)';
    ctx.fill();

    // label + value beside the dial
    ctx.textAlign = 'left';
    ctx.font = '11px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fillText(label, cx + r + 10, cy - 5);
    ctx.font = '600 16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillText(valueText, cx + r + 10, cy + 14);
}

// ---------- main loop ----------
function tick() {
    frame++;
    if (!asleep) {
        step();
        // on big lattices refresh the field grid every other frame
        if (fieldNeeded() && (n <= 300 || frame % 2 === 0 || stillFrames > SLEEP_FRAMES - 2)) computeField();
        draw();
        if (frame % 15 === 0) energyEl.textContent = (totalEnergy() / n).toFixed(3);
    }
    requestAnimationFrame(tick);
}

// ---------- events ----------
function resize() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    allocField();
    if (n) fit();
    wake();
}

canvas.addEventListener('pointerdown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    let best = -1, bestD = Math.max(24, scale * 0.75);
    for (let i = 0; i < n; i++) {
        const dx = offX + px[i] * scale - mx;
        const dy = offY + py[i] * scale - my;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < bestD) { bestD = d; best = i; }
    }
    if (best >= 0) kickOne(best);
});

shapeSel.addEventListener('change', rebuild);
sizeInput.addEventListener('input', rebuild);
frictionInput.addEventListener('input', () => {
    gamma = parseFloat(frictionInput.value);
    frictionLabel.textContent = gamma.toFixed(2);
    wake();
});
function updateExtField() {
    const deg = parseInt(extDirInput.value, 10);
    extAngle = (deg - 90) * Math.PI / 180; // compass: 0 = north (up), 90 = east
    extB = parseFloat(extIntInput.value);
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    extDirLabel.textContent = `${dirs[Math.round(deg / 45) % 8]} (${deg}°)`;
    extIntLabel.textContent = extB.toFixed(1);
    wake();
}
extDirInput.addEventListener('input', updateExtField);
extIntInput.addEventListener('input', updateExtField);
overlaySel.addEventListener('change', wake);
colormapChk.addEventListener('change', wake);
densityInput.addEventListener('input', () => {
    densityLabel.textContent = densityInput.value;
    wake();
});
randomizeBtn.addEventListener('click', randomizeAll);
panelToggle.addEventListener('click', () => {
    panel.classList.toggle('open');
    if (n) fit();
    wake();
});
window.addEventListener('resize', resize);

// ---------- go ----------
resize();
rebuild();
requestAnimationFrame(tick);
