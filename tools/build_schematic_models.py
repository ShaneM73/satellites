"""Build schematic 3D models (GLB) of Chinese Earth observation satellites from published descriptions.

Each top-level node is one named module, so the hangar can isolate, X-ray, label and explode it.
Axes (metres): +x = flight direction, +y = zenith (up), -y = nadir (Earth), +z = right of track.

Sources
  Gaofen-3: eoPortal GF-3 page (SAR antenna 15 m x 1.232 m, 4 panels, 1536 T/R channels, folded on two
            sides at launch, right-looking; CMGs and momentum wheels; dual-frequency GPS; two antenna power
            units and an antenna interface unit; NiCd + Li-ion batteries); Gunter's Space Page (two deployable
            solar arrays, CS-L3000B bus, 2,950 kg). Orbit: dawn-dusk sun-synchronous, 755 km.
  Fengyun-3E: Zhang et al. 2022, Adv. Atmos. Sci. "FY-3E: the first operational meteorological satellite
            mission in an early morning orbit" (hexahedron, 5.7 x 3.2 x 11.6 m in flight, ~2,675 kg, one solar
            panel on one side, star sensor, 11 instruments); eoPortal FY-3 (body 4.4 x 2.0 x 2.0 m; service,
            payload and propulsion modules).
  Where the sources give no position or size, the layout follows the usual practice for the instrument type
  (Earth viewers on the nadir face, Sun viewers on the Sun-facing side of a dawn-dusk orbit) and is approximate.

Run:  python3 tools/build_schematic_models.py   (needs: pip install trimesh)
"""
import math
from pathlib import Path

import numpy as np
import trimesh
from trimesh.visual.material import PBRMaterial
from trimesh.visual import TextureVisuals

OUT = Path(__file__).resolve().parent.parent / 'assets' / 'models' / 'schematic'
OUT.mkdir(parents=True, exist_ok=True)

_mats = {}
def mat(name, rgb, metal=0.3, rough=0.5, alpha=1.0):
    if name not in _mats:
        _mats[name] = PBRMaterial(name=name, baseColorFactor=[*rgb, alpha], metallicFactor=metal, roughnessFactor=rough,
                                  alphaMode='BLEND' if alpha < 1 else 'OPAQUE', doubleSided=True)
    return _mats[name]

GOLD = lambda: mat('gold_mli', [0.86, 0.62, 0.22], 1.0, 0.38)
SILVER = lambda: mat('silver_structure', [0.80, 0.82, 0.86], 0.85, 0.3)
WHITE = lambda: mat('white_radiator', [0.93, 0.94, 0.95], 0.0, 0.7)
DARK = lambda: mat('dark_hardware', [0.16, 0.17, 0.2], 0.4, 0.45)
CELL = lambda: mat('solar_cells', [0.12, 0.2, 0.48], 0.5, 0.28)


class Model:
    def __init__(self):
        self.scene = trimesh.Scene()
        self.count = {}

    def add(self, part, mesh, material):
        mesh.visual = TextureVisuals(material=material)
        if part not in self.scene.graph.nodes:
            self.scene.graph.update(frame_from=self.scene.graph.base_frame, frame_to=part, matrix=np.eye(4))
        self.count[part] = self.count.get(part, 0) + 1
        name = f'{part}_{self.count[part]}'
        self.scene.add_geometry(mesh, node_name=name, geom_name=name, parent_node_name=part)

    def box(self, part, size, center, material, rot=None):
        m = trimesh.creation.box(extents=size)
        if rot is not None: m.apply_transform(rot)
        m.apply_translation(center)
        self.add(part, m, material)

    def cyl(self, part, r, h, center, axis, material, sections=32):
        m = trimesh.creation.cylinder(radius=r, height=h, sections=sections)
        m.apply_transform(align_z(axis))
        m.apply_translation(center)
        self.add(part, m, material)

    def cone(self, part, r, h, center, axis, material):
        m = trimesh.creation.cone(radius=r, height=h, sections=32)
        m.apply_transform(align_z(axis))
        m.apply_translation(center)
        self.add(part, m, material)

    def dish(self, part, r, depth, center, axis, material):
        # paraboloid cap opening along +axis
        n = 24; rings = 6
        verts = [[0, 0, 0]]
        for i in range(1, rings + 1):
            rr = r * i / rings
            for j in range(n):
                a = 2 * math.pi * j / n
                verts.append([rr * math.cos(a), rr * math.sin(a), depth * (rr / r) ** 2])
        faces = []
        for j in range(n): faces.append([0, 1 + j, 1 + (j + 1) % n])
        for i in range(rings - 1):
            for j in range(n):
                a = 1 + i * n + j; b = 1 + i * n + (j + 1) % n
                c = a + n; d = b + n
                faces += [[a, c, b], [b, c, d]]
        m = trimesh.Trimesh(vertices=verts, faces=faces)
        m.apply_transform(align_z(axis))
        m.apply_translation(center)
        self.add(part, m, material)

    def sphere(self, part, r, center, material):
        m = trimesh.creation.icosphere(subdivisions=2, radius=r)
        m.apply_translation(center)
        self.add(part, m, material)

    def save(self, path):
        self.scene.export(path)
        print(path.name, f'{path.stat().st_size / 1024:.0f} KB', sorted(self.count))


