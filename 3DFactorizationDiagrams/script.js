import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const config = {
    N: 42,
    radiusFactor: 0.9,
    repulsionStrength: 0.1,
    innerOpacity: 1.0,
    showWireframes: false,
    order: 'desc', // 'desc', 'asc'
    palette: 'rainbow',
    leafStyle: 'gold',
    dt: 0.2, // Time step
};



function getLevelColor(level) {
    if (config.palette === 'cool') {
        const hue = (180 + (level * 30)) % 360; // Cyan (180) -> Blue -> Purple
        return new THREE.Color(`hsl(${hue}, 80%, 50%)`);
    }
    if (config.palette === 'warm') {
        const hue = (0 + (level * 30)) % 360; // Red (0) -> Orange -> Yellow
        // constrain to warm range approx 0-60 or 300-360? 
        // Simple cycle 0-60 is too narrow. 
        // Let's do: 0 (Red), 30 (Orange), 60 (Yellow), 330 (Rose), 300 (Magenta)
        // Or just cycle shift
        const warmHue = (level * 40) % 360;
        return new THREE.Color(`hsl(${warmHue}, 90%, 50%)`);
    }
    if (config.palette === 'pastel') {
        const hue = (level * 137.5) % 360; // Golden angle for variety
        return new THREE.Color(`hsl(${hue}, 40%, 70%)`);
    }

    // Default Rainbow
    const hue = (level * 60) % 360;
    return new THREE.Color(`hsl(${hue}, 70%, 50%)`);
}

// --- Global State ---
let scene, camera, renderer, controls;
let rootSphere = null; // Root of the physics/data tree
let spheresMeshes = []; // Flat list of meshes for easy updating
let physicsRunning = true;
let currentFactors = []; // Store for legend

// --- Factorization Logic ---
function getPrimeFactors(n) {
    const factors = [];
    let d = 2;
    let temp = n;
    while (d * d <= temp) {
        while (temp % d === 0) {
            factors.push(d);
            temp /= d;
        }
        d++;
    }
    if (temp > 1) {
        factors.push(temp);
    }
    return factors;
}

function sortFactors(factors, order) {
    if (order === 'asc') return factors.sort((a, b) => a - b);
    if (order === 'desc') return factors.sort((a, b) => b - a);
    return factors;
}

// --- Tree / Geometry Logic ---
class SphereNode {
    constructor(level, maxLevel, parent = null) {
        this.level = level;
        this.maxLevel = maxLevel;
        this.parent = parent;
        this.children = [];

        // Physics properties relative to parent center (or world origin for root)
        // Position is a Vector3
        this.position = new THREE.Vector3();
        this.velocity = new THREE.Vector3();
        this.radius = 1; // Will be calculated dynamically

        // For visualization
        this.mesh = null;
    }

    addChild(child) {
        this.children.push(child);
        child.parent = this;
    }
}

function buildTree(factors) {
    // Level 0 is the root sphere, radius fixed at 1 initially (or arbitrary base size)
    // The problem says "Initialy there is a sphere at origin with radius 1 on zeroth depth level."
    // "On that sphere there are p1 sphere centers..."
    // So factors[0] determines the number of children of the root.

    // The factors array p1, p2, ... corresponds to the branching factor at each level
    // p1 = branches at level 0 (children in level 1)
    // p2 = branches at level 1 (children in level 2)

    const root = new SphereNode(0, factors.length);
    root.radius = 40; // Initial big size
    root.position.set(0, 0, 0);

    // Recursive builder
    function grow(node, depth) {
        if (depth >= factors.length) return;

        const numChildren = factors[depth];
        for (let i = 0; i < numChildren; i++) {
            const child = new SphereNode(depth + 1, factors.length, node);

            // Random initial placement on the surface of parent
            const u = Math.random();
            const v = Math.random();
            const theta = 2 * Math.PI * u;
            const phi = Math.acos(2 * v - 1);

            const r = node.radius; // Initially place on surface
            child.position.set(
                r * Math.sin(phi) * Math.cos(theta),
                r * Math.sin(phi) * Math.sin(theta),
                r * Math.cos(phi)
            );

            node.addChild(child);
            grow(child, depth + 1);
        }
    }

    grow(root, 0);
    return root;
}

// --- Physics Engine ---

