import * as THREE from 'three';
import { OrbitControls } from '../vendor/OrbitControls.js';
import { GLTFLoader } from '../vendor/loaders/GLTFLoader.js';
import { DRACOLoader } from '../vendor/loaders/DRACOLoader.js';
import { RoomEnvironment } from '../vendor/environments/RoomEnvironment.js';
import { STLLoader } from '../vendor/loaders/STLLoader.js';
import { SATELLITES, ESA_3D, ESA_VISUALS } from './data.js';
import { MISSIONS } from './instruments.js';
import { instrumentsHTML } from './inst-render.js';

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
    partsBy: 'node',
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
    partsBy: 'node',
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

// ---- surface-material families, used to split models that have no named modules
const FAMILIES = [
  ['solar', 'Solar array', /solar|cell/i, 'Photovoltaic panels that convert sunlight into electrical power.'],
  ['antenna', 'Antennas & reflectors', /dish|antenna|reflector|mirror/i, 'Communication antennas, instrument reflectors and mirror-finished parts.'],
  ['mli', 'Insulation blankets (MLI)', /gold|foil|blanket|mli|bronze|leaf|orange|krinkle/i, 'Multilayer insulation that wraps the spacecraft to keep it within safe temperatures. Make it see-through to look inside.'],
  ['instrument', 'Instrument surfaces', /instr|wiffs|hooded|lens/i, 'Surfaces of the science instruments.'],
  ['white', 'White paint & radiators', /white|radiator|plasic|plastic/i, 'White surfaces that radiate heat away to space.'],
  ['black', 'Black surfaces', /black|dark/i, 'Black-painted or anodized surfaces.'],
  ['metal', 'Metal structure', /silver|metal|grey|gray|chrome|crome|alumin|iron|plating|hardware|rail|boom|thruster|pole|joint|trim/i, 'Structure, booms, brackets and thrusters.'],
];
const OTHER_FAMILY = ['other', 'Other surfaces', null, 'Remaining surfaces of the model.'];
const FAMILY_SHELLS = ['mli', 'white', 'black'];
const familyOf = name => FAMILIES.find(f => f[2].test(name || '')) || OTHER_FAMILY;

