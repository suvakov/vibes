/* ===========================================================================
   Three-Body Orbits on the Shape Sphere
   ---------------------------------------------------------------------------
   Newtonian planar three-body problem, equal masses, G = 1, zero angular
   momentum. Orbits from Suvakov & Dmitrasinovic, PRL 110, 114301 (2013),
   arXiv:1303.0181, plus the Chenciner-Montgomery figure eight and the
   Lagrange relative equilibrium.

   Three views of the same motion:
     - real space,
     - the shape sphere in 3D,
     - the shape sphere in Mercator projection,
   together with the orbit's topological class as a word in the free group
   on two generators.
   =========================================================================== */

'use strict';

/* ---------------------------------------------------------------------------
   1. Orbit catalogue

   For the catalogue orbits the initial configuration is always
       x1 = (-1, 0),  x2 = (1, 0),  x3 = (0, 0)
       v1 = v2 = (vx, vy),  v3 = (-2 vx, -2 vy)
   which has zero total momentum and zero angular momentum. `vx`, `vy` and `T`
   were Newton-refined from the published five-digit values so that the orbit
   closes to near machine precision; `paperWord` is the word printed in the
   paper, kept for comparison.
   --------------------------------------------------------------------------- */

function catalogueState(vx, vy) {
    return [-1, 0, 1, 0, 0, 0, vx, vy, vx, vy, -2 * vx, -2 * vy];
}

const ORBITS = [
    // ---- class I.A: the "butterfly / bumblebee" family -------------------
    {
        name: 'Butterfly I', group: 'I.A', vx: 0.3068934204794257, vy: 0.12550656701246837, T: 6.23467483887789,
        paperWord: '(ab)²(AB)²', word: 'ababABAB'
    },
    {
        name: 'Butterfly II', group: 'I.A', vx: 0.39295549370976385, vy: 0.09757896841841913, T: 7.003709600821609,
        paperWord: '(ab)²(AB)²', word: 'ababABAB'
    },
    {
        name: 'Bumblebee', group: 'I.A', vx: 0.18427849915147204, vy: 0.5871881721935769, T: 63.53435334104794,
        paperWord: 'b²(ABab)²A²(baBA)²ba · B²(abAB)²a²(BAba)²BA',
        word: 'bbABabABabAAbaBAbaBAba' + 'BBabABabABaaBAbaBAbaBA'
    },

    // ---- class I.B: the "moth / goggles / dragonfly" family --------------
    {
        name: 'Moth I', group: 'I.B', vx: 0.4644451728179236, vy: 0.39606001465294155, T: 14.894305175063172,
        paperWord: 'ba(BAB)ab(ABA)', word: 'baBABabABA'
    },
    {
        name: 'Moth II', group: 'I.B', vx: 0.43916591788769127, vy: 0.4529676431912693, T: 28.66927091507059,
        paperWord: '(abAB)²A(baBA)²B', word: 'abABabABAbaBAbaBAB'
    },
    {
        name: 'Butterfly III', group: 'I.B', vx: 0.40591556713648946, vy: 0.23016312598020125, T: 13.867123435932019,
        paperWord: '(ab)²(ABA)(ba)²(BAB)', word: 'ababABAbabaBAB'
    },
    {
        name: 'Moth III', group: 'I.B', vx: 0.38344351995255177, vy: 0.37736369488751903, T: 25.839236356858734,
        paperWord: '(babABA)²a(abaBAB)²b',
        word: 'babABAbabABAaabaBABabaBABb'
    },
    {
        name: 'Goggles', group: 'I.B', vx: 0.08330007185032495, vy: 0.12788925551925429, T: 10.46484952599965,
        paperWord: '(ab)²ABBA(ba)²BAAB', word: 'ababABBAbabaBAAB'
    },
    {
        name: 'Butterfly IV', group: 'I.B', unstable: true, vx: 0.3501162281921652, vy: 0.07933878562780956, T: 79.47538595206787,
        paperWord: '((ab)²(AB)²)⁶A((ba)²(BA)²)⁶B',
        word: 'ababABAB'.repeat(6) + 'A' + 'babaBABA'.repeat(6) + 'B'
    },
    {
        name: 'Dragonfly', group: 'I.B', vx: 0.08058422554019468, vy: 0.5888360897777283, T: 21.272337394861598,
        paperWord: 'b²(ABabAB)a²(BAbaBA)', word: 'bbABabABaaBAbaBA'
    },

    // ---- class II: yarn and yin-yang -------------------------------------
    {
        name: 'Yarn', group: 'II.B', vx: 0.5590642544910771, vy: 0.3491915648327977, T: 55.50242338925931,
        paperWord: '(babABabaBA)³', word: 'babABabaBA'.repeat(3)
    },
    {
        name: 'Yin-yang I a', group: 'II.C', vx: 0.5139385374619998, vy: 0.3047359193468447, T: 17.328834018819798,
        paperWord: '(ab)²(ABA)ba(BAB)', word: 'ababABAbaBAB'
    },
    {
        name: 'Yin-yang I b', group: 'II.C', vx: 0.28270209043970485, vy: 0.32720897152299566, T: 10.963303088210656,
        paperWord: '(ab)²(ABA)ba(BAB)', word: 'ababABAbaBAB'
    },
    {
        name: 'Yin-yang II a', group: 'II.C', unstable: true, vx: 0.41682327729889324, vy: 0.3303330619882933, T: 55.789451405899904,
        paperWord: '(abaBAB)³(abaBAbab)(ABAbab)³(AB)²',
        word: 'abaBAB'.repeat(3) + 'abaBAbab' + 'ABAbab'.repeat(3) + 'ABAB'
    },
    {
        name: 'Yin-yang II b', group: 'II.C', unstable: true, vx: 0.417340597571703, vy: 0.3130997719548036, T: 54.20769445089597,
        paperWord: '(abaBAB)³(abaBAbab)(ABAbab)³(AB)²',
        word: 'abaBAB'.repeat(3) + 'abaBAbab' + 'ABAbab'.repeat(3) + 'ABAB'
    }
];

// Two classics outside the catalogue, with their own initial conditions.
const EXTRA_ORBITS = [
    {
        name: 'Figure eight', group: 'classic',
        state: [0.97000436, -0.24308753, -0.97000436, 0.24308753, 0, 0,
            0.466203685, 0.43236573, 0.466203685, 0.43236573,
            -0.93240737, -0.86473146],
        T: 6.32591398292621,
        paperWord: 'abAB', word: 'abAB',
        note: 'Chenciner–Montgomery (2000). The one orbit everybody knows.'
    },
    {
        name: 'Lagrange (rotating triangle)', group: 'classic',
        state: (function () {
            // Equilateral triangle of circumradius 1 in rigid circular rotation.
            const v = Math.pow(3, -0.25);
            const p = [], q = [];
            for (let k = 0; k < 3; k++) {
                const th = Math.PI / 2 + k * 2 * Math.PI / 3;
                p.push(Math.cos(th), Math.sin(th));
                q.push(-v * Math.sin(th), v * Math.cos(th));
            }
            return p.concat(q);
        })(),
        T: 2 * Math.PI * Math.pow(3, 0.25),
        paperWord: '0', word: '',
        note: 'The shape never changes — the curve is a single point at the ' +
            'north pole, and the word is empty.'
    }
];

for (const o of ORBITS) if (!o.state) o.state = catalogueState(o.vx, o.vy);

const ALL_ORBITS = ORBITS.concat(EXTRA_ORBITS);

/* ---------------------------------------------------------------------------
   2. Dynamics: Newtonian gravity, equal unit masses, G = 1.
   State layout: [x1,y1, x2,y2, x3,y3, vx1,vy1, vx2,vy2, vx3,vy3]
   --------------------------------------------------------------------------- */

function deriv(y, out) {
    out[0] = y[6]; out[1] = y[7];
    out[2] = y[8]; out[3] = y[9];
    out[4] = y[10]; out[5] = y[11];
    out[6] = 0; out[7] = 0; out[8] = 0; out[9] = 0; out[10] = 0; out[11] = 0;
    for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
            const dx = y[2 * j] - y[2 * i];
            const dy = y[2 * j + 1] - y[2 * i + 1];
            const r2 = dx * dx + dy * dy;
            const inv = 1 / (r2 * Math.sqrt(r2));
            const fx = dx * inv, fy = dy * inv;
            out[6 + 2 * i] += fx; out[7 + 2 * i] += fy;
            out[6 + 2 * j] -= fx; out[7 + 2 * j] -= fy;
        }
    }
}