def align_z(axis):
    axis = np.asarray(axis, float); axis /= np.linalg.norm(axis)
    z = np.array([0, 0, 1.0])
    if np.allclose(axis, z): return np.eye(4)
    if np.allclose(axis, -z): return trimesh.transformations.rotation_matrix(math.pi, [1, 0, 0])
    v = np.cross(z, axis); ang = math.acos(np.clip(np.dot(z, axis), -1, 1))
    return trimesh.transformations.rotation_matrix(ang, v)


def rot_x(deg): return trimesh.transformations.rotation_matrix(math.radians(deg), [1, 0, 0])


# ----------------------------------------------------------------------------------------- Gaofen-3
def gaofen3():
    M = Model()
    # bus (CS-L3000B class): gold MLI with white radiators
    M.box('Bus', [2.6, 2.4, 2.2], [0, 0, 0], GOLD())
    M.box('Bus', [2.62, 0.05, 2.22], [0, 1.22, 0], WHITE())
    M.box('Bus', [0.05, 1.6, 1.6], [-1.32, 0.1, 0], WHITE())
    # SAR antenna: 4 panels, 15 m x 1.232 m, right-looking (normal ~35 deg off nadir toward +z)
    tilt = rot_x(55)                      # turns panel normal from +z toward -y
    centre = np.array([0, -0.85, 1.55])
    normal = np.array([0, -math.sin(math.radians(55)), math.cos(math.radians(55))])
    for i, xc in enumerate([-5.625, -1.875, 1.875, 5.625]):
        c = centre + [xc, 0, 0]
        M.box('SAR_Antenna', [3.70, 1.232, 0.10], c, DARK(), tilt)             # radiating face
        M.box('SAR_Antenna', [3.70, 1.20, 0.04], c - normal * 0.07, SILVER(), tilt)  # back frame
        for k in range(6):                                                   # 6 column modules per panel
            xk = xc - 1.85 + (k + 0.5) * (3.70 / 6)
            M.box('SAR_Antenna', [0.02, 1.18, 0.012], np.array([xk, c[1], c[2]]) + normal * 0.056, SILVER(), tilt)
    # deployment hinges and yoke
    for xh in [-3.75, 0.0, 3.75]:
        M.cyl('Deployment_Mechanism', 0.06, 1.1, centre + [xh, 0, 0] - normal * 0.11, [0, math.cos(math.radians(55)), math.sin(math.radians(55))], SILVER())
    for xs in [-0.9, 0.9]:
        M.box('Deployment_Mechanism', [0.12, 0.12, 0.75], [xs, -0.55, 1.12], SILVER())
    # two deployable solar wings on the Sun side (-z) of a dawn-dusk orbit
    for side in (-1, 1):
        M.box('Solar_Arrays', [0.08, 0.08, 1.0], [side * 1.0, 0.6, -1.55], SILVER())
        for k in range(3):
            xc = side * (1.9 + k * 1.75)
            M.box('Solar_Arrays', [1.68, 1.5, 0.04], [xc, 0.6, -2.08], CELL())
            M.box('Solar_Arrays', [1.72, 1.54, 0.02], [xc, 0.6, -2.05], SILVER())
        M.box('Solar_Arrays', [5.4, 0.06, 0.06], [side * 3.65, 0.6, -2.0], SILVER())
    # data transmission (X-band) antenna on the nadir face
    M.cyl('Data_Transmission_Antenna', 0.04, 0.45, [-0.8, -1.42, -0.6], [0, 1, 0], SILVER())
    M.dish('Data_Transmission_Antenna', 0.28, 0.1, [-0.8, -1.68, -0.6], [0, -1, 0], WHITE())
    # dual-frequency GPS antennas on the zenith face
    for x in (-0.7, 0.7):
        M.cyl('GPS_Antennas', 0.12, 0.05, [x, 1.28, 0.5], [0, 1, 0], WHITE())
    # internal units (visible with X-ray)
    for x in (-0.5, 0.5):
        for z in (-0.45, 0.45):
            M.cyl('CMGs_and_Wheels', 0.22, 0.2, [x, 0.55, z], [0, 1, 0], SILVER())
    M.box('Batteries', [0.9, 0.45, 0.5], [-0.6, -0.4, -0.65], DARK())
    M.box('Batteries', [0.9, 0.45, 0.5], [0.6, -0.4, -0.65], mat('battery_green', [0.45, 0.7, 0.3], 0.2, 0.6))
    M.box('Antenna_Power_and_Control', [0.5, 0.35, 0.3], [-0.6, -0.45, 0.7], mat('electronics_teal', [0.2, 0.68, 0.66], 0.3, 0.5))
    M.box('Antenna_Power_and_Control', [0.5, 0.35, 0.3], [0.6, -0.45, 0.7], mat('electronics_teal', [0.2, 0.68, 0.66], 0.3, 0.5))
    M.box('Antenna_Power_and_Control', [0.4, 0.3, 0.3], [0.0, -0.45, 0.7], mat('electronics_teal', [0.2, 0.68, 0.66], 0.3, 0.5))
    M.box('SAR_Electronics', [0.9, 0.5, 0.5], [0, 0.0, 0.55], mat('payload_orange', [0.95, 0.55, 0.2], 0.3, 0.5))
    M.sphere('Propulsion', 0.38, [0, 0.1, -0.35], mat('tank_bronze', [0.78, 0.63, 0.4], 0.7, 0.35))
    M.cone('Propulsion', 0.08, 0.18, [-1.38, -0.9, 0], [-1, 0, 0], DARK())
    M.save(OUT / 'gf3.glb')


