# Shape-sphere coordinates and the topology of a three-body trajectory

A self-contained reference. It covers two things:

1. **The shape sphere** — what it is, the exact map from three planar positions
   to a point on it, and what every feature of the sphere means physically.
2. **Topology of a closed curve** — how to turn a trajectory into a word in a
   free group on two letters, and how to reduce that word to a canonical class
   label.

Everything needed to implement both from scratch is here: conventions, signs,
formulas, a complete reference implementation, test vectors with known answers,
and the mistakes that are easy to make.

Scope: **three equal masses in the plane**. Masses are all 1. Nothing below
depends on the potential, the energy or the angular momentum — the shape sphere
is kinematics. Only the *dynamics* used to generate a trajectory cares about
those.

---

## Part I — The shape sphere

### 1. Why a sphere

Three points in the plane have 6 degrees of freedom. Quotient out the
symmetries that do not change the shape of the triangle:

| quotient by | dimensions removed | left with |
| --- | --- | --- |
| translation (fix the centre of mass) | 2 | 4 |
| scaling (fix the overall size) | 1 | 3 |
| rotation (fix the orientation) | 1 | **2** |

Two dimensions, and the resulting space is a **sphere**. Concretely: the
translation-reduced configuration space is $\mathbb{R}^4$; fixing the size to 1
gives $S^3$; quotienting $S^3$ by the rotation circle gives $S^2$ via the Hopf
fibration. That last step is why the map below is called the Hopf map.

A point of the sphere is an **oriented similarity class of triangle** — a
triangle shape, together with which way round the three labelled vertices go.
Two configurations map to the same point exactly when one can be carried to the
other by a translation, a rotation, and a positive scaling.

Reflections are *not* quotiented out. A triangle and its mirror image are
different points — they sit at opposite latitudes. That is the whole content of
the northern/southern hemisphere distinction.

### 2. Jacobi coordinates

Let the positions be $\mathbf{x}_1,\mathbf{x}_2,\mathbf{x}_3\in\mathbb{R}^2$.
The mass-weighted Jacobi coordinates for equal masses are

$$
\boldsymbol\rho=\frac{\mathbf{x}_1-\mathbf{x}_2}{\sqrt2},
\qquad
\boldsymbol\lambda=\frac{\mathbf{x}_1+\mathbf{x}_2-2\mathbf{x}_3}{\sqrt6}.
$$

$\boldsymbol\rho$ is the separation of the first pair; $\boldsymbol\lambda$ is
the displacement of the third body from that pair's centre of mass. Both are
independent of translations, and both are unchanged if you add a constant to
every $\mathbf{x}_i$. The normalising $\sqrt2$ and $\sqrt6$ make the kinetic
energy diagonal and, more usefully here, make the identity in §5 exact.

The **moment of inertia about the centre of mass** is

$$
I=\sum_i|\mathbf{x}_i-\mathbf{x}_{\rm cm}|^2=|\boldsymbol\rho|^2+|\boldsymbol\lambda|^2 ,
$$

which is the squared "size" being quotiented out. Write $R^2=I$.

### 3. The Hopf map

$$
\boxed{\;
\mathbf{n}=\frac{1}{R^{2}}
\begin{pmatrix}
|\boldsymbol\lambda|^{2}-|\boldsymbol\rho|^{2}\\[2pt]
-2\,\boldsymbol\rho\cdot\boldsymbol\lambda\\[2pt]
2\,(\boldsymbol\rho\wedge\boldsymbol\lambda)
\end{pmatrix},
\qquad
R^{2}=|\boldsymbol\rho|^{2}+|\boldsymbol\lambda|^{2},
\;}
$$

where $\boldsymbol\rho\wedge\boldsymbol\lambda=\rho_x\lambda_y-\rho_y\lambda_x$
is the scalar cross product in the plane.

**$\mathbf{n}$ is automatically a unit vector.** The check is one line, using
$(\boldsymbol\rho\cdot\boldsymbol\lambda)^2+(\boldsymbol\rho\wedge\boldsymbol\lambda)^2=|\boldsymbol\rho|^2|\boldsymbol\lambda|^2$:

$$
n_x^2+n_y^2+n_z^2=\frac{(\lambda^2-\rho^2)^2+4\rho^2\lambda^2}{R^4}
=\frac{(\lambda^2+\rho^2)^2}{R^4}=1 .
$$

