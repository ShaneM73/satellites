import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { DRACOLoader } from '../vendor/loaders/DRACOLoader.js';
import { RoomEnvironment } from '../vendor/environments/RoomEnvironment.js';
import { SATELLITES } from './data.js';

// ------------------------------------------------------------------ model catalogue
const GOLD = '#ffd54a';
const MODELS = {
  landsat9: {
    url: 'assets/models/landsat9.glb',
    name: 'Landsat 9',
    kicker: 'Launched Sep 27, 2021 · operational',
    body: 'Landsat 9 carries two pushbroom instruments: OLI-2 for visible to shortwave-infrared light and TIRS-2 for heat. It flies with Landsat 8 so that together they revisit every spot every 8 days.',
    specs: [
      ['Instruments', 'OLI-2 (9 bands) + TIRS-2 (2 thermal bands)'],
      ['Resolution', '30 m multispectral, 15 m pan, 100 m thermal'],
      ['Radiometry', '14-bit (OLI-2)'],
      ['Swath', '185 km, 16-day repeat'],
      ['Orbit', '705 km, sun-synchronous'],
    ],
    shells: ['Spacecraft'],
    paths: ['OLI2_LightPath', 'TIRS2_LightPath'],
    focusSkip: ['Spacecraft'],
    sizeAdj: 0.6, // sized by its inner modules, so shrink to match the other spacecraft
    view: { dir: [1, 0.55, 1.1], dist: 2.1 },
    modules: {
      Spacecraft: ['Bus & solar array', 'The spacecraft bus carries power, pointing, propulsion and communications. A single solar wing tracks the Sun.'],
      OLI2_Optics: ['OLI-2 telescope', 'Operational Land Imager 2: a four-mirror telescope focusing light onto 14 focal-plane modules with thousands of detectors per band, so a whole 185 km line is imaged at once (pushbroom).'],
      OLI2_LightPath: ['OLI-2 light path', 'Sunlight reflected from Earth enters the aperture and bounces off mirrors M1–M4 to the focal plane.'],
      TIRS2: ['TIRS-2 structure', 'Thermal Infrared Sensor 2 measures emitted heat in two bands near 10.9 and 12.0 µm, used for land surface temperature and water use.'],
      TIRS2_Optics: ['TIRS-2 optics', 'A germanium-lens telescope and quantum-well (QWIP) detectors cooled to about 43 K by a cryocooler. A scene-select mirror rotates to view calibration targets.'],
      TIRS2_LightPath: ['TIRS-2 infrared path', 'Thermal radiation path through the scene-select mirror and lens stack to the detectors.'],
      GPS: ['GPS antennas', 'Zenith-pointing antennas give precise position and time, needed to geolocate every pixel.'],
      SBand: ['S-band antenna', 'Telemetry, tracking and command link with ground stations.'],
      XBand: ['X-band antenna', 'Earth-coverage antenna that downlinks the science imagery.'],
      StarTrackers: ['Star trackers', 'Cameras that recognize star patterns to measure the spacecraft’s orientation.'],
      ReactionWheels: ['Reaction wheels', 'Spinning wheels that turn the spacecraft without using fuel.'],
      Propulsion: ['Propulsion', 'Hydrazine tank and thrusters for orbit adjustments and end-of-life disposal.'],
      Battery: ['Battery', 'Stores solar power for the night side of each orbit.'],
      Avionics: ['Avionics / C&DH', 'Command and data handling: the flight computer and solid-state recorder.'],
    },
    // Detailed labels in model coordinates (from the original viewer). pr = shown in overview.
    labels: [
      { m: 'OLI2_Optics', pr: 1, t: 'OLI-2 Land Imager', p: [-9.0, -21.0, 1.8] },
      { m: 'OLI2_Optics', t: 'Shutter wheel', p: [-9.55, -21.0, 4.95] },
      { m: 'OLI2_Optics', t: 'Diffuser wheel', p: [-10.15, -21.0, -1.5] },
      { m: 'OLI2_Optics', t: 'Stim lamps', p: [-9.3, -18.4, 4.0] },
      { m: 'OLI2_Optics', t: 'M1 primary mirror', p: [3.6, -21.0, 1.4] },
      { m: 'OLI2_Optics', t: 'M2 secondary', p: [-6.8, -21.0, -0.8] },
      { m: 'OLI2_Optics', t: 'M3 tertiary', p: [2.8, -21.0, -1.6] },
      { m: 'OLI2_Optics', t: 'M4 quaternary', p: [-4.6, -21.0, 4.2] },
      { m: 'OLI2_Optics', t: 'Focal plane (14 SCAs)', p: [3.2, -21.0, 4.8] },
      { m: 'OLI2_Optics', t: 'FPA radiator', p: [4.1, -21.0, 5.87] },
      { m: 'OLI2_LightPath', pr: 1, t: 'Light path', p: [-11.0, -21.0, 1.8] },
      { m: 'TIRS2', pr: 1, t: 'TIRS-2 Thermal Sensor', p: [-9.0, -6.5, -6.5] },
      { m: 'TIRS2', t: 'Cryocooler + radiator', p: [-5.2, -3.9, -1.3] },
      { m: 'TIRS2_Optics', pr: 1, t: 'TIRS-2 optics', p: [-5.2, -6.5, -4.5] },
      { m: 'TIRS2_Optics', t: 'Scene-select mirror', p: [-5.2, -6.5, -6.5] },
      { m: 'TIRS2_Optics', t: 'Ge lens telescope', p: [-5.2, -6.5, -3.6] },
      { m: 'TIRS2_Optics', t: 'QWIP arrays (43 K)', p: [-5.2, -6.5, -1.3] },
      { m: 'TIRS2_Optics', t: 'Blackbody calibrator', p: [-5.2, -6.5, -8.8] },
      { m: 'GPS', pr: 1, t: 'GPS antennas', p: [13.0, -20.0, 7.6] },
      { m: 'SBand', pr: 1, t: 'S-band omni', p: [13.2, -23.6, -2.6] },
      { m: 'XBand', pr: 1, t: 'X-band antenna', p: [-11.5, 3.5, -4.0] },
      { m: 'StarTrackers', pr: 1, t: 'Star trackers', p: [-8.5, -15.0, 7.2] },
      { m: 'ReactionWheels', pr: 1, t: 'Reaction wheels', p: [9.0, -13.0, 0.0] },
      { m: 'Propulsion', pr: 1, t: 'Hydrazine tank', p: [0.5, 7.5, 0.0] },
      { m: 'Propulsion', t: 'Thrusters', p: [0.0, -29.8, 0.0] },
      { m: 'Battery', pr: 1, t: 'Battery', p: [6.0, 0.5, -6.0] },
      { m: 'Avionics', pr: 1, t: 'Avionics', p: [6.0, 0.5, 6.0] },
    ],
    fix(root) {
      root.traverse(n => {
        if (!n.isMesh) return;
        const m = n.material;
        if (n.name === 'Spacecraft') {
          // tint the solar wing (flat panel above y≈20) as photovoltaic cells
          const pos = n.geometry.attributes.position;
          const col = new Float32Array(pos.count * 3);
          const cell = new THREE.Color('#2a4b9b'), bus = new THREE.Color('#ffffff');
          for (let i = 0; i < pos.count; i++) {
            const c = pos.getY(i) > 20 ? cell : bus;
            col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
          }
          n.geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
          m.vertexColors = true;
          m.color.set('#d9dee5'); m.metalness = 0.55; m.roughness = 0.42;
        }
        if (/LightPath/.test(n.name)) { m.transparent = true; m.depthWrite = false; m.side = THREE.DoubleSide; }
      });
    },
  },

  landsat7: {
    url: 'assets/models/landsat7.glb',
    name: 'Landsat 7',
    kicker: 'Launched Apr 15, 1999 · decommissioned Jun 4, 2025',
    body: 'Landsat 7’s single instrument, ETM+, used an oscillating scan mirror to sweep across the ground track (whiskbroom). Its scan-line corrector failed in 2003, leaving wedge-shaped gaps in later images.',
    specs: [
      ['Instrument', 'ETM+ (8 bands)'],
      ['Resolution', '30 m multispectral, 15 m pan, 60 m thermal'],
      ['Radiometry', '8-bit'],
      ['Swath', '185 km, 16-day repeat'],
      ['Service', '1999–2025; science ended 2024'],
    ],
    shells: ['External_Hardware', 'Bus_Gold_MLI', 'ETM_Housing'],
    paths: ['ETM_LightPath', 'ETM_ThermalPath'],
    focusSkip: ['Solar_Array'],
    view: { dir: [1.1, 0.5, 1], dist: 2.2 },
    modules: {
      External_Hardware: ['External hardware', 'Antennas, booms, sunshades and structure on the outside of the spacecraft.'],
      Solar_Array: ['Solar array', 'A single deployable solar wing powered the spacecraft and its batteries.'],
      Bus_Gold_MLI: ['Bus (gold MLI)', 'The spacecraft body, wrapped in gold-coloured multilayer insulation that keeps electronics within safe temperatures.'],
      ETM_Housing: ['ETM+ housing', 'Enhanced Thematic Mapper Plus: the instrument enclosure on the Earth-facing side.'],
      ETM_ScanMirror: ['Scan mirror', 'Oscillates back and forth about 7 times a second, sweeping detectors across the 185 km swath (whiskbroom). Play with Spin off to watch it.'],
      ETM_Optics: ['ETM+ telescope', 'Ritchey–Chrétien telescope that focuses the scanned light onto the focal planes.'],
      ETM_Cooler: ['Radiative cooler', 'Radiates heat to space to chill the cold focal plane for the shortwave and thermal infrared detectors.'],
      ETM_LightPath: ['Reflected light path', 'Visible and near-infrared light from the scan mirror through the telescope.'],
      ETM_ThermalPath: ['Thermal path', 'Infrared path to the cooled focal plane for band 6 (thermal).'],
    },
    labels: null, // generated from module bounding boxes
    fix(root) {
      root.traverse(n => {
        if (!n.isMesh) return;
        const mats = Array.isArray(n.material) ? n.material : [n.material];
        for (const m of mats) {
          const nm = m.name || '';
          if (/^(body|rest)/.test(nm)) { m.color.set('#e0a63c'); m.metalness = 1; m.roughness = 0.36; }
          else if (/SolarPanelSolar/.test(nm)) { m.color.set('#1f3a82'); m.metalness = 0.5; m.roughness = 0.28; }
          else if (/solarpanelback/.test(nm)) { m.color.set('#7c828c'); m.metalness = 0.4; m.roughness = 0.6; }
          else if (/WhiteFlat/.test(nm)) { m.metalness = 0; m.roughness = 0.75; }
          else if (/^mirror/.test(nm)) { m.metalness = 1; m.roughness = 0.08; m.color.set('#b9c2cc'); }
          else if (/silver|hardware|Hardware|comm|backend/.test(nm)) { m.color.set('#cdd3db'); m.metalness = 0.85; m.roughness = 0.3; }
          else m.roughness = Math.max(m.roughness, 0.25);
        }
        if (/Path/.test(n.name)) for (const m of mats) { m.transparent = true; m.depthWrite = false; }
      });
    },
  },
};

