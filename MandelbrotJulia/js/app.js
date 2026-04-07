// app.js — Main fractal explorer application
(function () {
  'use strict';

  // ─── Formula labels ────────────────────────────────────
  const FORMULAS = {
    0:  { name: 'z² + c',   tex: 'z_{n+1} = z_n² + c' },
    1:  { name: 'z³ + c',   tex: 'z_{n+1} = z_n³ + c' },
    2:  { name: 'z⁴ + c',   tex: 'z_{n+1} = z_n⁴ + c' },
    3:  { name: 'Burning Ship', tex: 'z_{n+1} = (|Re(z_n)| + i|Im(z_n)|)² + c' },
    4:  { name: 'Tricorn',     tex: 'z_{n+1} = conj(z_n)² + c' },
    5:  { name: 'z⁵ + c',   tex: 'z_{n+1} = z_n⁵ + c' },
    6:  { name: 'z⁶ + c',   tex: 'z_{n+1} = z_n⁶ + c' },
    7:  { name: 'Celtic',      tex: 'z_{n+1} = |Re(z_n²)| + i·Im(z_n²) + c' },
    8:  { name: 'Buffalo',     tex: 'z_{n+1} = |Re(z_n²)| - |Im(z_n²)| - 2i|Re·Im| + c' },
    9:  { name: 'Perp Burning Ship', tex: 'z_{n+1} = Re(z)² - Im(z)² - 2i|Re(z)|Im(z) + c' },
    10: { name: 'sin(z)·c + c', tex: 'z_{n+1} = sin(z_n)·c + c' },
    11: { name: 'z² + z + c',   tex: 'z_{n+1} = z_n² + z_n + c' },
    12: { name: 'z²·c + c',     tex: 'z_{n+1} = z_n²·c + c' },
  };

  // ─── State ─────────────────────────────────────────────
  const S = {
    center: { hi: [-0.5, 0.0], lo: [0.0, 0.0] },
    zoom: 0.35,
    maxIter: 200,
    fractalType: 0,
    paletteIndex: 0,
    paletteOffset: 0,
    smooth: true,
    autoIter: true,
    cycleColors: false,
    cycleSpeed: 1,
    showAxes: false,
    bailout: 256,
    juliaC: [0, 0],
    juliaMode: false,
    juliaCenter: { hi: [0, 0], lo: [0, 0] },
    juliaZoom: 0.35,
    dragging: false,
    dragStart: [0, 0],
    dragCenterStart: { hi: [0, 0], lo: [0, 0] },
    mousePos: [0, 0],
    dirty: true,
    juliaDirty: true,
    precisionMode: 'standard',
    refOrbitReady: false,
    refOrbitLen: 0,
  };

  // ─── DOM ───────────────────────────────────────────────
  const mainCanvas = document.getElementById('main-canvas');
  const juliaCanvas = document.getElementById('julia-canvas');
  const juliaCont = document.getElementById('julia-container');
  const infoCoords = document.getElementById('coordinates');
  const infoZoom = document.getElementById('zoom-level');
  const infoPrecision = document.getElementById('precision-indicator');
  const optPanel = document.getElementById('options-panel');
  const backBtn = document.getElementById('back-to-mandelbrot');
  const formulaDisp = document.getElementById('formula-display');

  // Controls
  const ctrlFractal = document.getElementById('fractal-type');
  const ctrlIter = document.getElementById('max-iter');
  const ctrlIterDisp = document.getElementById('iter-display');
  const ctrlPalette = document.getElementById('palette-select');
  const ctrlOffset = document.getElementById('palette-offset');
  const ctrlSmooth = document.getElementById('smooth-coloring');
  const ctrlAutoIter = document.getElementById('auto-iter');
  const ctrlCycle = document.getElementById('cycle-colors');
  const ctrlCycleSpeed = document.getElementById('cycle-speed');
  const ctrlCycleGroup = document.getElementById('cycle-speed-group');
  const ctrlAxes = document.getElementById('show-crosshair');
  const ctrlReset = document.getElementById('reset-view');
  const ctrlPalettePreview = document.getElementById('palette-preview');

  // ─── Renderers ─────────────────────────────────────────
  const mainR = new Renderer(mainCanvas);
  const juliaR = new Renderer(juliaCanvas);

  // ─── Formula Display ──────────────────────────────────
  function updateFormula() {
    if (formulaDisp) {
      const f = FORMULAS[S.fractalType] || FORMULAS[0];
      formulaDisp.textContent = f.tex;
    }
  }

  // ─── Palette Setup ─────────────────────────────────────
  function setupPalettes() {
    const sel = ctrlPalette;
    sel.innerHTML = '';
    Palettes.list.forEach(function (p, i) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = p.name;
      sel.appendChild(opt);
    });
    uploadPalette(0);
  }

  function uploadPalette(idx) {
    const pal = Palettes.list[idx];
    const data = Palettes.generateTexture(pal, 2048);
    mainR.uploadPalette(data, 2048);
    juliaR.uploadPalette(data, 2048);
    updatePalettePreview(data, 2048);
    S.dirty = true;
    S.juliaDirty = true;
  }

  function updatePalettePreview(data, size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, 1);
    imgData.data.set(data);
    ctx.putImageData(imgData, 0, 0);
    ctrlPalettePreview.style.backgroundImage = 'url(' + canvas.toDataURL() + ')';
  }

  // ─── Precision Switching ───────────────────────────────
  // Lower threshold: at zoom ~1e3, single float starts losing precision
  function determinePrecision() {
    const zoom = S.juliaMode ? S.juliaZoom : S.zoom;
    // For all fractal types that support DD
    if (zoom > 500) {
      if (zoom > 5e12 && S.fractalType === 0) return 'perturbation';
      return 'double-double';
    }
    return 'standard';
  }

  function updatePrecision() {
    const newMode = determinePrecision();
    if (newMode !== S.precisionMode) {
      S.precisionMode = newMode;
      S.refOrbitReady = false;
      S.dirty = true;
    }
  }

  // ─── Reference Orbit ──────────────────────────────────
  function computeRefOrbit() {
    if (S.precisionMode !== 'perturbation' || S.refOrbitReady) return;
    const c = S.juliaMode ? S.juliaCenter : S.center;
    const result = Perturbation.computeReferenceOrbit(
      { hi: c.hi[0], lo: c.lo[0] },
      { hi: c.hi[1], lo: c.lo[1] },
      S.maxIter,
      S.bailout
    );
    mainR.uploadRefOrbit(result.data, result.length);
    S.refOrbitLen = result.length;
    S.refOrbitReady = true;
  }

  // ─── Rendering ─────────────────────────────────────────
  function renderMain() {
    const isJulia = S.juliaMode;
    updatePrecision();

    if (S.precisionMode === 'perturbation') {
      computeRefOrbit();
    }

    const prec = S.precisionMode;
    const key = (isJulia ? 'julia' : 'mandelbrot') + '_' + prec + '_ft' + S.fractalType;
    let fSrc;
    if (prec === 'double-double') fSrc = Shaders.fragDoubleDouble();
    else if (prec === 'perturbation') fSrc = Shaders.fragPerturbation();
    else fSrc = Shaders.fragStandard();

    const prog = mainR.getProgram(key, Shaders.VERT, fSrc);
    if (!prog) return;

    const c = isJulia ? S.juliaCenter : S.center;
    const zoom = isJulia ? S.juliaZoom : S.zoom;

    const uniforms = {
      u_resolution: [mainCanvas.width, mainCanvas.height],
      u_zoom: zoom,
      u_maxIter: S.maxIter,
      u_fractalType: S.fractalType,
      u_julia: isJulia,
      u_juliaC: S.juliaC,
      u_smooth: S.smooth,
      u_paletteOffset: S.paletteOffset,
      u_bailout: S.bailout,
      u_showAxes: S.showAxes,
    };

    if (prec === 'double-double') {
      uniforms.u_center_hi = c.hi;
      uniforms.u_center_lo = c.lo;
    } else if (prec === 'perturbation') {
      uniforms.u_refLen = S.refOrbitLen;
      uniforms.u_deltaC_offset = [0, 0];
    } else {
      uniforms.u_center = [c.hi[0] + c.lo[0], c.hi[1] + c.lo[1]];
    }

    mainR.render(prog, uniforms);
    mainR.setIntUniforms(prog, {
      u_maxIter: S.maxIter,
      u_fractalType: S.fractalType,
      u_julia: isJulia ? 1 : 0,
      u_smooth: S.smooth ? 1 : 0,
      u_showAxes: S.showAxes ? 1 : 0,
    });
    if (prec === 'perturbation') {
      mainR.setIntUniforms(prog, { u_refLen: S.refOrbitLen });
    }
  }

  function renderJulia() {
    if (S.juliaMode) return;
    const key = 'julia_preview_ft' + S.fractalType;
    const fSrc = Shaders.fragStandard();
    const prog = juliaR.getProgram(key, Shaders.VERT, fSrc);
    if (!prog) return;

    const uniforms = {
      u_resolution: [juliaCanvas.width, juliaCanvas.height],
      u_center: [0, 0],
      u_zoom: 0.35,
      u_maxIter: Math.min(S.maxIter, 500),
      u_fractalType: S.fractalType,
      u_julia: true,
      u_juliaC: S.juliaC,
      u_smooth: S.smooth,
      u_paletteOffset: S.paletteOffset,
      u_bailout: S.bailout,
      u_showAxes: false,
    };

    juliaR.render(prog, uniforms);
    juliaR.setIntUniforms(prog, {
      u_maxIter: Math.min(S.maxIter, 500),
      u_fractalType: S.fractalType,
      u_julia: 1,
      u_smooth: S.smooth ? 1 : 0,
      u_showAxes: 0,
    });
  }

  // ─── Auto-Iterations ──────────────────────────────────
  function autoAdjustIterations() {
    if (!S.autoIter) return;
    const zoom = S.juliaMode ? S.juliaZoom : S.zoom;
    const iters = Math.max(200, Math.floor(200 + 80 * Math.log2(Math.max(1, zoom))));
    const clamped = Math.min(10000, iters);
    if (clamped !== S.maxIter) {
      S.maxIter = clamped;
      ctrlIter.value = clamped;
      ctrlIterDisp.textContent = clamped;
      S.refOrbitReady = false;
    }
  }

  // ─── Screen <-> Complex ────────────────────────────────
  function screenToComplex(sx, sy) {
    const w = mainCanvas.clientWidth || window.innerWidth;
    const h = mainCanvas.clientHeight || window.innerHeight;
    const aspect = Math.min(w, h);
    const ux = (sx - w * 0.5) / aspect;
    const uy = -(sy - h * 0.5) / aspect;
    const c = S.juliaMode ? S.juliaCenter : S.center;
    const zoom = S.juliaMode ? S.juliaZoom : S.zoom;
    return [
      c.hi[0] + c.lo[0] + ux / zoom,
      c.hi[1] + c.lo[1] + uy / zoom,
    ];
  }

  function addToCenter(center, dx, dy) {
    const newX = center.hi[0] + dx;
    const errX = dx - (newX - center.hi[0]);
    const newY = center.hi[1] + dy;
    const errY = dy - (newY - center.hi[1]);
    return {
      hi: [newX, newY],
      lo: [center.lo[0] + errX, center.lo[1] + errY],
    };
  }

  // ─── Event Handlers ────────────────────────────────────
  function onWheel(e) {
    e.preventDefault();
    const rect = mainCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    const zoomFactor = e.deltaY < 0 ? 1.3 : 1 / 1.3;
    const [cx, cy] = screenToComplex(mx, my);

    const c = S.juliaMode ? S.juliaCenter : S.center;
    const zoom = S.juliaMode ? S.juliaZoom : S.zoom;
    const cCenter = [c.hi[0] + c.lo[0], c.hi[1] + c.lo[1]];

    const newZoom = zoom * zoomFactor;
    const dx = (cx - cCenter[0]) * (1 - 1 / zoomFactor);
    const dy = (cy - cCenter[1]) * (1 - 1 / zoomFactor);
    const newCenter = addToCenter(c, dx, dy);

    if (S.juliaMode) {
      S.juliaCenter = newCenter;
      S.juliaZoom = newZoom;
    } else {
      S.center = newCenter;
      S.zoom = newZoom;
    }

    autoAdjustIterations();
    S.dirty = true;
    S.refOrbitReady = false;
  }

  function onMouseDown(e) {
    if (e.button !== 0) return;
    S.dragging = true;
    S.dragStart = [e.clientX, e.clientY];
    const c = S.juliaMode ? S.juliaCenter : S.center;
    S.dragCenterStart = { hi: [...c.hi], lo: [...c.lo] };
    mainCanvas.style.cursor = 'grabbing';
  }

  function onMouseMove(e) {
    const rect = mainCanvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    S.mousePos = [mx, my];

    if (S.dragging) {
      const dx = e.clientX - S.dragStart[0];
      const dy = e.clientY - S.dragStart[1];
      const aspect = Math.min(mainCanvas.clientWidth || window.innerWidth, mainCanvas.clientHeight || window.innerHeight);
      const zoom = S.juliaMode ? S.juliaZoom : S.zoom;
      const cdx = -dx / aspect / zoom;
      const cdy = dy / aspect / zoom;
      const newCenter = addToCenter(S.dragCenterStart, cdx, cdy);
      if (S.juliaMode) {
        S.juliaCenter = newCenter;
      } else {
        S.center = newCenter;
      }
      S.dirty = true;
      S.refOrbitReady = false;
    }

    if (!S.juliaMode && !S.dragging) {
      const [cx, cy] = screenToComplex(mx, my);
      S.juliaC = [cx, cy];
      S.juliaDirty = true;
    }

    updateInfoBar();
  }

  function onMouseUp() {
    S.dragging = false;
    mainCanvas.style.cursor = 'crosshair';
  }

  function onDblClick(e) {
    e.preventDefault();
    if (!S.juliaMode) {
      const rect = mainCanvas.getBoundingClientRect();
      const [cx, cy] = screenToComplex(e.clientX - rect.left, e.clientY - rect.top);
      S.juliaC = [cx, cy];
      S.juliaMode = true;
      S.juliaCenter = { hi: [0, 0], lo: [0, 0] };
      S.juliaZoom = 0.35;
      juliaCont.classList.add('hidden');
      backBtn.classList.remove('hidden');
      S.dirty = true;
      S.refOrbitReady = false;
      autoAdjustIterations();
    }
  }

  function exitJulia() {
    S.juliaMode = false;
    juliaCont.classList.remove('hidden');
    backBtn.classList.add('hidden');
    S.dirty = true;
    S.juliaDirty = true;
    S.refOrbitReady = false;
    autoAdjustIterations();
  }

  function onKeyDown(e) {
    if (e.key === 'Escape' && S.juliaMode) exitJulia();
  }

  // Touch support
  let touchDist = 0;
  function onTouchStart(e) {
    if (e.touches.length === 1) {
      onMouseDown({ button: 0, clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      touchDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      S.dragging = false;
    }
  }

  function onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      onMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
    } else if (e.touches.length === 2) {
      const t1 = e.touches[0], t2 = e.touches[1];
      const newDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
      const ratio = newDist / touchDist;
      const zoom = S.juliaMode ? S.juliaZoom : S.zoom;
      if (S.juliaMode) S.juliaZoom = zoom * ratio;
      else S.zoom = zoom * ratio;
      touchDist = newDist;
      S.dirty = true;
      S.refOrbitReady = false;
      autoAdjustIterations();
    }
  }

  function onTouchEnd() { S.dragging = false; }

  // ─── UI Controls ───────────────────────────────────────
  function setupControls() {
    ctrlFractal.addEventListener('change', function () {
      S.fractalType = parseInt(this.value);
      mainR.invalidatePrograms();
      juliaR.invalidatePrograms();
      S.dirty = true;
      S.juliaDirty = true;
      S.refOrbitReady = false;
      updateFormula();
    });

    ctrlIter.addEventListener('input', function () {
      S.maxIter = parseInt(this.value);
      ctrlIterDisp.textContent = this.value;
      S.dirty = true;
      S.juliaDirty = true;
      S.refOrbitReady = false;
    });

    ctrlPalette.addEventListener('change', function () {
      S.paletteIndex = parseInt(this.value);
      uploadPalette(S.paletteIndex);
    });

    ctrlOffset.addEventListener('input', function () {
      S.paletteOffset = parseFloat(this.value);
      S.dirty = true;
      S.juliaDirty = true;
    });

    ctrlSmooth.addEventListener('change', function () {
      S.smooth = this.checked;
      S.dirty = true;
      S.juliaDirty = true;
    });

    ctrlAutoIter.addEventListener('change', function () {
      S.autoIter = this.checked;
      if (this.checked) autoAdjustIterations();
    });

    ctrlCycle.addEventListener('change', function () {
      S.cycleColors = this.checked;
      ctrlCycleGroup.style.display = this.checked ? 'block' : 'none';
    });

    ctrlCycleSpeed.addEventListener('input', function () {
      S.cycleSpeed = parseFloat(this.value);
    });

    ctrlAxes.addEventListener('change', function () {
      S.showAxes = this.checked;
      S.dirty = true;
      S.juliaDirty = true;
    });

    ctrlReset.addEventListener('click', function () {
      S.center = { hi: [-0.5, 0.0], lo: [0.0, 0.0] };
      S.zoom = 0.35;
      S.maxIter = 200;
      S.paletteOffset = 0;
      ctrlIter.value = 200;
      ctrlIterDisp.textContent = '200';
      ctrlOffset.value = 0;
      S.dirty = true;
      S.juliaDirty = true;
      S.refOrbitReady = false;
      if (S.juliaMode) exitJulia();
    });

    backBtn.addEventListener('click', exitJulia);

    const toggleBtn = document.getElementById('toggle-panel');
    toggleBtn.addEventListener('click', function () {
      optPanel.classList.toggle('collapsed');
      this.textContent = optPanel.classList.contains('collapsed') ? '▶' : '◀';
    });
  }

  // ─── Info Bar ──────────────────────────────────────────
  function updateInfoBar() {
    const [cx, cy] = screenToComplex(S.mousePos[0], S.mousePos[1]);
    const sign = cy >= 0 ? '+' : '-';
    infoCoords.textContent = `c = ${cx.toFixed(12)} ${sign} ${Math.abs(cy).toFixed(12)}i`;
    const zoom = S.juliaMode ? S.juliaZoom : S.zoom;
    const exp = Math.log10(zoom);
    infoZoom.textContent = `Zoom: ${zoom.toExponential(2)} (10^${exp.toFixed(1)})`;
    const mode = S.precisionMode;
    const label = mode === 'standard' ? 'FP32' : mode === 'double-double' ? 'FP32×2' : 'Perturbation';
    infoPrecision.textContent = label;
    infoPrecision.className = 'prec-' + mode;
  }

  // ─── Animation Loop ────────────────────────────────────
  let lastTime = 0;
  function loop(time) {
    requestAnimationFrame(loop);
    const dt = (time - lastTime) / 1000;
    lastTime = time;

    if (S.cycleColors) {
      S.paletteOffset = (S.paletteOffset + dt * S.cycleSpeed * 0.1) % 1.0;
      ctrlOffset.value = S.paletteOffset;
      S.dirty = true;
      S.juliaDirty = true;
    }

    if (S.dirty) {
      renderMain();
      S.dirty = false;
    }

    if (S.juliaDirty && !S.juliaMode) {
      renderJulia();
      S.juliaDirty = false;
    }

    updateInfoBar();
  }

  // ─── Init ──────────────────────────────────────────────
  function init() {
    // Force canvas to full viewport size immediately
    const dpr = window.devicePixelRatio || 1;
    mainCanvas.width = window.innerWidth * dpr;
    mainCanvas.height = window.innerHeight * dpr;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      mainCanvas.width = window.innerWidth * dpr;
      mainCanvas.height = window.innerHeight * dpr;
      S.dirty = true;
      S.juliaDirty = true;
    }
    window.addEventListener('resize', resize);

    setupPalettes();
    setupControls();
    updateFormula();

    // Events
    mainCanvas.addEventListener('wheel', onWheel, { passive: false });
    mainCanvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    mainCanvas.addEventListener('dblclick', onDblClick);
    document.addEventListener('keydown', onKeyDown);

    // Touch
    mainCanvas.addEventListener('touchstart', onTouchStart, { passive: false });
    mainCanvas.addEventListener('touchmove', onTouchMove, { passive: false });
    mainCanvas.addEventListener('touchend', onTouchEnd);

    mainCanvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Initial render
    S.dirty = true;
    S.juliaDirty = true;
    requestAnimationFrame(loop);

    // Ensure correct sizing after layout
    requestAnimationFrame(function () {
      resize();
      S.dirty = true;
      S.juliaDirty = true;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