# ----------------------------------------------------------------------------------------- Fengyun-3E
def fy3e():
    M = Model()
    BL, BH, BW = 4.4, 2.0, 2.0                       # body 4.4 x 2.0 x 2.0 m (FY-3 series)
    M.box('Bus', [BL, BH, BW], [0, 0, 0], GOLD())
    M.box('Bus', [BL + 0.02, 0.04, BW * 0.8], [0, BH / 2 + 0.02, 0], WHITE())          # zenith radiator
    M.box('Bus', [BL * 0.9, BH * 0.8, 0.04], [0, 0, BW / 2 + 0.02], WHITE())          # anti-sun radiator
    # one solar wing on one side; extends aft, cells face the Sun (-z) in the dawn-dusk orbit
    M.box('Solar_Array', [1.2, 0.1, 0.1], [-BL / 2 - 0.6, 0.2, -0.6], SILVER())
    for k in range(5):
        xc = -BL / 2 - 1.2 - 0.66 - k * 1.36
        M.box('Solar_Array', [1.3, 2.6, 0.04], [xc, 0.2, -0.62], CELL())
        M.box('Solar_Array', [1.34, 2.64, 0.02], [xc, 0.2, -0.59], SILVER())
    ny = -BH / 2                                     # nadir face
    # Earth-viewing instruments on the nadir face
    M.box('MERSI_LL', [0.9, 0.55, 0.7], [1.55, ny - 0.28, 0.35], WHITE())
    M.cyl('MERSI_LL', 0.18, 0.5, [1.55, ny - 0.62, 0.35], [1, 0, 0], DARK())          # scan cavity
    M.box('HIRAS_II', [0.8, 0.5, 0.7], [0.45, ny - 0.25, -0.45], SILVER())
    M.cyl('HIRAS_II', 0.15, 0.4, [0.45, ny - 0.55, -0.45], [1, 0, 0], DARK())
    M.cyl('MWTS_III', 0.32, 0.35, [-0.45, ny - 0.2, 0.5], [1, 0, 0], WHITE())
    M.dish('MWTS_III', 0.28, 0.08, [-0.45, ny - 0.2, 0.5], [0, -1, 0.3], SILVER())
    M.cyl('MWHS_II', 0.26, 0.3, [-1.25, ny - 0.18, -0.45], [1, 0, 0], WHITE())
    M.dish('MWHS_II', 0.22, 0.07, [-1.25, ny - 0.18, -0.45], [0, -1, 0.3], SILVER())
    # WindRAD: dual-frequency (C and Ku) rotating fan-beam scatterometer at the forward end
    M.cyl('WindRAD', 0.35, 0.25, [BL / 2 + 0.3, ny - 0.1, 0], [0, 1, 0], SILVER())
    M.box('WindRAD', [1.6, 0.06, 0.32], [BL / 2 + 0.3, ny - 0.32, 0.25], DARK(), rot_x(-20))
    M.box('WindRAD', [1.1, 0.06, 0.26], [BL / 2 + 0.3, ny - 0.32, -0.25], mat('ku_panel', [0.55, 0.45, 0.9], 0.3, 0.5), rot_x(20))
    # Tri-IPM: three ionospheric photometers (nadir + two oblique)
    for i, ang in enumerate([-25, 0, 25]):
        M.cyl('Tri_IPM', 0.07, 0.25, [-1.85 + i * 0.18, ny - 0.13, 0.55], [0, -math.cos(math.radians(ang)), math.sin(math.radians(ang))], DARK())
    # GNOS-II: GNSS antennas for orbit determination (zenith), occultation (fore/aft) and reflectometry (nadir)
    M.cyl('GNOS_II', 0.18, 0.05, [0.8, BH / 2 + 0.05, 0.4], [0, 1, 0], WHITE())
    M.box('GNOS_II', [0.05, 0.5, 0.9], [BL / 2 + 0.03, 0.45, -0.3], WHITE())
    M.box('GNOS_II', [0.05, 0.5, 0.9], [-BL / 2 - 0.03, 0.55, 0.5], WHITE())
    M.box('GNOS_II', [0.6, 0.04, 0.5], [-0.4, ny - 0.02, -0.55], WHITE())
    # Sun-viewing instruments on the Sun-facing side (-z)
    sz = -BW / 2
    M.cyl('SIM_II', 0.12, 0.3, [1.4, 0.55, sz - 0.15], [0, 0, -1], SILVER())
    M.box('SSIM', [0.35, 0.3, 0.3], [0.9, 0.55, sz - 0.15], SILVER())
    M.cyl('X_EUVI', 0.13, 0.65, [0.2, 0.55, sz - 0.33], [0, 0, -1], mat('telescope_white', [0.95, 0.95, 0.95], 0.1, 0.6))
    # space environment monitor and star sensors on the zenith face
    M.box('SEM', [0.4, 0.25, 0.35], [-1.3, BH / 2 + 0.13, -0.4], DARK())
    M.box('SEM', [0.3, 0.2, 0.25], [-0.6, BH / 2 + 0.1, -0.5], DARK())
    for i, z in enumerate((-0.3, 0.3)):
        M.cyl('Star_Sensors', 0.08, 0.3, [1.7, BH / 2 + 0.12, z], [0.3, 1, 0.3 * (1 if i else -1)], DARK())
    # downlink antennas (nadir) and internal modules
    M.cyl('Downlink_Antennas', 0.03, 0.3, [-1.9, ny - 0.15, -0.2], [0, 1, 0], SILVER())
    M.dish('Downlink_Antennas', 0.2, 0.06, [-1.9, ny - 0.32, -0.2], [0, -1, 0], WHITE())
    M.sphere('Propulsion_Module', 0.4, [-1.3, 0.1, 0], mat('tank_bronze', [0.78, 0.63, 0.4], 0.7, 0.35))
    M.cone('Propulsion_Module', 0.1, 0.22, [-BL / 2 - 0.1, -0.7, 0], [-1, 0, 0], DARK())
    M.box('Service_Module', [1.2, 0.6, 1.2], [0.2, 0.3, 0], mat('electronics_teal', [0.2, 0.68, 0.66], 0.3, 0.5))
    M.save(OUT / 'fy3e.glb')


if __name__ == '__main__':
    gaofen3()
    fy3e()