So no normalisation step is needed, and if your code needs one, the map is
wrong. (Re-normalising numerically after an integration step is a different
matter and is fine.)

The sign conventions matter and are not universal across the literature. The
ones above are the ones every formula in this document assumes:

* $n_x$ **positive** when $\boldsymbol\lambda$ dominates $\boldsymbol\rho$,
  i.e. when bodies 1 and 2 are close together.
* $n_y$ carries a **minus** sign.
* $n_z$ is **twice** the Jacobi cross product, and has the same sign as the
  signed area of the triangle (see §6).

### 4. Geography: what each point means

**Poles, $n_z=\pm1$ — equilateral triangles.** At a pole
$|\boldsymbol\rho|=|\boldsymbol\lambda|$ and
$\boldsymbol\rho\cdot\boldsymbol\lambda=0$, which for equal masses is exactly
the equilateral condition. The north pole $(0,0,1)$ is the equilateral triangle
with $1\to2\to3$ counterclockwise; the south pole is its mirror image,
$1\to2\to3$ clockwise. These are the two Lagrange configurations.

**Equator, $n_z=0$ — collinear configurations (syzygies).** $n_z=0$ means
$\boldsymbol\rho\wedge\boldsymbol\lambda=0$, i.e. $\boldsymbol\rho$ and
$\boldsymbol\lambda$ are parallel, i.e. all three bodies lie on one line. Every
crossing of the equator is a moment when the three bodies are collinear. In
this subject that event is called a **syzygy**, and it is the event the entire
topology construction is built on.

**Three punctures on the equator — binary collisions.** Set one pair
separation to zero and the configuration is still collinear, so collisions live
on the equator. Their positions are

| collision | unit vector $\mathbf{c}$ | longitude |
| --- | --- | --- |
| $r_{12}=0$ (bodies 1 and 2) | $(1,0,0)$ | $0$ |
| $r_{13}=0$ (bodies 1 and 3) | $(-\tfrac12,+\tfrac{\sqrt3}{2},0)$ | $2\pi/3$ |
| $r_{23}=0$ (bodies 2 and 3) | $(-\tfrac12,-\tfrac{\sqrt3}{2},0)$ | $4\pi/3$ |

These three points are **removed** from the sphere. They are singularities of
any $1/r$-type potential, a trajectory cannot pass through them, and their
removal is precisely what gives the sphere an interesting fundamental group.
A "shape sphere" in this document always means the sphere minus these three
points.

The **triple collision** $r_{12}=r_{13}=r_{23}=0$ is not a point of the sphere
at all: it is $R=0$, where the map is undefined. It has been scaled away.

**Everything else.** A generic point is a triangle with a definite shape and
handedness. The northern hemisphere and the southern hemisphere contain the
same shapes with opposite orientation; the reflection
$\mathbf{n}\mapsto(n_x,n_y,-n_z)$ is the mirror image of the configuration.

### 5. The identity that makes distances cheap

With the size normalised to $I=R^2=1$, for each collision direction
$\mathbf{c}_k$ above,

$$
\boxed{\;1-\mathbf{n}\cdot\mathbf{c}_k=r_k^{2}\;}
$$

where $r_k$ is the corresponding physical pair separation
($r_1=r_{12}$, $r_2=r_{13}$, $r_3=r_{23}$). Verified numerically to machine
precision; the $\sqrt2,\sqrt6$ normalisation of §2 is what makes the constant
exactly 1.

Two immediate uses:

* **Collision proximity** without leaving the sphere: the closest approach of
  any pair is $\min_k\sqrt{1-\mathbf{n}\cdot\mathbf{c}_k}$. A collision
  cut-off is a test on $1-\mathbf{n}\cdot\mathbf{c}_k$.
* **The potential** of the strong ($1/r^2$) problem becomes a function on the
  sphere alone:
  $$
  U(\mathbf{n})=\sum_{k=1}^{3}\frac{1}{1-\mathbf{n}\cdot\mathbf{c}_k},
  $$
  which is $\sum_k r_k^{-2}$ at $I=1$. For a general exponent $a$ the sum is
  $\sum_k(1-\mathbf{n}\cdot\mathbf{c}_k)^{-a/2}$.

