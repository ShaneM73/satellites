import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { AGENCIES, SATELLITES, SWARMS, REFERENCE, STEPS, MODEL_LINKS } from './data.js';
import { MISSION_BY_SAT } from './instruments.js';
import { instrumentsHTML } from './inst-render.js';

// ---------------------------------------------------------------- constants
const R_EARTH = 6371;               // km; 1 scene unit = 1 Earth radius
const MU = 398600.4418;             // km^3/s^2
const GEO_R = 42164 / R_EARTH;      // geostationary radius in Earth radii
const DAY = 86400;                  // solar day (scene uses a Sun-fixed frame)
const OMEGA_E = (2 * Math.PI) / DAY;
const SPEEDS = [60, 300, 600, 3000];
const DEG = Math.PI / 180;
const NOW_YEAR = 2026.84;

// ---------------------------------------------------------------- renderer
const container = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.01, 1000);
camera.position.set(0, 1.5, 4.2);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 1.35;
controls.maxDistance = 30;
controls.enablePan = false;
controls.rotateSpeed = 0.6;

const SUN_DIR = new THREE.Vector3(1, 0.12, 0).normalize();

// ---------------------------------------------------------------- stars
{
  const n = 3000, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(300 + Math.random() * 200);
    pos.set([v.x, v.y, v.z], i * 3);
    const b = 0.4 + Math.random() * 0.6;
    col.set([b, b, b * (0.9 + Math.random() * 0.2)], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({ size: 1.1, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.8 })));
}

// ---------------------------------------------------------------- earth
const loader = new THREE.TextureLoader();
let pending = 3;
const hideLoading = () => document.getElementById('loading').classList.add('done');
const onTex = () => { if (--pending === 0) hideLoading(); };
setTimeout(hideLoading, 8000);
const loadTex = (url, srgb = true) => {
  const t = loader.load(url, onTex, undefined, onTex);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
};
const dayTex = loadTex('assets/earth-blue-marble.jpg');
const nightTex = loadTex('assets/earth-night.jpg');
const waterTex = loadTex('assets/earth-water.png', false);

const earth = new THREE.Group();
scene.add(earth);

const earthMat = new THREE.ShaderMaterial({
  uniforms: { dayTex: { value: dayTex }, nightTex: { value: nightTex }, waterTex: { value: waterTex }, sunDir: { value: SUN_DIR } },
  vertexShader: /* glsl */`
    varying vec2 vUv; varying vec3 vN; varying vec3 vP;
    void main() {
      vUv = uv;
      vN = normalize(mat3(modelMatrix) * normal);
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vP = wp.xyz;
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    uniform sampler2D dayTex; uniform sampler2D nightTex; uniform sampler2D waterTex; uniform vec3 sunDir;
    varying vec2 vUv; varying vec3 vN; varying vec3 vP;
    void main() {
      vec3 N = normalize(vN);
      float d = dot(N, sunDir);
      vec3 day = texture2D(dayTex, vUv).rgb;
      vec3 night = texture2D(nightTex, vUv).rgb;
      float water = texture2D(waterTex, vUv).r;
      float k = smoothstep(-0.12, 0.22, d);
      vec3 V = normalize(cameraPosition - vP);
      vec3 H = normalize(V + sunDir);
      float spec = pow(max(dot(N, H), 0.0), 220.0) * water * 0.35 * k;
      vec3 lit = day * (0.25 + 1.05 * max(d, 0.0)) + vec3(0.75, 0.85, 1.0) * spec * 0.0;
      vec3 dark = night * vec3(1.35, 1.15, 0.85) + day * 0.05;
      gl_FragColor = vec4(mix(dark, lit, k), 1.0);
      #include <colorspace_fragment>
    }`,
});
const earthMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 128, 96), earthMat);
earth.add(earthMesh);

// atmosphere rim
scene.add(new THREE.Mesh(
  new THREE.SphereGeometry(1.035, 64, 48),
  new THREE.ShaderMaterial({
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: `varying vec3 vN; varying vec3 vP;
      void main(){ vN = normalize(mat3(modelMatrix)*normal); vec4 wp = modelMatrix*vec4(position,1.); vP = wp.xyz; gl_Position = projectionMatrix*viewMatrix*wp; }`,
    fragmentShader: `uniform vec3 sunDir; varying vec3 vN; varying vec3 vP;
      void main(){ vec3 V = normalize(cameraPosition - vP); float f = pow(1.0 - abs(dot(V, normalize(vN))), 3.0);
        float lit = smoothstep(-0.4, 0.5, dot(normalize(vN), sunDir));
        gl_FragColor = vec4(vec3(0.35,0.62,1.0) * f * (0.25 + 0.9*lit), f); }`,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  })
));

