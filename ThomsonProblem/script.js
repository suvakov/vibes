
// Global variables
let scene, camera, renderer, controls;
let pointsMesh = [];
let hullMesh = null;
let sphereMesh = null;
let isRunning = false;
let nElectrons = 12;
let simulation = null;

// Simulation Parameters
let populationSize = 20;
let mutationRate = 0.2;
let learningRate = 0.01;
let convergenceThreshold = 1e-8;

// Visual Parameters
let lineWidth = 3;
let sphereOpacity = 0.15;
let edgeVisibility = new Map(); // Key: length string, Value: boolean

// Constants
const RADIUS = 1;

class ThomsonSimulation {
    constructor(n) {
        this.n = n;
        this.populationSize = populationSize;
        this.population = [];
        this.bestConfig = null;
        this.bestEnergy = Infinity;

        this.initPopulation();
    }

    initPopulation() {
        this.population = [];
        for (let i = 0; i < this.populationSize; i++) {
            const config = this.createRandomConfig();
            // Initial local optimization
            this.gradientDescent(config, 0.1);
            const energy = this.calculateEnergy(config);
            this.population.push({ points: config, energy: energy });
        }
        this.updateBest();
    }

    createRandomConfig() {
        const points = [];
        for (let i = 0; i < this.n; i++) {
            points.push(this.randomPointOnSphere());
        }
        return points;
    }

    randomPointOnSphere() {
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);
        const x = Math.sin(phi) * Math.cos(theta);
        const y = Math.sin(phi) * Math.sin(theta);
        const z = Math.cos(phi);
        return new THREE.Vector3(x, y, z);
    }

    calculateEnergy(points) {
        let energy = 0;
        for (let i = 0; i < points.length; i++) {
            for (let j = i + 1; j < points.length; j++) {
                const dist = points[i].distanceTo(points[j]);
                if (dist > 1e-9) {
                    energy += 1 / dist;
                } else {
                    energy += 1e9; // Penalty for collision
                }
            }
        }
        return energy;
    }

    updateBest() {
        this.population.sort((a, b) => a.energy - b.energy);
        if (this.population[0].energy < this.bestEnergy) {
            this.bestEnergy = this.population[0].energy;
            this.bestConfig = this.population[0].points.map(p => p.clone());
        }
    }

    step() {
        const initialBestEnergy = this.bestEnergy;

        // 1. Rigorous Gradient Descent on ALL individuals
        // This ensures every individual is at a local minimum before selection
        for (let ind of this.population) {
            this.gradientDescent(ind.points, learningRate);
            ind.energy = this.calculateEnergy(ind.points);
        }

        this.updateBest(); // Update best after GD

        // 2. Genetic Algorithm Step
        const numToReplace = Math.floor(this.populationSize / 2);

        for (let i = 0; i < numToReplace; i++) {
            const p1 = this.tournamentSelect();
            const p2 = this.tournamentSelect();

            let childPoints = this.crossover(p1.points, p2.points);
            this.mutate(childPoints);

            // Initial GD on child to get it into shape
            this.gradientDescent(childPoints, learningRate * 5); // Faster initial descent

            const childEnergy = this.calculateEnergy(childPoints);

            // Replace a poor individual
            const replaceIdx = this.populationSize - 1 - i;
            this.population[replaceIdx] = { points: childPoints, energy: childEnergy };
        }

        this.updateBest();

        return Math.abs(initialBestEnergy - this.bestEnergy);
    }

    gradientDescent(points, lr) {
        const maxIter = 10000; // Safety break
        let iter = 0;
        let deltaEnergy = Infinity;
        let currentEnergy = this.calculateEnergy(points);

        while (deltaEnergy > convergenceThreshold && iter < maxIter) {
            const forces = new Array(points.length).fill(0).map(() => new THREE.Vector3());

            for (let i = 0; i < points.length; i++) {
                for (let j = i + 1; j < points.length; j++) {
                    const diff = new THREE.Vector3().subVectors(points[i], points[j]);
                    const distSq = diff.lengthSq();
                    const dist = Math.sqrt(distSq);

                    if (dist > 1e-9) {
                        const forceMag = 1 / (distSq * dist);
                        const force = diff.multiplyScalar(forceMag);
                        forces[i].add(force);
                        forces[j].sub(force);
                    }
                }
            }

            for (let i = 0; i < points.length; i++) {
                const normal = points[i].clone();
                const dot = forces[i].dot(normal);
                forces[i].sub(normal.multiplyScalar(dot));

                points[i].addScaledVector(forces[i], lr);
                points[i].normalize();
            }

            const newEnergy = this.calculateEnergy(points);
            deltaEnergy = Math.abs(currentEnergy - newEnergy);
            currentEnergy = newEnergy;
            iter++;
        }
    }

    tournamentSelect() {
        const k = 3;
        let best = null;
        for (let i = 0; i < k; i++) {
            const ind = this.population[Math.floor(Math.random() * this.population.length)];
            if (!best || ind.energy < best.energy) {
                best = ind;
            }
        }
        return best;
    }

    crossover(parentA, parentB) {
        const normal = this.randomPointOnSphere();
        const child = [];

        for (let p of parentA) {
            if (p.dot(normal) >= 0) child.push(p.clone());
        }

        for (let p of parentB) {
            if (p.dot(normal) < 0) child.push(p.clone());
        }

        while (child.length < this.n) {
            child.push(this.randomPointOnSphere());
        }
        while (child.length > this.n) {
            let minDist = Infinity;
            let removeIdx = -1;
            for (let i = 0; i < child.length; i++) {
                for (let j = i + 1; j < child.length; j++) {
                    const d = child[i].distanceTo(child[j]);
                    if (d < minDist) {
                        minDist = d;
                        removeIdx = i;
                    }
                }
            }
            if (removeIdx !== -1) {
                child.splice(removeIdx, 1);
            } else {
                child.pop();
            }
        }
        return child;
    }

    mutate(points) {
        if (Math.random() < mutationRate) {
            const idx = Math.floor(Math.random() * points.length);
            const perturbation = this.randomPointOnSphere().multiplyScalar(0.2);
            points[idx].add(perturbation).normalize();
        }
    }
}