function energy(y) {
    let T = 0;
    for (let i = 0; i < 3; i++) T += 0.5 * (y[6 + 2 * i] * y[6 + 2 * i] + y[7 + 2 * i] * y[7 + 2 * i]);
    let U = 0;
    for (let i = 0; i < 3; i++) {
        for (let j = i + 1; j < 3; j++) {
            const dx = y[2 * j] - y[2 * i], dy = y[2 * j + 1] - y[2 * i + 1];
            U -= 1 / Math.hypot(dx, dy);
        }
    }
    return T + U;
}

/* --- Dormand-Prince 5(4), adaptive, autonomous ---------------------------- */

const DP = {
    a21: 1 / 5,
    a31: 3 / 40, a32: 9 / 40,
    a41: 44 / 45, a42: -56 / 15, a43: 32 / 9,
    a51: 19372 / 6561, a52: -25360 / 2187, a53: 64448 / 6561, a54: -212 / 729,
    a61: 9017 / 3168, a62: -355 / 33, a63: 46732 / 5247, a64: 49 / 176, a65: -5103 / 18656,
    b1: 35 / 384, b3: 500 / 1113, b4: 125 / 192, b5: -2187 / 6784, b6: 11 / 84,
    // b - bhat, for the embedded error estimate
    e1: 35 / 384 - 5179 / 57600, e3: 500 / 1113 - 7571 / 16695,
    e4: 125 / 192 - 393 / 640, e5: -2187 / 6784 + 92097 / 339200,
    e6: 11 / 84 - 187 / 2100, e7: -1 / 40
};

const N_DIM = 12;

function makeIntegrator() {
    const k1 = new Float64Array(N_DIM), k2 = new Float64Array(N_DIM),
        k3 = new Float64Array(N_DIM), k4 = new Float64Array(N_DIM),
        k5 = new Float64Array(N_DIM), k6 = new Float64Array(N_DIM),
        k7 = new Float64Array(N_DIM), tmp = new Float64Array(N_DIM),
        yNew = new Float64Array(N_DIM);

    /* One trial step of size h from y (k1 must already hold deriv(y)).
       Writes the 5th-order result into yNew, the new derivative into k7,
       and returns the scaled error norm. */
    function trial(y, h, rtol, atol) {
        const d = DP;
        for (let i = 0; i < N_DIM; i++) tmp[i] = y[i] + h * d.a21 * k1[i];
        deriv(tmp, k2);
        for (let i = 0; i < N_DIM; i++) tmp[i] = y[i] + h * (d.a31 * k1[i] + d.a32 * k2[i]);
        deriv(tmp, k3);
        for (let i = 0; i < N_DIM; i++) tmp[i] = y[i] + h * (d.a41 * k1[i] + d.a42 * k2[i] + d.a43 * k3[i]);
        deriv(tmp, k4);
        for (let i = 0; i < N_DIM; i++) tmp[i] = y[i] + h * (d.a51 * k1[i] + d.a52 * k2[i] + d.a53 * k3[i] + d.a54 * k4[i]);
        deriv(tmp, k5);
        for (let i = 0; i < N_DIM; i++) tmp[i] = y[i] + h * (d.a61 * k1[i] + d.a62 * k2[i] + d.a63 * k3[i] + d.a64 * k4[i] + d.a65 * k5[i]);
        deriv(tmp, k6);
        for (let i = 0; i < N_DIM; i++) {
            yNew[i] = y[i] + h * (d.b1 * k1[i] + d.b3 * k3[i] + d.b4 * k4[i] + d.b5 * k5[i] + d.b6 * k6[i]);
        }
        deriv(yNew, k7);  // FSAL
        let err = 0;
        for (let i = 0; i < N_DIM; i++) {
            const e = h * (d.e1 * k1[i] + d.e3 * k3[i] + d.e4 * k4[i] + d.e5 * k5[i] + d.e6 * k6[i] + d.e7 * k7[i]);
            const sc = atol + rtol * Math.max(Math.abs(y[i]), Math.abs(yNew[i]));
            const r = e / sc;
            err += r * r;
        }
        return Math.sqrt(err / N_DIM);
    }

    /* Integrate y0 over [0, T], writing the state at the N+1 grid times
       t_k = k T / N into `out` (row-major, N_DIM per row). */
    return function integrateToGrid(y0, T, N, rtol, atol) {
        rtol = rtol || 1e-12; atol = atol || 1e-13;
        const out = new Float64Array((N + 1) * N_DIM);
        const y = Float64Array.from(y0);
        out.set(y, 0);
        deriv(y, k1);

        const dtGrid = T / N;
        let h = dtGrid * 0.25, t = 0, nsteps = 0;
        const hMin = T * 1e-13;

        for (let k = 1; k <= N; k++) {
            const tTarget = k * dtGrid;
            while (t < tTarget - 1e-14 * T) {
                const remaining = tTarget - t;
                const clipped = h > remaining;
                const hh = clipped ? remaining : h;
                const err = trial(y, hh, rtol, atol);
                if (err <= 1 || hh <= hMin) {
                    t += hh;
                    y.set(yNew);
                    k1.set(k7);
                    nsteps++;
                    if (!clipped) {
                        const fac = err === 0 ? 5 : 0.9 * Math.pow(err, -0.2);
                        h = hh * Math.min(5, Math.max(0.2, fac));
                    }
                } else {
                    h = hh * Math.max(0.1, 0.9 * Math.pow(err, -0.2));
                    if (h < hMin) h = hMin;
                }
            }
            out.set(y, k * N_DIM);
        }
        return { samples: out, steps: nsteps };
    };
}

const integrateToGrid = makeIntegrator();

/* ---------------------------------------------------------------------------
   3. Shape-sphere kinematics
   --------------------------------------------------------------------------- */

const SQRT2 = Math.SQRT2, SQRT6 = Math.sqrt(6);
const TWO_PI = 2 * Math.PI;

/* The Hopf map: three planar positions -> a unit vector on the shape sphere.
       rho = (x1 - x2)/sqrt(2),  lam = (x1 + x2 - 2 x3)/sqrt(6)
       n = ( |lam|^2 - |rho|^2 , -2 rho.lam , 2 rho^lam ) / (|rho|^2 + |lam|^2)
   The result has unit length automatically; no normalisation is applied. */
function hopf(s, off, out) {
    off = off || 0;
    const rx = (s[off] - s[off + 2]) / SQRT2, ry = (s[off + 1] - s[off + 3]) / SQRT2;
    const lx = (s[off] + s[off + 2] - 2 * s[off + 4]) / SQRT6;
    const ly = (s[off + 1] + s[off + 3] - 2 * s[off + 5]) / SQRT6;
    const rr = rx * rx + ry * ry, ll = lx * lx + ly * ly;
    const R2 = rr + ll;
    out[0] = (ll - rr) / R2;
    out[1] = -2 * (rx * lx + ry * ly) / R2;
    out[2] = 2 * (rx * ly - ry * lx) / R2;
    return out;
}

/* Signed area of the triangle: vanishes exactly at a syzygy, and carries the
   same sign as n_z. Three subtractions and two multiplications. */
function signedArea(s, off) {
    off = off || 0;
    return (s[off + 2] - s[off]) * (s[off + 5] - s[off + 1])
        - (s[off + 3] - s[off + 1]) * (s[off + 4] - s[off]);
}

// Collision directions on the equator: r12 = 0, r13 = 0, r23 = 0.
const COLLISIONS = [
    { lon: 0, n: [1, 0, 0], label: '1=2' },
    { lon: TWO_PI / 3, n: [-0.5, Math.sqrt(3) / 2, 0], label: '1=3' },
    { lon: 2 * TWO_PI / 3, n: [-0.5, -Math.sqrt(3) / 2, 0], label: '2=3' }
];

/* At size I = 1 the identity 1 - n.c_k = r_k^2 holds exactly, so this is the
   closest pair separation in units of the overall size. */
function minCollisionDistance(n) {
    let m = Infinity;
    for (const c of COLLISIONS) {
        const d = 1 - (n[0] * c.n[0] + n[1] * c.n[1] + n[2] * c.n[2]);
        if (d < m) m = d;
    }
    return Math.sqrt(Math.max(0, m));
}

/* The letter rule. Lower case = descending (north to south). */
function letterAt(lon, descending) {
    if (lon > 0 && lon < TWO_PI / 3) return descending ? 'a' : 'A';
    if (lon > 2 * TWO_PI / 3 && lon < TWO_PI) return descending ? 'b' : 'B';
    return '';
}

/* ---------------------------------------------------------------------------
   4. Word algebra in the free group on {a, b}
   --------------------------------------------------------------------------- */