### 6. The signed area — the cheapest way to find the equator

Do not compute $\mathbf{n}$ just to test for a syzygy. Use the signed area of
the triangle directly:

$$
\mathcal{A}(\mathbf{x})=(\mathbf{x}_2-\mathbf{x}_1)\wedge(\mathbf{x}_3-\mathbf{x}_1)
=\mathbf{x}_1\wedge\mathbf{x}_2+\mathbf{x}_2\wedge\mathbf{x}_3+\mathbf{x}_3\wedge\mathbf{x}_1 .
$$

A short expansion gives
$\boldsymbol\rho\wedge\boldsymbol\lambda=\tfrac{2}{\sqrt{12}}\,\mathcal{A}$, so

$$
n_z=\frac{2\,\boldsymbol\rho\wedge\boldsymbol\lambda}{R^2}
   =\frac{4}{\sqrt{12}}\cdot\frac{\mathcal{A}}{R^2}
\quad\Longrightarrow\quad
\operatorname{sign}n_z=\operatorname{sign}\mathcal{A}.
$$

$\mathcal{A}$ is translation-invariant, rotation-invariant, three subtractions
and two multiplications. **Sign changes of $\mathcal{A}$ are exactly equator
crossings**, and the sign of $\dot{\mathcal{A}}$ tells you the crossing
direction. This is the workhorse of Part II.

### 7. Spherical coordinates and the equatorial section

Longitude and latitude:

$$
\varphi=\operatorname{atan2}(n_y,n_x)\in[0,2\pi),\qquad
\vartheta_{\rm lat}=\arcsin n_z .
$$

Longitude is the coordinate that matters: the punctures sit at
$\varphi=0,\;2\pi/3,\;4\pi/3$, and the letter assignment of Part II is a
question about which arc of longitude a crossing falls in.

For studies that reduce the dynamics to the sphere, the natural Poincaré
section is the equator itself, parametrised by

$$
\mathbf{n}=(\cos\varphi,\ \sin\varphi,\ 0),\qquad
\mathbf{u}=(-\cos\vartheta\,\sin\varphi,\ \ \cos\vartheta\,\cos\varphi,\ \ -\sin\vartheta),
$$

where $\mathbf{u}$ is the unit tangent (the arc-length velocity) and
$\vartheta$ is the angle of that velocity measured from the eastward
direction, positive $\vartheta$ pointing south. Recovering $(\varphi,\vartheta)$
from a state on the equator:

$$
\varphi=\operatorname{atan2}(n_y,n_x),\qquad
u_e=-\sin\varphi\;u_x+\cos\varphi\;u_y,\qquad
\vartheta=\operatorname{atan2}(-u_z,\;u_e).
$$

Note that $\vartheta$ and $u_z$ have **opposite** signs: $\vartheta>0$ means
$u_z<0$ means heading south.

### 8. Closed curves: shape-periodic vs. absolutely periodic

This distinction decides what you compute the topology *of*, and getting it
wrong is the most common way to produce a meaningless word.

The shape curve $t\mapsto\mathbf{n}(t)$ forgets the overall rotation. So:

* A **relative periodic orbit** returns to its starting *shape* after a time
  $T_s$ (the **shape period**), but the physical configuration comes back
  rotated by some angle $\Delta$. On the sphere the curve is **closed** after
  $T_s$. This is the curve whose topology you want.
* An **absolutely periodic orbit** returns to the starting configuration
  exactly, after $T$. If $\Delta/2\pi=p/q$ in lowest terms, then $T=q\,T_s$.

Consequences:

* **Read the word over one shape period $T_s$, not over the absolute period.**
  Integrating for $q$ shape periods gives the word repeated $q$ times,
  $w^q$ — correct but not primitive, and it will not match a catalogue of
  primitive classes. (Observed directly: a $q=3$ member of class `abAB` over
  its full absolute period yields `abAB abAB abAB`.)
* If you only have the absolute period, compute the word over $T$ and then take
  its **primitive root** (§14) — that recovers $w$ and tells you $q$ at the
  same time.
* An orbit that is not periodic at all has no closed shape curve and no
  topological class. You can still record its syzygy sequence, but it is a
  finite word, not a group element, and canonicalisation does not apply.

---

## Part II — Topology of the closed curve