function init() {
    // UI Setup
    const nInput = document.getElementById('n-input');
    const popInput = document.getElementById('pop-input');
    const mutInput = document.getElementById('mut-input');
    const lrInput = document.getElementById('lr-input');
    const convInput = document.getElementById('conv-input');
    const widthInput = document.getElementById('width-input');
    const opacityInput = document.getElementById('opacity-input');

    const resetBtn = document.getElementById('reset-btn');
    const energyDisplay = document.getElementById('energy-display');
    const statusDisplay = document.getElementById('status-display');
    const edgeListContainer = document.getElementById('edge-list-container');

    // New UI Elements
    const uiContainer = document.getElementById('ui-container');
    const uiToggle = document.getElementById('ui-toggle');
    const minimizeBtn = document.getElementById('minimize-btn');
    const infoBtn = document.getElementById('info-btn');
    const infoModal = document.getElementById('info-modal');
    const closeModal = document.querySelector('.close-modal');

    // Initial Values
    nElectrons = parseInt(nInput.value);
    populationSize = parseInt(popInput.value);
    mutationRate = parseFloat(mutInput.value);
    learningRate = parseFloat(lrInput.value);
    convergenceThreshold = Math.pow(10, -parseInt(convInput.value));
    lineWidth = parseInt(widthInput.value);
    sphereOpacity = parseFloat(opacityInput.value);

    // Three.js Setup
    const container = document.getElementById('canvas-container');
    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0, 3.5);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.0;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 5, 5);
    scene.add(dirLight);
    const backLight = new THREE.DirectionalLight(0x444455, 0.5);
    backLight.position.set(-5, -5, -5);
    scene.add(backLight);

    // Base Sphere
    const sphereGeo = new THREE.SphereGeometry(0.98, 64, 64);
    const sphereMat = new THREE.MeshPhongMaterial({
        color: 0x111119,
        transparent: true,
        opacity: sphereOpacity,
        shininess: 50,
        side: THREE.DoubleSide,
        depthWrite: false
    });
    sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
    scene.add(sphereMesh);

    // Initialize Simulation
    resetSimulation();

    // Event Listeners
    resetBtn.addEventListener('click', () => {
        nElectrons = parseInt(nInput.value);
        populationSize = parseInt(popInput.value);
        resetSimulation();
    });

    nInput.addEventListener('change', () => {
        nElectrons = parseInt(nInput.value);
        resetSimulation();
    });

    popInput.addEventListener('change', () => {
        populationSize = parseInt(popInput.value);
        // Don't reset immediately, maybe? Or yes, because population changes structure.
        resetSimulation();
    });

    mutInput.addEventListener('change', () => {
        mutationRate = parseFloat(mutInput.value);
    });

    lrInput.addEventListener('change', () => {
        learningRate = parseFloat(lrInput.value);
    });

    convInput.addEventListener('change', () => {
        convergenceThreshold = Math.pow(10, -parseInt(convInput.value));
    });

    widthInput.addEventListener('input', () => {
        lineWidth = parseInt(widthInput.value);
        updateVisualization();
    });

    opacityInput.addEventListener('input', () => {
        sphereOpacity = parseFloat(opacityInput.value);
        if (sphereMesh) sphereMesh.material.opacity = sphereOpacity;
    });

    // UI Toggle Logic
    minimizeBtn.addEventListener('click', () => {
        uiContainer.classList.add('hidden');
        uiToggle.style.display = 'block';
    });

    uiToggle.addEventListener('click', () => {
        uiContainer.classList.remove('hidden');
        uiToggle.style.display = 'none';
    });

    // Initially hide toggle since UI is open
    uiToggle.style.display = 'none';

    // Modal Logic
    infoBtn.addEventListener('click', () => {
        infoModal.style.display = 'block';
    });

    closeModal.addEventListener('click', () => {
        infoModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target == infoModal) {
            infoModal.style.display = 'none';
        }
    });

    window.addEventListener('resize', onWindowResize);

    animate();
}