function updatePhysics() {
    if (!rootSphere) return;

    // We proceed level by level, from 1 to maxLevel
    // Level 0 is fixed at origin.

    // Collect nodes by level
    const levels = [];
    const queue = [rootSphere];
    while (queue.length > 0) {
        const node = queue.shift();
        if (!levels[node.level]) levels[node.level] = [];
        levels[node.level].push(node);
        queue.push(...node.children);
    }

    // 1. Calculate Radii for each level (except last level leaves don't strictly need radius for children, but for drawing)
    for (let l = 0; l < levels.length - 1; l++) {
        const parents = levels[l];
        for (const parent of parents) {
            if (parent.children.length === 0) continue;

            // Find min distance between children
            let minDirectDist = Infinity;

            if (parent.children.length === 1) {
                // If only 1 child, it takes the whole space? Or ratio?
                minDirectDist = parent.radius * 2; // Arbitrary max
            } else {
                for (let i = 0; i < parent.children.length; i++) {
                    const c1 = parent.children[i];
                    for (let j = i + 1; j < parent.children.length; j++) {
                        const c2 = parent.children[j];
                        const d = c1.position.distanceTo(c2.position);
                        if (d < minDirectDist) minDirectDist = d;
                    }
                }
            }

            const childRadius = (minDirectDist / 2) * config.radiusFactor;

            for (const child of parent.children) {
                child.radius = childRadius;
            }
        }
    }

    // 2. Physics Update Phase
    const k = 1000; // Coulomb constant
    const dt = config.dt;

    for (let l = 1; l < levels.length; l++) {
        const nodes = levels[l];

        // Accumulate forces
        const forces = new Map(); // node -> Vector3

        for (let i = 0; i < nodes.length; i++) {
            const n1 = nodes[i];
            const f = new THREE.Vector3();

            for (let j = 0; j < nodes.length; j++) {
                if (i === j) continue;
                const n2 = nodes[j];

                // Vector from n2 to n1
                const diff = new THREE.Vector3().subVectors(n1.position, n2.position);
                const distSq = diff.lengthSq();

                if (distSq > 0.00001) {
                    const dist = Math.sqrt(distSq);

                    const parentRad = n1.parent ? n1.parent.radius : 1.0;
                    const forceMag = (config.repulsionStrength * k * parentRad) / distSq;

                    diff.normalize().multiplyScalar(forceMag);
                    f.add(diff);
                }
            }
            forces.set(n1, f);
        }

        // Apply forces and constraints
        for (const node of nodes) {
            const force = forces.get(node);

            // Apply simple drag
            node.velocity.add(force.multiplyScalar(dt));
            node.velocity.multiplyScalar(0.9); // Damping

            node.position.add(node.velocity.clone().multiplyScalar(dt));

            // Constraint: Lock to surface of parent sphere
            if (node.parent) {
                const parentPos = node.parent.position;
                const parentRad = node.parent.radius;

                // Vector from parent to child
                const rel = new THREE.Vector3().subVectors(node.position, parentPos);
                rel.setLength(parentRad); // Snap to surface

                node.position.copy(parentPos).add(rel);
            }
        }
    }
}

// --- Visualization ---

function initScene() {
    scene = new THREE.Scene();

    // Lights for metallic effect
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 3);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 3);
    dirLight2.position.set(-10, -10, -10);
    scene.add(dirLight2);


    const pointLight = new THREE.PointLight(0xffaa00, 2, 100);
    pointLight.position.set(0, 0, 0); // Inner glow?
    scene.add(pointLight);

    // Environment map could enhance metallic look, but let's stick to standard lights for simplicity

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 300);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 4.0;

    controls.addEventListener('start', function () {
        controls.autoRotate = false;
    });

    window.addEventListener('resize', onResize);
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}



function renderLegend() {
    const legendContainer = document.getElementById('legend-container');
    if (!legendContainer) return;

    legendContainer.innerHTML = '';
    legendContainer.style.display = 'flex';

    currentFactors.forEach((factor, index) => {
        const item = document.createElement('div');
        item.className = 'legend-item';
        item.textContent = factor;

        // Color based on level index
        const col = getLevelColor(index);
        item.style.backgroundColor = `#${col.getHexString()}`;

        // Simple contrast text
        // HSL 50% lightness usually fine with black, maybe white if blue?
        // Let's stick strictly to black text as requested in previous turn implicitly or default
        item.style.color = '#000';

        legendContainer.appendChild(item);
    });
}

function getLeafMaterial() {
    switch (config.leafStyle) {
        case 'silver':
            return new THREE.MeshStandardMaterial({
                color: 0xaaaaaa, // Light grey
                metalness: 0.9,
                roughness: 0.2,
            });
        case 'blue':
            return new THREE.MeshStandardMaterial({
                color: 0x2196f3,
                metalness: 0.1,
                roughness: 0.8,
            });
        case 'red':
            return new THREE.MeshStandardMaterial({
                color: 0x000000,
                emissive: 0xff0000,
                emissiveIntensity: 2.0,
                metalness: 0.5,
                roughness: 0.5,
            });
        case 'gold':
        default:
            return new THREE.MeshStandardMaterial({
                color: 0xffd700,
                metalness: 0.8,
                roughness: 0.2,
            });
    }
}

