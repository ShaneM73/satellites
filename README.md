# Eyes on Earth — Modern Earth Observation Satellites

An interactive 3D infographic that walks through the modern Earth observation fleet in ten steps, built as a companion to the *Introduction to Geospatial Technologies*, Chapter 11 ("Images from Space") lecture.

**Live demo:** https://shanem73.github.io/satellites/

## Steps

| # | Step | What you see |
|---|------|--------------|
| 0 | Eyes on Earth | The whole fleet, plus a timeline from Sputnik (1957) to Landsat 10 (planned 2031) |
| 1 | Three ways to orbit | Sun-synchronous, near-polar, inclined and geostationary reference orbits |
| 2 | NASA's EOS flagships | Terra, Aqua, Aura and their projected end-of-science dates (2027–2028) |
| 3 | Landsat | Landsat 8 and 9 building up 185 km ground-track swaths; 1972–2031 lineage |
| 4 | Copernicus Sentinels | Sentinel-1C/1D, -2B/2C, -3A/B/C, -5P, -6B, Biomass, Sentinel-4 on MTG-S1 |
| 5 | Specialist science | NISAR, PACE, SWOT, ICESat-2, GRACE-FO, SMAP, OCO-2, GPM, TEMPO |
| 6 | Weather fleet | GOES-19/18, Himawari-9, Meteosat-12, NOAA-20/21, Suomi NPP |
| 7 | Beyond the US and Europe | ALOS-4, GOSAT-GW, Cartosat-3, EOS-04, Gaofen-3, Fengyun-3E, RADARSAT Constellation |
| 8 | The commercial era | WorldView Legion, Pléiades Neo, Tanager-1, Planet SuperDoves, ICEYE; plus a 30 m → 34 cm resolution comparison |
| 9 | Explore | Everything at once, with filters by operator |

Click any satellite (or its name in the side panel) for its launch date, orbit, sensors and status. Arrow keys move between steps; `#step=3` in the URL deep-links to a step.

## Mission timeline (`timeline.html`)

**Live:** https://shanem73.github.io/satellites/timeline.html

70 missions from Sputnik (1957) to Landsat 10 (planned 2031), in lanes by operator (early missions, NASA/USGS, NOAA & weather, Europe, Asia & Canada, commercial). Bars show operating, ended, projected end-of-science and planned periods. Click a bar for every instrument with its **spatial, spectral, temporal and radiometric resolution** (133 instruments). Filter by operator or search by satellite or instrument name; `timeline.html#terra` deep-links to a mission.

The same instrument tables appear on the globe tour's satellite cards and in the hangar. Data live in `js/instruments.js`: nominal design specifications; "n/a" marks radar, lidar and ranging instruments that have no bit depth, and "—" marks values not published in the sources used (listed in `SPEC_SOURCES`).

## 3D satellite hangar (`spacecraft.html`)

**Live:** https://shanem73.github.io/satellites/spacecraft.html

| View | What it does |
|------|--------------|
| Landsat 9 / Landsat 7 | Detailed cutaway models: click a module (OLI-2, TIRS-2, ETM+ scan mirror, star trackers…) to isolate it, X-ray the bus, pull parts apart with the Explode slider, and follow the animated light paths. Landsat 7's scan mirror oscillates. |
| 7 vs 9 | Side by side, with a whiskbroom vs pushbroom table and animated scan diagrams |
| Lineage | Landsat 1–3, 4–5, 7, 8 and 9 in a row, 1972–2021. Click one (or its button) to inspect it on its own with all module tools. |
| Gallery | NASA models of Terra, Aqua, Aura, ICESat-2, GPM, OCO-2, Suomi NPP, GOES, Sentinel-6 and GRACE |
| Open file… | Drop or pick your own `.glb`, `.gltf` or `.stl` files (several STL parts assemble into one scene). Nothing is uploaded. |

**Inspection tools (all views):** X-ray and a See-through slider to reveal internal structure; click a part (or its name) to isolate it while the rest turns transparent; eye icons to hide parts; Wireframe; Labels: main / all / off, drawn as callouts with leader lines; hover to name a part. Models without named modules (most NASA models) are split into surface groups: insulation blankets, solar array, antennas, structure, radiators. Sentinel-6 uses its real instrument names.

Deep links: `spacecraft.html#landsat9`, `#landsat7`, `#compare`, `#lineage`, `#lineage/landsat8`, `#gallery/terra`. Satellite cards on the globe link here with **View in 3D**.

## Run locally

No build step. Serve the folder with any static server:

```bash
python3 -m http.server 8000
# open http://localhost:8000
```

## Notes on accuracy

- Orbits are simplified circular approximations (altitude, inclination, local time of ascending node) drawn in a Sun-fixed frame, not real-time ephemerides. Planet and ICEYE swarms are illustrative.
- Mission facts are as of November 2026. Main sources: NASA (Terra, Aura mission pages), USGS (Landsat 7, Landsat 10), ESA/Copernicus Sentinel launch records, and *The State of Earth Observation 2026* (NewSpace Economy).

## Credits

- [three.js](https://threejs.org) r169 (MIT), vendored in `vendor/`.
- Earth textures (NASA Blue Marble and Black Marble, via the [three-globe](https://github.com/vasturiano/three-globe) examples).
- Landsat 9 and Landsat 7 cutaway models (`assets/models/`): schematic models with named modules by the project author.
- Gallery and lineage models (`assets/models/nasa/`): [NASA 3D Resources](https://github.com/nasa/NASA-3D-Resources), "free and without copyright". Landsat 1–3 and 4–5 were recompressed (Draco + WebP, 1024 px textures); Terra's two missing external textures were removed. Use of NASA models does not imply NASA endorsement.
- Draco decoder and GLTFLoader from three.js r169 (`vendor/`).