// ---- NASA 3D Resources models (github.com/nasa/NASA-3D-Resources, free and without copyright)
const NASA = {
  terra:      { name: 'Terra', sat: 'terra' },
  aqua:       { name: 'Aqua', sat: 'aqua' },
  aura:       { name: 'Aura', sat: 'aura' },
  landsat8:   { name: 'Landsat 8', sat: 'landsat8' },
  icesat2:    { name: 'ICESat-2', sat: 'icesat2' },
  gpm:        { name: 'GPM Core', sat: 'gpm' },
  oco2:       { name: 'OCO-2', sat: 'oco2' },
  snpp:       { name: 'Suomi NPP', sat: 'snpp' },
  goes:       { name: 'GOES', sat: 'goes19', note: 'NASA’s generic GOES model; the current GOES-R series (GOES-16 to -19) differs in detail.' },
  sentinel6:  { name: 'Sentinel-6', sat: 's6b', note: 'Model of the Jason Continuity of Service (Sentinel-6) design shared by 6A and 6B.' },
  grace:      { name: 'GRACE', sat: 'gracefo', note: 'Model of the original GRACE (2002–2017); its successor GRACE-FO uses a very similar twin-satellite design.' },
  landsat123: { name: 'Landsat 1–3', hidden: true, launched: '1972, 1975, 1978', sensors: 'MSS (~80 m), RBV cameras', status: 'Retired by 1983',
                text: 'The first civilian Earth-resources satellites, based on the Nimbus weather-satellite bus.' },
  landsat45:  { name: 'Landsat 4–5', hidden: true, launched: '1982, 1984', sensors: 'MSS, Thematic Mapper (30 m)', status: 'Landsat 5 ran a record 29 years, to 2013',
                text: 'Introduced the Thematic Mapper, the first 30 m Landsat sensor.' },
};
for (const [k, n] of Object.entries(NASA)) {
  const s = SATELLITES.find(x => x.id === n.sat) || {};
  MODELS[k] = {
    simple: true,
    url: `assets/models/nasa/${k}.glb`,
    name: n.name,
    kicker: `Launched ${n.launched || s.launched} · ${n.status || s.status}`,
    body: [n.text || s.text, n.note].filter(Boolean).join(' '),
    specs: [['Sensors', n.sensors || s.sensors], ['Status', n.status || s.status]],
    shells: [], paths: [], focusSkip: [], modules: {}, labels: [],
    view: { dir: [1, 0.45, 1.1], dist: 1.9 },
    hidden: n.hidden,
    fix(root) {
      root.traverse(o => {
        if (!o.isMesh) return;
        for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
          if (m.roughness !== undefined) m.roughness = Math.max(m.roughness, 0.28);
          const nm = m.name || '';
          if (/gold/i.test(nm)) { m.metalness = 1; m.roughness = 0.4; m.color.multiplyScalar(1.5); }
          else if (/silver|foil|mli/i.test(nm)) { m.metalness = 0.8; m.roughness = Math.min(m.roughness, 0.45); }
        }
      });
    },
  };
}