### 9. The group

Let $\Sigma$ be the sphere minus the three collision punctures. Its
fundamental group is **free of rank two**:

$$
\pi_1(\Sigma)\;\cong\;F_2=\langle a,b\rangle .
$$

Rank two, not three, because a loop encircling all three punctures is
contractible over the back of the sphere: the three peripheral loops satisfy
one relation, so any two of them generate.

A closed curve on $\Sigma$ therefore determines an element of $F_2$, up to
conjugacy (free homotopy has no basepoint, so the word is only defined up to
cyclic permutation). The task is to read that element off a trajectory.

### 10. Why two letters, when there are three arcs

The equator passes through all three punctures, so the equator minus the
punctures is three open arcs:

| arc | longitude range | joins | letter |
| --- | --- | --- | --- |
| $\alpha$ | $(0,\;2\pi/3)$ | $r_{12}=0$ to $r_{13}=0$ | `a` / `A` |
| (free) | $(2\pi/3,\;4\pi/3)$ | $r_{13}=0$ to $r_{23}=0$ | **none** |
| $\beta$ | $(4\pi/3,\;2\pi)$ | $r_{23}=0$ to $r_{12}=0$ | `b` / `B` |

Only two of the three arcs are used, and this is not an approximation — it is
the construction. Here is why it is exact.

Take the two arcs $\alpha$ and $\beta$ as **cuts**. Their union is a path
$$
(r_{13}=0)\;-\!\!-\;\alpha\;-\!\!-\;(r_{12}=0)\;-\!\!-\;\beta\;-\!\!-\;(r_{23}=0),
$$
a connected tree joining all three punctures. **Cutting a sphere along a
contractible connected set leaves a disc**, and a disc is simply connected: any
loop inside it is contractible. Therefore a loop's homotopy class in $\Sigma$
is determined entirely by the sequence of times it crosses the cut, and in
which direction. Crossings of the third arc happen strictly inside the disc and
carry no information, which is why they are recorded as nothing.

The middle arc is arbitrary — choosing a different one of the three to leave
free relabels the generators but describes the same group. The choice above is
the convention used throughout this document.

### 11. The letter rule

At each equator crossing, two facts determine the letter:

1. **Which arc** — from the longitude $\varphi$ at the crossing point.
2. **Which direction** — from the sign of $\dot n_z$, equivalently
   $\dot{\mathcal{A}}$, at the crossing.

$$
\text{letter}=
\begin{cases}
\texttt{a} & 0<\varphi<2\pi/3,\ \ \dot n_z<0 \quad(\text{north}\to\text{south})\\
\texttt{A} & 0<\varphi<2\pi/3,\ \ \dot n_z>0 \quad(\text{south}\to\text{north})\\
\texttt{b} & 4\pi/3<\varphi<2\pi,\ \ \dot n_z<0\\
\texttt{B} & 4\pi/3<\varphi<2\pi,\ \ \dot n_z>0\\
\text{nothing} & 2\pi/3\le\varphi\le4\pi/3 .
\end{cases}
$$

**Lower case = descending (north to south). Upper case = ascending.**
`A` is the inverse of `a` in the group, `B` of `b`. Case-swapping a single
letter inverts it; the inverse of a whole word is
`word[::-1].swapcase()` — reverse the order *and* swap the case.

Concatenating the letters in time order along one shape period gives the raw
word.

### 12. The algorithm

```
INPUT  : initial state y0 (three positions + three velocities),
         shape period T, and an integrator for the dynamics
OUTPUT : a word in {a, A, b, B}

1. Integrate from 0 to T, sampling densely (see pitfalls for how dense).

2. At every sample compute the signed area
       A = (x2 - x1) ^ (x3 - x1).

3. For each consecutive pair of samples with A[k] * A[k+1] < 0:

   a. Locate the crossing. Linear interpolation
          w = A[k] / (A[k] - A[k+1])
      is enough for a word; refine with Newton on A(t) if you also need the
      crossing time or the state there accurately.

   b. Interpolate the configuration to the crossing and map it to the sphere:
          n = hopf(x_crossing)

   c. Longitude:
          phi = atan2(n_y, n_x)  mod  2*pi

   d. Direction: descending if A[k+1] < A[k]  (i.e. dA/dt < 0).

   e. Emit the letter by the table of section 11; emit nothing in the free arc.

4. Concatenate in time order -> raw word.

5. Free-reduce, cyclically reduce, canonicalise (sections 13-15).
```