// ---------------------------------------------------------------- helpers
const glowTex = (() => {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.22, 'rgba(255,255,255,0.95)');
  grd.addColorStop(0.45, 'rgba(255,255,255,0.25)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
})();

// earth-local direction for geographic lat/lon (matches SphereGeometry UVs)
function geoDir(latDeg, lonDeg, out = new THREE.Vector3()) {
  const la = latDeg * DEG, lo = lonDeg * DEG;
  return out.set(Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo));
}

// inertial position of a circular orbit, in scene coordinates (y = north)
function orbitPos(o, t, out = new THREE.Vector3()) {
  const r = 1 + o.alt / R_EARTH;
  const i = o.inc * DEG;
  const raan = (o.ltan !== undefined ? (o.ltan - 12) * 15 : o.raan) * DEG;
  const n = Math.sqrt(MU / Math.pow(R_EARTH + o.alt, 3));
  const u = o.phase * DEG + n * t;
  const cu = Math.cos(u), su = Math.sin(u), cO = Math.cos(raan), sO = Math.sin(raan), ci = Math.cos(i);
  const X = r * (cO * cu - sO * su * ci);
  const Y = r * (sO * cu + cO * su * ci);
  const Z = r * su * Math.sin(i);
  return out.set(X, Z, -Y);
}

function periodMin(o) { return (2 * Math.PI * Math.sqrt(Math.pow(R_EARTH + o.alt, 3) / MU)) / 60; }

function orbitText(o) {
  if (o.geoLon !== undefined) return `Geostationary, 35,786 km, ${Math.abs(o.geoLon).toFixed(1)}°${o.geoLon < 0 ? 'W' : 'E'}`;
  const kind = o.ltan !== undefined ? 'Sun-synchronous' : (o.inc > 85 && o.inc < 95 ? 'Near-polar' : 'Inclined');
  return `${kind}, ~${o.alt.toLocaleString()} km, ${o.inc}° · ${Math.round(periodMin(o))} min period`;
}

// ---------------------------------------------------------------- satellites
const orbitsGroup = new THREE.Group();
scene.add(orbitsGroup);
const satGroup = new THREE.Group();
scene.add(satGroup);

const ALL = [...SATELLITES, ...REFERENCE];
const sats = [];

for (const s of ALL) {
  const color = new THREE.Color(AGENCIES[s.agency].color);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  sprite.scale.setScalar(0.07);
  const isGeo = s.orbit.geoLon !== undefined;
  let line;
  if (isGeo) {
    earth.add(sprite);
    sprite.position.copy(geoDir(0, s.orbit.geoLon)).multiplyScalar(GEO_R);
    // a short radial line pointing at the sub-satellite point
    const g = new THREE.BufferGeometry().setFromPoints([geoDir(0, s.orbit.geoLon).multiplyScalar(1.01), geoDir(0, s.orbit.geoLon).multiplyScalar(GEO_R)]);
    line = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 }));
    earth.add(line);
  } else {
    satGroup.add(sprite);
    const pts = [];
    const n = Math.sqrt(MU / Math.pow(R_EARTH + s.orbit.alt, 3));
    const T = (2 * Math.PI) / n;
    for (let k = 0; k <= 256; k++) pts.push(orbitPos(s.orbit, (k / 256) * T - (s.orbit.phase * DEG) / n));
    line = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.4 }));
    orbitsGroup.add(line);
  }
  const label = document.createElement('div');
  label.className = 'sat-label';
  label.textContent = s.name;
  label.style.setProperty('--c', AGENCIES[s.agency].color);
  document.getElementById('labels').appendChild(label);
  sats.push({ data: s, sprite, line, label, isGeo, color, visible: true, focus: false, worldPos: new THREE.Vector3() });
}

// geostationary belt ring (rotates with Earth so satellites sit on it)
const geoRing = (() => {
  const pts = [];
  for (let k = 0; k <= 256; k++) pts.push(geoDir(0, (k / 256) * 360).multiplyScalar(GEO_R));
  const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x9fb4d8, dashSize: 0.15, gapSize: 0.1, transparent: true, opacity: 0.35 }));
  l.computeLineDistances();
  earth.add(l);
  return l;
})();

