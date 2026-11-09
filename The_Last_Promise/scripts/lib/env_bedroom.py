"""Daniel's bedroom at night in the rain: bed, desk with the old laptop and lamp, chair, wardrobe, shelf,
window with rain outside, lightning, phone on the desk."""
import bpy, math, random
from mathutils import Vector
import blib as B

SPOTS = {
    'desk_chair': (0.0, -0.85, 180),   # sits facing +Y (the desk at +Y)... characters face -Y at yaw 0 -> yaw 180 faces +Y
    'bed_sit': (1.45, 0.2, -90),       # on the bed edge facing -X
    'doorway': (-1.2, -1.5, 180),
    'beside_desk': (-0.85, -0.55, 70),
    'stand_centre': (0.1, -0.3, 180),
}
LAPTOP = (0.0, 1.42, 0.95)
D = 3.8
DEVICES = {}


def build(scene, preset='night'):
    col = B.collection('Bedroom')
    rnd = random.Random(5)
    objs = []
    def add(o):
        B.link(o, col); objs.append(o); return o
    W, Hh = 4.2, 2.7
    wall = B.material('bd_wall', (0.6, 0.58, 0.52, 1), roughness=0.95); B.add_noise_bump(wall, 14, 0.2, 3)
    floor = B.material('bd_floor', (0.3, 0.17, 0.08, 1), roughness=0.8); B.add_noise_bump(floor, 8, 0.3, 4)
    dark = B.material('bd_dark', (0.2, 0.11, 0.05, 1), roughness=0.7)
    metal = B.material('bd_metal', (0.6, 0.62, 0.65, 1), roughness=0.35, metallic=0.8)
    wax = B.wax_print_material('bd_wax', (0.1, 0.07, 0.4, 1), scale=8)
    add(B.assign(B.box('floor', (W, D, 0.05), (0, 0, -0.025), col), floor))
    add(B.assign(B.box('ceiling', (W, D, 0.05), (0, 0, Hh + 0.025), col), B.material('bd_ceil', (0.7, 0.68, 0.62, 1))))
    add(B.assign(B.box('wall_front', (W, 0.15, Hh), (0, -D / 2 - 0.075, Hh / 2), col), wall))   # door wall (-Y)
    add(B.assign(B.box('wall_r', (0.15, D, Hh), (W / 2 + 0.075, 0, Hh / 2), col), wall))
    add(B.assign(B.box('wall_l', (0.15, D, Hh), (-W / 2 - 0.075, 0, Hh / 2), col), wall))
    # back wall (+Y) with a window above the desk
    winW, winH, winY = 1.3, 1.1, 1.6
    for name, size, loc in (('wb1', ((W - winW) / 2, 0.15, Hh), (-W / 4 - winW / 4, D / 2 + 0.075, Hh / 2)), ('wb2', ((W - winW) / 2, 0.15, Hh), (W / 4 + winW / 4, D / 2 + 0.075, Hh / 2)),
                            ('wb3', (winW, 0.15, winY - winH / 2), (0, D / 2 + 0.075, (winY - winH / 2) / 2)), ('wb4', (winW, 0.15, Hh - (winY + winH / 2)), (0, D / 2 + 0.075, (Hh + winY + winH / 2) / 2))):
        add(B.assign(B.box(name, size, loc, col), wall))
    frame = B.material('bd_frame', (0.9, 0.88, 0.82, 1), roughness=0.6)
    for name, size, loc in (('f1', (winW + 0.12, 0.12, 0.06), (0, D / 2, winY + winH / 2)), ('f2', (winW + 0.12, 0.12, 0.06), (0, D / 2, winY - winH / 2)),
                            ('f3', (0.06, 0.12, winH), (winW / 2, D / 2, winY)), ('f4', (0.06, 0.12, winH), (-winW / 2, D / 2, winY)), ('f5', (0.03, 0.08, winH), (0, D / 2, winY))):
        add(B.assign(B.box(name, size, loc, col), frame))
    glass = B.material('bd_glass', (0.55, 0.65, 0.85, 1), roughness=0.05, alpha=0.2)
    add(B.assign(B.box('glass', (winW, 0.01, winH), (0, D / 2 + 0.02, winY), col), glass))
    for i in (-1, 0, 1):
        add(B.assign(B.box(f'bar{i}', (0.015, 0.015, winH), (i * 0.4, D / 2 - 0.03, winY), col), metal))
    # night outside the window: dark plane + distant lit windows
    add(B.assign(B.box('night', (6, 0.05, 4), (0, D / 2 + 1.0, 1.8), col), B.material('bd_night', (0.02, 0.03, 0.08, 1), emission=(0.03, 0.05, 0.12, 1), emission_strength=1)))
    for i in range(9):
        add(B.assign(B.box(f'lit{i}', (0.06, 0.02, 0.05), (-0.6 + rnd.random() * 1.2, D / 2 + 0.9, 1.2 + rnd.random() * 0.6), col), B.material(f'bd_lit{i}', (1, 0.8, 0.4, 1), emission=(1, 0.7, 0.3, 1), emission_strength=6)))
    for sx in (-1, 1):
        add(B.assign(B.box(f'curtain{sx}', (0.45, 0.02, winH + 0.3), (sx * (winW / 2 + 0.05), D / 2 - 0.12, winY), col), wax))
    add(B.assign(B.cylinder('rod', 0.015, 0.015, winW + 0.9, (0, D / 2 - 0.14, winY + winH / 2 + 0.15), 8, col, (0, math.radians(90), 0)), dark))
    # desk under the window (desk at +Y, Daniel sits at y=-0.85 facing +Y)
    deskm = B.material('bd_desk', (0.45, 0.25, 0.12, 1), roughness=0.5)
    add(B.assign(B.box('desk_top', (1.5, 0.7, 0.04), (0, D / 2 - 0.5, 0.74), col), deskm))
    for sx in (-1, 1):
        for sy in (-1, 1):
            add(B.assign(B.box(f'dleg{sx}{sy}', (0.05, 0.05, 0.72), (sx * 0.7, D / 2 - 0.5 + sy * 0.3, 0.36), col), dark))
    add(B.assign(B.box('desk_side', (0.05, 0.6, 0.6), (-0.7, D / 2 - 0.5, 0.42), col), dark))
    # chair
    plastic = B.material('bd_chair', (0.45, 0.15, 0.15, 1), roughness=0.6)
    add(B.assign(B.box('chair_seat', (0.44, 0.44, 0.04), (0, -0.85, 0.45), col), plastic))
    add(B.assign(B.box('chair_back', (0.44, 0.04, 0.45), (0, -1.05, 0.7), col), plastic))
    for sx in (-1, 1):
        for sy in (-1, 1):
            add(B.assign(B.box(f'cleg{sx}{sy}', (0.035, 0.035, 0.45), (sx * 0.19, -0.85 + sy * 0.19, 0.225), col), plastic))
    # laptop (screen faces -Y toward Daniel)
    lap = B.material('bd_laptop', (0.22, 0.23, 0.26, 1), roughness=0.5, metallic=0.3)
    add(B.assign(B.box('laptop_base', (0.34, 0.24, 0.02), (0, D / 2 - 0.58, 0.775), col, bevel=0.005), lap))
    lid = add(B.assign(B.box('laptop_lid', (0.34, 0.012, 0.23), (0, D / 2 - 0.46, 0.89), col, bevel=0.004), lap))
    lid.rotation_euler = (math.radians(18), 0, 0)
    screen = B.material('bd_screen', (0.05, 0.1, 0.2, 1), roughness=0.3, emission=(0.35, 0.55, 1.0, 1), emission_strength=1.5)
    scr = add(B.assign(B.box('laptop_screen', (0.31, 0.004, 0.2), (0, D / 2 - 0.468, 0.89), col), screen))
    scr.rotation_euler = (math.radians(18), 0, 0)
    DEVICES['screen'] = screen
    keys = B.material('bd_keys', (0.1, 0.1, 0.11, 1), roughness=0.6)
    for r in range(4):
        for c in range(11):
            add(B.assign(B.box(f'key{r}{c}', (0.022, 0.02, 0.004), (-0.13 + c * 0.026, D / 2 - 0.58 - 0.07 + r * 0.026, 0.787), col), keys))
    # desk lamp
    add(B.assign(B.cylinder('lamp_base', 0.08, 0.1, 0.02, (-0.55, D / 2 - 0.35, 0.76), 14, col), metal))
    add(B.assign(B.cylinder('lamp_arm', 0.012, 0.012, 0.4, (-0.55, D / 2 - 0.35, 0.96), 8, col), metal))
    shade = add(B.assign(B.cylinder('lamp_shade', 0.12, 0.04, 0.14, (-0.49, D / 2 - 0.39, 1.18), 16, col), B.material('bd_shade', (0.15, 0.4, 0.28, 1), roughness=0.6)))
    shade.rotation_euler = (0, math.radians(-30), 0)
    add(B.assign(B.uv_sphere('lamp_bulb', 0.03, (-0.48, D / 2 - 0.4, 1.14), 8, 6, col), B.material('bd_bulb', (1, 0.95, 0.8, 1), emission=(1, 0.85, 0.55, 1), emission_strength=8)))
    # phone, notebook, cup
    add(B.assign(B.box('phone', (0.07, 0.14, 0.008), (0.45, D / 2 - 0.5, 0.765), col, bevel=0.004), B.material('bd_phone', (0.05, 0.05, 0.06, 1), roughness=0.3)))
    add(B.assign(B.box('notebook', (0.2, 0.26, 0.015), (0.35, D / 2 - 0.25, 0.77), col), B.material('bd_nb', (0.9, 0.88, 0.8, 1), roughness=0.9)))
    add(B.assign(B.cylinder('cup', 0.04, 0.035, 0.09, (-0.25, D / 2 - 0.2, 0.81), 14, col), B.material('bd_cup', (0.75, 0.3, 0.2, 1), roughness=0.4)))
    # bed along +X wall
    add(B.assign(B.box('bed_frame', (0.95, 1.95, 0.3), (1.5, 0.3, 0.15), col), dark))
    add(B.assign(B.box('mattress', (0.9, 1.9, 0.2), (1.5, 0.3, 0.4), col, bevel=0.04), B.material('bd_matt', (0.3, 0.35, 0.5, 1), roughness=0.95)))
    add(B.assign(B.box('pillow', (0.55, 0.35, 0.12), (1.5, 1.0, 0.55), col, bevel=0.04), B.material('bd_pillow', (0.9, 0.88, 0.82, 1), roughness=0.9)))
    add(B.assign(B.box('blanket', (0.9, 1.15, 0.07), (1.5, -0.0, 0.53), col, bevel=0.02), wax))
    # wardrobe, shelf, books, posters
    add(B.assign(B.box('wardrobe', (0.6, 1.0, 1.9), (-1.75, -0.9, 0.95), col), B.material('bd_wardrobe', (0.35, 0.18, 0.08, 1), roughness=0.7)))
    for i in range(2):
        add(B.assign(B.box(f'shelf{i}', (0.3, 1.0, 0.03), (-1.9, 0.6, 1.3 + i * 0.5), col), dark))
    bookc = [(0.7, 0.15, 0.12, 1), (0.1, 0.35, 0.7, 1), (0.15, 0.6, 0.3, 1), (0.9, 0.75, 0.1, 1), (0.5, 0.2, 0.6, 1), (0.9, 0.45, 0.1, 1)]
    for i in range(9):
        add(B.assign(B.box(f'book{i}', (0.18, 0.05, 0.2 + (i % 3) * 0.03), (-1.9, 1.05 - (i % 5) * 0.2, 1.43 + (0.5 if i > 4 else 0)), col), B.material(f'bd_book{i}', bookc[i % 6], roughness=0.6)))
    add(B.assign(B.box('poster1', (0.01, 0.6, 0.4), (-2.04, 0.0, 1.8), col), B.material('bd_poster1', (0.05, 0.1, 0.25, 1), roughness=0.8)))
    add(B.assign(B.box('poster2', (0.01, 0.5, 0.65), (2.04, 0.8, 1.9), col), B.material('bd_poster2', (0.7, 0.15, 0.12, 1), roughness=0.8)))
    # door (-Y wall)
    add(B.assign(B.box('door', (0.9, 0.06, 2.05), (-1.2, -D / 2 + 0.04, 1.025), col), B.material('bd_door', (0.35, 0.18, 0.08, 1), roughness=0.7)))
    add(B.assign(B.uv_sphere('handle', 0.03, (-0.85, -D / 2 + 0.1, 1.0), 10, 8, col), metal))
    # rain outside: thin streak boxes in a volume behind the window (animated by animate_rain)
    rainm = B.material('bd_rain', (0.8, 0.85, 0.95, 1), roughness=0.1, alpha=0.35)
    RAIN.clear()
    for i in range(220):
        x, y, z = rnd.uniform(-3, 3), D / 2 + 0.15 + rnd.random() * 0.8, rnd.random() * 4
        o = add(B.assign(B.box(f'rain{i}', (0.004, 0.004, 0.18 + rnd.random() * 0.15), (x, y, z), col), rainm))
        RAIN.append((o, x, y, z, 5 + rnd.random() * 3))
    lights(scene, col, preset)
    return col