const LINEAGE = [
  { key: 'landsat123', year: '1972', label: 'Landsat 1–3' },
  { key: 'landsat45', year: '1982', label: 'Landsat 4–5' },
  { key: 'landsat7', year: '1999', label: 'Landsat 7' },
  { key: 'landsat8', year: '2013', label: 'Landsat 8' },
  { key: 'landsat9', year: '2021', label: 'Landsat 9' },
];
const LINEAGE_TEXT = {
  title: 'Landsat 1 to 9',
  kicker: 'Five generations since 1972',
  body: 'Each generation sharpened the view of Earth’s land: from 80 m MSS pixels in 1972 to 30 m Thematic Mapper in 1982 and 14-bit pushbroom imaging today. Models are shown at the same size, not to scale.',
  rows: [
    ['1972', 'Landsat 1–3', 'MSS, ~80 m, 4 bands'],
    ['1982', 'Landsat 4–5', 'Thematic Mapper, 30 m, 7 bands'],
    ['1999', 'Landsat 7', 'ETM+, adds 15 m pan'],
    ['2013', 'Landsat 8', 'OLI pushbroom + TIRS'],
    ['2021', 'Landsat 9', 'OLI-2 (14-bit) + TIRS-2'],
  ],
};

const COMPARE = {
  title: 'Landsat 7 vs Landsat 9',
  kicker: 'Two generations, 22 years apart',
  body: 'The biggest change is how the sensor scans. ETM+ swept one mirror across the track; OLI-2 uses long detector arrays that see the whole swath at once, with no moving scan mirror and much finer brightness levels.',
  rows: [
    ['', 'Landsat 7 ETM+', 'Landsat 9 OLI-2 / TIRS-2'],
    ['Scanning', 'Whiskbroom (mirror)', 'Pushbroom (arrays)'],
    ['Bands', '8', '11 (9 + 2 thermal)'],
    ['Pixel size', '30 m · 15 m pan · 60 m TIR', '30 m · 15 m pan · 100 m TIR'],
    ['Radiometry', '8-bit (256 levels)', '14-bit (16,384 levels)'],
    ['Service', '1999–2025', '2021–present'],
  ],
};