function createGeometries(root) {
    // Clear old
    spheresMeshes.forEach(m => {
        scene.remove(m.mesh);
        if (m.mesh.geometry) m.mesh.geometry.dispose();
        if (m.mesh.material) m.mesh.material.dispose();
    });
    spheresMeshes = [];

    if (!root) return;

    const queue = [root];

    const geometry = new THREE.SphereGeometry(1, 32, 32);

    while (queue.length > 0) {
        const node = queue.shift();

        const isLeaf = node.children.length === 0;

        let material;
        if (isLeaf) {
            material = getLeafMaterial();
        } else {
            // Inner spheres - Transparent colored by level
            // Level 0 corresponds to first factor, Level 1 to second, etc.
            const colorVal = getLevelColor(node.level);

            material = new THREE.MeshPhongMaterial({
                color: colorVal,
                transparent: true,
                opacity: config.innerOpacity,
                side: THREE.FrontSide,
                wireframe: config.showWireframes
            });
        }

        const mesh = new THREE.Mesh(geometry, material);
        node.mesh = mesh;
        scene.add(mesh);
        spheresMeshes.push(node);

        queue.push(...node.children);
    }

    renderLegend();
}

function updateMeshes() {
    for (const node of spheresMeshes) {
        if (node.mesh) {
            node.mesh.position.copy(node.position);
            node.mesh.scale.setScalar(node.radius);

            // Dynamic material updates if needed
            if (!node.children.length) {
                // leaf
            } else {
                node.mesh.material.opacity = config.innerOpacity;
                node.mesh.material.wireframe = config.showWireframes;
            }
        }
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (physicsRunning) {
        updatePhysics();
    }

    updateMeshes();
    controls.update();
    renderer.render(scene, camera);
}

// --- Interaction ---

function regenerate() {
    const n = parseInt(document.getElementById('number-input').value) || 50;
    config.N = n;
    config.order = document.getElementById('factor-order').value;

    // Update mobile display
    const mobDisplay = document.getElementById('mobile-n-display');
    if (mobDisplay) mobDisplay.textContent = `N = ${n}`;

    const factors = getPrimeFactors(n);
    const sortedFactors = sortFactors(factors, config.order);
    currentFactors = sortedFactors; // Store for legend

    console.log("Factors for", n, ":", sortedFactors);

    rootSphere = buildTree(sortedFactors);
    createGeometries(rootSphere);

    // Reset camera focus roughly
    camera.position.set(0, 0, 300);
    controls.target.set(0, 0, 0);
    controls.autoRotate = true;
}

function initUI() {

    document.getElementById('number-input').addEventListener('change', regenerate);
    document.getElementById('number-input').addEventListener('input', regenerate);

    document.getElementById('factor-order').addEventListener('change', regenerate);
    document.getElementById('color-palette').addEventListener('change', () => {
        config.palette = document.getElementById('color-palette').value;
        regenerate();
    });
    document.getElementById('leaf-style').addEventListener('change', () => {
        config.leafStyle = document.getElementById('leaf-style').value;
        regenerate();
    });

    // Mobile buttons
    const numInput = document.getElementById('number-input');
    const minVal = 2;
    const maxVal = 100000;

    const btnMinus = document.getElementById('btn-minus');
    if (btnMinus) {
        btnMinus.addEventListener('click', () => {
            let val = parseInt(numInput.value) || 2;
            if (val > minVal) {
                numInput.value = val - 1;
                regenerate();
            }
        });
    }

    const btnPlus = document.getElementById('btn-plus');
    if (btnPlus) {
        btnPlus.addEventListener('click', () => {
            let val = parseInt(numInput.value) || 2;
            if (val < maxVal) {
                numInput.value = val + 1;
                regenerate();
            }
        });
    }

    document.getElementById('update-btn').addEventListener('click', regenerate);

    document.getElementById('radius-factor').addEventListener('input', (e) => {
        config.radiusFactor = parseFloat(e.target.value);
        document.getElementById('radius-factor-val').textContent = config.radiusFactor;
    });

    document.getElementById('repulsion-strength').addEventListener('input', (e) => {
        config.repulsionStrength = parseFloat(e.target.value);
        document.getElementById('repulsion-strength-val').textContent = config.repulsionStrength;
    });

    document.getElementById('time-step').addEventListener('input', (e) => {
        config.dt = parseFloat(e.target.value);
        document.getElementById('time-step-val').textContent = config.dt;
    });

    document.getElementById('opacity-levels').addEventListener('input', (e) => {
        config.innerOpacity = parseFloat(e.target.value);
        document.getElementById('opacity-levels-val').textContent = config.innerOpacity;
    });

    document.getElementById('show-wireframes').addEventListener('change', (e) => {
        config.showWireframes = e.target.checked;
    });

    const collapseHeader = document.querySelector('.collapsible-header');
    collapseHeader.addEventListener('click', () => {
        collapseHeader.classList.toggle('active');
        document.querySelector('.collapsible-content').classList.toggle('active');
    });

    const toggleBtn = document.getElementById('mobile-toggle');
    if (toggleBtn) {
        toggleBtn.addEventListener('click', () => {
            document.getElementById('ui-container').classList.toggle('hidden');
            toggleBtn.classList.toggle('collapsed');
        });
    }

    // Initial generation
    regenerate();
}

// --- Boot ---
initScene();
initUI();
animate();