const RANK = { a: 0, A: 1, b: 2, B: 3 };

function swapCase(c) { return c === c.toLowerCase() ? c.toUpperCase() : c.toLowerCase(); }
function swapCaseWord(w) { let s = ''; for (const c of w) s += swapCase(c); return s; }
function reverseWord(w) { return w.split('').reverse().join(''); }

// Traverse the loop backwards: reverse the order and invert each letter.
function inverseWord(w) { return swapCaseWord(reverseWord(w)); }
// Planar mirror reflection: invert each letter in place. Sends L -> -L.
function kappa(w) { return swapCaseWord(w); }

function freeReduce(w) {
    const st = [];
    for (const c of w) {
        if (st.length && st[st.length - 1] === swapCase(c)) st.pop();
        else st.push(c);
    }
    return st.join('');
}

function wordLess(x, y) {
    if (x.length !== y.length) return x.length < y.length;
    for (let i = 0; i < x.length; i++) {
        if (x[i] !== y[i]) return RANK[x[i]] < RANK[y[i]];
    }
    return false;
}

function minWord(list) {
    let best = list[0];
    for (let i = 1; i < list.length; i++) if (wordLess(list[i], best)) best = list[i];
    return best;
}

/* Free reduction, then cyclic reduction, then the least rotation. */
function cyclicNormal(w) {
    w = freeReduce(w);
    while (w.length > 1 && w[0] === swapCase(w[w.length - 1])) w = w.slice(1, -1);
    if (!w) return '';
    const rots = [];
    for (let i = 0; i < w.length; i++) rots.push(w.slice(i) + w.slice(0, i));
    return minWord(rots);
}

// Images of (a, b) under the six particle permutations, as outer automorphisms.
const PERMUTATIONS = [
    ['a', 'b'], ['B', 'aB'], ['bA', 'A'], ['B', 'A'], ['a', 'Ba'], ['Ab', 'b']
];

function substitute(w, ia, ib) {
    const image = { a: ia, A: inverseWord(ia), b: ib, B: inverseWord(ib) };
    let s = '';
    for (const c of w) s += image[c];
    return freeReduce(s);
}

/* policy 'labeled' quotients by cyclic conjugacy only; 'fixed_L' adds the six
   particle permutations and traversal reversal; 'all' adds the mirror. */
function canonical(w, policy) {
    w = cyclicNormal(w);
    if (policy === 'labeled') return w;
    let variants;
    if (policy === 'fixed_L') variants = [w, reverseWord(w)];
    else variants = [w, inverseWord(w), kappa(w), reverseWord(w)];
    const out = [];
    for (const v of variants) {
        for (const [ia, ib] of PERMUTATIONS) out.push(cyclicNormal(substitute(v, ia, ib)));
    }
    return minWord(out);
}

/* (primitive root, exponent). A q-fold cover gives exponent q. */
function powerRoot(w) {
    w = cyclicNormal(w);
    if (!w) return ['', 1];
    for (let k = 1; k <= w.length; k++) {
        if (w.length % k === 0 && w.slice(0, k).repeat(w.length / k) === w) {
            return [w.slice(0, k), w.length / k];
        }
    }
    return [w, 1];
}

/* ---------------------------------------------------------------------------
   5. Building one orbit: integrate, map to the sphere, read the word
   --------------------------------------------------------------------------- */

/* Cubic Hermite interpolation of the three positions between grid samples
   k and k+1. Velocities are stored in the same rows, so this is O(h^4)
   accurate and costs nothing extra. */
function hermitePos(S, k, h, s, out) {
    const o0 = k * N_DIM, o1 = o0 + N_DIM;
    const s2 = s * s, s3 = s2 * s;
    const h00 = 2 * s3 - 3 * s2 + 1, h10 = s3 - 2 * s2 + s;
    const h01 = -2 * s3 + 3 * s2, h11 = s3 - s2;
    for (let i = 0; i < 6; i++) {
        out[i] = h00 * S[o0 + i] + h10 * h * S[o0 + 6 + i]
            + h01 * S[o1 + i] + h11 * h * S[o1 + 6 + i];
    }
}

function areaAtFrac(S, N, h, u, scratch) {
    let k = Math.floor(u);
    if (k >= N) k = N - 1;
    hermitePos(S, k, h, u - k, scratch);
    return signedArea(scratch, 0);
}

/* Find every equator crossing over one period and turn it into a letter.
   Follows the standard construction: sign changes of the signed area locate
   syzygies, the longitude decides the arc, the direction decides the case. */
function extractEvents(S, N, T) {
    const h = T / N;
    const A = new Float64Array(N + 1);
    let maxA = 0;
    for (let k = 0; k <= N; k++) {
        A[k] = signedArea(S, k * N_DIM);
        const a = Math.abs(A[k]);
        if (a > maxA) maxA = a;
    }
    const eps = 1e-9 * maxA;
    const pos = new Float64Array(6);
    const nv = [0, 0, 0];
    const events = [];

    function emit(u, descending) {
        let k = Math.floor(u);
        if (k >= N) k = N - 1;
        hermitePos(S, k, h, u - k, pos);
        hopf(pos, 0, nv);
        let lon = Math.atan2(nv[1], nv[0]);
        if (lon < 0) lon += TWO_PI;
        events.push({
            u: u, t: u * h, lon: lon, descending: descending,
            letter: letterAt(lon, descending),
            n: [nv[0], nv[1], nv[2]],
            rmin: minCollisionDistance(nv)
        });
    }

    // First sample that is genuinely off the equator.
    let k0 = 0;
    while (k0 <= N && Math.abs(A[k0]) <= eps) k0++;
    if (k0 > N) return { events: [], word: '' };   // never leaves the equator

    /* Starting exactly at a syzygy is the usual convention for these orbits,
       and the product test can never fire on it. Emit it by hand, taking the
       direction from the sign just after t = 0, and then refuse to emit the
       closing crossing at t = T, which is the very same crossing. */
    const startsOnEquator = k0 > 0;
    if (startsOnEquator) emit(0, A[k0] < 0);
    const uGuard = startsOnEquator ? N * (1 - 1e-6) : Infinity;

    let prevSign = A[k0] > 0 ? 1 : -1;
    let prevIdx = k0;

    for (let k = k0 + 1; k <= N; k++) {
        if (Math.abs(A[k]) <= eps) continue;
        const sgn = A[k] > 0 ? 1 : -1;
        if (sgn !== prevSign) {
            // Bisect on the Hermite interpolant to pin the crossing down.
            let lo = prevIdx, hi = k;
            const sLo = prevSign;
            for (let it = 0; it < 48; it++) {
                const mid = 0.5 * (lo + hi);
                const am = areaAtFrac(S, N, h, mid, pos);
                const sm = am > 0 ? 1 : (am < 0 ? -1 : 0);
                if (sm === 0) { lo = hi = mid; break; }
                if (sm === sLo) lo = mid; else hi = mid;
            }
            const u = 0.5 * (lo + hi);
            if (u < uGuard) emit(u, sgn < 0);
            prevSign = sgn;
        }
        prevIdx = k;
    }

    let word = '';
    for (const e of events) {
        e.wordIndex = e.letter ? word.length : -1;
        word += e.letter;
    }
    return { events: events, word: word };
}

/* Integrate one period, precompute everything the three views need. */
function buildOrbit(def) {
    const N = Math.min(60000, Math.max(16000, Math.round(1500 * def.T)));
    const t0 = performance.now();
    const res = integrateToGrid(def.state, def.T, N);
    const S = res.samples;

    // --- conserved quantities and how well the orbit closes ---------------
    const E0 = energy(def.state);
    let maxDE = 0;
    for (let k = 0; k <= N; k += Math.max(1, Math.floor(N / 400))) {
        const d = Math.abs(energy(S.subarray(k * N_DIM, k * N_DIM + N_DIM)) - E0);
        if (d > maxDE) maxDE = d;
    }
    let closure = 0;
    for (let i = 0; i < N_DIM; i++) closure = Math.hypot(closure, S[N * N_DIM + i] - def.state[i]);

    // --- shape sphere curve, real-space bounds, closest approach ----------
    const sphere = new Float32Array((N + 1) * 3);
    const nv = [0, 0, 0];
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    let rmin = Infinity;
    for (let k = 0; k <= N; k++) {
        const o = k * N_DIM;
        hopf(S, o, nv);
        sphere[3 * k] = nv[0]; sphere[3 * k + 1] = nv[1]; sphere[3 * k + 2] = nv[2];
        const d = minCollisionDistance(nv);
        if (d < rmin) rmin = d;
        for (let i = 0; i < 3; i++) {
            const x = S[o + 2 * i], y = S[o + 2 * i + 1];
            if (x < xmin) xmin = x; if (x > xmax) xmax = x;
            if (y < ymin) ymin = y; if (y > ymax) ymax = y;
        }
    }

    const ev = extractEvents(S, N, def.T);
    /* Section 14's four reductions, in order: free reduction, cyclic
       reduction, primitive root, then the symmetry policy. The root has to be
       taken BEFORE the policy — an orbit that covers a shorter shape curve q
       times spells w^q, and it is w that names its class. */
    const normal = cyclicNormal(ev.word);
    const root = powerRoot(normal)[0];

    return {
        def: def, N: N, T: def.T, samples: S, sphere: sphere,
        events: ev.events, rawWord: ev.word,
        normalWord: normal,
        // kept for the comparison against the published word, which is written
        // with a different choice of body labels; not displayed as a stage
        klass: canonical(root, 'all') || '0',
        energy: E0, energyDrift: maxDE, closure: closure,
        rminScaled: rmin,
        bounds: { xmin: xmin, xmax: xmax, ymin: ymin, ymax: ymax },
        buildMs: performance.now() - t0, steps: res.steps
    };
}

