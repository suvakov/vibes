// --- Global State ---
const state = {
    w1: 0,
    w2: 0,
    w3: 10, // Start at North Pole (Equilateral)
    radius: 10,
    hemisphere: 1 // 1 for North, -1 for South
};

// --- DOM Elements ---
const sphereCanvas = document.getElementById('sphereCanvas');
const projectionCanvas = document.getElementById('projectionCanvas');
const triangleCanvas = document.getElementById('triangleCanvas');
const hemisphereBtn = document.getElementById('hemisphereBtn');

// --- Three.js Setup (Sphere) ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050505);

const camera = new THREE.PerspectiveCamera(45, sphereCanvas.clientWidth / sphereCanvas.clientHeight, 0.1, 1000);
camera.position.set(25, 15, 25);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ canvas: sphereCanvas, antialias: true });
renderer.setSize(sphereCanvas.clientWidth, sphereCanvas.clientHeight);

// OrbitControls is usually attached to THREE in global builds or available as global
const Controls = THREE.OrbitControls || window.OrbitControls;
const controls = new Controls(camera, sphereCanvas);
controls.enableDamping = true;

// Lighting
const ambientLight = new THREE.AmbientLight(0x404040, 2);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xffffff, 2);
dirLight.position.set(10, 20, 10);
scene.add(dirLight);

// Sphere Mesh
const geometry = new THREE.SphereGeometry(state.radius, 32, 32);
const material = new THREE.MeshPhongMaterial({
    color: 0x222222,
    transparent: true,
    opacity: 0.8,
    wireframe: false,
    shininess: 50
});
const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Wireframe helper
const wireframe = new THREE.LineSegments(
    new THREE.WireframeGeometry(geometry),
    new THREE.LineBasicMaterial({ color: 0x444444, transparent: true, opacity: 0.3 })
);
scene.add(wireframe);

// Markers
const currentPointGeometry = new THREE.SphereGeometry(0.5, 16, 16);
const currentPointMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const currentPointMesh = new THREE.Mesh(currentPointGeometry, currentPointMaterial);
scene.add(currentPointMesh);

// Special Points & Lines
function addSpecialFeatures() {
    const R = state.radius;

    const colPoints = [
        new THREE.Vector3(-R, 0, 0),
        new THREE.Vector3(R / 2, R * Math.sqrt(3) / 2, 0),
        new THREE.Vector3(R / 2, -R * Math.sqrt(3) / 2, 0)
    ];

    const colGeo = new THREE.SphereGeometry(0.4, 16, 16);
    const colMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });

    colPoints.forEach(p => {
        const m = new THREE.Mesh(colGeo, colMat);
        // Map w1 -> x, w3 -> y (up), w2 -> z
        m.position.set(p.x, 0, p.y);
        scene.add(m);
    });

    // Isosceles Lines (Great Circles connecting Poles to Collisions)
    // These are great circles passing through Poles (0, R, 0) and Collision Points.
    const isoLineMat = new THREE.LineBasicMaterial({ color: 0x00ffff, opacity: 0.5, transparent: true });

    colPoints.forEach(p => {
        const points = [];
        // Circle in plane of P and Y-axis (w3 axis)
        // P in Three.js is (p.x, 0, p.y)
        const u = new THREE.Vector3(p.x, 0, p.y).normalize();
        const v = new THREE.Vector3(0, 1, 0); // Y axis (w3)

        for (let i = 0; i <= 64; i++) {
            const theta = (i / 64) * Math.PI * 2;
            const pt = new THREE.Vector3()
                .copy(u).multiplyScalar(Math.cos(theta) * R)
                .add(new THREE.Vector3().copy(v).multiplyScalar(Math.sin(theta) * R));
            points.push(pt);
        }

        const geo = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geo, isoLineMat);
        scene.add(line);
    });

    // Right Triangle Circles
    // These are circles formed by the intersection of vertical planes connecting collision points.
    // 1. w1 = R/2 (Connects C2 and C3)
    // 2. Rotated by 120 deg
    // 3. Rotated by 240 deg
    const rightLineMat = new THREE.LineBasicMaterial({ color: 0xffff00, opacity: 0.8, transparent: true });

    // Base circle: w1 = R/2. In Three.js: x = R/2.
    // y (w3) and z (w2) form a circle of radius sqrt(R^2 - (R/2)^2) = R*sqrt(3)/2.
    const rRight = R * Math.sqrt(3) / 2;
    const basePoints = [];
    for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        // x = R/2
        // y = rRight * cos(theta)
        // z = rRight * sin(theta)
        basePoints.push(new THREE.Vector3(R / 2, rRight * Math.cos(theta), rRight * Math.sin(theta)));
    }

    // Create 3 circles by rotating the base points around Y axis (w3)
    for (let k = 0; k < 3; k++) {
        const angle = k * 2 * Math.PI / 3;
        const rotatedPoints = basePoints.map(p => {
            const pClone = p.clone();
            pClone.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
            return pClone;
        });
        const geo = new THREE.BufferGeometry().setFromPoints(rotatedPoints);
        const line = new THREE.Line(geo, rightLineMat);
        scene.add(line);
    }

    // Equator (w3 = 0) -> In Three.js (x, 0, z)
    const eqPoints = [];
    for (let i = 0; i <= 64; i++) {
        const theta = (i / 64) * Math.PI * 2;
        eqPoints.push(new THREE.Vector3(R * Math.cos(theta), 0, R * Math.sin(theta)));
    }
    const eqGeo = new THREE.BufferGeometry().setFromPoints(eqPoints);
    const eqLine = new THREE.Line(eqGeo, new THREE.LineBasicMaterial({ color: 0xffaa00 }));
    scene.add(eqLine);
}

