"""Procedural, rigged, consistent characters for THE LAST PROMISE (Blender 4.0).

build_character(spec, col) returns a Character with:
  arm            the armature object (bones: hips, spine, chest, neck, head, shoulder.L/R,
                 upper_arm.L/R, forearm.L/R, hand.L/R, thumb/index/middle/ring/pinky.L/R,
                 thigh.L/R, shin.L/R, foot.L/R)
  body parts     skinned meshes (body, clothing) + rigid face parts parented to the head bone
  face controls  eyelids (rotation), brows (location/rotation), lips (shape keys),
                 eye_target empty (eyes and head look-at)
Every character is produced by the same code from a small spec, so proportions, materials
and controls are identical across scenes.
"""
import bpy, bmesh, math, random
from mathutils import Vector, Euler, Quaternion, Matrix
import blib as B


def low_cost_hair(spec):
    return False


def _noise(seed):
    r = random.Random(seed)
    return r


SPECS = {
    'Daniel': dict(
        name='Daniel', height=1.72, sex='male', skin=(0.21, 0.105, 0.06, 1), hair=dict(style='short', color=(0.02, 0.015, 0.012, 1)),
        top=dict(type='hoodie', color=(0.05, 0.14, 0.55, 1), sleeve='long'), bottom=dict(type='trousers', color=(0.03, 0.035, 0.05, 1)),
        shoes=(0.85, 0.85, 0.85, 1), face=dict(nose=1.05, lips=1.05, eyes=1.0, brows=1.0, jaw=0.38, cheek=0.4), iris=(0.12, 0.06, 0.03, 1)),
    'Grace': dict(
        name='Grace', height=1.62, sex='female', skin=(0.27, 0.135, 0.07, 1), hair=dict(style='natural', color=(0.025, 0.018, 0.014, 1), band=(0.9, 0.55, 0.12, 1)),
        top=dict(type='blouse', color=(0.12, 0.08, 0.45, 1), sleeve='short'), bottom=dict(type='skirt', color=(0.32, 0.05, 0.12, 1)),
        shoes=(0.12, 0.07, 0.04, 1), face=dict(nose=1.0, lips=1.15, eyes=1.0, brows=0.85, jaw=0.32, cheek=0.6), iris=(0.12, 0.06, 0.03, 1)),
    'Brian': dict(
        name='Brian', height=1.76, sex='male', skin=(0.17, 0.085, 0.05, 1), hair=dict(style='short', color=(0.015, 0.012, 0.01, 1)),
        top=dict(type='jacket', color=(0.85, 0.6, 0.08, 1), sleeve='long'), bottom=dict(type='trousers', color=(0.04, 0.045, 0.06, 1)),
        shoes=(0.08, 0.08, 0.09, 1), face=dict(nose=1.1, lips=1.0, eyes=1.0, brows=1.15, jaw=0.4, cheek=0.35), iris=(0.1, 0.05, 0.03, 1)),
}


class Character:
    def __init__(self, name):
        self.name = name
        self.arm = None
        self.objects = []
        self.parts = {}
        self.H = 1.7
        self.head_center = Vector((0, 0, 0))
        self.eye_target = None
        self.lids = {}
        self.brows = {}
        self.lips = {}
        self.spec = None

    # --- convenience -------------------------------------------------------
    def bone(self, name):
        return self.arm.pose.bones[name]

    def world_head(self):
        return self.arm.matrix_world @ self.arm.pose.bones['head'].tail


# ----------------------------------------------------------------------------
# skin-modifier skeleton meshes
# ----------------------------------------------------------------------------

def _skin_mesh(name, verts, radii, edges, root, col, subsurf=2, apply_skin=True):
    obj = B.mesh_object(name, verts, edges, (), col)
    mod = obj.modifiers.new('Skin', 'SKIN')
    mod.use_smooth_shade = True
    skin = obj.data.skin_vertices[0].data
    for i, (rx, ry) in enumerate(radii):
        skin[i].radius = (rx, ry)
    skin[root].use_root = True
    if apply_skin:
        B.set_active(obj)
        bpy.ops.object.modifier_apply(modifier='Skin')
        B.smooth(obj)
    if subsurf:
        B.subsurf(obj, subsurf, subsurf)
    return obj