### 13. Reference implementation

Complete and runnable. Uses only `numpy` and `scipy`. The dynamics shown is the
homogeneous family $V=-\sum r_{ij}^{-a}$ (so $a=1$ is Newtonian gravity and
$a=2$ the strong potential), but only `word_of` matters — substitute any
integrator you like.

```python
import numpy as np
from scipy.integrate import solve_ivp

S2, S6 = np.sqrt(2.0), np.sqrt(6.0)


def hopf(x):
    """Three planar positions (3x2 array) -> unit vector on the shape sphere."""
    rho = (x[0] - x[1]) / S2
    lam = (x[0] + x[1] - 2 * x[2]) / S6
    R2 = rho @ rho + lam @ lam
    return np.array([(lam @ lam - rho @ rho) / R2,
                     -2.0 * (rho @ lam) / R2,
                     2.0 * (rho[0] * lam[1] - rho[1] * lam[0]) / R2])


def signed_area(x):
    """Zero exactly at a syzygy; same sign as n_z."""
    return np.cross(x[1] - x[0], x[2] - x[0])


def letter(lon, descending):
    """Section 11. Longitude in [0, 2pi); '' in the free arc."""
    if 0.0 < lon < 2 * np.pi / 3:
        return 'a' if descending else 'A'
    if 4 * np.pi / 3 < lon < 2 * np.pi:
        return 'b' if descending else 'B'
    return ''


def rhs(t, y, a=1.0):
    """V = -sum r^-a;  a=1 Newton, a=2 strong."""
    x = y[:6].reshape(3, 2)
    d = np.zeros((3, 2))
    for i in range(3):
        for j in range(3):
            if i != j:
                w = x[j] - x[i]
                d[i] += a * w / np.linalg.norm(w) ** (a + 2)
    return np.concatenate([y[6:], d.ravel()])


def word_of(y0, T, a=1.0, n=200000):
    """Raw word over one shape period. y0 = [x1,x2,x3, v1,v2,v3] flat."""
    s = solve_ivp(rhs, (0, T), y0, args=(a,), rtol=1e-12, atol=1e-13,
                  dense_output=True, method="DOP853")
    ts = np.linspace(0, T, n)
    X = s.sol(ts)[:6].T.reshape(-1, 3, 2)
    A = np.array([signed_area(x) for x in X])
    out = []
    for k in range(len(ts) - 1):
        if A[k] * A[k + 1] < 0.0:                      # equator crossing
            w = A[k] / (A[k] - A[k + 1])
            xm = X[k] + w * (X[k + 1] - X[k])
            nv = hopf(xm)
            lon = np.arctan2(nv[1], nv[0]) % (2 * np.pi)
            c = letter(lon, A[k + 1] < A[k])
            if c:
                out.append(c)
    return "".join(out)
```

And the word algebra:

