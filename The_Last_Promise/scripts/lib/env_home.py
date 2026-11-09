"""The modest Kampala home (used for scenes 1, 5 and 6). Blender coords: X right, +Y = back wall (kitchen), -Y = door wall."""
import bpy, math
from mathutils import Vector
import blib as B

DOOR = {}
SPOTS = {
    'daniel_chair': (-1.0, 0.55, 0),     # sits on the +Y side of the table facing -Y (the table)
    'grace_chair': (-1.0, -0.75, 0),
    'side_chair': (-1.95, -0.1, 90),
    'kitchen': (1.2, 1.75, 180),
    'doorway': (2.0, -2.2, 0),
    'door_outside': (2.0, -3.4, 0),
    'beside_daniel': (-0.36, 0.5, -90),
    'centre': (0.6, 0.6, 0),
    'side_chair2': (-0.05, -0.1, -90),
}
LAPTOP = (-1.0, 0.15, 0.95)
TABLE = (-1.0, -0.1)


SCREENS = {}


def screen_color(t, color, strength=1.2, name='home_screen'):
    from anim import F
    m = bpy.data.materials[name]
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Emission Color'].keyframe_insert('default_value', frame=F(t) - 1)
    bsdf.inputs['Emission Strength'].keyframe_insert('default_value', frame=F(t) - 1)
    bsdf.inputs['Emission Color'].default_value = color
    bsdf.inputs['Emission Strength'].default_value = strength
    bsdf.inputs['Emission Color'].keyframe_insert('default_value', frame=F(t))
    bsdf.inputs['Emission Strength'].keyframe_insert('default_value', frame=F(t))


def add_laptop(name, x, y, yaw, visible_from=None, silver=False):
    """An extra laptop on a surface (Brian's). Screen faces -Y before yaw."""
    from anim import F
    col = B.collection('Home')
    root = bpy.data.objects.new(name, None)
    col.objects.link(root)
    root.location = (x, y, 0.765)
    root.rotation_euler = (0, 0, math.radians(yaw))
    lap = B.material(f'{name}_m', (0.7, 0.72, 0.75, 1) if silver else (0.2, 0.21, 0.23, 1), roughness=0.5, metallic=0.4)
    scr = B.material(f'{name}_screen', (0.05, 0.1, 0.2, 1), roughness=0.3, emission=(0.35, 0.55, 1.0, 1), emission_strength=1.2)
    parts = [B.assign(B.box(f'{name}_base', (0.34, 0.24, 0.02), (0, 0, 0.01), col, bevel=0.005), lap)]
    lid = B.assign(B.box(f'{name}_lid', (0.34, 0.012, 0.23), (0, 0.12, 0.125), col, bevel=0.004), lap)
    lid.rotation_euler = (math.radians(-18), 0, 0)
    sc = B.assign(B.box(f'{name}_scr', (0.31, 0.004, 0.2), (0, 0.112, 0.125), col), scr)
    sc.rotation_euler = (math.radians(-18), 0, 0)
    parts += [lid, sc]
    for p in parts:
        p.parent = root
        if visible_from is not None:
            p.hide_render = True
            p.keyframe_insert('hide_render', frame=1)
            p.hide_render = False
            p.keyframe_insert('hide_render', frame=F(visible_from))
    return root


def clock_hand(t0, t1, turns=1.0):
    """Spin the wall clock's hand between t0 and t1 (time passing)."""
    from anim import F
    h = bpy.data.objects['clock_h']
    h.rotation_euler = (0, 0, 0)
    h.keyframe_insert('rotation_euler', frame=F(t0))
    h.rotation_euler = (math.radians(-360 * turns), 0, 0)
    h.keyframe_insert('rotation_euler', frame=F(t1))


def open_door(t0, t1, angle=-95):
    import math as _m
    from anim import F
    h = DOOR['hinge']
    h.rotation_euler = (0, 0, 0); h.keyframe_insert('rotation_euler', frame=F(t0))
    h.rotation_euler = (0, 0, _m.radians(angle)); h.keyframe_insert('rotation_euler', frame=F(t1))