/* ---------------------------------------------------------------------------
   6. Shared view state
   --------------------------------------------------------------------------- */

const BODY_COLORS = ['#ff5f6d', '#ffd166', '#5ee7df'];
const ARC_A = '#7fe0ff', ARC_B = '#ffa94d', ARC_FREE = 'rgba(255,255,255,0.22)';
const LAT_CLIP = 85 * Math.PI / 180;
const MERC_MAX = Math.asinh(Math.tan(LAT_CLIP));

const view = {
    orbit: null,
    u: 0,              // playback position, a real number in [0, N)
    playing: true,
    speed: 1,
    trail: 0.35,
    showFullPath: true,
    showTriangle: true,
    showGraticule: true,
    spin: false
};

function mercY(nz) {
    const c = Math.max(-0.9999999, Math.min(0.9999999, nz));
    const lat = Math.asin(c);
    const cl = Math.max(-LAT_CLIP, Math.min(LAT_CLIP, lat));
    return Math.asinh(Math.tan(cl));
}

/* Position of the three bodies at fractional sample index u, wrapped. */
const stateScratch = new Float64Array(6);
function positionsAt(orbit, u) {
    const N = orbit.N;
    let uu = u % N;
    if (uu < 0) uu += N;
    const k = Math.min(N - 1, Math.floor(uu));
    hermitePos(orbit.samples, k, orbit.T / N, uu - k, stateScratch);
    return stateScratch;
}

function sphereAt(orbit, u) {
    const p = positionsAt(orbit, u);
    return hopf(p, 0, [0, 0, 0]);
}

/* ---------------------------------------------------------------------------
   7. Real-space view
   --------------------------------------------------------------------------- */

const realCanvas = document.getElementById('realCanvas');
const realCtx = realCanvas.getContext('2d');
let realStatic = document.createElement('canvas');
let realXf = null;   // world -> pixel transform

function setupCanvas(canvas) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (w === 0 || h === 0) return false;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return true;
}

function renderRealStatic() {
    const orbit = view.orbit;
    if (!orbit) return;
    const w = realCanvas.clientWidth, h = realCanvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    realStatic.width = Math.round(w * dpr);
    realStatic.height = Math.round(h * dpr);
    const ctx = realStatic.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const b = orbit.bounds;
    const pad = 0.12 * Math.max(b.xmax - b.xmin, b.ymax - b.ymin) + 0.05;
    const bw = (b.xmax - b.xmin) + 2 * pad, bh = (b.ymax - b.ymin) + 2 * pad;
    const s = Math.min(w / bw, h / bh);
    const cx = 0.5 * (b.xmin + b.xmax), cy = 0.5 * (b.ymin + b.ymax);
    realXf = {
        s: s,
        px: function (x) { return w / 2 + (x - cx) * s; },
        py: function (y) { return h / 2 - (y - cy) * s; }
    };

    // centre of mass
    ctx.fillStyle = 'rgba(255,255,255,0.28)';
    ctx.beginPath();
    ctx.arc(realXf.px(0), realXf.py(0), 2, 0, TWO_PI);
    ctx.fill();

    if (!view.showFullPath) return;
    const S = orbit.samples, N = orbit.N;
    for (let i = 0; i < 3; i++) {
        ctx.strokeStyle = BODY_COLORS[i];
        ctx.globalAlpha = 0.24;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(realXf.px(S[2 * i]), realXf.py(S[2 * i + 1]));
        for (let k = 1; k <= N; k++) {
            const o = k * N_DIM;
            ctx.lineTo(realXf.px(S[o + 2 * i]), realXf.py(S[o + 2 * i + 1]));
        }
        ctx.stroke();
    }
    ctx.globalAlpha = 1;
}