RAIN = []


def animate_rain(t0, t1, step=1 / 24):
    from anim import F
    for o, x, y, z0, speed in RAIN:
        t = t0
        while t <= t1 + step:
            z = (z0 - (t - t0) * speed) % 4.0
            o.location = (x, y, z)
            o.keyframe_insert('location', frame=F(t))
            t += step
        for fc in o.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR'


LIGHTS = {}


def lights(scene, col, preset):
    def light(name, kind, loc, energy, color=(1, 1, 1), size=1.0, rot=(0, 0, 0)):
        d = bpy.data.lights.new(name, kind)
        d.energy = energy
        d.color = color
        if kind == 'AREA':
            d.size = size
        d.use_shadow = True
        o = bpy.data.objects.new(name, d)
        col.objects.link(o)
        o.location = loc
        o.rotation_euler = rot
        LIGHTS[name] = o
        return o
    world = bpy.data.worlds.get('world') or bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    bg.inputs['Color'].default_value = (0.05, 0.08, 0.18, 1)
    bg.inputs['Strength'].default_value = 0.4
    light('desk_lamp', 'POINT', (-0.45, D / 2 - 0.45, 1.15), 45, (1, 0.8, 0.55))
    light('screen_light', 'AREA', (0, D / 2 - 0.5, 1.0), 12, (0.55, 0.7, 1.0), 0.3, (math.radians(-90), 0, 0))
    light('moon', 'AREA', (0, D / 2 + 0.6, 2.2), 60, (0.55, 0.65, 1.0), 1.6, (math.radians(-110), 0, 0))
    light('fill', 'AREA', (0.5, -0.5, 2.5), 25, (0.6, 0.65, 0.9), 3.0, (0, 0, 0))
    light('lightning', 'SUN', (0, 5, 8), 0.0, (0.85, 0.9, 1.0), rot=(math.radians(-120), 0, 0))