def build(scene, preset='morning'):
    col = B.collection('Home')
    W, D, Hh = 7.0, 5.5, 2.8
    wood = B.material('home_floor', (0.32, 0.17, 0.08, 1), roughness=0.75)
    B.add_noise_bump(wood, 8, 0.3, 4)
    wall = B.material('home_wall', (0.72, 0.65, 0.5, 1), roughness=0.95)
    B.add_noise_bump(wall, 14, 0.2, 3)
    wall2 = B.material('home_wall2', (0.55, 0.62, 0.5, 1), roughness=0.95)
    B.add_noise_bump(wall2, 14, 0.2, 3)
    ceil = B.material('home_ceiling', (0.85, 0.82, 0.75, 1), roughness=1)
    dark = B.material('home_darkwood', (0.2, 0.1, 0.04, 1), roughness=0.7)
    plastic = B.material('home_plastic', (0.1, 0.3, 0.65, 1), roughness=0.5)
    metal = B.material('home_metal', (0.6, 0.62, 0.65, 1), roughness=0.35, metallic=0.8)
    ceramic = B.material('home_ceramic', (0.9, 0.87, 0.8, 1), roughness=0.35)
    fabric = B.material('home_fabric', (0.35, 0.12, 0.18, 1), roughness=0.95)
    sofa_m = B.material('home_sofa', (0.12, 0.25, 0.18, 1), roughness=0.95)
    wax = B.wax_print_material('home_wax', (0.1, 0.07, 0.4, 1), scale=8)
    red = B.material('home_red', (0.6, 0.08, 0.05, 1), roughness=0.5)

    objs = []
    def add(o):
        B.link(o, col)
        objs.append(o)
        return o
    add(B.assign(B.box('floor', (W, D, 0.05), (0, 0, -0.025), col), wood))
    add(B.assign(B.box('ceiling', (W, D, 0.05), (0, 0, Hh + 0.025), col), ceil))
    add(B.assign(B.box('wall_back', (W, 0.15, Hh), (0, D / 2 + 0.075, Hh / 2), col), wall))
    add(B.assign(B.box('wall_front', (W, 0.15, Hh), (0, -D / 2 - 0.075, Hh / 2), col), wall))
    add(B.assign(B.box('wall_left', (0.15, D, Hh), (-W / 2 - 0.075, 0, Hh / 2), col), wall2))
    # right wall with window opening
    winW, winH, winY = 1.6, 1.3, 1.5
    for name, size, loc in (
        ('wall_r1', (0.15, (D - winW) / 2, Hh), (W / 2 + 0.075, -D / 4 - winW / 4, Hh / 2)),
        ('wall_r2', (0.15, (D - winW) / 2, Hh), (W / 2 + 0.075, D / 4 + winW / 4, Hh / 2)),
        ('wall_r3', (0.15, winW, winY - winH / 2), (W / 2 + 0.075, 0, (winY - winH / 2) / 2)),
        ('wall_r4', (0.15, winW, Hh - (winY + winH / 2)), (W / 2 + 0.075, 0, (Hh + winY + winH / 2) / 2)),
    ):
        add(B.assign(B.box(name, size, loc, col), wall2))
    frame_m = B.material('home_frame', (0.9, 0.88, 0.82, 1), roughness=0.6)
    for name, size, loc in (('wf1', (0.1, winW + 0.06, 0.06), (W / 2, 0, winY + winH / 2)), ('wf2', (0.1, winW + 0.06, 0.06), (W / 2, 0, winY - winH / 2)),
                            ('wf3', (0.1, 0.06, winH), (W / 2, winW / 2, winY)), ('wf4', (0.1, 0.06, winH), (W / 2, -winW / 2, winY)), ('wf5', (0.08, 0.03, winH), (W / 2, 0, winY))):
        add(B.assign(B.box(name, size, loc, col), frame_m))
    for i in range(-2, 3):
        add(B.assign(B.box(f'bar{i}', (0.02, 0.02, winH), (W / 2 - 0.05, i * 0.3, winY), col), metal))
    glass = B.material('home_glass', (0.8, 0.9, 1.0, 1), roughness=0.05, alpha=0.15)
    add(B.assign(B.box('glass', (0.01, winW, winH), (W / 2, 0, winY), col), glass))
    for sy in (-1, 1):
        c = add(B.assign(B.box(f'curtain{sy}', (0.02, 0.55, winH + 0.3), (W / 2 - 0.12, sy * (winW / 2 - 0.1), winY), col), wax))
    # door
    hinge = bpy.data.objects.new('door_hinge', None)
    col.objects.link(hinge)
    hinge.location = (1.55, -D / 2 + 0.1, 0)
    door = add(B.assign(B.box('door', (0.9, 0.06, 2.05), (0.45, 0, 1.025), col), B.material('home_door', (0.35, 0.18, 0.08, 1), roughness=0.7)))
    door.parent = hinge
    DOOR['hinge'] = hinge
    add(B.assign(B.box('door_frame', (1.0, 0.14, 0.08), (2.0, -D / 2 + 0.1, 2.08), col), dark))
    add(B.assign(B.uv_sphere('handle', 0.035, (2.35, -D / 2 + 0.16, 1.0), 12, 8, col), metal))
    # table + chairs
    add(B.assign(B.box('table_top', (1.5, 0.9, 0.05), (TABLE[0], TABLE[1], 0.74), col), B.material('home_table', (0.45, 0.25, 0.12, 1), roughness=0.5)))
    for sx in (-1, 1):
        for sy in (-1, 1):
            add(B.assign(B.box(f'leg{sx}{sy}', (0.07, 0.07, 0.72), (TABLE[0] + sx * 0.68, TABLE[1] + sy * 0.38, 0.36), col), dark))
    def chair(name, x, y, yaw):
        parts = [B.box(f'{name}_seat', (0.44, 0.44, 0.04), (0, 0, 0.45), col), B.box(f'{name}_back', (0.44, 0.04, 0.45), (0, 0.2, 0.7), col)]
        for sx in (-1, 1):
            for sy in (-1, 1):
                parts.append(B.box(f'{name}_l{sx}{sy}', (0.035, 0.035, 0.45), (sx * 0.19, sy * 0.19, 0.225), col))
        e = bpy.data.objects.new(name, None)
        col.objects.link(e)
        e.location = (x, y, 0)
        e.rotation_euler = (0, 0, math.radians(yaw))
        for p in parts:
            B.assign(p, plastic)
            p.parent = e
            objs.append(p)
        return e
    chair('chair_daniel', -1.0, 0.55, 0)      # back at +y side: Daniel sits facing +Y... seat back should be behind him (-y)
    chair('chair_grace', -1.0, -0.75, 180)
    chair('chair_side', -1.95, -0.1, 90)
    chair('chair_side2', -0.05, -0.1, -90)
    # laptop on the table in front of Daniel's chair (he sits at y=0.55 facing -Y toward the table)
    lap = B.material('home_laptop', (0.2, 0.21, 0.23, 1), roughness=0.5, metallic=0.3)
    add(B.assign(B.box('laptop_base', (0.34, 0.24, 0.02), (-1.0, 0.15, 0.775), col, bevel=0.005), lap))
    lid = add(B.assign(B.box('laptop_lid', (0.34, 0.012, 0.23), (-1.0, 0.03, 0.89), col, bevel=0.004), lap))
    lid.rotation_euler = (math.radians(-18), 0, 0)
    screen_m = B.material('home_screen', (0.05, 0.1, 0.2, 1), roughness=0.3, emission=(0.35, 0.55, 1.0, 1), emission_strength=1.2)
    scr = add(B.assign(B.box('laptop_screen', (0.31, 0.004, 0.2), (-1.0, 0.038, 0.89), col), screen_m))
    scr.rotation_euler = (math.radians(-18), 0, 0)
    keys = B.material('home_keys', (0.1, 0.1, 0.11, 1), roughness=0.6)
    for r in range(4):
        for c in range(11):
            add(B.assign(B.box(f'key{r}{c}', (0.022, 0.02, 0.004), (-1.0 - 0.13 + c * 0.026, 0.15 + 0.07 - r * 0.026, 0.787), col), keys))
    # cups, plate, flask
    add(B.assign(B.cylinder('cup1', 0.04, 0.035, 0.09, (-0.5, -0.15, 0.81), 16, col), ceramic))
    add(B.assign(B.cylinder('cup2', 0.04, 0.035, 0.09, (-1.45, -0.3, 0.81), 16, col), red))
    add(B.assign(B.cylinder('plate', 0.13, 0.11, 0.015, (-1.1, -0.35, 0.775), 24, col), ceramic))
    add(B.assign(B.cylinder('flask', 0.07, 0.07, 0.3, (-1.6, 0.2, 0.92), 18, col), red))
    # kitchen along the back wall
    cab = B.material('home_cabinet', (0.5, 0.33, 0.18, 1), roughness=0.7)
    add(B.assign(B.box('cabinet', (3.2, 0.6, 0.85), (1.6, D / 2 - 0.3, 0.425), col), cab))
    add(B.assign(B.box('counter', (3.3, 0.65, 0.05), (1.6, D / 2 - 0.3, 0.875), col), B.material('home_counter', (0.7, 0.68, 0.62, 1), roughness=0.6)))
    add(B.assign(B.box('stove', (0.6, 0.6, 0.86), (0.0, D / 2 - 0.3, 0.43), col), metal))
    add(B.assign(B.box('sink', (0.5, 0.4, 0.02), (2.3, D / 2 - 0.3, 0.9), col), metal))
    add(B.assign(B.cylinder('tap', 0.012, 0.012, 0.25, (2.3, D / 2 - 0.1, 1.0), 8, col), metal))
    add(B.assign(B.cylinder('pot', 0.12, 0.11, 0.1, (0.15, D / 2 - 0.3, 0.95), 18, col), metal))
    add(B.assign(B.cylinder('kettle', 0.1, 0.08, 0.14, (1.1, D / 2 - 0.3, 0.97), 16, col), metal))
    add(B.assign(B.box('shelf', (2.0, 0.25, 0.03), (1.6, D / 2 - 0.13, 1.7), col), cab))
    for i, c in enumerate(((0.85, 0.65, 0.3, 1), (0.5, 0.65, 0.25, 1), (0.75, 0.2, 0.15, 1), (0.9, 0.85, 0.7, 1), (0.3, 0.55, 0.8, 1))):
        add(B.assign(B.cylinder(f'jar{i}', 0.05, 0.05, 0.14 + i * 0.015, (0.8 + i * 0.4, D / 2 - 0.13, 1.79), 12, col), B.material(f'home_jar{i}', c, roughness=0.4)))
    add(B.assign(B.box('jerrycan', (0.3, 0.22, 0.42), (3.1, 1.5, 0.21), col, bevel=0.03), B.material('home_jerry', (0.85, 0.7, 0.1, 1), roughness=0.5)))
    add(B.assign(B.box('fridge', (0.65, 0.65, 1.5), (-2.4, D / 2 - 0.33, 0.75), col), B.material('home_fridge', (0.85, 0.85, 0.85, 1), roughness=0.35)))
    add(B.assign(B.cylinder('sigiri', 0.16, 0.12, 0.22, (-3.0, 2.2, 0.11), 14, col), B.material('home_sigiri', (0.2, 0.2, 0.2, 1), roughness=0.9)))
    # bed in the corner
    add(B.assign(B.box('bed_frame', (1.0, 1.9, 0.3), (2.6, 1.6, 0.15), col), dark))
    add(B.assign(B.box('mattress', (0.95, 1.85, 0.2), (2.6, 1.6, 0.4), col, bevel=0.04), fabric))
    add(B.assign(B.box('pillow', (0.6, 0.35, 0.12), (2.6, 2.3, 0.55), col, bevel=0.04), ceramic))
    add(B.assign(B.box('blanket', (0.95, 1.1, 0.06), (2.6, 1.3, 0.52), col, bevel=0.02), wax))
    # sofa near the door
    add(B.assign(B.box('sofa_seat', (1.3, 0.75, 0.4), (-2.6, -1.9, 0.25), col, bevel=0.05), sofa_m))
    add(B.assign(B.box('sofa_back', (1.3, 0.2, 0.5), (-2.6, -2.2, 0.65), col, bevel=0.05), sofa_m))
    for sx in (-1, 1):
        add(B.assign(B.box(f'sofa_arm{sx}', (0.18, 0.75, 0.3), (-2.6 + sx * 0.58, -1.9, 0.55), col, bevel=0.04), sofa_m))
    # wall details
    add(B.assign(B.cylinder('clock', 0.2, 0.2, 0.03, (-W / 2 + 0.08, -0.8, 2.1), 24, col, (0, math.radians(90), 0)), ceramic))
    add(B.assign(B.box('clock_h', (0.01, 0.015, 0.15), (-W / 2 + 0.1, -0.8, 2.16), col), dark))
    add(B.assign(B.box('photo', (0.03, 0.35, 0.28), (-W / 2 + 0.08, 0.6, 1.75), col), dark))
    add(B.assign(B.box('photo_in', (0.035, 0.29, 0.22), (-W / 2 + 0.08, 0.6, 1.75), col), B.material('home_photo', (0.7, 0.6, 0.45, 1))))
    add(B.assign(B.box('calendar', (0.3, 0.01, 0.42), (1.0, -D / 2 + 0.085, 1.9), col), ceramic))
    add(B.assign(B.box('calendar_top', (0.3, 0.012, 0.12), (1.0, -D / 2 + 0.085, 2.05), col), red))
    add(B.assign(B.box('mat', (2.0, 1.4, 0.01), (-1.0, -0.1, 0.005), col), wax))
    add(B.assign(B.box('radio', (0.3, 0.1, 0.14), (2.6, D / 2 - 0.13, 1.78), col, bevel=0.02), B.material('home_radio', (0.15, 0.15, 0.15, 1), roughness=0.6)))
    # ceiling light
    add(B.assign(B.cylinder('cord', 0.004, 0.004, 0.4, (0, 0, Hh - 0.2), 6, col), dark))
    add(B.assign(B.cylinder('shade', 0.22, 0.05, 0.16, (0, 0, Hh - 0.45), 20, col), B.material('home_shade', (0.15, 0.3, 0.5, 1), roughness=0.6)))
    add(B.assign(B.uv_sphere('bulb', 0.05, (0, 0, Hh - 0.5), 12, 8, col), B.material('home_bulb', (1, 0.95, 0.8, 1), emission=(1, 0.85, 0.6, 1), emission_strength=4)))
    # outside: wall + greenery behind the window
    add(B.assign(B.box('outside_wall', (0.3, 10, 3), (7.5, 0, 1.5), col), B.material('home_outwall', (0.7, 0.55, 0.35, 1), roughness=1)))
    leaf = B.material('home_leaf', (0.12, 0.35, 0.1, 1), roughness=0.9)
    for i in range(6):
        add(B.assign(B.uv_sphere(f'leaf{i}', 0.55 + (i % 3) * 0.15, (5.8 + (i % 2) * 0.6, -2.2 + i * 0.9, 1.5 + (i % 3) * 0.4), 12, 8, col), leaf))

    lights(scene, col, preset)
    return col


