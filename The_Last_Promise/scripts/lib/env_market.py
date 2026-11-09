"""Nakasero-style vegetable market: stalls with tomatoes, onions, potatoes, matooke, sacks, umbrellas, tarps,
sellers and customers on red murram ground."""
import bpy, math, random
from mathutils import Vector
import blib as B

SPOTS = {
    'grace_stall': (3.45, -1.5, -90),     # behind the right-row stall, facing -X (toward the walkway)
    'customer': (1.85, -1.3, 90),         # in front of the stall facing +X
    'walk_in': (0.2, 12.0, 0),
    'walk_out': (0.2, -14.0, 0),
}
TIN = (3.0, -1.85, 0.86)


def build(scene, preset='afternoon'):
    col = B.collection('Market')
    rnd = random.Random(3)
    objs = []
    def add(o):
        B.link(o, col); objs.append(o); return o
    dirt = B.material('mk_dirt', (0.5, 0.27, 0.13, 1), roughness=1); B.add_noise_bump(dirt, 5, 0.5, 4)
    wood = B.material('mk_wood', (0.42, 0.26, 0.13, 1), roughness=0.85); B.add_noise_bump(wood, 12, 0.3, 3)
    dark = B.material('mk_dark', (0.18, 0.11, 0.05, 1), roughness=0.9)
    tomato = B.material('mk_tomato', (0.85, 0.07, 0.03, 1), roughness=0.3, coat=0.4)
    onion = B.material('mk_onion', (0.4, 0.1, 0.35, 1), roughness=0.55)
    potato = B.material('mk_potato', (0.5, 0.33, 0.16, 1), roughness=0.95); B.add_noise_bump(potato, 60, 0.4, 2)
    banana = B.material('mk_matooke', (0.25, 0.5, 0.12, 1), roughness=0.6)
    stem = B.material('mk_stem', (0.12, 0.25, 0.06, 1), roughness=0.9)
    sack = B.material('mk_sack', (0.8, 0.75, 0.6, 1), roughness=1); B.add_noise_bump(sack, 50, 0.6, 2)
    basket = B.material('mk_basket', (0.6, 0.45, 0.2, 1), roughness=1)
    add(B.assign(B.box('ground', (120, 120, 0.05), (0, 0, -0.05), col), dirt))

    def pile(name, x, y, z, w, d, n, mat, r=0.045, squash=1.0, seed=0):
        rr = random.Random(seed)
        # one mesh with many spheres (joined) to keep object count down
        bm_objs = []
        for i in range(n):
            u, v = rr.random(), rr.random()
            rad = math.hypot(u - 0.5, v - 0.5) * 2
            h = max(0.0, 1 - rad) * 0.12 + rr.random() * 0.03
            s = r * (0.85 + rr.random() * 0.35)
            o = B.uv_sphere(f'{name}_{i}', 1, (x + (u - 0.5) * w, y + (v - 0.5) * d, z + 0.04 + h), 8, 6, col, (s, s, s * squash))
            o.rotation_euler = (rr.random() * 3, rr.random() * 3, 0)
            bm_objs.append(o)
        B.set_active(bm_objs[0])
        for o in bm_objs:
            o.select_set(True)
        bpy.ops.object.join()
        joined = bpy.context.view_layer.objects.active
        joined.name = name
        B.assign(joined, mat)
        add(joined)
        return joined

    def matooke(name, x, y, z, seed):
        rr = random.Random(seed)
        root = bpy.data.objects.new(name, None)
        col.objects.link(root)
        root.location = (x, y, z)
        root.rotation_euler = (0, 0, rr.random() * 6)
        parts = [B.assign(B.cylinder(f'{name}_stem', 0.05, 0.06, 0.5, (0, 0, 0.25), 8, col), stem)]
        for row in range(4):
            for k in range(8):
                a = k / 8 * math.pi * 2 + row * 0.4
                f = B.cylinder(f'{name}_f{row}{k}', 0.035, 0.03, 0.22, (math.cos(a) * 0.12, math.sin(a) * 0.12, 0.12 + row * 0.11), 8, col,
                               (math.sin(a) * 0.9, -math.cos(a) * 0.9, 0))
                parts.append(B.assign(f, banana))
        for p in parts:
            p.parent = root
            add(p)
        return root

    def sack_obj(name, x, y, seed):
        o = B.box(name, (0.5, 0.35, 0.75), (x, y, 0.37), col, (0, 0, random.Random(seed).random() * 2), bevel=0.08)
        add(B.assign(o, sack))
        add(B.assign(B.torus(f'{name}_tie', 0.12, 0.03, (x, y, 0.77), col, (0, 0, 0), 12, 6), B.material(f'{name}_tiem', (0.8, 0.7, 0.5, 1))))

    def umbrella(name, x, y, color, h=2.4):
        add(B.assign(B.cylinder(f'{name}_pole', 0.025, 0.03, h, (x, y, h / 2), 8, col), dark))
        canopy = B.cylinder(f'{name}_canopy', 1.5, 0.05, 0.55, (x, y, h + 0.1), 10, col)
        add(B.assign(canopy, B.material(f'{name}_m', color, roughness=0.8)))

    def stall(name, x, y, yaw, kind, seed, ucolor):
        root = bpy.data.objects.new(name, None)
        col.objects.link(root)
        root.location = (x, y, 0)
        root.rotation_euler = (0, 0, math.radians(yaw))
        parts = [B.box(f'{name}_top', (1.9, 0.9, 0.05), (0, 0, 0.78), col)]
        for sx in (-1, 1):
            for sy in (-1, 1):
                parts.append(B.box(f'{name}_l{sx}{sy}', (0.07, 0.07, 0.78), (sx * 0.88, sy * 0.38, 0.39), col))
        parts.append(B.box(f'{name}_bar', (1.9, 0.05, 0.05), (0, 0.4, 0.35), col))
        for p in parts:
            B.assign(p, wood if p.name.endswith('_top') else dark)
            p.parent = root
            add(p)
        flip = -1 if math.cos(math.radians(yaw)) < 0 else 1
        px = lambda lx: x + lx * flip
        if kind == 'tomato':
            pile(f'{name}_tomatoes', px(-0.5), y, 0.8, 0.7, 0.6, 60, tomato, 0.045, 0.9, seed)
            pile(f'{name}_onions', px(0.45), y, 0.8, 0.6, 0.55, 40, onion, 0.045, 1.0, seed + 7)
        elif kind == 'onion':
            pile(f'{name}_onions', px(-0.4), y, 0.8, 0.8, 0.6, 55, onion, 0.045, 1.0, seed)
            pile(f'{name}_tomatoes', px(0.5), y, 0.8, 0.5, 0.5, 30, tomato, 0.045, 0.9, seed + 3)
        elif kind == 'potato':
            pile(f'{name}_potatoes', px(0), y, 0.8, 1.5, 0.6, 80, potato, 0.05, 0.75, seed)
        elif kind == 'matooke':
            matooke(f'{name}_m1', px(-0.55), y, 0.8, seed)
            matooke(f'{name}_m2', px(0.1), y + 0.1, 0.8, seed + 1)
            matooke(f'{name}_m3', px(0.6), y - 0.1, 0.8, seed + 2)
        else:
            pile(f'{name}_t', px(-0.6), y, 0.8, 0.5, 0.5, 35, tomato, 0.045, 0.9, seed)
            pile(f'{name}_p', px(0.1), y, 0.8, 0.6, 0.55, 35, potato, 0.05, 0.75, seed + 1)
            pile(f'{name}_o', px(0.65), y, 0.8, 0.45, 0.5, 28, onion, 0.045, 1.0, seed + 2)
        umbrella(f'{name}_u', x + 0.9 * flip, y - 0.55 * flip, ucolor)

    colors = [(0.8, 0.1, 0.1, 1), (0.1, 0.4, 0.8, 1), (0.95, 0.75, 0.1, 1), (0.15, 0.5, 0.2, 1), (0.95, 0.45, 0.0, 1), (0.45, 0.1, 0.6, 1), (0.0, 0.55, 0.6, 1), (0.75, 0.1, 0.35, 1)]
    kinds = ['tomato', 'matooke', 'potato', 'mixed', 'onion', 'matooke', 'tomato', 'potato']
    seller_spots = []
    for i in range(8):
        y = -10.5 + i * 3
        stall(f'stallL{i}', -2.6, y, 180, kinds[i], i * 11, colors[i % 8])
        stall(f'stallR{i}', 2.6, y, 0, kinds[(i + 3) % 8], i * 13 + 5, colors[(i + 3) % 8])
        if i != 3:
            seller_spots.append((-3.5, y, -90))
            seller_spots.append((3.5, y, 90))
    # Grace's stall is stallR3 at y = -1.5; savings tin + scale on it
    tin = B.material('mk_tin', (0.7, 0.72, 0.75, 1), roughness=0.3, metallic=0.8)
    add(B.assign(B.cylinder('savings_tin', 0.08, 0.08, 0.1, (TIN[0], TIN[1], 0.86), 16, col), tin))
    add(B.assign(B.cylinder('savings_lid', 0.085, 0.085, 0.02, (TIN[0], TIN[1], 0.92), 16, col), B.material('mk_lid', (0.75, 0.1, 0.1, 1), roughness=0.4)))
    add(B.assign(B.cylinder('scale_base', 0.12, 0.14, 0.08, (2.2, -1.2, 0.85), 14, col), B.material('mk_scale', (0.75, 0.1, 0.1, 1), roughness=0.4)))
    add(B.assign(B.cylinder('scale_pan', 0.16, 0.16, 0.02, (2.2, -1.2, 0.93), 14, col), tin))
    for i, (x, y, lbl) in enumerate(((4.1, -3.3, 'RICE'), (4.4, -2.6, 'BEANS'), (-4.0, 2.2, 'POSHO'), (-4.2, -6.5, 'RICE'), (4.0, 5.2, 'SUGAR'))):
        sack_obj(f'sack{i}', x, y, i)
    for i in range(6):
        add(B.assign(B.box(f'crate{i}', (0.5, 0.35, 0.3), (4.3 if i % 2 else -4.3, -8 + i * 2.7, 0.15 + (0.3 if i > 3 else 0)), col, bevel=0.02), B.material(f'mk_crate{i}', [(0.15, 0.5, 0.2, 1), (0.1, 0.35, 0.75, 1), (0.75, 0.15, 0.15, 1)][i % 3], roughness=0.7)))
    for i in range(4):
        add(B.assign(B.cylinder(f'basket{i}', 0.3, 0.22, 0.35, (-4.0 + rnd.random() * 0.5, 4.5 + i * 0.8, 0.18), 12, col), basket))
    # tarpaulins and poles
    tarp = B.material('mk_tarp', (0.3, 0.5, 0.9, 1), roughness=0.9, alpha=0.9)
    for i in range(3):
        add(B.assign(B.box(f'tarp{i}', (6, 4, 0.02), (0, -8 + i * 8, 3.6), col), tarp))
        for sx in (-1, 1):
            for sy in (-1, 1):
                add(B.assign(B.cylinder(f'tpole{i}{sx}{sy}', 0.03, 0.04, 3.6, (sx * 2.95, -8 + i * 8 + sy * 1.95, 1.8), 8, col), dark))
    # walls and buildings around
    wallm = B.material('mk_wall', (0.75, 0.62, 0.45, 1), roughness=1); B.add_noise_bump(wallm, 4, 0.4, 3)
    add(B.assign(B.box('wall_back', (28, 0.4, 4), (0, -17, 2), col), wallm))
    add(B.assign(B.box('wall_r', (0.4, 36, 3.5), (8.5, -2, 1.75), col), B.material('mk_wall2', (0.65, 0.72, 0.6, 1), roughness=1)))
    add(B.assign(B.box('wall_l', (0.4, 36, 3.5), (-8.5, -2, 1.75), col), B.material('mk_wall3', (0.8, 0.65, 0.55, 1), roughness=1)))
    roof = B.material('mk_roof', (0.45, 0.15, 0.1, 1), roughness=0.6, metallic=0.4)
    add(B.assign(B.box('bldA', (12, 6, 5.5), (-14, -12, 2.75), col), B.material('mk_bldA', (0.8, 0.65, 0.45, 1), roughness=0.9)))
    add(B.assign(B.box('bldA_roof', (12.4, 6.4, 0.15), (-14, -12, 5.6), col), roof))
    add(B.assign(B.box('bldB', (14, 7, 4.5), (15, -10, 2.25), col), B.material('mk_bldB', (0.55, 0.7, 0.85, 1), roughness=0.9)))
    add(B.assign(B.box('bldB_roof', (14.4, 7.4, 0.15), (15, -10, 4.6), col), roof))
    trunk = B.material('mk_trunk', (0.3, 0.2, 0.12, 1), roughness=1)
    leaf = B.material('mk_leaf', (0.12, 0.38, 0.12, 1), roughness=0.9)
    for (x, y) in ((-11, 4), (11, 6), (-6, -20), (7, -21)):
        add(B.assign(B.cylinder(f'trunk{x}{y}', 0.15, 0.25, 4, (x, y, 2), 8, col), trunk))
        for k in range(5):
            add(B.assign(B.uv_sphere(f'leaf{x}{y}{k}', 1.4 + rnd.random() * 0.8, (x + rnd.uniform(-1.2, 1.2), y + rnd.uniform(-1.2, 1.2), 4.4 + rnd.random() * 1.5), 12, 8, col), leaf))
    build_people(col, rnd, seller_spots)
    lights(scene, col, preset)
    return col