def flash(t, strength=12, length=0.12):
    """Keyframe a lightning flash on the sun light at time t."""
    from anim import F
    o = LIGHTS['lightning'].data
    for tt, e in ((t - 0.05, 0), (t, strength), (t + length, 0), (t + length + 0.08, strength * 0.5), (t + length + 0.2, 0)):
        o.energy = e
        o.keyframe_insert('energy', frame=F(tt))


def power_cut(t, on=False):
    """Switch the desk lamp (and bulb) off at time t (power cut) or on."""
    from anim import F
    o = LIGHTS['desk_lamp'].data
    o.energy = 45
    o.keyframe_insert('energy', frame=F(t) - 1)
    o.energy = 45 if on else 0
    o.keyframe_insert('energy', frame=F(t))
    bulb = bpy.data.materials['bd_bulb']
    bulb.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 8
    bulb.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].keyframe_insert('default_value', frame=F(t) - 1)
    bulb.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].default_value = 8 if on else 0
    bulb.node_tree.nodes['Principled BSDF'].inputs['Emission Strength'].keyframe_insert('default_value', frame=F(t))


def screen_state(t, on=True, error=False):
    """Laptop screen: on / off / error-red, keyframed at time t."""
    from anim import F
    m = DEVICES['screen']
    bsdf = m.node_tree.nodes['Principled BSDF']
    col = (0.9, 0.15, 0.1, 1) if error else ((0.35, 0.55, 1.0, 1) if on else (0.0, 0.0, 0.0, 1))
    strength = 1.5 if (on or error) else 0.0
    bsdf.inputs['Emission Color'].keyframe_insert('default_value', frame=F(t) - 1)
    bsdf.inputs['Emission Strength'].keyframe_insert('default_value', frame=F(t) - 1)
    bsdf.inputs['Emission Color'].default_value = col
    bsdf.inputs['Emission Strength'].default_value = strength
    bsdf.inputs['Emission Color'].keyframe_insert('default_value', frame=F(t))
    bsdf.inputs['Emission Strength'].keyframe_insert('default_value', frame=F(t))
    sl = LIGHTS['screen_light'].data
    sl.keyframe_insert('energy', frame=F(t) - 1)
    sl.energy = 12 if on else (6 if error else 0)
    sl.color = (0.9, 0.3, 0.2) if error else (0.55, 0.7, 1.0)
    sl.keyframe_insert('energy', frame=F(t))
    sl.keyframe_insert('color', frame=F(t))