def lights(scene, col, preset):
    def light(name, kind, loc, energy, color=(1, 1, 1), size=1.0, rot=(0, 0, 0), spot=60):
        d = bpy.data.lights.new(name, kind)
        d.energy = energy
        d.color = color
        if kind == 'AREA':
            d.size = size
        if kind == 'SPOT':
            d.spot_size = math.radians(spot)
        d.use_shadow = True
        o = bpy.data.objects.new(name, d)
        col.objects.link(o)
        o.location = loc
        o.rotation_euler = rot
        return o
    world = bpy.data.worlds.get('world') or bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    if preset == 'morning':
        light('sun', 'SUN', (6, -2, 6), 3.0, (1, 0.88, 0.7), rot=(math.radians(50), math.radians(42), math.radians(20)))
        light('window_fill', 'AREA', (3.2, 0, 1.6), 140, (1, 0.9, 0.75), 1.8, (0, math.radians(-90), 0))
        light('room_fill', 'AREA', (-1, 0, 2.6), 60, (1, 0.93, 0.85), 3.0, (0, 0, 0))
        light('bulb_light', 'POINT', (0, 0, 2.3), 20, (1, 0.85, 0.6))
        bg.inputs['Color'].default_value = (0.6, 0.7, 0.9, 1)
        bg.inputs['Strength'].default_value = 0.35
    elif preset == 'evening':
        light('sun', 'SUN', (6, -2, 2.5), 2.0, (1, 0.7, 0.45), rot=(math.radians(75), math.radians(50), math.radians(20)))
        light('window_fill', 'AREA', (3.2, 0, 1.6), 120, (1, 0.75, 0.5), 1.8, (0, math.radians(-90), 0))
        light('room_fill', 'AREA', (-1, 0, 2.6), 90, (1, 0.9, 0.8), 3.0, (0, 0, 0))
        light('bulb_light', 'POINT', (0, 0, 2.3), 120, (1, 0.8, 0.55))
        bg.inputs['Color'].default_value = (0.9, 0.55, 0.35, 1)
        bg.inputs['Strength'].default_value = 0.5
    else:  # early morning (dawn, cool)
        light('sun', 'SUN', (6, -2, 3.5), 2.2, (1, 0.8, 0.65), rot=(math.radians(65), math.radians(45), math.radians(20)))
        light('window_fill', 'AREA', (3.2, 0, 1.6), 160, (0.85, 0.85, 1.0), 1.8, (0, math.radians(-90), 0))
        light('room_fill', 'AREA', (-1, 0, 2.6), 100, (0.95, 0.95, 1), 3.0, (0, 0, 0))
        light('bulb_light', 'POINT', (0, 0, 2.3), 80, (1, 0.85, 0.6))
        bg.inputs['Color'].default_value = (0.5, 0.6, 0.85, 1)
        bg.inputs['Strength'].default_value = 0.5