function resetSimulation() {
    simulation = new ThomsonSimulation(nElectrons);
    edgeVisibility.clear(); // Reset visibility toggles
    updateVisualization();
    document.getElementById('energy-display').textContent = simulation.bestEnergy.toFixed(6);
    document.getElementById('edge-list-container').style.display = 'none';

    // Auto-start
    isRunning = true;
    document.getElementById('status-display').textContent = 'Running';
    controls.autoRotate = false;
}

function renderEdgeList() {
    const listContainer = document.getElementById('edge-list');
    listContainer.innerHTML = '';

    if (!simulation || !simulation.bestConfig) return;

    // We need to re-calculate groups to list them
    // This logic is duplicated from updateVisualization, ideally refactor
    const groups = calculateEdgeGroups(simulation.bestConfig);

    groups.forEach((g, idx) => {
        const hue = (idx * 137.508) % 360;
        const color = `hsl(${hue}, 100%, 60%)`;
        const lenStr = g.len.toFixed(6);

        // Check visibility state (default true)
        const isVisible = edgeVisibility.has(lenStr) ? edgeVisibility.get(lenStr) : true;

        const item = document.createElement('div');
        item.className = 'edge-item';
        item.innerHTML = `
            <input type="checkbox" ${isVisible ? 'checked' : ''} data-len="${lenStr}">
            <span class="edge-color" style="background-color: ${color};"></span>
            <div class="edge-info">
                <span class="edge-len">Len: ${lenStr}</span>
                <span class="edge-count">(${g.edges.length})</span>
            </div>
        `;

        item.querySelector('input').addEventListener('change', (e) => {
            edgeVisibility.set(lenStr, e.target.checked);
            updateVisualization();
        });

        listContainer.appendChild(item);
    });
}