PEOPLE = []


def build_people(col, rnd, seller_spots):
    import charlib as C
    PEOPLE.clear()
    tops = [(0.7, 0.15, 0.12, 1), (0.1, 0.35, 0.7, 1), (0.15, 0.6, 0.3, 1), (0.9, 0.75, 0.1, 1), (0.5, 0.2, 0.6, 1), (0.9, 0.9, 0.9, 1), (0.9, 0.45, 0.1, 1)]
    bots = [(0.12, 0.15, 0.25, 1), (0.08, 0.08, 0.08, 1), (0.3, 0.2, 0.12, 1)]
    skins = [(0.2, 0.1, 0.06, 1), (0.27, 0.13, 0.07, 1), (0.16, 0.08, 0.05, 1)]
    picks = [s for i, s in enumerate(seller_spots) if i % 2 == 0][:6]
    walkers = [((0.6, 14), (0.6, -14), 0.9), ((-0.7, -14), (-0.7, 14), 0.8), ((1.2, 14), (-1.0, -14), 1.0)]
    for i, (x, y, yaw) in enumerate(picks):
        female = rnd.random() < 0.6
        spec = dict(name=f'seller{i}', height=1.58 + rnd.random() * 0.2, sex='female' if female else 'male', skin=skins[i % 3],
                    hair=dict(style='natural' if female else 'short', color=(0.02, 0.015, 0.012, 1), band=tops[(i + 1) % 7]),
                    top=dict(type='blouse' if female else 'shirt', color=tops[i % 7], sleeve='short'), bottom=dict(type='skirt' if female else 'trousers', color=bots[i % 3]),
                    shoes=(0.1, 0.08, 0.06, 1), face=dict(nose=1, lips=1, eyes=1, brows=1, jaw=0.3, cheek=0.5), iris=(0.1, 0.05, 0.03, 1))
        ch = C.build_character(spec, B.collection(f'seller{i}'), (x, y, 0))
        PEOPLE.append(('stand', ch, (x, y, yaw), None))
    for i, (a, b, speed) in enumerate(walkers):
        spec = dict(name=f'shopper{i}', height=1.62 + rnd.random() * 0.18, sex='male' if i % 2 else 'female', skin=skins[(i + 1) % 3],
                    hair=dict(style='short' if i % 2 else 'natural', color=(0.02, 0.015, 0.012, 1), band=tops[(i + 3) % 7]),
                    top=dict(type='shirt' if i % 2 else 'blouse', color=tops[(i + 2) % 7], sleeve='short'), bottom=dict(type='trousers' if i % 2 else 'skirt', color=bots[(i + 1) % 3]),
                    shoes=(0.1, 0.08, 0.06, 1), face=dict(nose=1, lips=1, eyes=1, brows=1, jaw=0.3, cheek=0.5), iris=(0.1, 0.05, 0.03, 1))
        ch = C.build_character(spec, B.collection(f'shopper{i}'), (a[0], a[1], 0))
        PEOPLE.append(('walk', ch, (a, b, speed), i * 11))