// ---- NASA 3D Resources models (github.com/nasa/NASA-3D-Resources, free and without copyright)
const NASA = {
  terra:      { name: 'Terra', sat: 'terra' },
  aqua:       { name: 'Aqua', sat: 'aqua' },
  aura:       { name: 'Aura', sat: 'aura' },
  landsat8:   { name: 'Landsat 8', sat: 'landsat8', hidden: true }, // shown in Lineage
  icesat2:    { name: 'ICESat-2', sat: 'icesat2' },
  gpm:        { name: 'GPM Core', sat: 'gpm' },
  oco2:       { name: 'OCO-2', sat: 'oco2' },
  snpp:       { name: 'Suomi NPP', sat: 'snpp' },
  goes:       { name: 'GOES', sat: 'goes19', note: 'NASA’s generic GOES model; the current GOES-R series (GOES-16 to -19) differs in detail.' },
  sentinel6:  { name: 'Sentinel-6', sat: 's6b', note: 'Model of the Jason Continuity of Service (Sentinel-6) design shared by 6A and 6B.',
                parts: {
                  BUS: ['Spacecraft bus', 'The main structure that carries power, avionics and propulsion.'],
                  pos4Antenna: ['Poseidon-4 altimeter', 'Radar altimeter antenna that measures sea-surface height to about centimetre precision.'],
                  AMR: ['AMR-C radiometer', 'Microwave radiometer that measures water vapour, used to correct the altimeter signal delay.'],
                  'DORIS-A': ['DORIS antenna', 'Receives ground-beacon signals for precise orbit determination.'],
                  GNSS: ['GNSS antenna', 'Navigation-satellite receiver antenna for precise positioning.'],
                  GNSS_POD_RO_SPA: ['GNSS-RO antennas', 'Radio-occultation antennas that profile atmospheric temperature and humidity.'],
                  LRA: ['Laser retroreflector', 'Corner-cube mirrors that ground lasers bounce off to track the orbit.'],
                  starTrackers: ['Star trackers', 'Star cameras that measure the spacecraft\u2019s orientation.'],
                  XBA: ['X-band antenna', 'Downlinks the science data.'],
                  array: ['Solar array', 'Photovoltaic wings that power the spacecraft.'],
                  array_locks: ['Array hold-downs', 'Latches that held the solar wings during launch.'],
                  CESS: ['Coarse Earth–Sun sensors', 'Simple sensors used to find the Earth and Sun during safe mode.'],
                  MPPS: ['MPPS', 'Spacecraft subsystem as named in the NASA model.'],
                  SHA: ['SHA', 'Spacecraft subsystem as named in the NASA model.'],
                } },
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
    partsBy: n.parts ? 'node' : 'material', unwrap: true,
    shells: n.parts ? ['BUS'] : FAMILY_SHELLS, paths: [], focusSkip: [], modules: n.parts || {}, labels: null,
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

// ---- schematic models built from published descriptions (tools/build_schematic_models.py)
const SCHEMATIC = {
  gf3: { name: 'Gaofen-3', sat: 'gf3',
    body: 'China’s civil C-band radar satellite: a 15 m phased-array antenna looks to the right of the track, imaging day and night in 12 modes. Schematic model built from published descriptions; proportions and placement are approximate.',
    modules: {
      Bus: ['Spacecraft bus', 'CS-L3000B-class bus (some sources say ZY1000B) carrying power, attitude control, propulsion and data handling; about 2.8–2.95 t at launch.'],
      SAR_Antenna: ['C-SAR antenna', 'Active phased-array antenna, 15 m × 1.23 m in four panels with 1,536 T/R channels. It looks to the right of the ground track and steers its beam electronically for 12 imaging modes, from 1 m spotlight to 500 m global.'],
      Deployment_Mechanism: ['Antenna deployment', 'Hinges and yoke that unfolded the four antenna panels, which were folded against two sides of the spacecraft at launch.'],
      Solar_Arrays: ['Solar arrays', 'Two deployable triple-junction GaAs wings. In the dawn–dusk orbit they face the Sun almost all the time.'],
      Data_Transmission_Antenna: ['Data transmission antenna', 'Downlinks radar data; the SAR produces raw data at up to 1,280 Mbit/s.'],
      GPS_Antennas: ['Dual-frequency GPS', 'Precise orbit determination, needed to geolocate radar images.'],
      CMGs_and_Wheels: ['CMGs & momentum wheels', 'Control moment gyros and wheels point the spacecraft to better than 0.03° and roll it up to ±31.5° to look left or right.'],
      Batteries: ['Batteries', 'NiCd (100 Ah) and Li-ion (225 Ah) batteries supply the radar’s high peak power.'],
      Antenna_Power_and_Control: ['Antenna power & interface units', 'Two antenna power units feed the panels; an antenna interface unit controls beam forming and steering.'],
      SAR_Electronics: ['SAR central electronics', 'Generates the radar pulse, receives the echoes and formats raw data (typical SAR layout; position approximate).'],
      Propulsion: ['Propulsion', 'Tank and thrusters for orbit maintenance (typical for this bus; not detailed in open sources).'],
    } },
  fy3e: { name: 'Fengyun-3E', sat: 'fy3e',
    body: 'The first civil weather satellite in an early-morning (dawn–dusk) orbit, carrying 11 instruments for weather, wind, the ionosphere and the Sun. Schematic model built from the 2022 FY-3E system paper; instrument placement is approximate.',
    modules: {
      Bus: ['Spacecraft bus', 'Hexahedral FY-3 bus (body about 4.4 × 2.0 × 2.0 m) with service, payload and propulsion modules; about 2,675 kg.'],
      Solar_Array: ['Solar array', 'One solar wing on one side of the body; in flight the spacecraft spans 11.6 m. Its cells face the Sun from the dawn–dusk orbit.'],
      MERSI_LL: ['MERSI-LL imager', 'Low-light imager: 7 channels (0.5–12.5 µm) at 250 m–1 km, built for the dim light near the dawn terminator.'],
      HIRAS_II: ['HIRAS-II sounder', 'Hyperspectral infrared sounder (650–2,550 cm⁻¹, 14 km) for temperature and humidity profiles.'],
      MWTS_III: ['MWTS-III', 'Microwave temperature sounder, 23.8–57 GHz, 33 km.'],
      MWHS_II: ['MWHS-II', 'Microwave humidity sounder, 89–190 GHz, 15–30 km.'],
      WindRAD: ['WindRAD scatterometer', 'Wind radar at C band (5.4 GHz) and Ku band (13.256 GHz) with rotating fan beams; sea-surface wind vectors at 10–20 km.'],
      GNOS_II: ['GNOS-II antennas', 'GNSS receivers for radio occultation (atmosphere and ionosphere profiles) and reflectometry (sea-surface wind speed).'],
      Tri_IPM: ['Tri-IPM photometers', 'Three ionospheric photometers (135.6 nm and N₂ LBH bands) looking at three angles.'],
      SIM_II: ['SIM-II', 'Solar irradiance monitor: total solar irradiance, 0.2–20 µm.'],
      SSIM: ['SSIM', 'Solar spectral irradiance monitor, 165–1,650 nm.'],
      X_EUVI: ['X-EUVI telescope', 'Solar X-ray and extreme-ultraviolet imager (0.6–8 nm and 19.5 nm) for space weather.'],
      SEM: ['Space environment monitor', 'Measures charged particles and radiation, 30 eV–300 MeV.'],
      Star_Sensors: ['Star sensors', 'Star cameras for three-axis attitude determination.'],
      Downlink_Antennas: ['Downlink antennas', 'Send instrument data to ground stations (position approximate).'],
      Propulsion_Module: ['Propulsion module', 'Tank and thrusters for orbit control.'],
      Service_Module: ['Service module', 'Power control, avionics and data handling inside the bus.'],
    } },
};
for (const [k, n] of Object.entries(SCHEMATIC)) {
  const s = SATELLITES.find(x => x.id === n.sat) || {};
  MODELS[k] = {
    simple: true, schematic: true,
    url: `assets/models/schematic/${k}.glb`,
    name: n.name,
    kicker: `Launched ${s.launched} · ${s.status} · schematic model`,
    body: n.body,
    specs: [['Sensors', s.sensors], ['Status', s.status]],
    partsBy: 'node', unwrap: true, shells: ['Bus'], paths: [], focusSkip: [], modules: n.modules, labels: null,
    view: k === 'fy3e' ? { dir: [1, 0.45, -1.2], dist: 1.6 } : { dir: [1, 0.55, 1.2], dist: 1.6 },
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
const stlLoader = new STLLoader();
const loaded = {}; // key -> instance
const FOCUS_SIZE = 3;
const _p = new THREE.Vector3();

const matsOf = mesh => (Array.isArray(mesh.material) ? mesh.material : [mesh.material]);
const unwrap = n => { while (!n.isMesh && n.children.length === 1) n = n.children[0]; return n; };
const GENERIC_NAME = /^(mesh|object|cube|cylinder|sphere|plane|node|group|polysurface|default|untitled|layer|root)?([\s._-]*\d+)*$/i;

// bounds of the faces that use material `idx` (sampled), in root space
function expandByMaterial(box, mesh, idx) {
  const g = mesh.geometry, pos = g.attributes.position, index = g.index;
  const ranges = Array.isArray(mesh.material) ? g.groups.filter(gr => gr.materialIndex === idx) : [{ start: 0, count: index ? index.count : pos.count }];
  for (const r of ranges) {
    const step = Math.max(1, Math.floor(r.count / 400));
    for (let i = r.start; i < r.start + r.count; i += step) {
      _p.fromBufferAttribute(pos, index ? index.getX(i) : i).applyMatrix4(mesh.matrixWorld);
      box.expandByPoint(_p);
    }
  }
}

// A "part" is something the viewer can isolate, ghost, hide and label:
// a named node (cutaways, Sentinel-6, multi-file STL) or a family of surface materials.
function buildParts(root, cfg) {
  root.updateMatrixWorld(true);
  const parts = {};
  const add = (key, label, desc) => (parts[key] ||= { key, label, desc, meshes: [], mats: [], node: null, self: false, box: new THREE.Box3() });
  if (cfg.partsBy === 'node') {
    const base = cfg.unwrap ? unwrap(root) : root;
    if (base !== root && base.isMesh) { // a parent mesh (e.g. Sentinel-6 BUS) is its own part
      const [label, desc] = cfg.modules[base.name] || [base.name, ''];
      const p = add(base.name, label, desc);
      p.meshes.push(base); p.mats.push(...matsOf(base)); p.self = true;
      matsOf(base).forEach((_, i) => expandByMaterial(p.box, base, i));
    }
    for (const node of base.children) {
      if (base !== root && node.isMesh && GENERIC_NAME.test(node.name)) { // unnamed primitives of the parent (e.g. Sentinel-6 BUS)
        const [label, desc] = cfg.modules[base.name] || [base.name, ''];
        const p = add(base.name, label, desc);
        p.meshes.push(node); p.mats.push(...matsOf(node)); p.self = true;
        matsOf(node).forEach((_, i) => expandByMaterial(p.box, node, i));
        continue;
      }
      const [label, desc] = cfg.modules[node.name] || [node.name, ''];
      const p = add(node.name || node.uuid, label, desc);
      p.node = node;
      node.traverse(n => { if (n.isMesh) { p.meshes.push(n); p.mats.push(...matsOf(n)); } });
      p.box.setFromObject(node);
    }
  } else {
    root.traverse(mesh => {
      if (!mesh.isMesh) return;
      matsOf(mesh).forEach((m, i) => {
        const [key, label, , desc] = familyOf(m.name);
        const p = add(key, label, desc);
        if (!p.meshes.includes(mesh)) p.meshes.push(mesh);
        p.mats.push(m);
        expandByMaterial(p.box, mesh, i);
      });
    });
  }
  for (const p of Object.values(parts)) {
    if (p.box.isEmpty()) p.box.setFromCenterAndSize(new THREE.Vector3(), new THREE.Vector3(1e-3, 1e-3, 1e-3));
    p.center = p.box.getCenter(new THREE.Vector3());
    p.color = '#' + (p.mats.find(m => m.color)?.color.getHexString() || 'cccccc');
    p.isShell = cfg.shells.includes(p.key);
    p.isPath = cfg.paths.includes(p.key);
    p.basePos = p.node ? p.node.position.clone() : null;
    p.offset = new THREE.Vector3();
    p.mats.forEach(m => { m.userData.base = { opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite, emissive: m.emissive ? m.emissive.clone() : null }; });
  }
  return parts;
}

function prepare(key, root, animations = []) {
  const cfg = MODELS[key];
  // own copy of every material so highlighting never leaks between meshes
  root.traverse(n => { if (n.isMesh) n.material = Array.isArray(n.material) ? n.material.map(m => m.clone()) : n.material.clone(); });
  cfg.fix?.(root);
  const parts = buildParts(root, cfg);
  const matPart = new Map();
  for (const p of Object.values(parts)) p.mats.forEach(m => matPart.set(m.uuid, p.key));

  // normalize: centre and scale the main body (excluding long arrays) to FOCUS_SIZE
  const focus = new THREE.Box3();
  for (const [k, p] of Object.entries(parts)) if (!cfg.focusSkip.includes(k)) focus.union(p.box);
  const size = focus.getSize(new THREE.Vector3());
  const span = Math.max(size.x, size.y, size.z) || 1;
  const scale = (FOCUS_SIZE * (cfg.sizeAdj || 1)) / span;
  const center = focus.getCenter(new THREE.Vector3());
  const pivot = new THREE.Group();     // spins
  const holder = new THREE.Group();    // normalizes
  holder.scale.setScalar(scale);
  holder.position.copy(center).multiplyScalar(-scale);
  holder.add(root);
  pivot.add(holder);

  // explode directions (root space) away from the focus centre
  for (const p of Object.values(parts)) {
    const d = p.center.clone().sub(center);
    if (d.lengthSq() < 1e-9) d.set(0, 1, 0);
    p.dir = d.normalize().multiplyScalar(span * 0.55);
  }

  // labels: explicit list (Landsat 9) or one per part
  const labels = cfg.labels || Object.values(parts).map(p => ({ m: p.key, pr: 1, t: p.label, p: p.center.toArray() }));
  const labelEls = labels.map(l => {
    const el = document.createElement('div');
    el.className = 'part-label' + (l.pr ? '' : ' minor');
    el.textContent = l.t;
    el.style.setProperty('--c', parts[l.m]?.color || GOLD);
    el.style.opacity = 0;
    document.getElementById('labels').appendChild(el);
    return el;
  });

  let mixer = null;
  if (animations.length) {
    mixer = new THREE.AnimationMixer(root);
    animations.forEach(a => mixer.clipAction(a).play());
  }
  let tris = 0;
  root.traverse(n => { if (n.isMesh) tris += (n.geometry.index ? n.geometry.index.count : n.geometry.attributes.position.count) / 3; });
  return { key, cfg, root, pivot, holder, parts, matPart, labels, labelEls, mixer, tris: Math.round(tris), meshes: Object.values(parts).flatMap(p => p.meshes) };
}

function load(key) {
  if (loaded[key]) return Promise.resolve(loaded[key]);
  return new Promise((resolve, reject) => loader.load(MODELS[key].url, g => { loaded[key] = prepare(key, g.scene, g.animations); resolve(loaded[key]); }, undefined, reject));
}

// ------------------------------------------------------------------ your own files (as in the original viewer)
function disposeInstance(inst) {
  scene.remove(inst.pivot);
  inst.labelEls.forEach(el => el.remove());
  inst.tag?.remove();
  inst.root.traverse(n => { if (n.isMesh) { n.geometry.dispose(); matsOf(n).forEach(m => m.dispose()); } });
}

async function openFiles(fileList) {
  const files = [...fileList];
  const models = files.filter(f => /\.(glb|gltf)$/i.test(f.name));
  const stls = files.filter(f => /\.stl$/i.test(f.name));
  if (!models.length && !stls.length) { flash('Use .glb, .gltf or .stl files'); return; }
  $('loading').textContent = 'Reading your file…';
  $('loading').classList.remove('done');
  try {
    let root, animations = [], partsBy, shells = [], paths = [], name;
    if (models.length) {
      const f = models[0];
      name = f.name;
      const gltf = await loader.parseAsync(await f.arrayBuffer(), '');
      root = gltf.scene; animations = gltf.animations;
      const base = unwrap(root);
      const named = base.children.filter(c => c.name && !GENERIC_NAME.test(c.name));
      partsBy = !base.isMesh && base.children.length >= 2 && named.length >= base.children.length / 2 ? 'node' : 'material';
      if (partsBy === 'node') {
        const keys = base.children.map(c => c.name || c.uuid);
        shells = keys.filter(k => /spacecraft|body|bus|housing|shell|mli|external/i.test(k));
        paths = keys.filter(k => /light_?path|beam|ray/i.test(k));
      } else shells = FAMILY_SHELLS;
    } else {
      // several STL parts are assembled in one scene; colours follow the original viewer's naming rules
      name = stls.map(f => f.name).join(', ');
      root = new THREE.Group();
      const palette = [0xd8dee6, 0xe8a33d, 0x6fb8ff, 0x9be89b, 0xd88fd8];
      for (const [i, f] of stls.entries()) {
        const geo = stlLoader.parse(await f.arrayBuffer());
        geo.computeVertexNormals();
        const lower = f.name.toLowerCase();
        const mat = new THREE.MeshStandardMaterial({ color: palette[i % palette.length], metalness: 0.45, roughness: 0.5 });
        if (lower.includes('element')) { mat.color.set(0xffd54a); mat.metalness = 0.55; mat.roughness = 0.3; mat.emissive.set(0x3a2f00); }
        else if (/light_path|beam|ray/.test(lower)) { mat.color.set(0x5fd4ff); mat.transparent = true; mat.opacity = 0.55; mat.depthWrite = false; mat.emissive.set(0x0a3a52); }
        const mesh = new THREE.Mesh(geo, mat);
        mesh.name = f.name.replace(/\.stl$/i, '');
        root.add(mesh);
        if (/light_path|beam|ray/.test(lower)) paths.push(mesh.name);
        else if (i === 0 || /assembled|landsat|spacecraft|body/.test(lower)) shells.push(mesh.name);
      }
      partsBy = 'node';
    }
    if (loaded.custom) disposeInstance(loaded.custom);
    delete loaded.custom;
    MODELS.custom = {
      simple: true, hidden: true, name, partsBy, unwrap: true, shells, paths, focusSkip: [], modules: {}, labels: null,
      kicker: 'Your file · stays in this browser', body: 'Loaded locally; nothing is uploaded. Click a part to isolate it, use X-ray and See-through to look inside, or the eye icons to hide parts.',
      specs: [], view: { dir: [1, 0.5, 1.1], dist: 2 },
      fix(r) { r.traverse(o => { if (o.isMesh) matsOf(o).forEach(m => { if (m.roughness !== undefined) m.roughness = Math.max(m.roughness, 0.25); }); }); },
    };
    loaded.custom = prepare('custom', root, animations);
    MODELS.custom.specs = [['File', name], ['Parts', `${Object.keys(loaded.custom.parts).length} (${partsBy === 'node' ? 'by object name' : 'by surface material'})`], ['Triangles', loaded.custom.tris.toLocaleString()]];
    await setView('custom');
  } catch (e) {
    $('loading').textContent = 'Could not read the file: ' + (e.message || e);
    setTimeout(() => $('loading').classList.add('done'), 2500);
  }
}

// ------------------------------------------------------------------ state
const state = { view: 'landsat9', explode: 0, xray: false, see: 0.12, paths: true, labelMode: 'main', wire: false, spin: true, highlight: null, hidden: new Set() };
let active = []; // instances currently shown

const $ = id => document.getElementById(id);
function flash(msg) { const t = $('hoverTip'); t.textContent = msg; t.style.transform = 'translate(50vw, 50vh) translate(-50%, -50%)'; t.style.opacity = 1; setTimeout(() => (t.style.opacity = 0), 1800); }

// view keys: landsat9 | landsat7 | compare | lineage | gallery/<model> | custom
const isMulti = v => v === 'compare' || v === 'lineage';
const tabOf = v => (v.startsWith('gallery') ? 'gallery' : v.startsWith('lineage') ? 'lineage' : v);
let lastGallery = 'terra';
const single = () => (isMulti(state.view) ? null : active[0]);

function viewKeys(view) {
  if (view === 'compare') return ['landsat7', 'landsat9'];
  if (view === 'lineage') return LINEAGE.map(l => l.key);
  if (view.startsWith('gallery')) return [view.split('/')[1] || lastGallery];
  if (view.startsWith('lineage/')) return [view.slice(8)];
  return [view];
}

async function setView(view) {
  if (view === 'gallery') view = 'gallery/' + lastGallery;
  if (view.startsWith('gallery/')) lastGallery = view.split('/')[1];
  state.view = view;
  state.highlight = null;
  if (view !== 'custom') history.replaceState(null, '', '#' + view);
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
const EYE = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>';
const EYE_OFF = '<svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" d="M3 3l18 18M10.6 5.1A10.8 10.8 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4M6.6 6.6A17 17 0 0 0 2 12s3.6 7 10 7a10 10 0 0 0 4.4-1"/></svg>';

function renderPanel() {
  const compare = state.view === 'compare', lineage = state.view === 'lineage', gallery = state.view.startsWith('gallery');
  const inst = single();
  const cfg = inst?.cfg;
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

  // instruments and the four resolutions (from the shared mission dataset)
  const keyOf = i => i?.key;
  const mission = inst ? MISSIONS.find(m => m.model && m.model.split('/').pop() === keyOf(inst)) : null;
  $('instWrap').hidden = !mission;
  if (mission) {
    $('instList').innerHTML = instrumentsHTML(mission.inst, '#4da3ff');
    $('instWrap').querySelector('summary').innerHTML = `Instruments &amp; resolutions <a href="timeline.html#${mission.key}">timeline &rarr;</a>`;
  }

  // gallery picker / lineage inspect list / back link
  const picker = $('picker');
  picker.replaceChildren();
  const fromLineage = state.view.startsWith('lineage/');
  picker.hidden = !(gallery || lineage || fromLineage);
  if (lineage) {
    const h = document.createElement('h3'); h.className = 'sub'; h.innerHTML = 'Inspect one <span>or click a satellite</span>';
    const grid = document.createElement('div'); grid.className = 'modules';
    for (const l of LINEAGE) {
      const b = document.createElement('button');
      b.className = 'mod';
      b.style.setProperty('--c', '#ffc94d');
      b.innerHTML = `<i></i>${l.label} <small>${l.year}</small>`;
      b.onclick = () => setView('lineage/' + l.key);
      grid.appendChild(b);
    }
    picker.append(h, grid);
  }
  if (fromLineage) {
    const b = document.createElement('button');
    b.className = 'back-link';
    b.innerHTML = '&larr; Back to Landsat lineage';
    b.onclick = () => setView('lineage');
    const nav = document.createElement('div'); nav.className = 'lineage-nav';
    for (const l of LINEAGE) {
      const n = document.createElement('button');
      n.className = 'mini' + ('lineage/' + l.key === state.view ? ' on' : '');
      n.textContent = l.year;
      n.title = l.label;
      n.onclick = () => setView('lineage/' + l.key);
      nav.appendChild(n);
    }
    picker.append(b, nav);
  }
  if (gallery) {
    const h = document.createElement('h3'); h.className = 'sub'; h.innerHTML = 'NASA 3D models <span>pick a satellite</span>';
    const grid = document.createElement('div'); grid.className = 'modules';
    for (const [k, m] of Object.entries(MODELS)) {
      if (!m.simple || m.hidden || m.schematic) continue;
      const b = document.createElement('button');
      b.className = 'mod' + (state.view === 'gallery/' + k ? ' active' : '');
      b.style.setProperty('--c', '#4da3ff');
      b.innerHTML = `<i></i>${m.name}`;
      b.onclick = () => setView('gallery/' + k);
      grid.appendChild(b);
    }
    const credit = document.createElement('p'); credit.className = 'credit';
    credit.innerHTML = 'Models: <a href="https://github.com/nasa/NASA-3D-Resources" target="_blank" rel="noopener">NASA 3D Resources</a> (free, without copyright).';
    const h2 = document.createElement('h3'); h2.className = 'sub'; h2.innerHTML = 'ESA models <span>open on ESA\u2019s site</span>';
    const grid2 = document.createElement('div'); grid2.className = 'modules';
    for (const e of Object.values(ESA_3D)) {
      const a = document.createElement('a');
      a.className = 'mod ext'; a.href = e.url; a.target = '_blank'; a.rel = 'noopener';
      a.style.setProperty('--c', '#ffc94d');
      a.innerHTML = `<i></i>${e.label} <small>↗</small>`;
      grid2.appendChild(a);
    }
    const credit2 = document.createElement('p'); credit2.className = 'credit';
    credit2.innerHTML = `Interactive 3D on <a href="${ESA_VISUALS}" target="_blank" rel="noopener">ESA Earth Online Visuals</a>; ESA does not offer these models for download, so they open in a new tab.`;
    const h3 = document.createElement('h3'); h3.className = 'sub'; h3.innerHTML = 'Schematic models <span>China</span>';
    const grid3 = document.createElement('div'); grid3.className = 'modules';
    for (const [k, m] of Object.entries(MODELS)) {
      if (!m.schematic) continue;
      const b = document.createElement('button');
      b.className = 'mod' + (state.view === 'gallery/' + k ? ' active' : '');
      b.style.setProperty('--c', '#ff7a9c');
      b.innerHTML = `<i></i>${m.name}`;
      b.onclick = () => setView('gallery/' + k);
      grid3.appendChild(b);
    }
    const credit3 = document.createElement('p'); credit3.className = 'credit';
    credit3.innerHTML = 'No open 3D models exist for these satellites, so these were built from published descriptions and papers. Shapes, sizes and positions are approximate.';
    picker.append(h, grid, credit, h3, grid3, credit3, h2, grid2, credit2);
  }

  // parts list: isolate, hide/show
  const list = $('modules');
  list.replaceChildren();
  $('modInfo').hidden = true;
  $('partsSection').hidden = !inst;
  if (!inst) return;
  const byMaterial = cfg.partsBy === 'material';
  $('modHead').innerHTML = `${byMaterial ? 'Parts by surface' : 'Modules'} <span>click to isolate · eye to hide</span>`;
  for (const p of Object.values(inst.parts)) {
    const row = document.createElement('div');
    row.className = 'mod-row';
    const b = document.createElement('button');
    b.className = 'mod';
    b.dataset.mod = p.key;
    b.style.setProperty('--c', p.color);
    b.innerHTML = `<i></i><span>${p.label}</span>`;
    b.onclick = () => setHighlight(p.key);
    const eye = document.createElement('button');
    const hk = inst.key + ':' + p.key;
    eye.className = 'eye' + (state.hidden.has(hk) ? ' off' : '');
    eye.title = 'Show / hide';
    eye.setAttribute('aria-label', `Show or hide ${p.label}`);
    eye.innerHTML = state.hidden.has(hk) ? EYE_OFF : EYE;
    eye.onclick = () => {
      state.hidden.has(hk) ? state.hidden.delete(hk) : state.hidden.add(hk);
      eye.classList.toggle('off', state.hidden.has(hk));
      eye.innerHTML = state.hidden.has(hk) ? EYE_OFF : EYE;
      applyLook();
    };
    row.append(b, eye);
    list.appendChild(row);
  }
}

function setHighlight(k) {
  state.highlight = state.highlight === k ? null : k;
  document.querySelectorAll('#modules .mod').forEach(b => b.classList.toggle('active', b.dataset.mod === state.highlight));
  const info = $('modInfo');
  const inst = single();
  if (state.highlight && inst) {
    const p = inst.parts[state.highlight];
    info.style.setProperty('--c', p.color);
    info.innerHTML = `<b>${p.label}</b>${p.desc || ''}`;
    info.hidden = false;
  } else info.hidden = true;
  applyLook();
}

// ------------------------------------------------------------------ look (isolate / x-ray / see-through / wireframe / hide)
function applyLook() {
  for (const inst of active) {
    const isolating = state.highlight && inst === single();
    for (const [k, p] of Object.entries(inst.parts)) {
      const hidden = state.hidden.has(inst.key + ':' + k) || (p.isPath && !state.paths);
      let opacity = null;
      if (isolating) opacity = k === state.highlight ? 1 : state.see;
      else if (state.xray && p.isShell) opacity = state.see;
      for (const m of p.mats) {
        const b = m.userData.base;
        m.visible = !hidden;
        m.wireframe = state.wire && !p.isPath;
        if (opacity === null) {
          m.opacity = b.opacity; m.transparent = b.transparent; m.depthWrite = b.depthWrite;
          if (m.emissive && b.emissive) m.emissive.copy(b.emissive);
        } else {
          m.transparent = true;
          m.opacity = p.isPath ? Math.min(opacity, b.opacity) : opacity;
          m.depthWrite = opacity >= 1 && !p.isPath;
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
toggle('wire', 'wire', applyLook);
toggle('spin', 'spin');
const LABEL_MODES = { main: 'Labels: main', all: 'Labels: all', off: 'Labels: off' };
$('labelsToggle').onclick = e => {
  state.labelMode = { main: 'all', all: 'off', off: 'main' }[state.labelMode];
  e.currentTarget.textContent = LABEL_MODES[state.labelMode];
  e.currentTarget.classList.toggle('on', state.labelMode !== 'off');
};
$('see').oninput = e => {
  state.see = +e.target.value;
  if (!state.xray && !state.highlight) { state.xray = true; $('xray').classList.add('on'); $('xray').setAttribute('aria-pressed', true); }
  applyLook();
};
$('showAll').onclick = () => {
  const inst = single(); if (!inst) return;
  [...state.hidden].filter(h => h.startsWith(inst.key + ':')).forEach(h => state.hidden.delete(h));
  state.highlight = 'x'; setHighlight('x'); renderPanel(); applyLook();
};
$('reset').onclick = () => {
  state.highlight = null; state.explode = 0; $('explode').value = 0;
  state.hidden.clear();
  setHighlight(null); renderPanel();
  active.forEach(i => i.pivot.rotation.set(0, state.view === 'lineage' ? -0.5 : 0, 0));
  resetCamera();
};
$('explode').oninput = e => (state.explode = +e.target.value);

// open / drop files
const fileInput = $('fileInput');
$('openFile').onclick = () => fileInput.click();
fileInput.onchange = e => { if (e.target.files.length) openFiles(e.target.files); fileInput.value = ''; };
let dragDepth = 0;
window.addEventListener('dragenter', e => { e.preventDefault(); dragDepth++; document.body.classList.add('dragging'); });
window.addEventListener('dragover', e => e.preventDefault());
window.addEventListener('dragleave', () => { if (--dragDepth <= 0) { dragDepth = 0; document.body.classList.remove('dragging'); } });
window.addEventListener('drop', e => { e.preventDefault(); dragDepth = 0; document.body.classList.remove('dragging'); if (e.dataTransfer.files.length) openFiles(e.dataTransfer.files); });

// picking: click isolates, hover names the part
const raycaster = new THREE.Raycaster();
function pickModel(e) {
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  let best = null;
  for (const inst of active) {
    const hit = raycaster.intersectObjects(inst.meshes, false).find(h => matsOf(h.object).some(m => m.visible));
    if (hit && (!best || hit.distance < best.d)) best = { inst, d: hit.distance };
  }
  return best?.inst || null;
}
function pick(e) {
  const inst = single();
  if (!inst) return null;
  const ndc = new THREE.Vector2((e.clientX / window.innerWidth) * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  raycaster.setFromCamera(ndc, camera);
  for (const hit of raycaster.intersectObjects(inst.meshes, false)) {
    const mats = matsOf(hit.object);
    const m = mats.length > 1 ? mats[hit.face?.materialIndex ?? 0] : mats[0];
    const k = m && inst.matPart.get(m.uuid);
    if (!k || !m.visible) continue;
    const p = inst.parts[k];
    if (p.isPath) continue;
    if (m.transparent && m.opacity < 0.5) continue; // look through ghosted parts
    return p;
  }
  return null;
}
let down = null, lastHover = 0;
renderer.domElement.addEventListener('pointerdown', e => (down = { x: e.clientX, y: e.clientY }));
renderer.domElement.addEventListener('pointerup', e => {
  const moved = !down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5;
  down = null;
  if (moved) return;
  if (state.view === 'lineage') { const inst = pickModel(e); if (inst) setView('lineage/' + inst.key); return; }
  const p = pick(e);
  if (p) setHighlight(p.key);
});
renderer.domElement.addEventListener('pointermove', e => {
  const tip = $('hoverTip');
  if (down || e.pointerType === 'touch') { tip.style.opacity = 0; return; }
  const now = performance.now();
  if (now - lastHover < 90) return;
  lastHover = now;
  const lin = state.view === 'lineage' ? pickModel(e) : null;
  const p = lin ? { label: `Inspect ${LINEAGE.find(l => l.key === lin.key).label}`, color: '#ffc94d' } : pick(e);
  tip.style.opacity = p ? 1 : 0;
  renderer.domElement.style.cursor = p ? 'pointer' : '';
  if (p) { tip.textContent = p.label; tip.style.setProperty('--c', p.color); tip.style.transform = `translate(${e.clientX + 14}px, ${e.clientY + 12}px)`; }
});
renderer.domElement.addEventListener('pointerleave', () => ($('hoverTip').style.opacity = 0));

// ------------------------------------------------------------------ scan diagrams (whiskbroom vs pushbroom)
function scanDiagram(canvas, mode) {
  const g = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  const rows = 16, cols = 22, cw = (W - 20) / cols, ch = 7;
  let t = 0;
  return dt => {
    t += dt;
    g.clearRect(0, 0, W, H);
    const sx = W / 2, sy = 22;
    g.fillStyle = '#d9dee5'; g.fillRect(sx - 10, sy - 7, 20, 14);
    g.fillStyle = '#2a4b9b'; g.fillRect(sx - 34, sy - 4, 22, 8); g.fillRect(sx + 12, sy - 4, 22, 8);
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

// ------------------------------------------------------------------ callout labels with leader lines
const leaders = $('leaders');
const toScreen = vec => ({ x: (vec.x * 0.5 + 0.5) * window.innerWidth, y: (-vec.y * 0.5 + 0.5) * window.innerHeight, z: vec.z });
const LABEL_GAP = 20, LEADER = 46;

function labelVisible(inst, l) {
  const p = inst.parts[l.m];
  if (!p || state.labelMode === 'off' || state.hidden.has(inst.key + ':' + l.m) || (p.isPath && !state.paths)) return false;
  if (state.view === 'lineage') return false;
  if (state.view === 'compare') return !!l.pr && /OLI2_Optics|ETM_Housing|TIRS2$/.test(l.m);
  if (state.highlight) return l.m === state.highlight;
  if (state.labelMode === 'all') return true;
  return !!l.pr && !p.isPath;
}

function layoutLabels() {
  let svg = '';
  for (const inst of active) {
    if (inst.tag) {
      v.copy(inst.pivot.position).add(_tagOff).project(camera);
      const s = toScreen(v);
      inst.tag.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, 0)`;
      inst.tag.style.opacity = isMulti(state.view) && v.z < 1 ? 1 : 0;
    }
    v.copy(inst.pivot.position).project(camera);
    const c = toScreen(v);
    const items = [];
    inst.labels.forEach((l, i) => {
      const el = inst.labelEls[i];
      if (!labelVisible(inst, l)) { el.style.opacity = 0; return; }
      v.fromArray(l.p).add(inst.parts[l.m].offset);
      inst.root.localToWorld(v);
      v.project(camera);
      if (v.z > 1) { el.style.opacity = 0; return; }
      const a = toScreen(v);
      let dx = a.x - c.x, dy = a.y - c.y;
      const len = Math.hypot(dx, dy) || 1;
      dx /= len; dy /= len;
      if (Math.abs(dx) < 0.25) dx = dx < 0 ? -0.25 : 0.25; // keep callouts to the left or right
      items.push({ el, a, side: dx < 0 ? -1 : 1, x: a.x + dx * LEADER, y: a.y + dy * LEADER * 0.6, color: inst.parts[l.m].color });
    });
    // push apart labels on each side so they don't overlap
    for (const side of [-1, 1]) {
      const col = items.filter(it => it.side === side).sort((p, q) => p.y - q.y);
      for (let i = 1; i < col.length; i++) if (col[i].y - col[i - 1].y < LABEL_GAP) col[i].y = col[i - 1].y + LABEL_GAP;
    }
    for (const it of items) {
      it.el.style.opacity = 1;
      it.el.style.transform = `translate(${it.x}px, ${it.y}px) translate(${it.side < 0 ? '-100%' : '0'}, -50%)`;
      svg += `<line x1="${it.a.x.toFixed(1)}" y1="${it.a.y.toFixed(1)}" x2="${it.x.toFixed(1)}" y2="${it.y.toFixed(1)}" stroke="${it.color}"/><circle cx="${it.a.x.toFixed(1)}" cy="${it.a.y.toFixed(1)}" r="2.6" fill="${it.color}"/>`;
    }
  }
  leaders.innerHTML = svg;
}

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
    for (const p of Object.values(inst.parts)) {
      if (p.node && !p.isShell && !p.self) {
        p.offset.lerp(v.copy(p.dir).multiplyScalar(state.explode), 0.15);
        p.node.position.copy(p.basePos).add(p.offset);
      }
      if (p.isPath) for (const m of p.mats) if (m.emissive) m.emissiveIntensity = 1.2 + Math.sin(time * 4) * 0.8;
    }
  }
  controls.update();
  renderer.render(scene, camera);
  diagrams.forEach(d => d(dt));
  layoutLabels();
  requestAnimationFrame(frame);
}

const initial = decodeURIComponent((location.hash || '#landsat9').slice(1));
const valid = ['landsat9', 'landsat7', 'compare', 'lineage', 'gallery'].includes(initial) || (initial.startsWith('gallery/') && MODELS[initial.slice(8)]?.simple && !MODELS[initial.slice(8)].hidden) || (initial.startsWith('lineage/') && LINEAGE.some(l => l.key === initial.slice(8)));
setView(valid ? initial : initial === 'gallery/landsat8' ? 'lineage/landsat8' : 'landsat9');
frame();