```python
ALPHABET = "aAbB"
RANK = {c: i for i, c in enumerate(ALPHABET)}

# images of (a, b) under the six particle permutations, as outer automorphisms
PERMUTATIONS = [
    ("a", "b"),     # identity
    ("B", "aB"),    # cyclic rotation of the three bodies
    ("bA", "A"),    # its square
    ("B", "A"),     # exchange of bodies 1 and 2
    ("a", "Ba"),
    ("Ab", "b"),
]


def inverse(word):
    """Traverse the loop backwards: reverse order and invert each letter."""
    return word[::-1].swapcase()


def kappa(word):
    """Planar mirror reflection: invert each letter in place. Sends L -> -L."""
    return word.swapcase()


def free_reduce(word):
    stack = []
    for c in word:
        if c not in RANK:
            raise ValueError("use only a, A, b, B")
        if stack and stack[-1] == c.swapcase():
            stack.pop()
        else:
            stack.append(c)
    return "".join(stack)


def word_key(word):
    return len(word), tuple(RANK[c] for c in word)


def cyclic_normal(word):
    """Free reduction, then cyclic reduction, then the least rotation."""
    word = str(word).strip()
    if word in {"0", "1", "e", ""}:
        word = ""
    word = free_reduce(word)
    while len(word) > 1 and word[0] == word[-1].swapcase():
        word = word[1:-1]
    if not word:
        return ""
    return min((word[i:] + word[:i] for i in range(len(word))), key=word_key)


def substitute(word, image_a, image_b):
    image = {"a": image_a, "A": inverse(image_a),
             "b": image_b, "B": inverse(image_b)}
    return free_reduce("".join(image[c] for c in word))


def canonical(word, policy="all"):
    word = cyclic_normal(word)
    if policy == "labeled":
        return word
    if policy == "fixed_L":
        variants = [word, word[::-1]]
    elif policy == "all":
        variants = [word, inverse(word), kappa(word), word[::-1]]
    else:
        raise ValueError("unknown policy")
    return min((cyclic_normal(substitute(v, ia, ib))
                for v in variants for ia, ib in PERMUTATIONS), key=word_key)


def topology_label(word, policy="all"):
    return canonical(word, policy) or "0"


def power_root(word):
    """(primitive root, exponent).  A q-fold cover gives exponent q."""
    word = cyclic_normal(word)
    if not word:
        return "", 1
    for k in range(1, len(word) + 1):
        if len(word) % k == 0 and word[:k] * (len(word) // k) == word:
            return word[:k], len(word) // k
    return word, 1


def is_primitive(word):
    return power_root(word)[1] == 1


def is_peripheral(word):
    """True when the class is a power of a loop around a single puncture."""
    root, _ = power_root(cyclic_normal(word))
    return bool(root) and canonical(root, "all") == "a"


def is_chiral(word):
    """True when the mirror image is a different class at fixed signed L."""
    w = cyclic_normal(word)
    return canonical(w, "fixed_L") != canonical(kappa(w), "fixed_L")


def enumerate_classes(max_letters=5, primitive_only=True):
    """Every 'all'-policy class with a representative of at most that length."""
    import itertools
    seen = set()
    for n in range(max_letters + 1):
        for letters in itertools.product(ALPHABET, repeat=n):
            w = cyclic_normal("".join(letters))
            if len(w) > max_letters:
                continue
            if primitive_only and not is_primitive(w):
                continue
            seen.add(canonical(w, "all"))
    return sorted(seen, key=word_key)
```

### 14. Reducing the word

Four reductions, applied in this order. Each one quotients by a genuine
ambiguity; skipping any of them means two descriptions of the same orbit will
not compare equal.

**Free reduction.** `aA` and `bB` are the identity. Cancel adjacent inverse
pairs until none remain. A raw word from a well-resolved trajectory is usually
already reduced; cancellations mean the curve made a small excursion across a
cut and came straight back, which is homotopically nothing.

**Cyclic reduction.** Free homotopy has no basepoint, so the word is only
defined up to conjugation. Strip matching inverse letters from the two ends
(`aBAb` $\to$ `BA` $\to$ ...), then take the lexicographically least rotation
under `word_key`. This makes the representative independent of where along the
orbit you started integrating — which matters, because the starting point of a
periodic orbit is arbitrary.

**Primitive root.** If the word is $w^q$, the curve covered a shorter closed
curve $q$ times. Reduce to $w$ and record $q$ separately. Use `power_root`.
This is what converts a word read over an absolute period into the primitive
class (§8).

**Symmetry policy.** Several physically distinct-looking words describe orbits
that are the same up to relabelling the bodies or reflecting the plane. Which
ones you quotient by depends on the question:

| policy | quotients by | use when |
| --- | --- | --- |
| `labeled` | cyclic conjugacy only | the body labels are physically meaningful |
| `fixed_L` | the six particle permutations, and the reversor (word reversal) | comparing orbits at a fixed **signed** angular momentum |
| `all` | additionally the mirror $\kappa$ (case swap) and traversal reversal | a catalogue label, sign of $L$ irrelevant |

The six particle permutations act on $F_2$ as outer automorphisms, listed in
`PERMUTATIONS` above. They are rotations of the sphere by multiples of $2\pi/3$
about the $n_z$ axis (cyclic relabelling) composed with reflections
(transpositions). `canonical` takes the minimum over every variant under every
permutation, which is a brute-force orbit computation over a group of order
$6\times|{\rm variants}|$ — small enough to do exhaustively.