// ------------------------------------------------------------------ scene
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.setClearColor(0x000000, 0);
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.55;

const sun = new THREE.DirectionalLight(0xfff4e0, 2.6);
sun.position.set(6, 4, 3);
scene.add(sun);
const earthshine = new THREE.DirectionalLight(0x5f8fd8, 0.6);
earthshine.position.set(-3, -5, -2);
scene.add(earthshine);

{ // stars
  const n = 2500, pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(80 + Math.random() * 60); pos.set([v.x, v.y, v.z], i * 3); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ color: 0xffffff, size: 1, sizeAttenuation: false, transparent: true, opacity: 0.7 })));
}

const camera = new THREE.PerspectiveCamera(38, window.innerWidth / window.innerHeight, 0.01, 500);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 0.6;
controls.maxDistance = 30;

function updateViewOffset() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  if (w > 760) camera.setViewOffset(w, h, -200, 0, w, h);
  else camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  camera.updateProjectionMatrix();
}
updateViewOffset();
window.addEventListener('resize', () => { updateViewOffset(); renderer.setSize(window.innerWidth, window.innerHeight); });

// ------------------------------------------------------------------ loading
const draco = new DRACOLoader().setDecoderPath('vendor/draco/').setDecoderConfig({ type: 'wasm' });
const loader = new GLTFLoader().setDRACOLoader(draco);
const loaded = {}; // key -> instance
const FOCUS_SIZE = 3;