function drawReal() {
    const orbit = view.orbit;
    if (!orbit || !realXf) return;
    const w = realCanvas.clientWidth, h = realCanvas.clientHeight;
    const ctx = realCtx;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(realStatic, 0, 0, w, h);

    const S = orbit.samples, N = orbit.N;
    const px = realXf.px, py = realXf.py;

    // --- trails -----------------------------------------------------------
    const span = Math.round(view.trail * N);
    if (span > 1) {
        const stride = Math.max(1, Math.floor(span / 900));
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = BODY_COLORS[i];
            ctx.lineWidth = 1.8;
            ctx.lineJoin = 'round';
            ctx.beginPath();
            let started = false;
            for (let d = span; d >= 0; d -= stride) {
                let k = Math.round(view.u) - d;
                k = ((k % N) + N) % N;
                const o = k * N_DIM;
                const X = px(S[o + 2 * i]), Y = py(S[o + 2 * i + 1]);
                if (!started) { ctx.moveTo(X, Y); started = true; }
                else ctx.lineTo(X, Y);
            }
            ctx.globalAlpha = 0.75;
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // --- triangle and bodies ---------------------------------------------
    const p = positionsAt(orbit, view.u);
    const area = signedArea(p, 0);
    const size = Math.hypot(p[2] - p[0], p[3] - p[1]) + Math.hypot(p[4] - p[0], p[5] - p[1]);
    const flat = size > 0 ? Math.abs(area) / (size * size) : 1;

    if (view.showTriangle) {
        // The triangle glows white as it flattens: that instant is a syzygy.
        const glow = Math.max(0, 1 - flat / 0.02);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.16 + 0.7 * glow) + ')';
        ctx.lineWidth = 1 + 1.4 * glow;
        ctx.beginPath();
        ctx.moveTo(px(p[0]), py(p[1]));
        ctx.lineTo(px(p[2]), py(p[3]));
        ctx.lineTo(px(p[4]), py(p[5]));
        ctx.closePath();
        ctx.stroke();
    }

    for (let i = 0; i < 3; i++) {
        const X = px(p[2 * i]), Y = py(p[2 * i + 1]);
        const g = ctx.createRadialGradient(X, Y, 0, X, Y, 14);
        g.addColorStop(0, BODY_COLORS[i]);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.globalAlpha = 0.45;
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(X, Y, 14, 0, TWO_PI); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.fillStyle = BODY_COLORS[i];
        ctx.beginPath(); ctx.arc(X, Y, 4.5, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.font = '600 9px system-ui, sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText(String(i + 1), X, Y + 0.5);
    }
}

/* ---------------------------------------------------------------------------
   8. Mercator view
   --------------------------------------------------------------------------- */

const mercCanvas = document.getElementById('mercCanvas');
const mercCtx = mercCanvas.getContext('2d');
let mercStatic = document.createElement('canvas');
let mercBox = null;

function mercLayout(w, h) {
    const padL = 10, padR = 10, padT = 26, padB = 20;
    return {
        x0: padL, y0: padT,
        w: w - padL - padR, h: h - padT - padB,
        X: function (lon) { return padL + (lon / TWO_PI) * (w - padL - padR); },
        Y: function (nz) { return padT + (0.5 - 0.5 * mercY(nz) / MERC_MAX) * (h - padT - padB); }
    };
}

function renderMercStatic() {
    const orbit = view.orbit;
    const w = mercCanvas.clientWidth, h = mercCanvas.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    mercStatic.width = Math.round(w * dpr);
    mercStatic.height = Math.round(h * dpr);
    const ctx = mercStatic.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const L = mercLayout(w, h);
    mercBox = L;

    // frame, with dotted top and bottom to mark the latitude clipping
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(L.x0, L.y0); ctx.lineTo(L.x0, L.y0 + L.h);
    ctx.moveTo(L.x0 + L.w, L.y0); ctx.lineTo(L.x0 + L.w, L.y0 + L.h);
    ctx.stroke();
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(L.x0, L.y0); ctx.lineTo(L.x0 + L.w, L.y0);
    ctx.moveTo(L.x0, L.y0 + L.h); ctx.lineTo(L.x0 + L.w, L.y0 + L.h);
    ctx.stroke();
    ctx.setLineDash([]);

    // graticule
    if (view.showGraticule) {
        ctx.strokeStyle = 'rgba(255,255,255,0.07)';
        ctx.beginPath();
        for (let d = 30; d < 360; d += 30) {
            const X = L.X(d * Math.PI / 180);
            ctx.moveTo(X, L.y0); ctx.lineTo(X, L.y0 + L.h);
        }
        for (const latDeg of [-75, -60, -45, -30, -15, 15, 30, 45, 60, 75]) {
            const Y = L.Y(Math.sin(latDeg * Math.PI / 180));
            ctx.moveTo(L.x0, Y); ctx.lineTo(L.x0 + L.w, Y);
        }
        ctx.stroke();
    }

    // the three cuts on the equator
    const eqY = L.Y(0);
    const arcs = [
        [0, TWO_PI / 3, ARC_A, 'α'],
        [TWO_PI / 3, 2 * TWO_PI / 3, ARC_FREE, ''],
        [2 * TWO_PI / 3, TWO_PI, ARC_B, 'β']
    ];
    for (const [l0, l1, col, tag] of arcs) {
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(L.X(l0), eqY); ctx.lineTo(L.X(l1), eqY);
        ctx.stroke();
        if (tag) {
            ctx.fillStyle = col;
            ctx.font = '11px system-ui, sans-serif';
            ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
            ctx.fillText(tag, L.X(0.5 * (l0 + l1)), eqY - 5);
        }
    }

    // punctures: the three binary collisions
    ctx.setLineDash([2, 4]);
    ctx.strokeStyle = 'rgba(255,107,107,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (const c of COLLISIONS) {
        const X = L.X(c.lon);
        ctx.moveTo(X, L.y0); ctx.lineTo(X, L.y0 + L.h);
    }
    ctx.stroke();
    ctx.setLineDash([]);
    for (const c of COLLISIONS) {
        const X = L.X(c.lon);
        ctx.fillStyle = '#ff6b6b';
        ctx.beginPath(); ctx.arc(X, eqY, 4, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = 'rgba(12,14,20,0.95)';
        ctx.beginPath(); ctx.arc(X, eqY, 1.7, 0, TWO_PI); ctx.fill();
        ctx.fillStyle = 'rgba(255,140,140,0.85)';
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = c.lon === 0 ? 'left' : 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(c.label, X + (c.lon === 0 ? 5 : 0), L.y0 + L.h + 4);
    }

    // pole labels
    ctx.fillStyle = 'rgba(255,255,255,0.32)';
    ctx.font = '9px system-ui, sans-serif';
    ctx.textAlign = 'right'; ctx.textBaseline = 'top';
    ctx.fillText('N  equilateral ↺', L.x0 + L.w, L.y0 + 2);
    ctx.textBaseline = 'bottom';
    ctx.fillText('S  equilateral ↻', L.x0 + L.w, L.y0 + L.h - 2);

    if (!orbit) return;

    // the shape curve, split wherever it wraps around in longitude
    if (view.showFullPath) {
        const sp = orbit.sphere, N = orbit.N;
        ctx.strokeStyle = 'rgba(190,215,255,0.62)';
        ctx.lineWidth = 1.1;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        let prevLon = null;
        for (let k = 0; k <= N; k++) {
            let lon = Math.atan2(sp[3 * k + 1], sp[3 * k]);
            if (lon < 0) lon += TWO_PI;
            const X = L.X(lon), Y = L.Y(sp[3 * k + 2]);
            if (prevLon === null || Math.abs(lon - prevLon) > Math.PI) ctx.moveTo(X, Y);
            else ctx.lineTo(X, Y);
            prevLon = lon;
        }
        ctx.stroke();
    }

    // one dot per syzygy, coloured by the letter it contributes
    for (const e of orbit.events) {
        const X = L.X(e.lon), Y = eqY;
        if (!e.letter) {                       // a crossing of the free arc: no letter
            ctx.strokeStyle = ARC_FREE;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(X, Y, 2.5, 0, TWO_PI); ctx.stroke();
            continue;
        }
        ctx.fillStyle = e.letter.toLowerCase() === 'a' ? ARC_A : ARC_B;
        ctx.beginPath(); ctx.arc(X, Y, 4, 0, TWO_PI); ctx.fill();
        ctx.strokeStyle = 'rgba(10,12,18,0.9)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
    }
}

function drawMerc() {
    const orbit = view.orbit;
    const w = mercCanvas.clientWidth, h = mercCanvas.clientHeight;
    const ctx = mercCtx;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(mercStatic, 0, 0, w, h);
    if (!orbit || !mercBox) return;
    const L = mercBox;
    const sp = orbit.sphere, N = orbit.N;

    // trail
    const span = Math.round(view.trail * N);
    if (span > 1) {
        const stride = Math.max(1, Math.floor(span / 700));
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 0.8;
        ctx.beginPath();
        let prevLon = null;
        for (let d = span; d >= 0; d -= stride) {
            let k = Math.round(view.u) - d;
            k = ((k % N) + N) % N;
            let lon = Math.atan2(sp[3 * k + 1], sp[3 * k]);
            if (lon < 0) lon += TWO_PI;
            const X = L.X(lon), Y = L.Y(sp[3 * k + 2]);
            if (prevLon === null || Math.abs(lon - prevLon) > Math.PI) ctx.moveTo(X, Y);
            else ctx.lineTo(X, Y);
            prevLon = lon;
        }
        ctx.stroke();
        ctx.globalAlpha = 1;
    }

    // current shape point
    const n = sphereAt(orbit, view.u);

    /* At a pole every meridian meets, so the longitude carries no information
       and a single dot would sit at an arbitrary place on the top edge. Draw
       the whole clipped edge instead and say so. */
    if (Math.abs(n[2]) > 0.9994) {
        const Y = L.Y(n[2]);
        ctx.strokeStyle = 'rgba(255,255,255,0.75)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(L.x0, Y); ctx.lineTo(L.x0 + L.w, Y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '10px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = n[2] > 0 ? 'top' : 'bottom';
        ctx.fillText('at the ' + (n[2] > 0 ? 'north' : 'south') +
            ' pole \u2014 longitude undefined', L.x0 + L.w / 2, Y + (n[2] > 0 ? 5 : -5));
        return;
    }

    let lon = Math.atan2(n[1], n[0]);
    if (lon < 0) lon += TWO_PI;
    const X = L.X(lon), Y = L.Y(n[2]);
    ctx.save();
    ctx.beginPath(); ctx.rect(L.x0, L.y0, L.w, L.h); ctx.clip();
    const g = ctx.createRadialGradient(X, Y, 0, X, Y, 12);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(X, Y, 12, 0, TWO_PI); ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.arc(X, Y, 3.6, 0, TWO_PI); ctx.fill();
    ctx.restore();
}

/* ---------------------------------------------------------------------------
   9. Shape sphere in 3D
   ---------------------------------------------------------------------------
   Shape coordinates (n_x, n_y, n_z) are mapped to three.js world coordinates
   by the cyclic permutation (n_x, n_y, n_z) -> (n_y, n_z, n_x), which puts
   n_z (the handedness axis, with the equilateral triangles at its poles)
   along the vertical and preserves handedness.
   --------------------------------------------------------------------------- */

const sphereHost = document.getElementById('sphereHost');
const Controls3D = THREE.OrbitControls || window.OrbitControls;

const gl = {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(42, 1, 0.01, 100),
    renderer: new THREE.WebGLRenderer({ antialias: true, alpha: true }),
    controls: null,
    curve: null, ghost: null, trail: null, marker: null, events: null,
    graticule: null, limb: null
};

const MAX_TRAIL = 1500;

function toThree(nx, ny, nz) { return [ny, nz, nx]; }

function initSphereView() {
    gl.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    gl.renderer.setClearColor(0x000000, 0);
    sphereHost.appendChild(gl.renderer.domElement);

    gl.camera.position.set(1.72, 1.95, 1.92);
    gl.controls = new Controls3D(gl.camera, gl.renderer.domElement);
    gl.controls.enableDamping = true;
    gl.controls.dampingFactor = 0.08;
    gl.controls.enablePan = false;
    gl.controls.minDistance = 1.5;
    gl.controls.maxDistance = 8;
    gl.controls.autoRotateSpeed = 0.9;

    gl.scene.add(new THREE.AmbientLight(0xffffff, 0.66));
    const dir = new THREE.DirectionalLight(0xaec4f0, 0.32);
    dir.position.set(3, 5, 4);
    gl.scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x465da8, 0.24);
    dir2.position.set(-4, -2, -3);
    gl.scene.add(dir2);

    // --- the sphere itself: matte and nearly black, so hairlines read ------
    const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.992, 96, 64),
        new THREE.MeshPhongMaterial({
            color: 0x0d1426, shininess: 1, specular: 0x0a0f1a,
            transparent: true, opacity: 0.96
        })
    );
    gl.scene.add(ball);

    // --- graticule: a fine 15-degree grid, plus ticks round the equator ----
    gl.graticule = new THREE.Group();

    const gpts = [];
    for (let d = 0; d < 360; d += 15) {              // meridians
        const lon = d * Math.PI / 180;
        let prev = null;
        for (let i = 0; i <= 72; i++) {
            const lat = -Math.PI / 2 + Math.PI * i / 72;
            const c = Math.cos(lat);
            const p = toThree(c * Math.cos(lon), c * Math.sin(lon), Math.sin(lat));
            if (prev) gpts.push(prev[0], prev[1], prev[2], p[0], p[1], p[2]);
            prev = p;
        }
    }
    for (let latDeg = -75; latDeg <= 75; latDeg += 15) {   // parallels
        if (latDeg === 0) continue;                        // the equator is drawn separately
        const lat = latDeg * Math.PI / 180, c = Math.cos(lat), z = Math.sin(lat);
        let prev = null;
        for (let i = 0; i <= 144; i++) {
            const lon = TWO_PI * i / 144;
            const p = toThree(c * Math.cos(lon), c * Math.sin(lon), z);
            if (prev) gpts.push(prev[0], prev[1], prev[2], p[0], p[1], p[2]);
            prev = p;
        }
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(gpts, 3));
    gl.graticule.add(new THREE.LineSegments(gg, new THREE.LineBasicMaterial({
        color: 0x7c93c8, transparent: true, opacity: 0.2
    })));

    const tpts = [];
    for (let d = 0; d < 360; d += 15) {
        const lon = d * Math.PI / 180;
        const a = toThree(Math.cos(lon), Math.sin(lon), 0);
        const r1 = 1.004, r2 = (d % 45 === 0) ? 1.062 : 1.03;
        tpts.push(a[0] * r1, a[1] * r1, a[2] * r1, a[0] * r2, a[1] * r2, a[2] * r2);
    }
    const tg2 = new THREE.BufferGeometry();
    tg2.setAttribute('position', new THREE.Float32BufferAttribute(tpts, 3));
    gl.graticule.add(new THREE.LineSegments(tg2, new THREE.LineBasicMaterial({
        color: 0xa8bce8, transparent: true, opacity: 0.48
    })));

    gl.scene.add(gl.graticule);

    // --- the equator, cut into its three arcs ------------------------------
    const arcs = [
        [0, TWO_PI / 3, 0x7fe0ff],
        [TWO_PI / 3, 2 * TWO_PI / 3, 0x7b8798],
        [2 * TWO_PI / 3, TWO_PI, 0xffa94d]
    ];
    for (const [l0, l1, col] of arcs) {
        const pts = [];
        const M = 120;
        for (let i = 0; i <= M; i++) {
            const lon = l0 + (l1 - l0) * i / M;
            const p = toThree(Math.cos(lon), Math.sin(lon), 0);
            pts.push(new THREE.Vector3(p[0] * 1.004, p[1] * 1.004, p[2] * 1.004));
        }
        // a tube, not a THREE.Line: WebGL ignores linewidth, and a hairline
        // equator is unreadable against the sphere
        const geo = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(pts, false), M, 0.0058, 6, false);
        gl.scene.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: col })));
    }

    // --- punctures and poles ----------------------------------------------
    /* A torus lies in its own xy-plane with its axis along local +z, so
       lookAt(origin) lays the ring flat against the sphere. */
    function targetRing(p, radius, color, opacity) {
        const ring = new THREE.Mesh(
            new THREE.TorusGeometry(radius, 0.0035, 6, 40),
            new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity }));
        ring.position.set(p[0] * 1.004, p[1] * 1.004, p[2] * 1.004);
        ring.lookAt(0, 0, 0);
        return ring;
    }

    const punctureMat = new THREE.MeshBasicMaterial({ color: 0xff6b6b });
    for (const c of COLLISIONS) {
        const p = toThree(c.n[0], c.n[1], c.n[2]);
        const m = new THREE.Mesh(new THREE.SphereGeometry(0.017, 16, 12), punctureMat);
        m.position.set(p[0] * 1.004, p[1] * 1.004, p[2] * 1.004);
        gl.scene.add(m);
        gl.scene.add(targetRing(p, 0.052, 0xff6b6b, 0.7));
        const lab = makeLabel(c.label, '#ff9b9b');
        lab.position.set(p[0] * 1.2, p[1] * 1.2, p[2] * 1.2);
        gl.scene.add(lab);
    }
    const poleMat = new THREE.MeshBasicMaterial({ color: 0xc9d6ff });
    for (const [z, txt] of [[1, '↺'], [-1, '↻']]) {
        const p = toThree(0, 0, z);
        const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.019), poleMat);
        m.position.set(p[0] * 1.004, p[1] * 1.004, p[2] * 1.004);
        gl.scene.add(m);
        gl.scene.add(targetRing(p, 0.045, 0xc9d6ff, 0.5));
        const lab = makeLabel(txt, '#c9d6ff');
        lab.position.set(p[0] * 1.2, p[1] * 1.2, p[2] * 1.2);
        gl.scene.add(lab);
    }

    /* The silhouette of the sphere, traced exactly. Gives the globe a crisp
       edge against the panel and reads like an instrument reticle; the
       position and radius are recomputed each frame in drawSphere. */
    const limbPts = [];
    for (let i = 0; i < 192; i++) {
        const a = TWO_PI * i / 192;
        limbPts.push(new THREE.Vector3(Math.cos(a), Math.sin(a), 0));
    }
    gl.limb = new THREE.LineLoop(
        new THREE.BufferGeometry().setFromPoints(limbPts),
        new THREE.LineBasicMaterial({
            color: 0x9fb6e8, transparent: true, opacity: 0.45, depthTest: false
        }));
    gl.limb.renderOrder = 2;
    gl.scene.add(gl.limb);

    // --- trail, marker ----------------------------------------------------
    const tg = new THREE.BufferGeometry();
    tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAX_TRAIL * 3), 3));
    gl.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.8
    }));
    gl.trail.frustumCulled = false;
    gl.scene.add(gl.trail);

    gl.marker = new THREE.Mesh(
        new THREE.SphereGeometry(0.021, 18, 12),
        new THREE.MeshBasicMaterial({ color: 0xffffff })
    );
    gl.scene.add(gl.marker);

    resizeSphere();
}