def body_skeleton(H, sex, shoulder=0.108):
    """Vertices / radii / edges of the body skin skeleton (Z up, faces -Y)."""
    f = sex == 'female'
    sh = (0.1 if f else shoulder) * H
    V = {}
    R = {}
    def add(k, x, y, z, rx, ry=None):
        V[k] = (x * H, y * H, z * H)
        R[k] = (rx * H, (ry if ry is not None else rx) * H)
    add('hips', 0, 0, 0.50, 0.092 if not f else 0.1, 0.068 if not f else 0.078)
    add('spine', 0, 0, 0.60, 0.082 if not f else 0.078, 0.058 if not f else 0.058)
    add('chest', 0, 0, 0.72, 0.1 if not f else 0.095, 0.07 if not f else 0.078)
    add('neck0', 0, 0, 0.80, 0.045, 0.04)
    add('neck1', 0, 0, 0.875, 0.038, 0.038)
    E = [('hips', 'spine'), ('spine', 'chest'), ('chest', 'neck0'), ('neck0', 'neck1')]
    for s, sx in (('L', 1), ('R', -1)):
        add(f'sho{s}', sx * sh / H, 0, 0.785, 0.03 if not f else 0.027)
        add(f'elb{s}', sx * (sh / H + 0.03), 0.0, 0.615, 0.024 if not f else 0.022)
        add(f'wri{s}', sx * (sh / H + 0.05), 0.0, 0.47, 0.019 if not f else 0.017)
        add(f'palm{s}', sx * (sh / H + 0.058), 0.0, 0.42, 0.026, 0.01)
        E += [('chest', f'sho{s}'), (f'sho{s}', f'elb{s}'), (f'elb{s}', f'wri{s}'), (f'wri{s}', f'palm{s}')]
        px = sh / H + 0.058
        for i, fn in enumerate(['index', 'middle', 'ring', 'pinky']):
            ln = [0.062, 0.067, 0.06, 0.048][i]
            add(f'{fn}1{s}', sx * (px + (i - 1.5) * 0.0115), -0.004, 0.42 - ln * 0.5, 0.0068, 0.0058)
            add(f'{fn}2{s}', sx * (px + (i - 1.5) * 0.012), -0.008, 0.42 - ln, 0.0055, 0.0048)
            E += [(f'palm{s}', f'{fn}1{s}'), (f'{fn}1{s}', f'{fn}2{s}')]
        add(f'thumb1{s}', sx * (px - 0.022), -0.02, 0.43, 0.008, 0.0065)
        add(f'thumb2{s}', sx * (px - 0.03), -0.036, 0.41, 0.006, 0.005)
        E += [(f'palm{s}', f'thumb1{s}'), (f'thumb1{s}', f'thumb2{s}')]
        add(f'thi{s}', sx * 0.05, 0, 0.47, 0.05 if not f else 0.056, 0.053 if not f else 0.058)
        add(f'kne{s}', sx * 0.055, 0.0, 0.26, 0.036, 0.038)
        add(f'ank{s}', sx * 0.055, 0.0, 0.06, 0.027, 0.03)
        add(f'toe{s}', sx * 0.055, -0.1, 0.03, 0.034, 0.02)
        E += [('hips', f'thi{s}'), (f'thi{s}', f'kne{s}'), (f'kne{s}', f'ank{s}'), (f'ank{s}', f'toe{s}')]
    return V, R, E


def _build_from_keys(name, V, R, E, keys, root, col, grow=0.0, radius_scale=1.0, subsurf=2):
    keys = [k for k in keys if k in V]
    idx = {k: i for i, k in enumerate(keys)}
    verts = [V[k] for k in keys]
    radii = [((R[k][0] + grow) * radius_scale, (R[k][1] + grow) * radius_scale) for k in keys]
    edges = [(idx[a], idx[b]) for a, b in E if a in idx and b in idx]
    return _skin_mesh(name, verts, radii, edges, idx[root], col, subsurf)


# ----------------------------------------------------------------------------
# head
# ----------------------------------------------------------------------------

def _deform_skull(x, y, z, face):
    """Unit sphere -> skull. Blender head space: +Z up, -Y front."""
    front = max(0.0, -y)
    jaw, cheek = face['jaw'], face['cheek']
    if z < 0:
        k = -z
        narrow = 1 - jaw * k * k * (0.7 + 0.3 * front)
        x *= narrow
        y *= 1 - 0.22 * k * k
        if y < 0 and z < -0.55:
            y += 0.07 * ((-z - 0.55) / 0.45) * y
    else:
        y *= 1 - 0.06 * z * z * front
    for sx in (-1, 1):
        dx, dz = x - sx * 0.33, z - 0.1
        d2 = dx * dx + dz * dz
        if -y > 0.3:
            y -= 0.11 * math.exp(-d2 / 0.035) * y
    if -y > 0.4:
        dz = z - 0.3
        y += 0.035 * math.exp(-(dz * dz) / 0.012) * y
    for sx in (-1, 1):
        dx, dz = x - sx * 0.55, z + 0.2
        d2 = dx * dx + dz * dz
        bump = cheek * 0.07 * math.exp(-d2 / 0.07)
        if y < 0:
            y += bump * y
            x += bump * sx * 0.6
    if z > 0.1 and abs(x) > 0.6:
        x *= 0.985
    return x, y, z


def _head_mesh(name, rx, ry, rz, face, col, segments=48):
    obj = B.uv_sphere(name, 1.0, (0, 0, 0), segments, int(segments * 0.75), col)
    me = obj.data
    for v in me.vertices:
        x, y, z = _deform_skull(v.co.x, v.co.y, v.co.z, face)
        v.co = (x * rx, y * ry, z * rz)
    me.update()
    B.subsurf(obj, 1, 1)
    return obj