function prepare(key, gltf) {
  const cfg = MODELS[key];
  const root = gltf.scene;
  // own copy of every material so highlighting never leaks between meshes
  root.traverse(n => {
    if (!n.isMesh) return;
    n.material = Array.isArray(n.material) ? n.material.map(m => m.clone()) : n.material.clone();
  });
  cfg.fix(root);

  // modules = top-level named nodes
  const modules = {};
  root.updateMatrixWorld(true);
  for (const node of root.children) {
    const meshes = [];
    node.traverse(n => { if (n.isMesh) meshes.push(n); });
    const mats = meshes.flatMap(m => (Array.isArray(m.material) ? m.material : [m.material]));
    mats.forEach(m => { m.userData.base = { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite, emissive: m.emissive ? m.emissive.clone() : null, ei: m.emissiveIntensity }; });
    const box = new THREE.Box3().setFromObject(node);
    modules[node.name] = { node, meshes, mats, box, center: box.getCenter(new THREE.Vector3()), basePos: node.position.clone(), offset: new THREE.Vector3() };
  }

  // normalize: centre and scale the main body (excluding long arrays) to FOCUS_SIZE
  const focus = new THREE.Box3();
  for (const [k, m] of Object.entries(modules)) if (!cfg.focusSkip.includes(k)) focus.union(m.box);
  const size = focus.getSize(new THREE.Vector3());
  const scale = (FOCUS_SIZE * (cfg.sizeAdj || 1)) / Math.max(size.x, size.y, size.z);
  const center = focus.getCenter(new THREE.Vector3());

  const pivot = new THREE.Group();     // spins
  const holder = new THREE.Group();    // normalizes
  holder.scale.setScalar(scale);
  holder.position.copy(center).multiplyScalar(-scale);
  holder.add(root);
  pivot.add(holder);

  // explode directions (in root space) away from the focus centre
  const span = Math.max(size.x, size.y, size.z);
  for (const [k, m] of Object.entries(modules)) {
    const d = m.center.clone().sub(center);
    if (d.lengthSq() < 1e-6) d.set(0, 1, 0);
    m.dir = d.normalize().multiplyScalar(span * 0.55);
    m.isShell = cfg.shells.includes(k);
  }

  // labels
  let labels = cfg.labels;
  if (!labels) labels = Object.entries(modules).map(([k, m]) => ({ m: k, pr: 1, t: cfg.modules[k]?.[0] || k, p: m.center.toArray() }));
  const labelEls = labels.map(l => {
    const el = document.createElement('div');
    el.className = 'part-label' + (l.pr ? '' : ' minor');
    el.textContent = l.t;
    const mesh = modules[l.m]?.mats[0];
    el.style.setProperty('--c', mesh ? '#' + mesh.color.getHexString() : GOLD);
    el.style.opacity = 0;
    document.getElementById('labels').appendChild(el);
    return el;
  });

  let mixer = null;
  if (gltf.animations?.length) {
    mixer = new THREE.AnimationMixer(root);
    gltf.animations.forEach(a => mixer.clipAction(a).play());
  }
  return { key, cfg, root, pivot, holder, modules, labels, labelEls, mixer };
}

function load(key) {
  if (loaded[key]) return Promise.resolve(loaded[key]);
  return new Promise((resolve, reject) => loader.load(MODELS[key].url, g => { loaded[key] = prepare(key, g); resolve(loaded[key]); }, undefined, reject));
}

// ------------------------------------------------------------------ state
const state = { view: 'landsat9', explode: 0, xray: false, paths: true, labels: true, spin: true, highlight: null };
let active = []; // instances currently shown

const $ = id => document.getElementById(id);

// view keys: landsat9 | landsat7 | compare | lineage | gallery/<model>
const isMulti = v => v === 'compare' || v === 'lineage';
const tabOf = v => (v.startsWith('gallery') ? 'gallery' : v);
let lastGallery = 'terra';

function viewKeys(view) {
  if (view === 'compare') return ['landsat7', 'landsat9'];
  if (view === 'lineage') return LINEAGE.map(l => l.key);
  if (view.startsWith('gallery')) return [view.split('/')[1] || lastGallery];
  return [view];
}