function makeLabel(text, color) {
    const c = document.createElement('canvas');
    c.width = 192; c.height = 64;
    const x = c.getContext('2d');
    x.fillStyle = color;
    x.font = '500 34px ui-monospace, monospace';
    x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillText(text, 96, 34);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({
        map: tex, transparent: true, depthTest: false, opacity: 0.75
    }));
    sp.scale.set(0.27, 0.09, 1);
    return sp;
}

/* Rebuild the trajectory objects for a newly selected orbit. */
function buildSphereCurve(orbit) {
    for (const key of ['curve', 'ghost', 'events']) {
        if (gl[key]) {
            gl.scene.remove(gl[key]);
            if (key !== 'ghost') gl[key].geometry.dispose();  // shared with curve
            gl[key].material.dispose();
            gl[key] = null;
        }
    }
    const N = orbit.N, sp = orbit.sphere;
    const c = new THREE.Color();

    /* Decimate the shape curve before tubing it: 60k samples is far more than
       the eye needs, and TubeGeometry cost is linear in the segment count.
       The threshold adapts so that even the most tangled curves stay bounded. */
    let pts = [], eps = 0.0025;
    for (let attempt = 0; attempt < 7; attempt++) {
        pts = [];
        let last = null;
        for (let k = 0; k <= N; k++) {
            const p = toThree(sp[3 * k], sp[3 * k + 1], sp[3 * k + 2]);
            const v = new THREE.Vector3(p[0], p[1], p[2]);
            if (!last || v.distanceTo(last) > eps) { pts.push(v); last = v; }
        }
        if (pts.length <= 5000) break;
        eps *= 1.6;
    }
    // fewer than four points means the shape never moves (Lagrange): no tube,
    // just the marker sitting at the pole
    if (pts.length >= 4) {
        const segs = Math.min(8000, Math.max(400, pts.length * 2));
        const radial = 5;
        const geo = new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3(pts, true), segs, 0.0032, radial, true);

        /* Colour each ring of the tube by its position along the curve. The
           ramp stays inside one cool quadrant — cyan to violet to magenta —
           so the direction of travel still reads without the plot turning
           into a rainbow. */
        const rad = radial + 1;
        const nv = geo.attributes.position.count;
        const col = new Float32Array(nv * 3);
        for (let i = 0; i < nv; i++) {
            const t = Math.floor(i / rad) / segs;
            c.setHSL(0.51 + 0.35 * t, 0.70, 0.62);
            col[3 * i] = c.r; col[3 * i + 1] = c.g; col[3 * i + 2] = c.b;
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));

        gl.curve = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true }));
        gl.curve.frustumCulled = false;
        gl.scene.add(gl.curve);

        // A ghost of the same tube drawn without depth test, so the stretch
        // hidden behind the sphere stays faintly readable.
        gl.ghost = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
            vertexColors: true, transparent: true, opacity: 0.2, depthTest: false
        }));
        gl.ghost.frustumCulled = false;
        gl.ghost.renderOrder = -1;
        gl.scene.add(gl.ghost);
    }

    // one point per syzygy, coloured by its letter
    if (orbit.events.length) {
        const ep = new Float32Array(orbit.events.length * 3);
        const ec = new Float32Array(orbit.events.length * 3);
        orbit.events.forEach(function (e, i) {
            const p = toThree(e.n[0], e.n[1], e.n[2]);
            ep[3 * i] = p[0] * 1.012; ep[3 * i + 1] = p[1] * 1.012; ep[3 * i + 2] = p[2] * 1.012;
            const hex = e.letter ? (e.letter.toLowerCase() === 'a' ? 0x7fe0ff : 0xffa94d) : 0x8899aa;
            c.setHex(hex);
            ec[3 * i] = c.r; ec[3 * i + 1] = c.g; ec[3 * i + 2] = c.b;
        });
        const eg = new THREE.BufferGeometry();
        eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
        eg.setAttribute('color', new THREE.BufferAttribute(ec, 3));
        gl.events = new THREE.Points(eg, new THREE.PointsMaterial({
            size: 0.032, vertexColors: true, sizeAttenuation: true
        }));
        gl.events.frustumCulled = false;
        gl.scene.add(gl.events);
    }
    aimCameraAt(orbit);
    updateSphereVisibility();
}