def _lip_mesh(name, hw, r, z0, lower, R, col, usegs=22, asegs=10):
    """Lip tube with shape keys: Basis, Smile, Frown, Open, Wide, Pucker."""
    def centre(u, smile, open_, width, pucker):
        hw2 = hw * (1 + width * 0.28) * (1 - pucker * 0.45)
        x = u * hw2
        corner = u * u
        z = z0 + smile * 0.13 * R * corner - (open_ * 0.26 * R * (1 - 0.55 * corner) if lower else -open_ * 0.035 * R * (1 - corner))
        if not lower:
            z += 0.012 * R * math.cos(u * math.pi * 1.5) * (1 - corner)
        y = 0.16 * R * corner - pucker * 0.06 * R * (1 - corner) + (smile * 0.03 * R * corner if smile > 0 else 0)
        return Vector((x, y, z))

    def ring_points(smile, open_, width, pucker):
        pts = []
        for i in range(usegs + 1):
            u = i / usegs * 2 - 1
            c = centre(u, smile, open_, width, pucker)
            if u < 0.99:
                t = (centre(u + 0.02, smile, open_, width, pucker) - c).normalized()
            else:
                t = (c - centre(u - 0.02, smile, open_, width, pucker)).normalized()
            taper = 1 - 0.65 * abs(u) ** 2.4
            rr = r * taper * (1 + pucker * 0.3)
            n = Vector((0, -1, 0))
            bn = t.cross(n).normalized()
            n = bn.cross(t).normalized()
            for j in range(asegs):
                a = 2 * math.pi * j / asegs
                pts.append(c + (n * math.cos(a) * 0.75 + bn * math.sin(a)) * rr)
        return pts

    base = ring_points(0, 0, 0, 0)
    faces = []
    for i in range(usegs):
        for j in range(asegs):
            a = i * asegs + j
            b = a + asegs
            faces.append((a, b, (i + 1) * asegs + (j + 1) % asegs, i * asegs + (j + 1) % asegs))
    obj = B.mesh_object(name, base, (), faces, col)
    B.smooth(obj)
    obj.shape_key_add(name='Basis')
    for key, args in (('Smile', (1, 0, 0, 0)), ('Frown', (-1, 0, 0, 0)), ('Open', (0, 1, 0, 0)), ('Wide', (0, 0, 1, 0)), ('Pucker', (0, 0, 0, 1))):
        sk = obj.shape_key_add(name=key)
        pts = ring_points(*args)
        for i, p in enumerate(pts):
            sk.data[i].co = p
    return obj


# ----------------------------------------------------------------------------
# armature
# ----------------------------------------------------------------------------

def _armature(name, H, V, col):
    arm = bpy.data.armatures.new(name + '_rig')
    obj = bpy.data.objects.new(name + '_rig', arm)
    col.objects.link(obj)
    B.set_active(obj)
    bpy.ops.object.mode_set(mode='EDIT')
    eb = arm.edit_bones
    def mk(bn, head, tail, parent=None, connect=False):
        b = eb.new(bn)
        b.head = Vector(head)
        b.tail = Vector(tail)
        if parent:
            b.parent = eb[parent]
            b.use_connect = connect
        return b
    mk('hips', (0, 0, 0.47 * H), V['spine'])
    mk('spine', V['spine'], V['chest'], 'hips', True)
    mk('chest', V['chest'], V['neck0'], 'spine', True)
    mk('neck', V['neck0'], V['neck1'], 'chest', True)
    mk('head', V['neck1'], (0, 0, 1.0 * H), 'neck', True)
    for s in ('L', 'R'):
        mk(f'shoulder.{s}', (V[f'sho{s}'][0] * 0.15, 0, V['neck0'][2] - 0.01 * H), V[f'sho{s}'], 'chest')
        mk(f'upper_arm.{s}', V[f'sho{s}'], V[f'elb{s}'], f'shoulder.{s}', True)
        mk(f'forearm.{s}', V[f'elb{s}'], V[f'wri{s}'], f'upper_arm.{s}', True)
        mk(f'hand.{s}', V[f'wri{s}'], V[f'palm{s}'], f'forearm.{s}', True)
        for fn in ('index', 'middle', 'ring', 'pinky'):
            mk(f'{fn}.{s}', V[f'palm{s}'], V[f'{fn}2{s}'], f'hand.{s}')
        mk(f'thumb.{s}', V[f'palm{s}'], V[f'thumb2{s}'], f'hand.{s}')
        mk(f'thigh.{s}', V[f'thi{s}'], V[f'kne{s}'], 'hips')
        mk(f'shin.{s}', V[f'kne{s}'], V[f'ank{s}'], f'thigh.{s}', True)
        mk(f'foot.{s}', V[f'ank{s}'], V[f'toe{s}'], f'shin.{s}', True)
    bpy.ops.object.mode_set(mode='OBJECT')
    obj.show_in_front = True
    for pb in obj.pose.bones:
        pb.rotation_mode = 'XYZ'
    return obj