async function setView(view) {
  if (view === 'gallery') view = 'gallery/' + lastGallery;
  if (view.startsWith('gallery/')) lastGallery = view.split('/')[1];
  state.view = view;
  state.highlight = null;
  history.replaceState(null, '', '#' + view);
  document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b.dataset.view === tabOf(view)));
  $('loading').textContent = 'Loading spacecraft…';
  $('loading').classList.remove('done');
  const keys = viewKeys(view);
  let insts;
  try { insts = await Promise.all(keys.map(load)); }
  catch (e) { $('loading').textContent = 'Could not load the model: ' + (e.message || e); return; }
  if (state.view !== view) return;
  for (const i of active) { scene.remove(i.pivot); i.labelEls.forEach(el => (el.style.opacity = 0)); if (i.tag) i.tag.style.opacity = 0; }
  active = insts;
  const gap = view === 'lineage' ? 3.3 : 4.2;
  insts.forEach((inst, idx) => {
    inst.pivot.position.set(isMulti(view) ? (idx - (insts.length - 1) / 2) * gap : 0, 0, 0);
    inst.pivot.rotation.set(0, view === 'lineage' ? -0.5 : 0, 0);
    scene.add(inst.pivot);
    if (isMulti(view)) {
      if (!inst.tag) {
        inst.tag = document.createElement('div');
        inst.tag.className = 'model-tag';
        document.getElementById('labels').appendChild(inst.tag);
      }
      const l = LINEAGE.find(x => x.key === inst.key);
      inst.tag.innerHTML = view === 'lineage' ? `<b>${l.year}</b>${l.label}` : `<b>${inst.key === 'landsat7' ? '1999' : '2021'}</b>${inst.cfg.name}`;
    }
  });
  $('xray').hidden = !insts.some(i => i.cfg.shells.length);
  $('paths').hidden = !insts.some(i => i.cfg.paths.length);
  $('loading').classList.add('done');
  renderPanel();
  applyLook();
  resetCamera();
}

function resetCamera() {
  const multi = isMulti(state.view);
  const n = active.length;
  const v = multi ? { dir: [0.12, 0.3, 1], dist: state.view === 'lineage' ? 1.3 * n : 1.2 * n } : active[0].cfg.view;
  let dist = FOCUS_SIZE * v.dist;
  if (window.innerWidth < window.innerHeight) dist *= multi ? (state.view === 'lineage' ? 3.4 : 2.4) : 1.6;
  camera.position.copy(new THREE.Vector3(...v.dir).normalize().multiplyScalar(dist));
  controls.target.set(0, 0, 0);
  controls.update();
}

// ------------------------------------------------------------------ panel
function renderPanel() {
  document.querySelectorAll('.credit').forEach(c => c.remove());
  const compare = state.view === 'compare', lineage = state.view === 'lineage', gallery = state.view.startsWith('gallery');
  const cfg = isMulti(state.view) ? null : active[0].cfg;
  const txt = compare ? COMPARE : lineage ? LINEAGE_TEXT : null;
  $('kicker').textContent = txt ? txt.kicker : cfg.kicker;
  $('title').textContent = txt ? txt.title : cfg.name;
  $('body').textContent = txt ? txt.body : cfg.body;

  const t = document.createElement('table');
  t.className = 'spec';
  if (compare) {
    t.innerHTML = '<thead><tr>' + COMPARE.rows[0].map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>' +
      COMPARE.rows.slice(1).map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('') + '</tbody>';
  } else if (lineage) {
    t.innerHTML = '<tbody>' + LINEAGE_TEXT.rows.map(r => `<tr><th>${r[0]}</th><td><b>${r[1]}</b><br>${r[2]}</td></tr>`).join('') + '</tbody>';
  } else {
    t.innerHTML = '<tbody>' + cfg.specs.map(r => `<tr><th>${r[0]}</th><td>${r[1]}</td></tr>`).join('') + '</tbody>';
  }
  $('specs').replaceChildren(t);

  const list = $('modules');
  list.replaceChildren();
  $('modInfo').hidden = true;
  $('modHead').hidden = isMulti(state.view);
  if (isMulti(state.view)) return;
  if (gallery) {
    $('modHead').innerHTML = 'NASA 3D models <span>pick a satellite</span>';
    for (const [k, m] of Object.entries(MODELS)) {
      if (!m.simple || m.hidden) continue;
      const b = document.createElement('button');
      b.className = 'mod' + (state.view === 'gallery/' + k ? ' active' : '');
      b.style.setProperty('--c', '#4da3ff');
      b.innerHTML = `<i></i>${m.name}`;
      b.onclick = () => setView('gallery/' + k);
      list.appendChild(b);
    }
    const credit = document.createElement('p');
    credit.className = 'credit';
    credit.innerHTML = 'Models: <a href="https://github.com/nasa/NASA-3D-Resources" target="_blank" rel="noopener">NASA 3D Resources</a> (free, without copyright).';
    list.after(credit);
    return;
  }
  $('modHead').innerHTML = 'Modules <span>click to isolate</span>';
  const inst = active[0];
  for (const [k, [label]] of Object.entries(cfg.modules)) {
    const mod = inst.modules[k];
    if (!mod) continue;
    const b = document.createElement('button');
    b.className = 'mod';
    b.dataset.mod = k;
    b.style.setProperty('--c', '#' + mod.mats[0].color.getHexString());
    b.innerHTML = `<i></i>${label}`;
    b.onclick = () => setHighlight(k);
    list.appendChild(b);
  }
}