/* Point the camera at the mean direction of the shape curve, so the orbit
   starts facing the viewer instead of hiding behind the sphere. */
function aimCameraAt(orbit) {
    const N = orbit.N, sp = orbit.sphere;
    let mx = 0, my = 0, mz = 0;
    for (let k = 0; k <= N; k++) { mx += sp[3 * k]; my += sp[3 * k + 1]; mz += sp[3 * k + 2]; }
    const p = toThree(mx, my, mz);
    const v = new THREE.Vector3(p[0], p[1], p[2]);
    if (v.length() < 1e-6) v.set(0.8, 0.7, 0.9);
    v.normalize();
    // tilt away from straight-on so the equator reads as an ellipse, not a line
    const up = new THREE.Vector3(0, 1, 0);
    if (Math.abs(v.y) > 0.9) up.set(0, 0, 1);
    v.addScaledVector(up, 0.42).normalize().multiplyScalar(3.0);
    gl.camera.position.copy(v);
    gl.controls.target.set(0, 0, 0);
    gl.controls.update();
}

function updateSphereVisibility() {
    if (gl.curve) gl.curve.visible = view.showFullPath;
    if (gl.ghost) gl.ghost.visible = view.showFullPath;
    if (gl.graticule) gl.graticule.visible = view.showGraticule;
}

function resizeSphere() {
    const w = sphereHost.clientWidth, h = sphereHost.clientHeight;
    if (!w || !h) return;
    gl.renderer.setSize(w, h, false);
    gl.camera.aspect = w / h;
    gl.camera.updateProjectionMatrix();
}

function drawSphere() {
    const orbit = view.orbit;
    if (orbit) {
        const N = orbit.N, sp = orbit.sphere;
        // trail
        const span = Math.round(view.trail * N);
        const attr = gl.trail.geometry.attributes.position;
        let count = 0;
        if (span > 1) {
            const stride = Math.max(1, Math.ceil(span / (MAX_TRAIL - 1)));
            for (let d = span; d >= 0 && count < MAX_TRAIL; d -= stride) {
                let k = Math.round(view.u) - d;
                k = ((k % N) + N) % N;
                const p = toThree(sp[3 * k], sp[3 * k + 1], sp[3 * k + 2]);
                attr.array[3 * count] = p[0] * 1.012;
                attr.array[3 * count + 1] = p[1] * 1.012;
                attr.array[3 * count + 2] = p[2] * 1.012;
                count++;
            }
        }
        attr.needsUpdate = true;
        gl.trail.geometry.setDrawRange(0, count);
        gl.trail.visible = count > 1;

        const n = sphereAt(orbit, view.u);
        const p = toThree(n[0], n[1], n[2]);
        gl.marker.position.set(p[0] * 1.015, p[1] * 1.015, p[2] * 1.015);
    }
    /* Track the true silhouette: for a camera at distance d looking at the
       centre, a unit sphere's outline is a circle of radius sqrt(d^2-1)/d
       sitting 1/d in front of the centre. */
    const d = gl.camera.position.length();
    if (d > 1.001) {
        const rad = Math.sqrt(d * d - 1) / d;
        gl.limb.quaternion.copy(gl.camera.quaternion);
        gl.limb.scale.set(rad, rad, rad);
        gl.limb.position.copy(gl.camera.position).normalize().multiplyScalar(1 / d);
    }

    gl.controls.autoRotate = view.spin;
    gl.controls.update();
    gl.renderer.render(gl.scene, gl.camera);
}

/* ---------------------------------------------------------------------------
   10. UI
   --------------------------------------------------------------------------- */

const el = {
    select: document.getElementById('orbit-select'),
    meta: document.getElementById('orbit-meta'),
    play: document.getElementById('play-btn'),
    restart: document.getElementById('restart-btn'),
    speed: document.getElementById('speed-input'),
    speedVal: document.getElementById('speed-value'),
    trail: document.getElementById('trail-input'),
    trailVal: document.getElementById('trail-value'),
    phase: document.getElementById('phase-input'),
    phaseVal: document.getElementById('phase-value'),
    fullpath: document.getElementById('fullpath-check'),
    triangle: document.getElementById('triangle-check'),
    graticule: document.getElementById('graticule-check'),
    spin: document.getElementById('spin-check'),
    wordBox: document.getElementById('word-box'),
    wordLen: document.getElementById('word-len'),
    reduceBox: document.getElementById('reduce-box'),
    reduceBadge: document.getElementById('reduce-badge'),
    statT: document.getElementById('stat-T'),
    statE: document.getElementById('stat-E'),
    statDE: document.getElementById('stat-dE'),
    statClose: document.getElementById('stat-close'),
    statSyz: document.getElementById('stat-syz'),
    statRmin: document.getElementById('stat-rmin'),
    statPaper: document.getElementById('stat-paper'),
    statMatch: document.getElementById('stat-match')
};

function populateSelect() {
    const groups = {};
    for (let i = 0; i < ALL_ORBITS.length; i++) {
        const o = ALL_ORBITS[i];
        (groups[o.group] = groups[o.group] || []).push([i, o]);
    }
    for (const g of Object.keys(groups)) {
        const og = document.createElement('optgroup');
        og.label = g === 'classic' ? 'Classics' : 'Class ' + g;
        for (const [i, o] of groups[g]) {
            const opt = document.createElement('option');
            opt.value = String(i);
            opt.textContent = o.name;
            og.appendChild(opt);
        }
        el.select.appendChild(og);
    }
}