function calculateEdgeGroups(points) {
    if (points.length < 4 || !THREE.ConvexGeometry) return [];

    const geometry = new THREE.ConvexGeometry(points);
    const vertices = geometry.attributes.position.array;
    const getVertexKey = (v) => `${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`;
    const uniqueEdges = new Map();

    for (let i = 0; i < vertices.length; i += 9) {
        const v1 = new THREE.Vector3(vertices[i], vertices[i + 1], vertices[i + 2]);
        const v2 = new THREE.Vector3(vertices[i + 3], vertices[i + 4], vertices[i + 5]);
        const v3 = new THREE.Vector3(vertices[i + 6], vertices[i + 7], vertices[i + 8]);
        processEdge(v1, v2);
        processEdge(v2, v3);
        processEdge(v3, v1);
    }

    function processEdge(a, b) {
        const ka = getVertexKey(a);
        const kb = getVertexKey(b);
        if (ka === kb) return;
        const key = ka < kb ? `${ka}|${kb}` : `${kb}|${ka}`;
        if (!uniqueEdges.has(key)) {
            uniqueEdges.set(key, { start: a, end: b, len: a.distanceTo(b) });
        }
    }

    const edges = Array.from(uniqueEdges.values());
    const groups = [];
    const threshold = 1e-2;

    edges.forEach(edge => {
        let foundGroup = null;
        for (let g of groups) {
            if (Math.abs(g.len - edge.len) < threshold) {
                foundGroup = g;
                break;
            }
        }
        if (foundGroup) {
            foundGroup.edges.push(edge);
        } else {
            groups.push({ len: edge.len, edges: [edge] });
        }
    });

    // Sort groups by length
    groups.sort((a, b) => a.len - b.len);
    return groups;
}

function updateVisualization() {
    if (!simulation || !simulation.bestConfig) return;

    const points = simulation.bestConfig;

    // 1. Update Points (Electrons)
    pointsMesh.forEach(mesh => scene.remove(mesh));
    pointsMesh = [];

    const pointGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const pointMat = new THREE.MeshPhongMaterial({ color: 0x00ffff, emissive: 0x004444 });

    points.forEach(p => {
        const mesh = new THREE.Mesh(pointGeo, pointMat);
        mesh.position.copy(p);
        scene.add(mesh);
        pointsMesh.push(mesh);
    });

    // 2. Update Convex Hull & Wireframe
    if (hullMesh) {
        scene.remove(hullMesh);
        hullMesh = null;
    }

    const groups = calculateEdgeGroups(points);
    if (groups.length > 0) {
        hullMesh = new THREE.Group();

        groups.forEach((g, idx) => {
            const lenStr = g.len.toFixed(6);
            // Check visibility
            if (edgeVisibility.has(lenStr) && !edgeVisibility.get(lenStr)) return;

            const hue = (idx * 137.508) % 360;
            const color = new THREE.Color(`hsl(${hue}, 100%, 60%)`);
            const material = new THREE.MeshPhongMaterial({
                color: color,
                shininess: 30
            });

            // Cylinder radius based on lineWidth input
            // lineWidth 1-10 maps to radius 0.002 - 0.02
            const radius = lineWidth * 0.002;

            g.edges.forEach(e => {
                const start = e.start;
                const end = e.end;
                const direction = new THREE.Vector3().subVectors(end, start);
                const length = direction.length();

                const geometry = new THREE.CylinderGeometry(radius, radius, length, 8, 1);
                const cylinder = new THREE.Mesh(geometry, material);

                // Position at midpoint
                cylinder.position.copy(start).add(end).multiplyScalar(0.5);

                // Orient
                cylinder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());

                hullMesh.add(cylinder);
            });
        });

        scene.add(hullMesh);
    }
}

function animate() {
    requestAnimationFrame(animate);

    if (isRunning && simulation) {
        const delta = simulation.step();
        updateVisualization();
        document.getElementById('energy-display').textContent = simulation.bestEnergy.toFixed(6);

        // Auto-stop if converged
        if (delta < convergenceThreshold) {
            isRunning = false;
            document.getElementById('status-display').textContent = 'Converged';
            controls.autoRotate = true; // Keep rotating nicely

            renderEdgeList();
            document.getElementById('edge-list-container').style.display = 'block';
        }
    }

    controls.update();
    renderer.render(scene, camera);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Start
init();
