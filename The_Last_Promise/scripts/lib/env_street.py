"""Kampala street near a school: road along Y, pavements, shop buildings with painted signs, boda bodas,
matatu taxis, pedestrians (background characters), power poles, trees, kiosk, school gate."""
import bpy, math, random
from mathutils import Vector
import blib as B

SPOTS = {
    'walk_start': (4.9, 14.0, 0),     # Daniel walks toward -Y along the +x pavement
    'meet': (4.75, 1.0, 0),           # faces -Y
    'brian_start': (5.2, -12.0, 180),
    'brian_meet': (4.95, -0.5, 180),  # faces +Y (toward Daniel)
}


def sign_material(name, text, bg, fg):
    # text is painted as coloured bands (no font rendering offline) + a label strip; reads as a shop sign from distance
    m = B.material(name, bg, roughness=0.8)
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexCoord')
    wave = nt.nodes.new('ShaderNodeTexWave')
    wave.wave_type = 'BANDS'
    wave.bands_direction = 'X'
    wave.inputs['Scale'].default_value = 6.0
    wave.inputs['Distortion'].default_value = 3.0
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].color = bg
    e = ramp.color_ramp.elements.new(0.55)
    e.color = fg
    nt.links.new(tex.outputs['UV'], wave.inputs['Vector'])
    nt.links.new(wave.outputs['Fac'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    return m


def build(scene, preset='day'):
    col = B.collection('Street')
    rnd = random.Random(7)
    objs = []
    def add(o):
        B.link(o, col); objs.append(o); return o
    dirt = B.material('st_dirt', (0.45, 0.25, 0.12, 1), roughness=1); B.add_noise_bump(dirt, 6, 0.4, 4)
    road = B.material('st_road', (0.09, 0.09, 0.09, 1), roughness=0.9); B.add_noise_bump(road, 40, 0.3, 3)
    pave = B.material('st_pave', (0.45, 0.42, 0.36, 1), roughness=0.95); B.add_noise_bump(pave, 20, 0.3, 2)
    paint = B.material('st_paint', (0.9, 0.8, 0.2, 1), roughness=0.7)
    white = B.material('st_white', (0.85, 0.85, 0.85, 1), roughness=0.7)
    concrete = B.material('st_concrete', (0.6, 0.55, 0.47, 1), roughness=0.95)
    dark = B.material('st_dark', (0.15, 0.12, 0.1, 1), roughness=0.8)
    glass = B.material('st_glass', (0.1, 0.15, 0.2, 1), roughness=0.15, metallic=0.3)
    roof = B.material('st_roof', (0.4, 0.15, 0.1, 1), roughness=0.6, metallic=0.4)
    roof2 = B.material('st_roof2', (0.45, 0.48, 0.5, 1), roughness=0.4, metallic=0.7)
    add(B.assign(B.box('ground', (160, 160, 0.05), (0, 0, -0.05), col), dirt))
    add(B.assign(B.box('road', (8, 90, 0.02), (0, 0, -0.005), col), road))
    for y in range(-44, 45, 4):
        add(B.assign(B.box(f'dash{y}', (0.18, 2.0, 0.005), (0, y, 0.006), col), paint))
    for sx in (-1, 1):
        add(B.assign(B.box(f'pave{sx}', (3, 90, 0.15), (sx * 5.6, 0, 0.075), col), pave))
        add(B.assign(B.box(f'drain{sx}', (0.5, 90, 0.1), (sx * 4.25, 0, 0.0), col), dark))
        add(B.assign(B.box(f'kerb{sx}', (0.1, 90, 0.18), (sx * 4.05, 0, 0.09), col), white))
    # buildings
    colors = [(0.75, 0.6, 0.4, 1), (0.7, 0.25, 0.2, 1), (0.85, 0.8, 0.65, 1), (0.45, 0.6, 0.7, 1), (0.8, 0.75, 0.35, 1), (0.6, 0.72, 0.55, 1), (0.85, 0.55, 0.35, 1), (0.75, 0.75, 0.75, 1)]
    signs = [('SALON', (0.7, 0.1, 0.35, 1), (1, 0.95, 0.85, 1)), ('ELECTRONICS', (0.1, 0.3, 0.7, 1), (1, 1, 1, 1)), ('RESTAURANT', (0.15, 0.45, 0.2, 1), (1, 0.9, 0.6, 1)),
             ('PHARMACY', (0.95, 0.95, 0.95, 1), (0.1, 0.4, 0.15, 1)), ('STATIONERY', (0.95, 0.65, 0.1, 1), (0.1, 0.1, 0.4, 1)), ('HARDWARE', (0.35, 0.22, 0.15, 1), (1, 0.85, 0.6, 1)),
             ('BOUTIQUE', (0.4, 0.1, 0.55, 1), (0.95, 0.9, 1, 1)), ('MOBILE MONEY', (1, 0.85, 0.0, 1), (0, 0, 0, 1)), ('CYBER CAFE', (0.0, 0.5, 0.55, 1), (0.9, 1, 1, 1))]
    si = 0
    for sx in (-1, 1):
        y = -40.0
        i = 0
        while y < 40:
            w = 6 + rnd.random() * 5
            floors = 1 + rnd.randint(0, 2)
            h = 3.4 * floors
            d = 7 + rnd.random() * 4
            x = sx * (7.1 + d / 2)
            cm = B.material(f'st_bld{sx}{i}', colors[(i * 3 + (1 if sx > 0 else 0)) % len(colors)], roughness=0.9)
            B.add_noise_bump(cm, 3, 0.35, 4)
            add(B.assign(B.box(f'bld{sx}{i}', (d, w, h), (x, y + w / 2, h / 2), col), cm))
            add(B.assign(B.box(f'roof{sx}{i}', (d + 0.6, w + 0.4, 0.12), (x, y + w / 2, h + 0.06), col), roof if rnd.random() < 0.6 else roof2))
            face_x = sx * 7.1
            sg = signs[si % len(signs)]; si += 1
            sgm = sign_material(f'st_sign{sx}{i}', *sg)
            add(B.assign(B.box(f'sign{sx}{i}', (0.08, w * 0.85, 0.8), (face_x - sx * 0.05, y + w / 2, 2.85), col), sgm))
            add(B.assign(B.box(f'door{sx}{i}', (0.08, 1.1, 2.2), (face_x - sx * 0.04, y + w * 0.3, 1.1), col), dark))
            add(B.assign(B.box(f'win{sx}{i}', (0.06, w * 0.35, 1.3), (face_x - sx * 0.03, y + w * 0.68, 1.4), col), glass))
            add(B.assign(B.box(f'ver{sx}{i}', (1.6, w, 0.15), (face_x - sx * 0.8, y + w / 2, 3.3), col), concrete))
            for c in range(3):
                add(B.assign(B.box(f'col{sx}{i}{c}', (0.25, 0.25, 3.3), (face_x - sx * 1.5, y + 0.3 + (w - 0.6) * (c / 2), 1.65), col), concrete))
            for f in range(1, floors):
                n = max(1, int(w / 2.2))
                for k in range(n):
                    wy = y + (w / (n + 1)) * (k + 1)
                    add(B.assign(B.box(f'uw{sx}{i}{f}{k}', (0.06, 0.9, 1.2), (face_x - sx * 0.02, wy, 3.4 * f + 1.7), col), glass))
                    add(B.assign(B.box(f'uf{sx}{i}{f}{k}', (0.1, 1.0, 1.3), (face_x + sx * 0.01, wy, 3.4 * f + 1.7), col), white))
            y += w + 0.3 + rnd.random() * 1.2
            i += 1
    # school gate + wall at the far +Y end of the +x side
    schoolm = B.material('st_school', (0.3, 0.45, 0.75, 1), roughness=0.9)
    add(B.assign(B.box('school_wall', (0.3, 14, 2.2), (7.0, 48, 1.1), col), schoolm))
    add(B.assign(B.box('school_gate', (0.1, 3, 2.4), (7.0, 44, 1.2), col), dark))
    add(B.assign(B.box('school_sign', (0.1, 4, 0.8), (6.9, 48, 2.7), col), sign_material('st_schoolsign', 'SCHOOL', (0.95, 0.95, 0.9, 1), (0.1, 0.2, 0.5, 1))))
    # poles, wires, trees
    pole = B.material('st_pole', (0.25, 0.2, 0.15, 1), roughness=1)
    for y in range(-40, 41, 14):
        add(B.assign(B.cylinder(f'pole{y}', 0.08, 0.11, 7.5, (6.9, y, 3.75), 8, col), pole))
        add(B.assign(B.box(f'cross{y}', (1.2, 0.08, 0.08), (6.9, y, 7.1), col), pole))
    wire = B.material('st_wire', (0.02, 0.02, 0.02, 1), roughness=0.5)
    for y in range(-40, 27, 14):
        for sx in (-0.5, 0.5):
            add(B.assign(B.cylinder(f'wire{y}{sx}', 0.012, 0.012, 14, (6.9 + sx, y + 7, 6.85), 5, col, (math.radians(90), 0, 0)), wire))
    trunk = B.material('st_trunk', (0.3, 0.2, 0.12, 1), roughness=1)
    leaf = B.material('st_leaf', (0.12, 0.38, 0.12, 1), roughness=0.9)
    for (x, y) in ((-6.2, -16), (6.3, 10), (-6.3, 22), (6.3, -30)):
        add(B.assign(B.cylinder(f'trunk{x}{y}', 0.12, 0.2, 3, (x, y, 1.5), 8, col), trunk))
        for k in range(5):
            add(B.assign(B.uv_sphere(f'leaf{x}{y}{k}', 1.1 + rnd.random() * 0.6, (x + rnd.uniform(-1, 1), y + rnd.uniform(-1, 1), 3.4 + rnd.random() * 1.2), 12, 8, col), leaf))
    # mobile-money kiosk
    kiosk = B.material('st_kiosk', (1, 0.8, 0.0, 1), roughness=0.6)
    add(B.assign(B.box('kiosk', (1.4, 1.2, 2.2), (5.8, 7, 1.1), col), kiosk))
    add(B.assign(B.box('kiosk_roof', (1.5, 1.3, 0.08), (5.8, 7, 2.25), col), dark))
    add(B.assign(B.box('kiosk_win', (0.05, 0.8, 0.6), (5.09, 7, 1.2), col), glass))
    # vehicles
    build_vehicles(col, add)
    build_people(col, add, rnd)
    lights(scene, col, preset)
    return col


def build_matatu(name, col, add, x, y, yaw):
    white = B.material(f'{name}_w', (0.9, 0.9, 0.9, 1), roughness=0.35, metallic=0.2)
    blue = B.material(f'{name}_b', (0.1, 0.3, 0.75, 1), roughness=0.4)
    glass = B.material(f'{name}_g', (0.1, 0.15, 0.2, 1), roughness=0.1, metallic=0.5)
    black = B.material(f'{name}_k', (0.03, 0.03, 0.03, 1), roughness=0.9)
    root = bpy.data.objects.new(name, None)
    col.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler = (0, 0, math.radians(yaw))
    parts = [B.assign(B.box(f'{name}_body', (1.9, 4.6, 1.6), (0, 0, 1.15), col, bevel=0.1), white)]
    for i in range(12):
        for sx in (-1, 1):
            parts.append(B.assign(B.box(f'{name}_chk{i}{sx}', (0.02, 0.36, 0.2), (sx * 0.96, -2.1 + i * 0.38, 1.05 + (i % 2) * 0.2), col), blue))
    for i in range(4):
        for sx in (-1, 1):
            parts.append(B.assign(B.box(f'{name}_win{i}{sx}', (0.02, 0.8, 0.6), (sx * 0.96, -1.5 + i * 1.0, 1.5), col), glass))
    parts.append(B.assign(B.box(f'{name}_wsf', (1.6, 0.02, 0.7), (0, -2.31, 1.55), col), glass))
    parts.append(B.assign(B.box(f'{name}_wsb', (1.6, 0.02, 0.6), (0, 2.31, 1.5), col), glass))
    for sx in (-1, 1):
        for sy in (-1.4, 1.5):
            parts.append(B.assign(B.cylinder(f'{name}_wh{sx}{sy}', 0.33, 0.33, 0.22, (sx * 0.85, sy, 0.33), 16, col, (0, math.radians(90), 0)), black))
    for p in parts:
        p.parent = root
        add(p)
    return root


def build_boda(name, col, add, x, y, yaw, color):
    frame = B.material(f'{name}_f', color, roughness=0.4, metallic=0.5)
    black = B.material(f'{name}_k', (0.03, 0.03, 0.03, 1), roughness=0.9)
    chrome = B.material(f'{name}_c', (0.8, 0.8, 0.8, 1), roughness=0.2, metallic=0.9)
    vest = B.material(f'{name}_v', (1, 0.45, 0.0, 1), roughness=0.6)
    skin = B.material(f'{name}_s', (0.2, 0.1, 0.06, 1), roughness=0.5)
    root = bpy.data.objects.new(name, None)
    col.objects.link(root)
    root.location = (x, y, 0)
    root.rotation_euler = (0, 0, math.radians(yaw))
    parts = []
    for yy in (-0.65, 0.7):
        parts.append(B.assign(B.torus(f'{name}_tyre{yy}', 0.28, 0.06, (0, yy, 0.34), col, (0, math.radians(90), 0), 24, 8), black))
        parts.append(B.assign(B.cylinder(f'{name}_hub{yy}', 0.2, 0.2, 0.04, (0, yy, 0.34), 12, col, (0, math.radians(90), 0)), chrome))
    parts.append(B.assign(B.box(f'{name}_frame', (0.18, 0.9, 0.3), (0, 0.05, 0.6), col), frame))
    parts.append(B.assign(B.box(f'{name}_engine', (0.25, 0.4, 0.35), (0, 0, 0.55), col), black))
    parts.append(B.assign(B.box(f'{name}_seat', (0.3, 0.75, 0.12), (0, 0.15, 0.82), col, bevel=0.03), black))
    parts.append(B.assign(B.box(f'{name}_tank', (0.28, 0.45, 0.22), (0, -0.35, 0.82), col, bevel=0.05), frame))
    parts.append(B.assign(B.cylinder(f'{name}_bar', 0.02, 0.02, 0.6, (0, -0.55, 1.05), 6, col, (0, math.radians(90), 0)), chrome))
    parts.append(B.assign(B.cylinder(f'{name}_fork', 0.03, 0.03, 0.5, (0, -0.6, 0.75), 6, col, (math.radians(-20), 0, 0)), chrome))
    # rider
    parts.append(B.assign(B.box(f'{name}_rider', (0.34, 0.26, 0.5), (0, 0.1, 1.15), col, bevel=0.06), vest))
    parts.append(B.assign(B.uv_sphere(f'{name}_head', 0.14, (0, 0.08, 1.52), 12, 8, col), skin))
    parts.append(B.assign(B.uv_sphere(f'{name}_helmet', 0.16, (0, 0.08, 1.56), 12, 8, col), B.material(f'{name}_h', (0.8, 0.1, 0.1, 1), roughness=0.3)))
    for sx in (-1, 1):
        parts.append(B.assign(B.cylinder(f'{name}_arm{sx}', 0.05, 0.05, 0.45, (sx * 0.22, -0.2, 1.0), 6, col, (math.radians(60), 0, 0)), skin))
        parts.append(B.assign(B.cylinder(f'{name}_leg{sx}', 0.07, 0.06, 0.5, (sx * 0.15, 0.05, 0.6), 6, col, (math.radians(-20), 0, 0)), black))
    for p in parts:
        p.parent = root
        add(p)
    return root


VEHICLES = []


def build_vehicles(col, add):
    VEHICLES.clear()
    for i in range(3):
        d = 1 if i % 2 else -1
        v = build_matatu(f'matatu{i}', col, add, 2.2 * d, -40 + i * 27, 0 if d > 0 else 180)
        VEHICLES.append((v, -40 + i * 27, d * (6 + i), 2.2 * d))
    cols = [(0.75, 0.1, 0.1, 1), (0.1, 0.3, 0.75, 1), (0.15, 0.5, 0.2, 1), (0.05, 0.05, 0.05, 1), (0.9, 0.6, 0.05, 1)]
    for i in range(5):
        d = -1 if i % 2 else 1
        x = (1.2 + (i % 2) * 0.8) * d
        v = build_boda(f'boda{i}', col, add, x, -40 + i * 16, 0 if d > 0 else 180, cols[i])
        VEHICLES.append((v, -40 + i * 16, d * (8 + i * 1.5), x))
    for i in range(3):
        build_boda(f'parked{i}', col, add, -4.9, 9.5 + i * 0.9, -35, cols[(i + 2) % 5])


def animate_vehicles(t0, t1):
    """Keyframe vehicles driving along the road (constant speed, wrap at the ends)."""
    from anim import F
    for v, y0, speed, x in VEHICLES:
        t = t0
        while t <= t1 + 0.5:
            y = ((y0 + t * speed + 60) % 120) - 60
            v.location = (x, y, 0)
            v.keyframe_insert('location', frame=F(t))
            t += 0.5
        if v.animation_data and v.animation_data.action:
            for fc in v.animation_data.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = 'LINEAR'


PEOPLE = []


def build_people(col, add, rnd):
    """Background pedestrians built from the shared character builder at reduced cost."""
    import charlib as C
    PEOPLE.clear()
    tops = [(0.7, 0.15, 0.12, 1), (0.1, 0.35, 0.7, 1), (0.15, 0.6, 0.3, 1), (0.9, 0.75, 0.1, 1), (0.5, 0.2, 0.6, 1), (0.9, 0.9, 0.9, 1), (0.9, 0.45, 0.1, 1)]
    bots = [(0.12, 0.15, 0.25, 1), (0.08, 0.08, 0.08, 1), (0.3, 0.2, 0.12, 1)]
    skins = [(0.2, 0.1, 0.06, 1), (0.27, 0.13, 0.07, 1), (0.16, 0.08, 0.05, 1)]
    paths = [((5.3, 30), (5.3, -30), 1.2), ((6.2, -30), (6.2, 30), 1.1), ((-5.4, -30), (-5.4, 30), 1.3), ((-6.3, 30), (-6.3, -30), 1.0), ((5.9, -30), (5.9, 30), 1.25)]
    for i, (a, b, speed) in enumerate(paths):
        female = rnd.random() < 0.45
        spec = dict(name=f'ped{i}', height=1.6 + rnd.random() * 0.2, sex='female' if female else 'male', skin=skins[i % 3],
                    hair=dict(style='natural' if female else 'short', color=(0.02, 0.015, 0.012, 1), band=tops[(i + 2) % 7]),
                    top=dict(type='blouse' if female else 'shirt', color=tops[i % 7], sleeve='short'), bottom=dict(type='skirt' if female else 'trousers', color=bots[i % 3]),
                    shoes=(0.1, 0.08, 0.06, 1), face=dict(nose=1, lips=1, eyes=1, brows=1, jaw=0.3, cheek=0.5), iris=(0.1, 0.05, 0.03, 1))
        ch = C.build_character(spec, B.collection(f'ped{i}'), (a[0], a[1], 0))
        PEOPLE.append((ch, a, b, speed, i * 9))


def animate_people(t0, t1):
    from anim import walk
    for ch, a, b, speed, offset in PEOPLE:
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        period = L / speed
        # loop the walk along the path across the shot
        k0 = (offset % period) / period
        start = Vector((a[0] + (b[0] - a[0]) * k0, a[1] + (b[1] - a[1]) * k0, 0))
        remaining = (1 - k0) * L
        dur = remaining / speed
        if dur > t1 - t0:
            end = Vector((start.x + (b[0] - a[0]) / L * speed * (t1 - t0), start.y + (b[1] - a[1]) / L * speed * (t1 - t0), 0))
            walk(ch, t0, t1, [(start.x, start.y), (end.x, end.y)])
        else:
            walk(ch, t0, t0 + dur, [(start.x, start.y), (b[0], b[1])])
            walk(ch, t0 + dur, t1, [(b[0], b[1]), (a[0] + (b[0] - a[0]) * 0.0, a[1] + (b[1] - a[1]) * 0.0)][::-1] if False else [(b[0], b[1]), (b[0] + (a[0] - b[0]) * min(1.0, (t1 - t0 - dur) * speed / L), b[1] + (a[1] - b[1]) * min(1.0, (t1 - t0 - dur) * speed / L))])


def lights(scene, col, preset):
    world = bpy.data.worlds.get('world') or bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    d = bpy.data.lights.new('sun', 'SUN')
    d.energy = 4.5
    d.color = (1, 0.95, 0.85)
    d.angle = math.radians(2)
    o = bpy.data.objects.new('sun', d)
    col.objects.link(o)
    o.location = (10, -6, 16)
    o.rotation_euler = (math.radians(40), math.radians(25), math.radians(-20))
    bg.inputs['Color'].default_value = (0.45, 0.62, 0.95, 1)
    bg.inputs['Strength'].default_value = 0.9
    f = bpy.data.lights.new('fill', 'AREA')
    f.energy = 400
    f.size = 6
    f.color = (1, 0.93, 0.85)
    fo = bpy.data.objects.new('fill', f)
    col.objects.link(fo)
    fo.location = (0, 0, 7)
    fo.rotation_euler = (0, 0, 0)