def animate_people(t0, t1):
    from anim import walk, idle, place, pose, work_pose, stand_pose, F
    for kind, ch, data, offset in PEOPLE:
        if kind == 'stand':
            x, y, yaw = data
            place(ch, F(t0), x, y, yaw)
            t = t0
            while t <= t1:
                pose(ch, F(t), work_pose(t, hash(ch.name) % 7), base=stand_pose())
                t += 0.5
        else:
            a, b, speed = data
            L = math.hypot(b[0] - a[0], b[1] - a[1])
            dur = L / speed
            t = t0 - (offset % dur)
            fwd = True
            while t < t1:
                s, e = (a, b) if fwd else (b, a)
                seg_t0, seg_t1 = max(t0, t), min(t1, t + dur)
                if seg_t1 > seg_t0:
                    k0 = (seg_t0 - t) / dur
                    k1 = (seg_t1 - t) / dur
                    p0 = (s[0] + (e[0] - s[0]) * k0, s[1] + (e[1] - s[1]) * k0)
                    p1 = (s[0] + (e[0] - s[0]) * k1, s[1] + (e[1] - s[1]) * k1)
                    walk(ch, seg_t0, seg_t1, [p0, p1])
                t += dur
                fwd = not fwd


def lights(scene, col, preset):
    world = bpy.data.worlds.get('world') or bpy.data.worlds.new('world')
    scene.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes['Background']
    d = bpy.data.lights.new('sun', 'SUN')
    d.energy = 4.0 if preset == 'afternoon' else 2.5
    d.color = (1, 0.88, 0.7) if preset == 'afternoon' else (1, 0.7, 0.45)
    d.angle = math.radians(2.5)
    o = bpy.data.objects.new('sun', d)
    col.objects.link(o)
    o.rotation_euler = (math.radians(50 if preset == 'afternoon' else 72), math.radians(-30), math.radians(30))
    bg.inputs['Color'].default_value = (0.5, 0.65, 0.95, 1) if preset == 'afternoon' else (0.95, 0.6, 0.4, 1)
    bg.inputs['Strength'].default_value = 0.8
    f = bpy.data.lights.new('fill', 'AREA')
    f.energy = 350
    f.size = 5
    f.color = (1, 0.9, 0.8)
    fo = bpy.data.objects.new('fill', f)
    col.objects.link(fo)
    fo.location = (1.5, 0.5, 4.5)