function updateSphereMarker() {
    // w1 -> x, w3 -> y, w2 -> z
    currentPointMesh.position.set(state.w1, state.w3, state.w2);
}

addSpecialFeatures();
updateSphereMarker();

// Raycaster
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

sphereCanvas.addEventListener('pointerdown', onSphereClick);

function onSphereClick(event) {
    const rect = sphereCanvas.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(sphere);

    if (intersects.length > 0) {
        const p = intersects[0].point;
        state.w1 = p.x;
        state.w3 = p.y;
        state.w2 = p.z;

        const currentR = Math.sqrt(state.w1 ** 2 + state.w2 ** 2 + state.w3 ** 2);
        if (currentR > 0.001) {
            state.w1 *= state.radius / currentR;
            state.w2 *= state.radius / currentR;
            state.w3 *= state.radius / currentR;
        }

        // Update hemisphere state based on clicked point
        state.hemisphere = state.w3 >= 0 ? 1 : -1;
        updateHemisphereUI();

        updateSphereMarker();
        drawProjection();
        drawTriangle();
    }
}

// --- 2D Projection ---
function updateHemisphereUI() {
    hemisphereBtn.textContent = state.hemisphere === 1 ? 'North' : 'South';
    // Optional: Change button style or projection background slightly
}

hemisphereBtn.addEventListener('click', () => {
    state.hemisphere *= -1;
    // Flip w3 if we just switched view, to keep the point "under the cursor" in the new view?
    // Or just switch view and keep w1, w2 same (so point flips to other side)?
    // Let's flip the point to the other hemisphere so it remains visible in the projection.
    state.w3 = -state.w3;

    updateHemisphereUI();
    updateSphereMarker();
    drawProjection();
    drawTriangle();
});

function drawProjection() {
    const ctx = projectionCanvas.getContext('2d');
    const w = projectionCanvas.width = projectionCanvas.clientWidth;
    const h = projectionCanvas.height = projectionCanvas.clientHeight;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (Math.min(w, h) / 2) * 0.8 / state.radius;

    ctx.clearRect(0, 0, w, h);

    // Disk
    ctx.beginPath();
    ctx.arc(cx, cy, state.radius * scale, 0, Math.PI * 2);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.stroke();
    // Darker background for South, Lighter for North?
    ctx.fillStyle = state.hemisphere === 1 ? '#111' : '#1a1a2e';
    ctx.fill();

    // Collision Points (w3=0)
    const colPoints = [
        { x: -state.radius, y: 0 },
        { x: state.radius / 2, y: state.radius * Math.sqrt(3) / 2 },
        { x: state.radius / 2, y: -state.radius * Math.sqrt(3) / 2 }
    ];

    // Right Triangle Lines (Chords connecting collision points)
    ctx.strokeStyle = '#ffff00';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx + colPoints[0].x * scale, cy + colPoints[0].y * scale);
    ctx.lineTo(cx + colPoints[1].x * scale, cy + colPoints[1].y * scale);
    ctx.lineTo(cx + colPoints[2].x * scale, cy + colPoints[2].y * scale);
    ctx.closePath();
    ctx.stroke();

    // Isosceles Lines (Diameters passing through collision points)
    ctx.strokeStyle = '#00ffff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    colPoints.forEach(p => {
        // Line from -P to P (Diameter)
        ctx.beginPath();
        ctx.moveTo(cx - p.x * scale, cy - p.y * scale);
        ctx.lineTo(cx + p.x * scale, cy + p.y * scale);
        ctx.stroke();
    });
    ctx.globalAlpha = 1.0;

    // Draw Collision Points
    ctx.fillStyle = '#ff0000';
    colPoints.forEach(p => {
        ctx.beginPath();
        ctx.arc(cx + p.x * scale, cy + p.y * scale, 4, 0, Math.PI * 2);
        ctx.fill();
    });

    // Current Point - Only draw if in current hemisphere (or close to equator)
    // Actually, we should draw it but maybe ghosted if on other side?
    // But the interaction logic flips it to this side if we click.
    // If we just rotated the sphere, w3 might be opposite.
    // Let's draw it solid if sign matches, hollow if not?
    // Or just draw it.

    const isVisible = (state.w3 * state.hemisphere) >= -0.1; // Tolerance

    if (isVisible) {
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.arc(cx + state.w1 * scale, cy + state.w2 * scale, 6, 0, Math.PI * 2);
        ctx.fill();
    } else {
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx + state.w1 * scale, cy + state.w2 * scale, 5, 0, Math.PI * 2);
        ctx.stroke();
    }

    // Text removed as requested
}