ALL_BONES = None
BONE_SETS = {
    'body': None,  # every deforming bone
    'legs': ['hips', 'spine', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'foot.L', 'foot.R'],
    'skirt': ['hips', 'spine', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R'],
    'torso_arms': ['hips', 'spine', 'chest', 'neck', 'shoulder.L', 'shoulder.R', 'upper_arm.L', 'upper_arm.R', 'forearm.L', 'forearm.R', 'hand.L', 'hand.R'],
    'torso': ['spine', 'chest', 'neck'],
    'foot.L': ['shin.L', 'foot.L'],
    'foot.R': ['shin.R', 'foot.R'],
}


def _auto_weight(groups, armobj):
    """groups: list of (mesh, bone_set_name). Automatic weights restricted to the relevant bones."""
    for mesh, setname in groups:
        allowed = BONE_SETS.get(setname)
        for b in armobj.data.bones:
            b.use_deform = True if allowed is None else (b.name in allowed)
        bpy.ops.object.select_all(action='DESELECT')
        mesh.select_set(True)
        armobj.select_set(True)
        bpy.context.view_layer.objects.active = armobj
        bpy.ops.object.parent_set(type='ARMATURE_AUTO')
        for mod in mesh.modifiers:
            if mod.type == 'ARMATURE':
                B.set_active(mesh)
                bpy.ops.object.modifier_move_to_index(modifier=mod.name, index=0)
    for b in armobj.data.bones:
        b.use_deform = True
    bpy.ops.object.select_all(action='DESELECT')


# ----------------------------------------------------------------------------
# build
# ----------------------------------------------------------------------------

def build_character(spec, col=None, location=(0, 0, 0)):
    name = spec['name']
    col = col or B.collection(name)
    H = spec['height']
    sex = spec['sex']
    face = spec['face']
    ch = Character(name)
    ch.spec = spec
    ch.H = H

    # materials
    skin = B.material(f'{name}_skin', spec['skin'], roughness=0.42, subsurface=0.18, subsurface_radius=(0.8, 0.25, 0.12), coat=0.12, specular=0.45)
    B.add_noise_bump(skin, 90, 0.08, 3)
    hair_m = B.material(f'{name}_hair', spec['hair']['color'], roughness=0.95)
    B.add_noise_bump(hair_m, 120, 0.6, 4)
    top = spec['top']
    if top['type'] == 'blouse':
        top_m = B.wax_print_material(f'{name}_top', top['color'])
    else:
        top_m = B.material(f'{name}_top', top['color'], roughness=0.9, sheen=0.3)
        B.add_noise_bump(top_m, 70, 0.35, 3)
    bottom_m = B.material(f'{name}_bottom', spec['bottom']['color'], roughness=0.92)
    B.add_noise_bump(bottom_m, 60, 0.3, 3)
    shoe_m = B.material(f'{name}_shoes', spec['shoes'], roughness=0.55)
    sole_m = B.material(f'{name}_sole', (0.03, 0.03, 0.03, 1), roughness=0.9)
    white_m = B.material(f'{name}_eyewhite', (0.92, 0.9, 0.86, 1), roughness=0.15, coat=0.6)
    iris_m = B.material(f'{name}_iris', spec['iris'], roughness=0.3, coat=0.5)
    pupil_m = B.material(f'{name}_pupil', (0.005, 0.004, 0.004, 1), roughness=0.3)
    lip_m = B.material(f'{name}_lips', tuple(c * 0.75 + d * 0.25 for c, d in zip(spec['skin'], (0.35, 0.08, 0.1, 1))), roughness=0.4, coat=0.3, subsurface=0.1)
    inner_m = B.material(f'{name}_inner', (0.12, 0.02, 0.025, 1), roughness=0.7)
    teeth_m = B.material(f'{name}_teeth', (0.9, 0.88, 0.82, 1), roughness=0.3)
    accent_m = B.material(f'{name}_accent', (0.05, 0.05, 0.06, 1), roughness=0.7)

    V, R, E = body_skeleton(H, sex)
    body_keys = list(V.keys())

    # ---- body -------------------------------------------------------------
    body = _build_from_keys(f'{name}_body', V, R, E, body_keys, 'hips', col)
    B.assign(body, skin)
    skinned = [(body, 'body')]

    # ---- clothing ---------------------------------------------------------
    if spec['bottom']['type'] == 'trousers':
        keys = ['hips', 'spine', 'thiL', 'thiR', 'kneL', 'kneR', 'ankL', 'ankR']
        tr = _build_from_keys(f'{name}_trousers', V, R, E, keys, 'hips', col, grow=0.009 * H)
        B.assign(tr, bottom_m)
        skinned.append((tr, 'legs'))
    else:
        prof = [(0.1 * H, 0.57 * H), (0.108 * H, 0.50 * H), (0.125 * H, 0.35 * H), (0.145 * H, 0.2 * H), (0.16 * H, 0.1 * H)]
        sk = B.lathe(f'{name}_skirt', prof, 40, (0, 0, 0), col, close=False)
        sk.scale = (1, 0.8, 1)
        B.assign(sk, bottom_m)
        B.subsurf(sk, 1)
        so = sk.modifiers.new('Solidify', 'SOLIDIFY')
        so.thickness = 0.004
        skinned.append((sk, 'skirt'))
    # top
    long = top['sleeve'] == 'long'
    keys = ['spine', 'chest', 'neck0', 'shoL', 'shoR', 'elbL', 'elbR'] + (['wriL', 'wriR'] if long else [])
    V2 = dict(V)
    R2 = dict(R)
    if not long:
        for s in ('L', 'R'):
            e = V[f'elb{s}']
            sh = V[f'sho{s}']
            V2[f'elb{s}'] = (sh[0] + (e[0] - sh[0]) * 0.5, sh[1], sh[2] + (e[2] - sh[2]) * 0.5)
            R2[f'elb{s}'] = (R[f'sho{s}'][0] * 0.98, R[f'sho{s}'][1] * 0.98)
    V2['spine'] = (0, 0, 0.60 * H)
    V2['hips'] = (0, 0, 0.505 * H)
    R2['hips'] = (R['hips'][0] * 1.03, R['hips'][1] * 1.03)
    keys = ['hips'] + keys
    tp = _build_from_keys(f'{name}_top', V2, R2, E, keys, 'chest', col, grow=0.009 * H)
    B.assign(tp, top_m)
    skinned.append((tp, 'torso_arms'))
    if top['type'] == 'hoodie':
        ring = B.torus(f'{name}_hood', 0.058 * H, 0.024 * H, (0, 0.03 * H, 0.825 * H), col, (0.45, 0, 0))
        B.assign(ring, top_m)
        skinned.append((ring, 'torso'))
        pocket = B.box(f'{name}_pocket', (0.13 * H, 0.012 * H, 0.06 * H), (0, -0.083 * H, 0.565 * H), col, bevel=0.005)
        B.assign(pocket, top_m)
        skinned.append((pocket, 'torso'))
        for sx in (-1, 1):
            s = B.cylinder(f'{name}_string{sx}', 0.003 * H, 0.003 * H, 0.09 * H, (sx * 0.03 * H, -0.072 * H, 0.75 * H), 8, col)
            B.assign(s, accent_m)
            skinned.append((s, 'torso'))
    elif top['type'] == 'jacket':
        zip_ = B.box(f'{name}_zip', (0.008 * H, 0.004 * H, 0.26 * H), (0, -0.079 * H, 0.66 * H), col)
        B.assign(zip_, accent_m)
        skinned.append((zip_, 'torso'))
        for sx in (-1, 1):
            c = B.box(f'{name}_collar{sx}', (0.06 * H, 0.012 * H, 0.04 * H), (sx * 0.04 * H, -0.045 * H, 0.80 * H), col, (0.5, sx * 0.3, sx * 0.5), bevel=0.004)
            B.assign(c, top_m)
            skinned.append((c, 'torso'))
    elif top['type'] == 'blouse':
        trim = B.torus(f'{name}_trim', 0.047 * H, 0.008 * H, (0, -0.01 * H, 0.80 * H), col, (0.3, 0, 0))
        B.assign(trim, B.material(f'{name}_trim', (0.95, 0.65, 0.15, 1), roughness=0.7))
        skinned.append((trim, 'torso'))
    # shoes
    for s in ('L', 'R'):
        keys = [f'ank{s}', f'toe{s}']
        sh = _build_from_keys(f'{name}_shoe{s}', V, R, E, keys, f'ank{s}', col, grow=0.008 * H, subsurf=2)
        B.assign(sh, shoe_m)
        skinned.append((sh, f'foot.{s}'))
        sole = B.box(f'{name}_sole{s}', (0.075 * H, 0.17 * H, 0.012 * H), (V[f'ank{s}'][0], -0.045 * H, 0.006 * H), col, bevel=0.004)
        B.assign(sole, sole_m)
        skinned.append((sole, f'foot.{s}'))

    # ---- armature + weights ----------------------------------------------
    arm = _armature(name, H, V, col)
    ch.arm = arm
    _auto_weight(skinned, arm)

    # ---- head --------------------------------------------------------------
    rx, ry, rz = 0.057 * H, 0.062 * H, 0.074 * H
    Rh = rx
    hc = Vector((0, 0, 0.925 * H))
    ch.head_center = hc
    head = _head_mesh(f'{name}_head', rx, ry, rz, face, col)
    head.location = hc
    B.assign(head, skin)
    rigid = [head]
    P = lambda ux, uy, uz: hc + Vector((ux * rx, uy * ry, uz * rz))

    # ears
    for sx in (-1, 1):
        ear = B.uv_sphere(f'{name}_ear{sx}', 1, P(sx * 0.97, -0.05, 0.0), 16, 12, col, (0.085 * Rh, 0.17 * Rh, 0.26 * Rh))
        ear.rotation_euler = (0, sx * 0.15, 0)
        B.assign(ear, skin)
        rigid.append(ear)
    # nose
    nose = bpy.data.objects.new(f'{name}_nose', None)
    col.objects.link(nose)
    nose.location = P(0, -0.9, -0.02)
    nose.scale = (1.25, 1.25, 1.25)
    rigid.append(nose)
    nw = face['nose']
    for nm, pos, scl, rot in (
        ('bridge', (0, 0.02 * Rh, -0.02 * Rh), (0.1 * Rh, 0.085 * Rh, 0.17 * Rh), (-0.25, 0, 0)),
        ('tip', (0, -0.1 * Rh, -0.2 * Rh), (0.15 * Rh * nw, 0.13 * Rh, 0.12 * Rh), (0, 0, 0)),
        ('alaL', (0.13 * Rh * nw, 0, -0.235 * Rh), (0.095 * Rh, 0.1 * Rh, 0.085 * Rh), (0, 0, 0)),
        ('alaR', (-0.13 * Rh * nw, 0, -0.235 * Rh), (0.095 * Rh, 0.1 * Rh, 0.085 * Rh), (0, 0, 0)),
    ):
        o = B.uv_sphere(f'{name}_nose_{nm}', 1, pos, 16, 12, col, scl)
        o.rotation_euler = rot
        o.parent = nose
        B.assign(o, skin)
    for sx in (-1, 1):
        o = B.uv_sphere(f'{name}_nostril{sx}', 1, (sx * 0.075 * Rh * nw, -0.04 * Rh, -0.31 * Rh), 10, 8, col, (0.04 * Rh, 0.035 * Rh, 0.025 * Rh))
        o.parent = nose
        B.assign(o, inner_m)

    # eyes
    ch.eye_target = bpy.data.objects.new(f'{name}_eye_target', None)
    col.objects.link(ch.eye_target)
    ch.eye_target.empty_display_type = 'SPHERE'
    ch.eye_target.empty_display_size = 0.05
    ch.eye_target.location = hc + Vector((0, -2.0, 0.05))
    re = 0.15 * Rh * face['eyes']
    for s, sx in (('L', 1), ('R', -1)):
        socket = P(sx * 0.31, -0.86, 0.08)
        eye = B.uv_sphere(f'{name}_eye{s}', re, socket, 24, 16, col)
        B.assign(eye, white_m)
        iris = B.uv_sphere(f'{name}_iris{s}', re * 1.0, (0, 0, 0), 24, 12, col, (0.72, 0.4, 0.72))
        iris.location = Vector((0, -re * 0.66, 0))
        iris.parent = eye
        B.assign(iris, iris_m)
        pupil = B.uv_sphere(f'{name}_pupil{s}', re * 0.42, (0, -re * 0.86, 0), 16, 10, col, (1, 0.35, 1))
        pupil.parent = eye
        B.assign(pupil, pupil_m)
        hl = B.uv_sphere(f'{name}_hl{s}', re * 0.14, (-sx * re * 0.3, -re * 0.95, re * 0.35), 8, 6, col)
        hl.parent = eye
        B.assign(hl, B.material(f'{name}_hl{s}', (1, 1, 1, 1), emission=(1, 1, 1, 1), emission_strength=1.5))
        tr = eye.constraints.new('TRACK_TO')
        tr.target = ch.eye_target
        tr.track_axis = 'TRACK_NEGATIVE_Y'
        tr.up_axis = 'UP_Z'
        rigid.append(eye)
        # eyelids: hemispherical shells pivoting around the eye centre
        lidR = re * 1.1
        for which, (rings_from, rings_to) in (('upper', (0.0, 0.5)), ('lower', (0.5, 1.0))):
            lid = B.uv_sphere(f'{name}_{which}lid{s}', lidR, socket, 24, 12, col)
            bm = bmesh.new()
            bm.from_mesh(lid.data)
            # keep only the front (-Y) half and the upper/lower quarter
            for v in list(bm.verts):
                keep = v.co.y < 0.001 and ((v.co.z >= -0.0005) if which == 'upper' else (v.co.z <= 0.0005))
                if not keep:
                    bm.verts.remove(v)
            bm.to_mesh(lid.data)
            bm.free()
            B.assign(lid, skin)
            so = lid.modifiers.new('Solidify', 'SOLIDIFY')
            so.thickness = 0.0015
            so.offset = 1
            B.smooth(lid)
            ch.lids[f'{which}{s}'] = lid
            rigid.append(lid)
        # lash line
        lash = B.torus(f'{name}_lash{s}', lidR * 0.99, 0.009 * Rh, (0, 0, 0), col, (0, 0, 0), 24, 6)
        lash.parent = ch.lids[f'upper{s}']
        B.assign(lash, hair_m)
        # brow
        brow = bpy.data.objects.new(f'{name}_brow{s}', None)
        col.objects.link(brow)
        brow.location = P(sx * 0.32, 0, 0.42)
        pts = []
        for ux, uz in ((0.1, 0.37), (0.22, 0.43), (0.36, 0.44), (0.52, 0.39)):
            uy = -math.sqrt(max(0.05, 1 - ux * ux - uz * uz))
            x, y, z = _deform_skull(sx * ux, uy, uz, face)
            pts.append(Vector((x * rx, y * ry * 1.03, z * rz)) + hc - brow.location)
        curve = bpy.data.curves.new(f'{name}_browcurve{s}', 'CURVE')
        curve.dimensions = '3D'
        sp = curve.splines.new('NURBS')
        sp.points.add(len(pts) - 1)
        for i, p in enumerate(pts):
            sp.points[i].co = (p.x, p.y, p.z, 1)
        sp.use_endpoint_u = True
        curve.bevel_depth = 0.048 * Rh * face['brows']
        curve.bevel_resolution = 4
        bobj = bpy.data.objects.new(f'{name}_browmesh{s}', curve)
        col.objects.link(bobj)
        bobj.parent = brow
        bobj.scale = (1, 0.7, 0.9)
        bobj.data.materials.append(hair_m)
        ch.brows[s] = brow
        rigid.append(brow)

    # mouth
    mouth = bpy.data.objects.new(f'{name}_mouth', None)
    col.objects.link(mouth)
    mouth.location = P(0, -0.86, -0.47)
    lipHW = 0.27 * Rh
    up = _lip_mesh(f'{name}_lip_upper', lipHW, 0.042 * Rh * face['lips'], 0.028 * Rh, False, Rh, col)
    lo = _lip_mesh(f'{name}_lip_lower', lipHW * 0.97, 0.052 * Rh * face['lips'], -0.04 * Rh, True, Rh, col)
    for o in (up, lo):
        o.parent = mouth
        B.assign(o, lip_m)
        B.subsurf(o, 1)
    inner = B.uv_sphere(f'{name}_inner', 1, (0, 0.05 * Rh, -0.03 * Rh), 16, 10, col, (lipHW * 0.95, 0.1 * Rh, 0.09 * Rh))
    inner.parent = mouth
    B.assign(inner, inner_m)
    teeth = B.box(f'{name}_teeth', (lipHW * 1.3, 0.05 * Rh, 0.05 * Rh), (0, 0.045 * Rh, 0.0), col, bevel=0.002)
    teeth.parent = mouth
    B.assign(teeth, teeth_m)
    ch.lips = {'upper': up, 'lower': lo, 'mouth': mouth}
    rigid.append(mouth)

    # hair
    style = spec['hair']['style']
    if style != 'bald':
        natural = style == 'natural'
        hair = B.uv_sphere(f'{name}_hair', 1.0, hc + Vector((0, 0, (0.04 if natural else 0.02) * Rh)), 64, 48, col)
        bm = bmesh.new()
        bm.from_mesh(hair.data)
        grow = 1.13 if natural else 1.045
        for v in list(bm.verts):
            x, y, z = v.co.x, v.co.y, v.co.z
            front = -y
            front_line = (0.56 if natural else 0.5) - 0.65 * max(0.0, 0.95 - front)
            side_line = -0.22 if natural else (-0.2 + 0.12 * max(0.0, y))
            inside = (z < front_line) if front > 0.25 else (z < side_line)
            if inside:
                bm.verts.remove(v)
                continue
            g = grow * (1.04 if natural else 1.0)
            v.co = Vector((x * rx * g, y * ry * g * (1.02 if natural else 1.0), z * rz * g * (1.0 if natural else 1.02)))
        bm.to_mesh(hair.data)
        bm.free()
        B.assign(hair, hair_m)
        so = hair.modifiers.new('Solidify', 'SOLIDIFY')
        so.thickness = 0.012 if natural else 0.006
        so.offset = -1
        tex = bpy.data.textures.new(f'{name}_hairtex', 'CLOUDS')
        tex.noise_scale = 0.035 if natural else 0.02
        tex.noise_depth = 3
        d = hair.modifiers.new('Displace', 'DISPLACE')
        d.texture = tex
        d.strength = 0.03 if natural else 0.008
        d.mid_level = 0.5
        B.subsurf(hair, 1)
        if not low_cost_hair(spec):
            B.apply_modifiers(hair)   # bake: the hair never deforms, so evaluate it once
        rigid.append(hair)
        if natural and spec['hair'].get('band'):
            band = B.torus(f'{name}_band', 1.1 * rx, 0.045 * Rh, hc + Vector((0, 0.02 * ry, 0.42 * rz)), col, (-0.28, 0, 0), 40, 10)
            band.scale = (1, ry / rx * 1.05, 1)
            B.assign(band, B.material(f'{name}_band', spec['hair']['band'], roughness=0.7))
            rigid.append(band)

    for o in rigid:
        B.bone_parent(o, arm, 'head')
    for s in ('L', 'R'):
        ch.brows[s]['base'] = ch.brows[s].location.copy()
    ch.objects = [m for m, _ in skinned] + rigid
    ch.parts = {o.name: o for o in ch.objects}

    # neutral face
    set_face(ch, eyes_open=1.0)
    arm.location = location
    return ch


# ----------------------------------------------------------------------------
# face + pose controls
# ----------------------------------------------------------------------------

def squint_k(x):
    return 0.0


def set_face(ch, eyes_open=1.0, smile=0.0, frown=0.0, open_=0.0, wide=0.0, pucker=0.0, brow_up=0.0, brow_inner=0.0, brow_down=0.0, frame=None):
    """Drive the facial controls (optionally keyframed at `frame`)."""
    Rh = ch.H * 0.054
    for s in ('L', 'R'):
        sign = 1 if s == 'L' else -1
        up = ch.lids[f'upper{s}']
        lo = ch.lids[f'lower{s}']
        o = max(0.0, min(1.35, eyes_open))
        o1 = min(1.0, o)
        wide_k = max(0.0, o - 1.0)
        # measured on the built geometry: negative X closes both lids, positive opens them
        up.rotation_euler = (-0.45 + 1.07 * o1 * (1 - squint_k(0)) + wide_k * 0.5, 0, 0)
        lo.rotation_euler = (-0.45 + 0.35 * (0.35 + 0.65 * o1) - wide_k * 0.15, 0, 0)
        b = ch.brows[s]
        base = Vector(b['base']) if 'base' in b else b.location.copy()
        b.location = base + Vector((0, 0, brow_up * 0.07 * Rh - brow_down * 0.05 * Rh + brow_inner * 0.015 * Rh))
        b.rotation_euler = (brow_up * 0.1, sign * (brow_inner * 0.35 - brow_up * 0.05 + brow_down * 0.1), 0)
        if frame is not None:
            up.keyframe_insert('rotation_euler', frame=frame)
            lo.keyframe_insert('rotation_euler', frame=frame)
            b.keyframe_insert('location', frame=frame)
            b.keyframe_insert('rotation_euler', frame=frame)
    for lip in (ch.lips['upper'], ch.lips['lower']):
        kb = lip.data.shape_keys.key_blocks
        kb['Smile'].value = max(0.0, smile)
        kb['Frown'].value = max(0.0, frown)
        kb['Open'].value = open_
        kb['Wide'].value = max(0.0, wide)
        kb['Pucker'].value = pucker
        if frame is not None:
            for k in ('Smile', 'Frown', 'Open', 'Wide', 'Pucker'):
                kb[k].keyframe_insert('value', frame=frame)
    inner = ch.parts.get(f'{ch.name}_inner')
    mouth = ch.lips['mouth']
    for o in mouth.children:
        if o.name.endswith('_inner'):
            o.scale.z = max(0.002, open_ * 0.17 * Rh)
            o.location.z = -0.03 * Rh - open_ * 0.1 * Rh
            if frame is not None:
                o.keyframe_insert('scale', frame=frame)
                o.keyframe_insert('location', frame=frame)
        if o.name.endswith('_teeth'):
            o.hide_render = open_ < 0.08
            o.hide_viewport = o.hide_render
            if frame is not None:
                o.keyframe_insert('hide_render', frame=frame)


EXPRESSIONS = {
    'neutral': dict(),
    'smile': dict(smile=0.55, brow_up=0.1),
    'bigSmile': dict(smile=1.0, open_=0.25, wide=0.5, brow_up=0.3),
    'laugh': dict(smile=1.0, open_=0.55, wide=0.4, brow_up=0.2, eyes_open=0.75),
    'frown': dict(frown=0.6, brow_down=0.5),
    'worried': dict(frown=0.3, brow_inner=0.8, brow_up=0.15, eyes_open=1.05),
    'surprised': dict(brow_up=0.9, eyes_open=1.3, open_=0.45, pucker=0.4),
    'shocked': dict(brow_up=1.0, eyes_open=1.35, open_=0.7, pucker=0.2, frown=0.2),
    'cry': dict(frown=0.7, brow_inner=1.0, brow_up=0.2, eyes_open=0.55, open_=0.15, wide=0.2),
    'sad': dict(frown=0.5, brow_inner=0.7, eyes_open=0.8),
    'disappointed': dict(frown=0.45, brow_inner=0.4, brow_down=0.2, eyes_open=0.75),
    'determined': dict(brow_down=0.45, eyes_open=0.9),
    'thinking': dict(brow_up=0.3, pucker=0.3, eyes_open=0.95),
    'tired': dict(eyes_open=0.6, brow_inner=0.3, frown=0.2),
    'proud': dict(smile=0.7, brow_up=0.2, eyes_open=0.9),
    'angry': dict(frown=0.7, brow_down=0.9, eyes_open=0.85, wide=0.2),
    'listening': dict(brow_up=0.15, smile=0.1),
}


def expression(ch, name, frame, strength=1.0, **override):
    e = dict(EXPRESSIONS[name])
    e.update(override)
    args = dict(eyes_open=1.0, smile=0, frown=0, open_=0, wide=0, pucker=0, brow_up=0, brow_inner=0, brow_down=0)
    for k, v in e.items():
        if k == 'eyes_open':
            args[k] = 1.0 + (v - 1.0) * strength
        else:
            args[k] = v * strength
    set_face(ch, frame=frame, **args)


def rotate_bone(ch, bone, x=0.0, y=0.0, z=0.0, frame=None, add=False):
    """Set a bone rotation (degrees, bone-local XYZ euler) and optionally keyframe it."""
    pb = ch.bone(bone)
    r = Euler((math.radians(x), math.radians(y), math.radians(z)), 'XYZ')
    if add:
        pb.rotation_euler = Euler((pb.rotation_euler.x + r.x, pb.rotation_euler.y + r.y, pb.rotation_euler.z + r.z), 'XYZ')
    else:
        pb.rotation_euler = r
    if frame is not None:
        pb.keyframe_insert('rotation_euler', frame=frame)


def pose(ch, frame, bones, reset_others=False):
    """bones: {bone_name: (x, y, z) degrees}. Keyframes every bone given."""
    if reset_others:
        for pb in ch.arm.pose.bones:
            if pb.name not in bones:
                pb.rotation_euler = (0, 0, 0)
                pb.keyframe_insert('rotation_euler', frame=frame)
    for bn, rot in bones.items():
        rotate_bone(ch, bn, *rot, frame=frame)


def place(ch, frame, location, yaw_deg):
    ch.arm.location = location
    ch.arm.rotation_euler = (0, 0, math.radians(yaw_deg))
    ch.arm.keyframe_insert('location', frame=frame)
    ch.arm.keyframe_insert('rotation_euler', frame=frame)


def look_at(ch, frame, target, influence=1.0):
    """Keyframe the eye target position (eyes track it; the head gets a damped track)."""
    ch.eye_target.location = target
    ch.eye_target.keyframe_insert('location', frame=frame)
    head = ch.bone('head')
    c = head.constraints.get('look')
    if c is None:
        c = head.constraints.new('DAMPED_TRACK')
        c.name = 'look'
        c.target = ch.eye_target
        c.track_axis = 'TRACK_Z'  # a vertical bone's local +Z is the face direction (-Y world)
    c.influence = influence * 0.65
    c.keyframe_insert('influence', frame=frame)