function esc(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

let wordSpans = [];

function renderWord(orbit) {
    const w = orbit.rawWord;
    el.wordLen.textContent = String(w.length);
    if (!w) {
        el.wordBox.innerHTML = '<span style="color:var(--text-dim)">empty — the curve never ' +
            'crosses a cut, so the class is the identity, 0.</span>';
        wordSpans = [];
        nowSpan = null;
        return;
    }
    let html = '';
    for (const c of w) {
        html += '<span class="ltr ' + (c.toLowerCase() === 'a' ? 'a' : 'b') + '">' + c + '</span>';
    }
    el.wordBox.innerHTML = html;
    nowSpan = null;
    wordSpans = Array.prototype.slice.call(el.wordBox.querySelectorAll('.ltr'));
}

let nowSpan = null;
function highlightWord(orbit) {
    if (!wordSpans.length) return;
    // the most recent syzygy that contributed a letter
    let idx = -1;
    for (const e of orbit.events) {
        if (e.u > view.u) break;
        if (e.wordIndex >= 0) idx = e.wordIndex;
    }
    // track the element, not the index, so a restart cannot leave one stuck lit
    const target = idx >= 0 ? wordSpans[idx] : null;
    if (target === nowSpan) return;
    if (nowSpan) nowSpan.classList.remove('now');
    if (target) target.classList.add('now');
    nowSpan = target;
}

/* The raw word and its labeled class, and nothing further. The labeled class
   is the free reduction followed by the cyclic reduction, which keeps the body
   labels. Taking the primitive root, quotienting by the particle permutations
   and quotienting by the mirror would each merge orbits that are physically
   distinct, so they are used only behind the scenes, to compare against the
   word as the paper prints it. */
function renderReduction(orbit) {
    const raw = orbit.rawWord;
    const rows = [
        ['raw', raw, 'the letters in time order'],
        ['labeled', orbit.normalWord,
            'free reduction, then cyclic reduction: the class with the body labels kept']
    ];
    let prev = null, html = '';
    for (let i = 0; i < rows.length; i++) {
        const [name, val, hint] = rows[i];
        const shown = val === '' ? '0' : val;
        // stages that change nothing are dimmed, so the ones that bite stand out
        const same = prev !== null && shown === prev;
        html += '<div class="reduce-row' + (i === rows.length - 1 ? ' final' : '') + '"' +
            (hint ? ' title="' + hint + '"' : '') + '><span>' + name + '</span>' +
            '<code' + (same && i !== rows.length - 1 ? ' class="same"' : '') + '>' +
            esc(shown) + '</code></div>';
        prev = shown;
    }
    el.reduceBox.innerHTML = html;
    el.reduceBadge.textContent = raw.length + ' → ' + orbit.normalWord.length;
}

function fmt(x, d) {
    if (!isFinite(x)) return '–';
    return x.toExponential(d === undefined ? 2 : d);
}

function showStats(orbit) {
    el.statT.textContent = orbit.T.toFixed(6);
    el.statE.textContent = orbit.energy.toFixed(9);
    el.statDE.textContent = fmt(orbit.energyDrift);
    el.statClose.textContent = fmt(orbit.closure);
    el.statSyz.textContent = String(orbit.events.length) +
        (orbit.events.length !== orbit.rawWord.length
            ? ' (' + orbit.rawWord.length + ' lettered)' : '');
    el.statRmin.textContent = orbit.rminScaled.toFixed(4);
    el.statPaper.textContent = orbit.def.paperWord || '–';

    // reduce the published word through the same chain, and note that klass is
    // stored as '0' for the identity
    const paperRoot = powerRoot(cyclicNormal(orbit.def.word))[0];
    const same = (canonical(paperRoot, 'all') || '0') === orbit.klass;
    el.statMatch.title = 'Primitive classes compared up to body relabelling and ' +
        'mirror reflection, since the paper writes several of these words with a ' +
        'different choice of labels.';
    if (same) {
        el.statMatch.textContent = '✓ matches paper';
        el.statMatch.className = 'stat-value ok';
    } else if (orbit.def.unstable) {
        el.statMatch.textContent = 'word truncated — see note';
        el.statMatch.className = 'stat-value warn';
    } else {
        el.statMatch.textContent = '✗ differs';
        el.statMatch.className = 'stat-value bad';
    }

    let meta = 'Period T = ' + orbit.T.toFixed(6);
    if (orbit.def.vx !== undefined) {
        meta += ' · v̇₁ = (' + orbit.def.vx + ', ' + orbit.def.vy + ')';
    }
    if (orbit.def.note) meta += '<br>' + esc(orbit.def.note);
    if (orbit.def.unstable) {
        meta += '<br><span class="warn-note">This orbit skims so close to a binary collision ' +
            'that an error of one part in 10¹⁶ in the initial conditions grows past order one ' +
            'within a single period — so its initial conditions cannot be pinned down in double ' +
            'precision at all. The trajectory drifts off the true periodic orbit partway through, ' +
            'and the tail of the word is not trustworthy. What you see is real three-body motion, ' +
            'but not quite this orbit.</span>';
    }
    meta += '<br>' + orbit.N.toLocaleString() + ' samples, ' +
        orbit.steps.toLocaleString() + ' integration steps in ' +
        orbit.buildMs.toFixed(0) + ' ms.';
    el.meta.innerHTML = meta;
}

function selectOrbit(i) {
    const def = ALL_ORBITS[i];
    view.orbit = buildOrbit(def);
    view.u = 0;
    renderWord(view.orbit);
    renderReduction(view.orbit);
    showStats(view.orbit);
    buildSphereCurve(view.orbit);
    renderRealStatic();
    renderMercStatic();
}

/* --- events --------------------------------------------------------------- */

el.select.addEventListener('change', function () { selectOrbit(+el.select.value); });

el.play.addEventListener('click', function () {
    view.playing = !view.playing;
    el.play.textContent = view.playing ? '⏸ Pause' : '▶ Play';
});

el.restart.addEventListener('click', function () { view.u = 0; });

el.speed.addEventListener('input', function () {
    view.speed = Math.pow(10, +el.speed.value);
    el.speedVal.textContent = view.speed.toFixed(2) + '×';
});

el.trail.addEventListener('input', function () {
    view.trail = +el.trail.value;
    el.trailVal.textContent = Math.round(view.trail * 100) + '%';
});

let scrubbing = false;
el.phase.addEventListener('input', function () {
    if (!view.orbit) return;
    scrubbing = true;
    view.u = (+el.phase.value) * view.orbit.N;
});
el.phase.addEventListener('change', function () { scrubbing = false; });

el.fullpath.addEventListener('change', function () {
    view.showFullPath = el.fullpath.checked;
    updateSphereVisibility();
    renderRealStatic();
    renderMercStatic();
});
el.triangle.addEventListener('change', function () { view.showTriangle = el.triangle.checked; });
el.graticule.addEventListener('change', function () {
    view.showGraticule = el.graticule.checked;
    updateSphereVisibility();
    renderMercStatic();
});
el.spin.addEventListener('change', function () { view.spin = el.spin.checked; });

document.getElementById('minimize-btn').addEventListener('click', function () {
    document.body.classList.add('ui-collapsed');
    requestAnimationFrame(onResize);
});
document.getElementById('ui-toggle').addEventListener('click', function () {
    document.body.classList.remove('ui-collapsed');
    requestAnimationFrame(onResize);
});

const modal = document.getElementById('info-modal');
document.getElementById('info-btn').addEventListener('click', function () { modal.classList.add('open'); });
modal.querySelector('.close-modal').addEventListener('click', function () { modal.classList.remove('open'); });
modal.addEventListener('click', function (e) { if (e.target === modal) modal.classList.remove('open'); });
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') modal.classList.remove('open');
    if (e.key === ' ' && e.target === document.body) {
        e.preventDefault();
        el.play.click();
    }
});

function onResize() {
    setupCanvas(realCanvas);
    setupCanvas(mercCanvas);
    resizeSphere();
    renderRealStatic();
    renderMercStatic();
}
window.addEventListener('resize', onResize);

/* --- animation loop -------------------------------------------------------- */

let lastT = performance.now();

function frame(now) {
    const dt = Math.min(0.05, (now - lastT) / 1000);
    lastT = now;
    const orbit = view.orbit;
    if (orbit) {
        if (view.playing && !scrubbing) {
            // one period per 8 seconds at speed 1, independent of T
            view.u += dt * view.speed * orbit.N / 8;
            if (view.u >= orbit.N) view.u -= orbit.N;
        }
        const ph = view.u / orbit.N;
        el.phase.value = String(ph);
        el.phaseVal.textContent = ph.toFixed(3) + ' T';
        highlightWord(orbit);
        drawReal();
        drawMerc();
    }
    drawSphere();
    requestAnimationFrame(frame);
}

/* --- start ----------------------------------------------------------------- */

populateSelect();
initSphereView();
onResize();
el.select.value = '0';
selectOrbit(0);
requestAnimationFrame(frame);