projectionCanvas.addEventListener('pointerdown', (e) => {
    const rect = projectionCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const w = projectionCanvas.width;
    const h = projectionCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (Math.min(w, h) / 2) * 0.8 / state.radius;

    // Shift functionality removed as requested

    let w1 = (x - cx) / scale;
    let w2 = (y - cy) / scale;

    const dist = Math.sqrt(w1 * w1 + w2 * w2);
    if (dist > state.radius) {
        w1 *= state.radius / dist;
        w2 *= state.radius / dist;
    }

    state.w1 = w1;
    state.w2 = w2;
    const w3sq = state.radius ** 2 - w1 ** 2 - w2 ** 2;
    // Use current hemisphere state for sign of w3
    state.w3 = state.hemisphere * Math.sqrt(Math.max(0, w3sq));

    updateSphereMarker();
    drawProjection();
    drawTriangle();
});


// --- Triangle Rendering ---
function drawTriangle() {
    const ctx = triangleCanvas.getContext('2d');
    const w = triangleCanvas.width = triangleCanvas.clientWidth;
    const h = triangleCanvas.height = triangleCanvas.clientHeight;
    const cx = w / 2;
    const cy = h / 2;

    ctx.clearRect(0, 0, w, h);

    const I = state.radius;
    const w1 = state.w1;
    const w2 = state.w2;
    const w3 = state.w3;

    const rho1Mag = Math.sqrt((I + w1) / 2);
    const rho2Mag = Math.sqrt((I - w1) / 2);

    const rho1 = { x: rho1Mag, y: 0 };

    let rho2x = 0, rho2y = 0;
    if (rho1Mag > 0.001) {
        rho2x = w2 / (2 * rho1Mag);
        rho2y = w3 / (2 * rho1Mag);
    } else {
        rho2x = rho2Mag;
        rho2y = 0;
    }

    const rho2 = { x: rho2x, y: rho2y };

    const s2 = Math.sqrt(2);
    const s6 = Math.sqrt(6);
    const s23 = Math.sqrt(2 / 3);

    const r1 = {
        x: -rho1.x / s2 - rho2.x / s6,
        y: -rho1.y / s2 - rho2.y / s6
    };
    const r2 = {
        x: rho1.x / s2 - rho2.x / s6,
        y: rho1.y / s2 - rho2.y / s6
    };
    const r3 = {
        x: s23 * rho2.x,
        y: s23 * rho2.y
    };

    const scale = Math.min(w, h) / (Math.sqrt(I) * 2.5);

    ctx.beginPath();
    ctx.moveTo(cx + r1.x * scale, cy - r1.y * scale);
    ctx.lineTo(cx + r2.x * scale, cy - r2.y * scale);
    ctx.lineTo(cx + r3.x * scale, cy - r3.y * scale);
    ctx.closePath();

    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = 'rgba(100, 108, 255, 0.2)';
    ctx.fill();

    ctx.fillStyle = '#ff0000';
    [r1, r2, r3].forEach((r, i) => {
        ctx.beginPath();
        ctx.arc(cx + r.x * scale, cy - r.y * scale, 4, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#aaa';
        ctx.fillText(i + 1, cx + r.x * scale + 8, cy - r.y * scale);
        ctx.fillStyle = '#ff0000';
    });
}

// --- Animation Loop ---
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
}

// Init
drawProjection();
drawTriangle();
animate();

// Handle Resize
window.addEventListener('resize', () => {
    camera.aspect = sphereCanvas.clientWidth / sphereCanvas.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sphereCanvas.clientWidth, sphereCanvas.clientHeight);

    drawProjection();
    drawTriangle();
});