// swarms (illustrative constellations)
const swarms = SWARMS.map(sw => {
  const members = [];
  const perPlane = Math.ceil(sw.count / sw.planes);
  for (let p = 0; p < sw.planes; p++) {
    for (let k = 0; k < perPlane && members.length < sw.count; k++) {
      members.push({ alt: sw.alt + (k % 5) * 4, inc: sw.inc, ltan: sw.ltanList[p % sw.ltanList.length], phase: (k / perPlane) * 360 + p * 17 });
    }
  }
  const pos = new Float32Array(members.length * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const color = new THREE.Color(AGENCIES[sw.agency].color);
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ map: glowTex, color, size: sw.count > 50 ? 0.035 : 0.05, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
  scene.add(pts);
  const label = document.createElement('div');
  label.className = 'sat-label';
  label.textContent = sw.name + ' (illustrative)';
  label.style.setProperty('--c', AGENCIES[sw.agency].color);
  document.getElementById('labels').appendChild(label);
  return { data: { ...sw, orbit: { alt: sw.alt, inc: sw.inc, ltan: sw.ltanList[0] } }, members, pts, pos, label, visible: true, focus: false, worldPos: new THREE.Vector3(), isSwarm: true };
});

// ---------------------------------------------------------------- ground-track trails
const TRAIL_MAX = 24000;
const TRAIL_DT = 15; // sim seconds between trail samples
const trails = new Map();
function makeTrail(sat) {
  const pos = new Float32Array(TRAIL_MAX * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setDrawRange(0, 0);
  // point size ~ 185 km swath (0.029 Earth radii)
  const m = new THREE.PointsMaterial({ color: sat.color, size: 0.029, transparent: true, opacity: 0.3, depthWrite: false });
  const p = new THREE.Points(g, m);
  earth.add(p);
  return { sat, pts: p, pos, n: 0, head: 0, clock: 0 };
}
function clearTrails() {
  for (const tr of trails.values()) { earth.remove(tr.pts); tr.pts.geometry.dispose(); }
  trails.clear();
}

// ---------------------------------------------------------------- time & state
let simT = 0;
let speed = SPEEDS[2];
let paused = false;
let rotOffset = -1.2;
let rotTween = null;
let camTween = null;
let showLabels = true;
let stepIndex = 0;
let activeAgencies = new Set(Object.keys(AGENCIES));

const earthRot = () => OMEGA_E * simT + rotOffset;

// ---------------------------------------------------------------- UI refs
const $ = id => document.getElementById(id);
const ui = {
  kicker: $('kicker'), title: $('title'), body: $('body'), extra: $('extra'), list: $('list'), hint: $('hint'),
  prev: $('prev'), next: $('next'), dots: $('dots'),
  card: $('card'), cardName: $('cardName'), cardText: $('cardText'), cardAgency: $('cardAgency'),
  cardLaunch: $('cardLaunch'), cardOrbit: $('cardOrbit'), cardSensors: $('cardSensors'), cardStatus: $('cardStatus'),
};

STEPS.forEach((s, i) => {
  const b = document.createElement('button');
  b.className = 'dot';
  b.setAttribute('aria-label', `Go to ${s.title}`);
  b.onclick = () => goTo(i);
  ui.dots.appendChild(b);
});
ui.prev.onclick = () => goTo(stepIndex - 1);
ui.next.onclick = () => goTo(stepIndex + 1);
window.addEventListener('keydown', e => {
  if (e.key === 'ArrowRight') goTo(stepIndex + 1);
  if (e.key === 'ArrowLeft') goTo(stepIndex - 1);
  if (e.key === 'Escape') closeCard();
});

const speedInput = $('speed'), speedOut = $('speedOut');
function setSpeedIndex(i) { speedInput.value = i; speed = SPEEDS[i]; speedOut.textContent = `${speed}×`; }
speedInput.oninput = () => setSpeedIndex(+speedInput.value);
$('labelsToggle').onclick = e => { showLabels = !showLabels; e.currentTarget.classList.toggle('on', showLabels); e.currentTarget.setAttribute('aria-pressed', showLabels); };
$('pause').onclick = e => { paused = !paused; e.currentTarget.classList.toggle('on', paused); e.currentTarget.textContent = paused ? 'Play' : 'Pause'; e.currentTarget.setAttribute('aria-pressed', paused); };
$('cardClose').onclick = closeCard;

// ---------------------------------------------------------------- info card
function openCard(obj) {
  const d = obj.data;
  ui.card.style.setProperty('--c', AGENCIES[d.agency].color);
  ui.cardAgency.textContent = AGENCIES[d.agency].label;
  ui.cardName.textContent = d.name;
  ui.cardText.textContent = d.text;
  ui.cardLaunch.textContent = d.launched;
  ui.cardOrbit.textContent = obj.isSwarm ? `Sun-synchronous, ~${d.alt} km, several planes` : orbitText(d.orbit);
  ui.cardSensors.textContent = d.sensors;
  ui.cardStatus.textContent = d.status;
  const ml = $('cardModel');
  ml.hidden = !MODEL_LINKS[d.id];
  if (MODEL_LINKS[d.id]) ml.href = 'spacecraft.html#' + MODEL_LINKS[d.id];
  const mission = MISSION_BY_SAT[d.id];
  $('cardInstWrap').hidden = !mission;
  if (mission) {
    $('cardInst').innerHTML = instrumentsHTML(mission.inst, AGENCIES[d.agency].color);
    $('cardInstWrap').querySelector('summary').innerHTML = `Instruments &amp; resolutions <a href="timeline.html#${mission.key}">timeline &rarr;</a>`;
  }
  ui.card.hidden = false;
  highlighted = obj;
}
function closeCard() { ui.card.hidden = true; highlighted = null; }
let highlighted = null;

// ---------------------------------------------------------------- step rendering
function inStep(obj, step) {
  if (step.show === 'all') return obj.data.agency !== 'REF' && activeAgencies.has(obj.data.agency);
  return obj.data.group.some(g => step.show.includes(g));
}

function renderTimeline(items) {
  const wrap = document.createElement('div');
  wrap.className = 'timeline';
  const track = document.createElement('div');
  track.className = 'timeline-track';
  items.forEach(([y, name], idx) => {
    const it = document.createElement('div');
    it.className = 'tl-item' + (+y > NOW_YEAR ? ' future' : '');
    it.style.left = `${(idx / (items.length - 1)) * 100}%`;
    it.innerHTML = `<span class="tl-year">${y}</span><span class="tl-name">${name}</span>`;
    track.appendChild(it);
  });
  wrap.appendChild(track);
  return wrap;
}

function renderEndBars(bars) {
  const y0 = 1999, y1 = 2029, pct = y => `${((y - y0) / (y1 - y0)) * 100}%`;
  const wrap = document.createElement('div');
  wrap.className = 'bars';
  bars.forEach(b => {
    const row = document.createElement('div');
    row.className = 'bar-row';
    const mid = Math.min(NOW_YEAR, b.end);
    row.innerHTML = `<span>${b.name}</span><div class="bar-track">
      <div class="bar-fill" style="left:${pct(b.start)};width:calc(${pct(mid)} - ${pct(b.start)})"></div>
      <div class="bar-tail" style="left:${pct(mid)};width:calc(${pct(b.end)} - ${pct(mid)})"></div>
      <div class="bar-now" style="left:${pct(NOW_YEAR)}"></div></div>`;
    wrap.appendChild(row);
  });
  const axis = document.createElement('div');
  axis.className = 'bar-axis';
  axis.innerHTML = '<span></span><div><span>1999</span><span>2009</span><span>2019</span><span>2029</span></div>';
  wrap.appendChild(axis);
  const lg = document.createElement('div');
  lg.className = 'legend-inline';
  lg.innerHTML = '<i style="background:#4da3ff"></i>Operating <i style="background:rgba(255,201,77,.6)"></i>Projected to end of science · white line = Nov 2026';
  wrap.appendChild(lg);
  return wrap;
}

function renderFacts(facts) {
  const wrap = document.createElement('div');
  wrap.className = 'facts';
  facts.forEach(([a, b]) => { const f = document.createElement('div'); f.className = 'fact'; f.innerHTML = `<b>${a}</b><span>${b}</span>`; wrap.appendChild(f); });
  return wrap;
}

function renderFilters() {
  const wrap = document.createElement('div');
  wrap.className = 'filters';
  for (const [k, a] of Object.entries(AGENCIES)) {
    if (k === 'REF') continue;
    const b = document.createElement('button');
    b.className = 'chip' + (activeAgencies.has(k) ? ' on' : '');
    b.style.setProperty('--c', a.color);
    b.innerHTML = `<i></i>${a.label}`;
    b.setAttribute('aria-pressed', activeAgencies.has(k));
    b.onclick = () => {
      activeAgencies.has(k) ? activeAgencies.delete(k) : activeAgencies.add(k);
      b.classList.toggle('on', activeAgencies.has(k));
      b.setAttribute('aria-pressed', activeAgencies.has(k));
      applyVisibility(STEPS[stepIndex]);
      renderList(STEPS[stepIndex]);
    };
    wrap.appendChild(b);
  }
  return wrap;
}

// ----- resolution comparator: one synthetic 300 m x 300 m neighbourhood rendered at four pixel sizes
const resSource = (() => {
  const S = 900; // 0.333 m per pixel
  const c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  g.fillStyle = '#5f7f43'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(${70 + rnd() * 40},${100 + rnd() * 40},${50 + rnd() * 20},.6)`; g.beginPath(); g.arc(rnd() * S, rnd() * S, 30 + rnd() * 80, 0, 7); g.fill(); }
  // river
  g.strokeStyle = '#2f5f86'; g.lineWidth = 60; g.beginPath(); g.moveTo(-20, 760); g.bezierCurveTo(250, 640, 520, 900, 920, 700); g.stroke();
  // roads
  g.fillStyle = '#8d8d88';
  [150, 450, 750].forEach(x => g.fillRect(x - 12, 0, 24, 620));
  [120, 330, 560].forEach(y => g.fillRect(0, y - 12, S, 24));
  // houses and trees per block
  const roofs = ['#b4553d', '#9a9a9a', '#6d4b3a', '#c8b28a', '#5a6470', '#d7d2c8'];
  for (let bx = 0; bx < 3; bx++) for (let by = 0; by < 3; by++) {
    const x0 = [0, 162, 462][bx] + 14, x1 = [138, 438, 738][bx] - 14;
    const y0 = [0, 132, 342][by] + 14, y1 = [108, 318, 548][by] - 14;
    for (let x = x0; x < x1 - 30; x += 46) for (let y = y0; y < y1 - 30; y += 52) {
      if (rnd() < 0.15) continue;
      g.fillStyle = roofs[Math.floor(rnd() * roofs.length)];
      const w = 26 + rnd() * 12, h = 22 + rnd() * 10;
      g.fillRect(x + rnd() * 6, y + rnd() * 6, w, h);
      g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w / 2, y, 2, h);
      if (rnd() < 0.18) { g.fillStyle = '#3fb6d9'; g.fillRect(x + 4, y + h + 6, 12, 8); }
      if (rnd() < 0.6) { g.fillStyle = '#2f4f23'; g.beginPath(); g.arc(x + w + 8, y + 8 + rnd() * 20, 6 + rnd() * 6, 0, 7); g.fill(); }
    }
  }
  // stadium + parking lot on the east side
  g.fillStyle = '#6a6a66'; g.fillRect(770, 20, 120, 290);
  for (let x = 778; x < 885; x += 9) for (let y = 30; y < 300; y += 16) if (rnd() < 0.55) { g.fillStyle = ['#c33', '#eee', '#225', '#999', '#dd3'][Math.floor(rnd() * 5)]; g.fillRect(x, y, 5, 10); }
  g.fillStyle = '#3f8f3a'; g.beginPath(); g.ellipse(820, 450, 60, 80, 0, 0, 7); g.fill();
  g.strokeStyle = '#c45a3a'; g.lineWidth = 10; g.stroke();
  g.strokeStyle = 'rgba(255,255,255,.8)'; g.lineWidth = 2; g.strokeRect(795, 410, 50, 80);
  // farm fields south
  for (let i = 0; i < 6; i++) { g.fillStyle = ['#a9a35a', '#7c9a43', '#c2b07a'][i % 3]; g.fillRect(i * 150 + 6, 590, 140, 70); }
  return c;
})();

const RES = [
  { m: 30, name: 'Landsat 9', note: '30 m: each pixel covers a whole city block.' },
  { m: 10, name: 'Sentinel-2', note: '10 m: roads and the river appear.' },
  { m: 3, name: 'SuperDove', note: '3 m: individual buildings emerge.' },
  { m: 0.34, name: 'WorldView Legion', note: '34 cm: cars and swimming pools are visible.' },
];
function renderResolution() {
  const wrap = document.createElement('div');
  wrap.className = 'res';
  const cv = document.createElement('canvas'); cv.width = cv.height = 600;
  cv.setAttribute('role', 'img');
  const tabs = document.createElement('div'); tabs.className = 'res-tabs';
  const cap = document.createElement('div'); cap.className = 'res-cap';
  const draw = (r) => {
    const px = Math.max(2, Math.round(300 / r.m));
    const small = document.createElement('canvas'); small.width = small.height = Math.min(px, 900);
    const sg = small.getContext('2d'); sg.imageSmoothingEnabled = true; sg.imageSmoothingQuality = 'high';
    sg.drawImage(resSource, 0, 0, small.width, small.height);
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = r.m < 1;
    g.drawImage(small, 0, 0, cv.width, cv.height);
    cap.textContent = `${r.name} — ${r.note} Same 300 m × 300 m synthetic scene.`;
    cv.setAttribute('aria-label', `Synthetic neighbourhood at ${r.m} metre resolution`);
    [...tabs.children].forEach((b, i) => b.classList.toggle('on', RES[i] === r));
  };
  RES.forEach(r => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = r.m < 1 ? `${Math.round(r.m * 100)} cm` : `${r.m} m`; b.onclick = () => draw(r); tabs.appendChild(b); });
  wrap.append(cv, tabs, cap);
  requestAnimationFrame(() => draw(RES[0]));
  return wrap;
}

function renderList(step) {
  ui.list.innerHTML = '';
  if (step.show === 'all' && !step.filters) return;
  const objs = [...sats, ...swarms].filter(o => o.visible);
  objs.forEach(o => {
    const b = document.createElement('button');
    b.className = 'sat-pill';
    b.style.setProperty('--c', AGENCIES[o.data.agency].color);
    b.innerHTML = `<i></i>${o.data.name}`;
    b.onclick = () => openCard(o);
    ui.list.appendChild(b);
  });
}

function applyVisibility(step) {
  const all = step.show === 'all';
  for (const s of sats) {
    s.visible = inStep(s, step);
    s.focus = s.visible && !all;
    s.sprite.visible = s.visible;
    s.line.visible = s.visible && !(all && !step.filters && !s.isGeo) && !(all && step.filters && s.data.agency === 'COMMERCIAL');
    s.line.material.opacity = all ? (s.isGeo ? 0.18 : 0.12) : (s.isGeo ? 0.45 : 0.5);
    s.sprite.scale.setScalar(all ? 0.05 : 0.075);
  }
  for (const w of swarms) {
    w.visible = inStep(w, step);
    w.focus = w.visible && !all;
    w.pts.visible = w.visible;
  }
  geoRing.visible = sats.some(s => s.visible && s.isGeo);
}

function goTo(i) {
  if (i < 0 || i >= STEPS.length) return;
  stepIndex = i;
  const step = STEPS[i];
  closeCard();

  ui.kicker.textContent = step.kicker;
  ui.title.textContent = step.title;
  ui.body.textContent = step.body;
  ui.hint.textContent = step.hint || '';
  ui.extra.innerHTML = '';
  if (step.endBars) ui.extra.appendChild(renderEndBars(step.endBars));
  if (step.timeline) ui.extra.appendChild(renderTimeline(step.timeline));
  if (step.facts) ui.extra.appendChild(renderFacts(step.facts));
  if (step.resolution) ui.extra.appendChild(renderResolution());
  if (step.filters) ui.extra.appendChild(renderFilters());
  if (step.link) { const a = document.createElement('a'); a.className = 'step-link'; a.href = step.link.href; a.innerHTML = `${step.link.text} &rarr;`; ui.extra.appendChild(a); }
  for (const el of [ui.kicker, ui.title, ui.body, ui.extra]) { el.classList.remove('fade-in'); void el.offsetWidth; el.classList.add('fade-in'); }
  document.querySelector('.panel-inner').scrollTop = 0;

  [...ui.dots.children].forEach((d, k) => d.classList.toggle('active', k === i));
  ui.prev.disabled = i === 0;
  ui.next.disabled = i === STEPS.length - 1;
  ui.next.textContent = i === STEPS.length - 1 ? 'Done' : 'Next →';

  applyVisibility(step);
  renderList(step);

  clearTrails();
  (step.trails || []).forEach(id => { const s = sats.find(x => x.data.id === id); if (s) trails.set(id, makeTrail(s)); });
  setSpeedIndex(step.trails && step.key === 'landsat' ? 3 : 2);

  flyTo(step.camera);
}

// Camera framing: turn the Earth so the requested longitude faces the lit side,
// then move the camera to a viewing direction just off the Sun direction.
function flyTo({ dist, lat, lon }) {
  const camAz = 58 * DEG; // camera sits 58° east of the subsolar point: day side with a visible terminator
  // earth-local longitude lon must point at inertial azimuth camAz -> rotation needed
  let target = camAz - lon * DEG - OMEGA_E * simT;
  const cur = rotOffset;
  // choose the equivalent target closest to the current offset
  target = cur + Math.atan2(Math.sin(target - cur), Math.cos(target - cur));
  rotTween = { from: cur, to: target, t: 0, dur: 1.6 };

  const la = lat * DEG;
  if (window.innerWidth < window.innerHeight) dist *= 1.7; // portrait screens need more room
  const end = new THREE.Vector3(Math.cos(la) * Math.cos(camAz), Math.sin(la), -Math.cos(la) * Math.sin(camAz)).multiplyScalar(dist);
  camTween = { from: camera.position.clone(), to: end, t: 0, dur: 1.6 };
}

// ---------------------------------------------------------------- picking
const ndc = new THREE.Vector3();
function screenPos(v) {
  ndc.copy(v).project(camera);
  return { x: (ndc.x * 0.5 + 0.5) * window.innerWidth, y: (-ndc.y * 0.5 + 0.5) * window.innerHeight, z: ndc.z };
}
const _ray = new THREE.Vector3();
function occluded(p) {
  // is the segment camera -> p blocked by the unit sphere?
  const c = camera.position;
  _ray.subVectors(p, c);
  const L = _ray.length(); _ray.divideScalar(L);
  const b = c.dot(_ray);
  const disc = b * b - (c.lengthSq() - 1);
  if (disc < 0) return false;
  const t = -b - Math.sqrt(disc);
  return t > 0 && t < L;
}

let downAt = null;
renderer.domElement.addEventListener('pointerdown', e => { downAt = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener('pointerup', e => {
  if (!downAt || Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 6) return;
  let best = null, bd = 18;
  for (const s of sats) {
    if (!s.visible || occluded(s.worldPos)) continue;
    const p = screenPos(s.worldPos); if (p.z > 1) continue;
    const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
    if (d < bd) { bd = d; best = s; }
  }
  for (const w of swarms) {
    if (!w.visible) continue;
    for (let k = 0; k < w.members.length; k++) {
      const v = new THREE.Vector3(w.pos[k * 3], w.pos[k * 3 + 1], w.pos[k * 3 + 2]);
      if (occluded(v)) continue;
      const p = screenPos(v);
      const d = Math.hypot(p.x - e.clientX, p.y - e.clientY);
      if (d < bd) { bd = d; best = w; }
    }
  }
  if (best) openCard(best);
});

// ---------------------------------------------------------------- loop
const clock = new THREE.Clock();
const tmp = new THREE.Vector3();
const inv = new THREE.Quaternion();
const ease = t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function updateTrails(prevT, curT) {
  if (!trails.size) return;
  inv.setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0);
  for (const tr of trails.values()) {
    tr.clock += curT - prevT;
    let t = prevT;
    while (tr.clock >= TRAIL_DT) {
      tr.clock -= TRAIL_DT;
      t += TRAIL_DT;
      orbitPos(tr.sat.data.orbit, t, tmp).normalize();
      // to Earth-fixed frame: undo Earth rotation at time t
      const rot = OMEGA_E * t + rotOffset;
      tmp.applyAxisAngle(_yAxis, -rot).multiplyScalar(1.004);
      tr.pos.set([tmp.x, tmp.y, tmp.z], tr.head * 3);
      tr.head = (tr.head + 1) % TRAIL_MAX;
      tr.n = Math.min(tr.n + 1, TRAIL_MAX);
    }
    tr.pts.geometry.attributes.position.needsUpdate = true;
    tr.pts.geometry.setDrawRange(0, tr.n);
  }
}
const _yAxis = new THREE.Vector3(0, 1, 0);

function frame() {
  const dt = Math.min(clock.getDelta(), 0.1);
  const prevT = simT;
  if (!paused) simT += dt * speed;

  // tweens
  if (rotTween) {
    rotTween.t += dt / rotTween.dur;
    const k = ease(Math.min(rotTween.t, 1));
    rotOffset = rotTween.from + (rotTween.to - rotTween.from) * k;
    if (rotTween.t >= 1) rotTween = null;
    if (trails.size) for (const tr of trails.values()) { tr.n = 0; tr.head = 0; } // restart tracks after re-framing
  }
  if (camTween) {
    camTween.t += dt / camTween.dur;
    const k = ease(Math.min(camTween.t, 1));
    const a = camTween.from, b = camTween.to;
    // spherical interpolation of direction + linear distance
    const da = a.length(), db = b.length();
    const dir = a.clone().normalize().lerp(b.clone().normalize(), k).normalize();
    camera.position.copy(dir.multiplyScalar(da + (db - da) * k));
    if (camTween.t >= 1) camTween = null;
  }

  earth.rotation.y = earthRot();
  updateTrails(prevT, simT);

  for (const s of sats) {
    if (!s.visible) continue;
    if (s.isGeo) s.sprite.getWorldPosition(s.worldPos);
    else { orbitPos(s.data.orbit, simT, s.worldPos); s.sprite.position.copy(s.worldPos); }
    const pulse = highlighted === s ? 1.8 + 0.4 * Math.sin(performance.now() / 150) : 1;
    const base = STEPS[stepIndex].show === 'all' ? 0.05 : 0.075;
    s.sprite.scale.setScalar(base * pulse * (s.isGeo ? 1.6 : 1));
  }
  for (const w of swarms) {
    if (!w.visible) continue;
    w.members.forEach((m, k) => { orbitPos(m, simT, tmp); w.pos.set([tmp.x, tmp.y, tmp.z], k * 3); });
    w.pts.geometry.attributes.position.needsUpdate = true;
    w.worldPos.set(w.pos[0], w.pos[1], w.pos[2]);
  }

  controls.update();
  renderer.render(scene, camera);

  // labels
  const step = STEPS[stepIndex];
  const labelAll = step.show !== 'all';
  for (const o of [...sats, ...swarms]) {
    let show = showLabels && o.visible && (labelAll || o === highlighted || (o.isGeo && step.filters));
    if (show && o.isSwarm) {
      // label the member closest to the camera
      let bestK = 0, bd = Infinity;
      for (let k = 0; k < o.members.length; k++) {
        tmp.set(o.pos[k * 3], o.pos[k * 3 + 1], o.pos[k * 3 + 2]);
        const d = tmp.distanceToSquared(camera.position);
        if (d < bd) { bd = d; bestK = k; }
      }
      o.worldPos.set(o.pos[bestK * 3], o.pos[bestK * 3 + 1], o.pos[bestK * 3 + 2]);
    }
    if (show && occluded(o.worldPos)) show = false;
    if (show) {
      const p = screenPos(o.worldPos);
      if (p.z > 1 || p.x < -50 || p.y < -20 || p.x > window.innerWidth + 50 || p.y > window.innerHeight + 20) show = false;
      else o.label.style.transform = `translate(${p.x + 10}px, ${p.y}px) translateY(-50%)`;
    }
    o.label.style.opacity = show ? (o === highlighted ? 1 : 0.85) : 0;
  }

  requestAnimationFrame(frame);
}

// labels are positioned via transform from the top-left corner
for (const o of [...sats, ...swarms]) { o.label.style.left = '0'; o.label.style.top = '0'; }

// keep the globe clear of the story panel: shift right on desktop, up on phones
function updateViewOffset() {
  const w = window.innerWidth, h = window.innerHeight;
  camera.aspect = w / h;
  if (w > 760) camera.setViewOffset(w, h, -200, 0, w, h);
  else camera.setViewOffset(w, h, 0, h * 0.2, w, h);
  camera.updateProjectionMatrix();
}
updateViewOffset();
window.addEventListener('resize', () => {
  updateViewOffset();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Deep-link: #step=3
const hashStep = parseInt((location.hash.match(/step=(\d+)/) || [])[1], 10);
goTo(Number.isFinite(hashStep) ? Math.min(Math.max(hashStep, 0), STEPS.length - 1) : 0);
frame();