function setHighlight(k) {
  state.highlight = state.highlight === k ? null : k;
  document.querySelectorAll('.mod').forEach(b => b.classList.toggle('active', b.dataset.mod === state.highlight));
  const info = $('modInfo');
  if (state.highlight && !isMulti(state.view)) {
    const [label, desc] = MODELS[state.view].modules[state.highlight];
    info.style.setProperty('--c', '#' + active[0].modules[state.highlight].mats[0].color.getHexString());
    info.innerHTML = `<b>${label}</b>${desc}`;
    info.hidden = false;
  } else info.hidden = true;
  applyLook();
}

// ------------------------------------------------------------------ look (isolate / x-ray / paths)
function applyLook() {
  for (const inst of active) {
    for (const [k, mod] of Object.entries(inst.modules)) {
      const isPath = inst.cfg.paths.includes(k);
      mod.node.visible = !isPath || state.paths;
      let opacity = null;
      if (state.highlight && inst.key === state.view) opacity = k === state.highlight ? 1 : 0.06;
      else if (state.xray && mod.isShell) opacity = 0.1;
      for (const m of mod.mats) {
        const b = m.userData.base;
        if (opacity === null) {
          m.opacity = b.opacity; m.transparent = b.transparent; m.depthWrite = b.depthWrite;
          if (m.emissive && b.emissive) m.emissive.copy(b.emissive);
        } else {
          m.transparent = true;
          m.opacity = isPath ? Math.min(opacity, b.opacity) : opacity;
          m.depthWrite = opacity >= 1 && !isPath;
          if (m.emissive && b.emissive) {
            if (k === state.highlight) m.emissive.copy(m.color).multiplyScalar(0.25);
            else m.emissive.copy(b.emissive);
          }
        }
        m.needsUpdate = true;
      }
    }
  }
}

// ------------------------------------------------------------------ controls
document.querySelectorAll('.tabs button').forEach(b => (b.onclick = () => setView(b.dataset.view)));
const toggle = (id, key, after) => {
  const el = $(id);
  el.onclick = () => { state[key] = !state[key]; el.classList.toggle('on', state[key]); el.setAttribute('aria-pressed', state[key]); after?.(); };
};
toggle('xray', 'xray', applyLook);
toggle('paths', 'paths', applyLook);
toggle('labelsToggle', 'labels');
toggle('spin', 'spin');
$('reset').onclick = () => { state.highlight = null; $('explode').value = 0; state.explode = 0; setHighlight(null); active.forEach(i => i.pivot.rotation.set(0, 0, 0)); resetCamera(); };
$('explode').oninput = e => (state.explode = +e.target.value);

// click a part to isolate it
const raycaster = new THREE.Raycaster();
let down = null;
renderer.domElement.addEventListener('pointerdown', e => (down = { x: e.clientX, y: e.clientY }));
renderer.domElement.addEventListener('pointerup', e => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5 || isMulti(state.view) || active[0].cfg.simple) return;
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  const inst = active[0];
  const meshes = Object.entries(inst.modules)
    .filter(([k, m]) => m.node.visible && !inst.cfg.paths.includes(k) && !(state.xray && m.isShell) && !(state.highlight && k !== state.highlight))
    .flatMap(([, m]) => m.meshes);
  const hit = raycaster.intersectObjects(meshes, false)[0];
  if (!hit) return;
  let n = hit.object;
  while (n.parent && n.parent !== inst.root) n = n.parent;
  if (inst.modules[n.name]) setHighlight(n.name);
});