**Chirality.** A class is *chiral* when
`canonical(w, "fixed_L") != canonical(kappa(w), "fixed_L")`. A chiral class
contains two physically distinct families at one fixed sign of $L$, mirror
images of each other; an achiral class contains one. Equivalently: for a chiral
class the sign of $L$ carries real information, and the mirror partner is the
same class at $-L$.

### 15. Test vectors

Check any implementation against these before trusting it.

**Kinematics.**

| input | expected $\mathbf{n}$ |
| --- | --- |
| equilateral, $1\to2\to3$ counterclockwise | $(0,0,1)$ — north pole |
| equilateral, clockwise | $(0,0,-1)$ |
| any $\mathbf{x}$ with $\mathbf{x}_1=\mathbf{x}_2$ | $(1,0,0)$, longitude $0$ |
| any $\mathbf{x}$ with $\mathbf{x}_1=\mathbf{x}_3$ | $(-\tfrac12,\tfrac{\sqrt3}{2},0)$, longitude $2\pi/3$ |
| any $\mathbf{x}$ with $\mathbf{x}_2=\mathbf{x}_3$ | $(-\tfrac12,-\tfrac{\sqrt3}{2},0)$, longitude $4\pi/3$ |
| any configuration at all | $|\mathbf{n}|=1$ to machine precision |
| any configuration with $I=1$ | $1-\mathbf{n}\cdot\mathbf{c}_k=r_k^2$ exactly |

**The figure eight.** The Chenciner–Montgomery choreography, Newtonian
($a=1$), with

```
x1 = ( 0.97000436, -0.24308753)     v1 = -v3 / 2
x2 = (-0.97000436,  0.24308753)     v2 = -v3 / 2
x3 = ( 0,           0          )    v3 = (-0.93240737, -0.86473146)
T  = 6.32591398292621
```

The raw word from `word_of` is `AbaB`; `cyclic_normal` gives `aBAb`;
`canonical(..., "all")` and `canonical(..., "fixed_L")` both give **`abAB`**.
Four letters, primitive, achiral, not peripheral. If your implementation
produces `abAB` here, the sign conventions, the arc boundaries and the
direction rule are all correct simultaneously — this single test catches almost
every convention error, because getting the direction rule backwards or the
arcs swapped changes the answer.

**The Lagrange relative equilibrium.** The equilateral configuration rotating
rigidly sits at a pole forever, never crosses the equator, and gives the
**empty word**, labelled `0`. Trivial topology is a legitimate answer, not a
failure.

**Word algebra.** With the implementation of §13:

```
topology_label("a")     == "a"       is_peripheral -> True
topology_label("b")     == "a"       all single letters are the same class
topology_label("bA")    == "a"       the third peripheral loop
topology_label("ab")    == "ab"
topology_label("abAB")  == "abAB"
topology_label("aa")    == "aa"      power_root("aa") == ("a", 2)
topology_label("")      == "0"
canonical("aB", "fixed_L") != canonical("a", "fixed_L")
```

Enumerating all primitive `all`-policy classes with a representative of at most
five letters gives exactly **15**:

```
0, a, ab, aab, aaab, aabb, aaBB, abAB,
aaaab, aaabb, aaaBB, aabab, aabaB, aabAB, aaBAB
```

A correct implementation reproduces this list exactly. It is a strong test of
the permutation table and the canonicalisation, because a single wrong
automorphism image merges or splits classes and changes the count.

### 16. Pitfalls

Every one of these has actually produced a wrong answer in practice.

**Sampling too coarsely.** The crossing detector only sees a syzygy if two
consecutive samples straddle it. Two crossings inside one sample interval
cancel and both are lost. Near a close approach the shape point sweeps past a
puncture very fast, and that is exactly where crossings bunch up. Symptoms: the
word changes length when you change the sample count. Fix: refine until the
word is stable, or use the integrator's own step-by-step event detection with a
sign-change test rather than post-hoc sampling.

**Starting exactly on the equator.** A very common convention is to start at a
syzygy, which makes $\mathcal{A}(0)=0$ exactly. The product test
$\mathcal{A}_k\mathcal{A}_{k+1}<0$ can never fire on it, so that crossing is
silently dropped and the word comes out one letter short. Fix: detect the
$t=0$ syzygy as a special case and take its direction from the sign of
$\mathcal{A}$ just *after* $t=0$.

**Double counting the closing crossing.** If the orbit both starts and ends at
a syzygy, $t=0$ and $t=T$ are the *same* crossing of the closed curve. Emit it
once. Symptom: a spurious extra letter, often one that free-reduces away and
masks the problem until a case where it does not.

**Segmented integration.** If the trajectory is computed in pieces (multiple
shooting, or just restarting the integrator), the sign of $\mathcal{A}$ must be
carried across the junction. Restarting the comparison at each segment start
loses any syzygy that lands on a junction, and makes each segment emit a
spurious start letter. Symptom: the word flickers — it changes by one or two
letters at isolated parameter values as a crossing drifts across a junction.
Fix: pass the final $\mathcal{A}$ of one segment in as the initial previous
value of the next, and emit a start letter only for the very first segment.

**Getting the direction from the wrong quantity.** The direction is the sign of
$\dot n_z$, i.e. whether $\mathcal{A}$ is *increasing or decreasing* through
the crossing. It is not the sign of $\mathcal{A}$ after the crossing (which is
the same thing only if you are careful) and it is certainly not the sign of
anything at a single sample. In the $(\varphi,\vartheta)$ section coordinates
of §7, note $\vartheta$ and $u_z$ have opposite signs — an easy sign flip.

**Longitude branch.** `atan2` returns $(-\pi,\pi]$. The arc tests assume
$[0,2\pi)$. Add $2\pi$ to negatives *before* testing, or the `b`/`B` arc
$(4\pi/3,2\pi)$ never matches and every `b` is silently dropped.

**Landing on an arc boundary.** A crossing exactly at a puncture longitude is a
collision, not a crossing — the trajectory should not be there. The tests in
§11 are strict inequalities, so a boundary hit emits nothing; that is the right
failure mode, but if it happens the trajectory is passing very close to a
collision and the word is not trustworthy. Monitor
$\min_k(1-\mathbf{n}\cdot\mathbf{c}_k)$ and treat a near-miss as a numerical
warning.

**Comparing raw words.** Two integrations of the same orbit from different
starting points give different raw words. Always compare canonical forms, never
raw ones.

**Reading over the wrong period.** §8. Over $q$ shape periods you get $w^q$.
Take the primitive root.

**Case-insensitive filesystems.** If words are used in filenames — and they
usually are — `aabAB` and `aabab` are *different classes* but collide on macOS
and Windows. This silently overwrites one figure with another. Fix: encode
capitals before touching the filesystem, e.g. map each upper-case letter to a
leading marker plus its lower-case form (`aabAB` $\to$ `aab-a-b`).

**Assuming the word determines the orbit.** It does not. The topological class
is an invariant, not a complete label: distinct orbits — different periods,
different energies, genuinely different trajectories — can share a class. The
class narrows the search and organises a catalogue; it never certifies that two
solutions are the same. Confirm identity with scale-invariant metric
quantities, not with the word.

### 17. Quick reference

```
rho      = (x1 - x2)/sqrt(2)
lam      = (x1 + x2 - 2 x3)/sqrt(6)
R^2      = |rho|^2 + |lam|^2 = I
n        = ( |lam|^2-|rho|^2 , -2 rho.lam , 2 rho^lam ) / R^2      |n| = 1

north pole  n=(0,0,1)      equilateral, 1->2->3 counterclockwise
south pole  n=(0,0,-1)     its mirror image
equator     n_z = 0        collinear (syzygy)
punctures   phi = 0        r12 = 0
            phi = 2pi/3    r13 = 0
            phi = 4pi/3    r23 = 0
identity    1 - n.c_k = r_k^2   (when I = 1)
U(n)       = sum_k 1 / (1 - n.c_k)          strong potential at I = 1

signed area A = (x2-x1)^(x3-x1),  sign A = sign n_z,  A = 0 at syzygy

letter at a crossing, phi in [0,2pi), descending means dA/dt < 0:
  0     < phi < 2pi/3 :  a if descending else A
  4pi/3 < phi < 2pi   :  b if descending else B
  otherwise           :  nothing

inverse(w) = w[::-1].swapcase()        kappa(w) = w.swapcase()   (L -> -L)
reduce: free -> cyclic -> primitive root -> symmetry policy
```