// ------------------------------------------------------------------ scan diagrams (whiskbroom vs pushbroom)
function scanDiagram(canvas, mode) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const rows = 16, cols = 22, cw = (W - 20) / cols, ch = 7;
  let t = 0;
  return dt => {
    t += dt;
    g.clearRect(0, 0, W, H);
    // satellite
    const sx = W / 2, sy = 22;
    g.fillStyle = '#d9dee5'; g.fillRect(sx - 10, sy - 7, 20, 14);
    g.fillStyle = '#2a4b9b'; g.fillRect(sx - 34, sy - 4, 22, 8); g.fillRect(sx + 12, sy - 4, 22, 8);
    // ground rows scroll toward the satellite track
    const speed = mode === 'whisk' ? 1.1 : 1.6;
    const progress = (t * speed) % rows;
    const done = Math.floor(progress);
    const baseY = H - 14;
    for (let r = 0; r < rows; r++) {
      const y = baseY - r * ch;
      for (let c = 0; c < cols; c++) {
        let lit = r < done;
        if (r === done) lit = mode === 'push' ? (progress - done) > 0.15 : c < Math.floor((progress - done) * cols);
        g.fillStyle = lit ? `hsl(${110 + ((r * 7 + c * 13) % 40)}, 35%, ${30 + ((r * 3 + c * 5) % 18)}%)` : 'rgba(255,255,255,.05)';
        g.fillRect(10 + c * cw + 0.5, y - ch + 1, cw - 1, ch - 1);
      }
    }
    // beam
    const ry = baseY - done * ch - ch / 2;
    g.fillStyle = mode === 'push' ? 'rgba(95,212,255,.25)' : 'rgba(255,213,74,.35)';
    g.beginPath();
    if (mode === 'push') { g.moveTo(sx - 6, sy + 7); g.lineTo(sx + 6, sy + 7); g.lineTo(W - 10, ry + 3); g.lineTo(10, ry + 3); }
    else {
      const cx = 10 + ((progress - done) * cols) * cw;
      g.moveTo(sx - 2, sy + 7); g.lineTo(sx + 2, sy + 7); g.lineTo(cx + cw, ry + 3); g.lineTo(cx, ry + 3);
    }
    g.closePath(); g.fill();
  };
}
const diagrams = [scanDiagram($('scanWhisk'), 'whisk'), scanDiagram($('scanPush'), 'push')];

// ------------------------------------------------------------------ loop
const clock = new THREE.Clock();
const v = new THREE.Vector3();
const _tagOff = new THREE.Vector3(0, -FOCUS_SIZE * 0.72, 0);
function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const time = clock.elapsedTime;
  for (const inst of active) {
    if (state.spin) inst.pivot.rotation.y += dt * 0.18;
    inst.mixer?.update(dt);
    for (const [k, mod] of Object.entries(inst.modules)) {
      const amt = mod.isShell ? 0 : state.explode;
      mod.offset.lerp(v.copy(mod.dir).multiplyScalar(amt), 0.15);
      mod.node.position.copy(mod.basePos).add(mod.offset);
      if (inst.cfg.paths.includes(k)) for (const m of mod.mats) if (m.emissive) m.emissiveIntensity = 1.2 + Math.sin(time * 4) * 0.8;
    }
  }
  controls.update();
  renderer.render(scene, camera);
  diagrams.forEach(d => d(dt));

  // labels
  for (const inst of active) {
    const showAll = !isMulti(state.view);
    if (inst.tag) {
      v.copy(inst.pivot.position).add(_tagOff);
      v.project(camera);
      inst.tag.style.transform = `translate(${(v.x * 0.5 + 0.5) * window.innerWidth}px, ${(-v.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, 0)`;
      inst.tag.style.opacity = isMulti(state.view) && v.z < 1 ? 1 : 0;
    }
    inst.labels.forEach((l, i) => {
      const el = inst.labelEls[i];
      const mod = inst.modules[l.m];
      let show = state.labels && mod && mod.node.visible;
      if (show) show = state.highlight ? (inst.key === state.view && l.m === state.highlight) : (l.pr && (showAll || (state.view === 'compare' && /OLI2_Optics|ETM_Housing/.test(l.m))) && !inst.cfg.paths.includes(l.m));
      if (show) {
        v.fromArray(l.p).add(mod.offset);
        inst.root.localToWorld(v);
        v.project(camera);
        if (v.z > 1) show = false;
        else el.style.transform = `translate(${(v.x * 0.5 + 0.5) * window.innerWidth}px, ${(-v.y * 0.5 + 0.5) * window.innerHeight}px) translate(-50%, -140%)`;
      }
      el.style.opacity = show ? 1 : 0;
    });
  }
  requestAnimationFrame(frame);
}

const initial = decodeURIComponent((location.hash || '#landsat9').slice(1));
const valid = ['landsat9', 'landsat7', 'compare', 'lineage', 'gallery'].includes(initial) || (initial.startsWith('gallery/') && MODELS[initial.slice(8)]?.simple);
setView(valid ? initial : 'landsat9');
frame();
