"""Reusable animation functions for the procedural characters (Blender keyframes).

Rotations in pose() are given in degrees about the CHARACTER'S rest-space axes
(X = right, -Y = facing direction, Z = up) and converted to each bone's local
space, so poses read naturally: an arm swings forward with a negative X pitch,
a head turns with Z yaw, etc. Everything is keyframed on the timeline so the
whole film is one deterministic Blender animation.
"""
import bpy, math, json, os, random
from mathutils import Vector, Euler, Matrix, Quaternion
import charlib as C

FPS = 24

# ---------------------------------------------------------------- timing log (for the audio mix) --
TIMING = {'dialogue': [], 'sfx': [], 'ambience': [], 'music': []}


def reset_timing():
    for k in TIMING:
        TIMING[k] = []


def sfx(name, t, gain=0.6):
    TIMING['sfx'].append({'name': name, 't': round(t, 3), 'gain': gain})


def ambience(name, t0, t1, gain=0.35):
    TIMING['ambience'].append({'name': name, 't0': round(t0, 3), 't1': round(t1, 3), 'gain': gain})


def music(mood, t0, t1, gain=0.28):
    TIMING['music'].append({'mood': mood, 't0': round(t0, 3), 't1': round(t1, 3), 'gain': gain})


def write_timing(path, duration, scene_name=''):
    import json as _json, os as _os
    _os.makedirs(_os.path.dirname(path), exist_ok=True)
    data = dict(TIMING)
    data['duration'] = duration
    data['scene'] = scene_name
    with open(path, 'w') as f:
        _json.dump(data, f, indent=1)
    return path


def F(seconds):
    return int(round(seconds * FPS))


# ----------------------------------------------------------------------------
# bone rotation in character space
# ----------------------------------------------------------------------------

def _world_rot(x, y, z):
    return (Matrix.Rotation(math.radians(z), 3, 'Z') @ Matrix.Rotation(math.radians(y), 3, 'Y') @ Matrix.Rotation(math.radians(x), 3, 'X'))


HOLD = 10  # frames (~0.4 s) over which a newly keyed value transitions from the held previous value


def hold_fcurves(fcurves, frame, hold=HOLD):
    """Insert a key `hold` frames before `frame` holding the evaluated value, unless a key already exists
    in that window. This makes sparse keys mean 'hold, then move' instead of 'drift slowly'."""
    if hold <= 0:
        return
    for fc in fcurves:
        pts = fc.keyframe_points
        if len(pts) == 0:
            continue
        last_before = None
        for kp in pts:
            if kp.co.x < frame - 0.5:
                last_before = kp.co.x if last_before is None else max(last_before, kp.co.x)
        if last_before is None or last_before >= frame - hold:
            continue
        v = fc.evaluate(frame - hold)
        pts.insert(frame - hold, v, options={'FAST'})
        fc.update()


def _fcurves(id_block, prefix=None):
    ad = getattr(id_block, 'animation_data', None)
    if not ad or not ad.action:
        return []
    return [fc for fc in ad.action.fcurves if prefix is None or fc.data_path.startswith(prefix)]


def hold_object(obj, frame, hold=HOLD):
    hold_fcurves(_fcurves(obj), frame, hold)


def set_bone(ch, bone, x=0.0, y=0.0, z=0.0, frame=None, hold=HOLD):
    pb = ch.bone(bone)
    Mb = ch.arm.data.bones[bone].matrix_local.to_3x3()
    local = Mb.inverted() @ _world_rot(x, y, z) @ Mb
    pb.rotation_mode = 'QUATERNION'
    if frame is not None and hold:
        hold_fcurves(_fcurves(ch.arm, f'pose.bones["{bone}"].rotation_quaternion'), frame, hold)
    pb.rotation_quaternion = local.to_quaternion()
    if frame is not None:
        pb.keyframe_insert('rotation_quaternion', frame=frame)


REST = {b: (0, 0, 0) for b in (
    'hips', 'spine', 'chest', 'neck', 'head', 'shoulder.L', 'shoulder.R', 'upper_arm.L', 'upper_arm.R', 'forearm.L', 'forearm.R',
    'hand.L', 'hand.R', 'thigh.L', 'thigh.R', 'shin.L', 'shin.R', 'foot.L', 'foot.R',
    'index.L', 'middle.L', 'ring.L', 'pinky.L', 'thumb.L', 'index.R', 'middle.R', 'ring.R', 'pinky.R', 'thumb.R')}


SWING_BONES = ('upper_arm.L', 'upper_arm.R', 'thigh.L', 'thigh.R')


def _fix(b, r):
    # For limbs the pose tables use (pitch, twist, sideways-swing). A sideways swing of a hanging
    # limb is a rotation about the character's Y axis, so swap the last two components.
    if b in SWING_BONES:
        return (r[0], r[2], r[1])
    return r


def pose(ch, frame, bones, base=None, hold=HOLD):
    """Keyframe a pose. `bones` = {bone: (pitch, twist, swing)} degrees in character space
    (pitch: + leans forward / arm forward is negative; swing: negative = outward for the left side).
    If base is given (another pose dict) its bones are keyframed first so the pose is complete.
    Values hold from the previous key and transition over `hold` frames (0 = plain interpolation)."""
    if base:
        for b, r in base.items():
            if b not in bones:
                set_bone(ch, b, *_fix(b, r), frame=frame, hold=hold)
    for b, r in bones.items():
        set_bone(ch, b, *_fix(b, r), frame=frame, hold=hold)


def hips_offset(ch, frame, dz=0.0, dy=0.0, dx=0.0, hold=HOLD):
    pb = ch.bone('hips')
    if hold:
        hold_fcurves(_fcurves(ch.arm, 'pose.bones["hips"].location'), frame, hold)
    # hips bone points up: local Y is world Z, local Z is world -Y
    pb.location = Vector((dx, dz, -dy))
    pb.keyframe_insert('location', frame=frame)


# ----------------------------------------------------------------------------
# poses (character space degrees)
# ----------------------------------------------------------------------------

def stand_pose(sway=0.0):
    return {
        'hips': (0, 0, 0), 'spine': (2, 0, 0), 'chest': (0, 0, 0), 'neck': (3, 0, 0), 'head': (0, 0, 0),
        'upper_arm.L': (3, 0, -6), 'upper_arm.R': (3, 0, 6), 'forearm.L': (-10, 0, 0), 'forearm.R': (-10, 0, 0),
        'hand.L': (0, 0, 0), 'hand.R': (0, 0, 0),
        'thigh.L': (0, 0, -2), 'thigh.R': (0, 0, 2), 'shin.L': (2, 0, 0), 'shin.R': (2, 0, 0), 'foot.L': (0, 0, 0), 'foot.R': (0, 0, 0),
        **{f'{f}.{s}': (18, 0, 0) for f in ('index', 'middle', 'ring', 'pinky') for s in ('L', 'R')},
        'thumb.L': (0, 0, 0), 'thumb.R': (0, 0, 0),
    }


def sit_pose():
    p = stand_pose()
    p.update({'thigh.L': (-85, 0, -6), 'thigh.R': (-85, 0, 6), 'shin.L': (80, 0, 0), 'shin.R': (80, 0, 0), 'foot.L': (5, 0, 0), 'foot.R': (5, 0, 0),
              'spine': (5, 0, 0), 'upper_arm.L': (-20, 0, -6), 'upper_arm.R': (-20, 0, 6), 'forearm.L': (-50, 0, 15), 'forearm.R': (-50, 0, -15)})
    return p


def typing_pose(t):
    pl = abs(math.sin(t * 9.3)) * 6
    pr = abs(math.sin(t * 8.1 + 1)) * 6
    return {'spine': (9, 0, 0), 'neck': (10, 0, 0), 'head': (6, 0, 0),
            'upper_arm.L': (-28, 0, -14), 'upper_arm.R': (-28, 0, 14), 'forearm.L': (-78, 0, 25), 'forearm.R': (-78, 0, -25),
            'hand.L': (-8 + pl, 0, 0), 'hand.R': (-8 + pr, 0, 0),
            **{f'{f}.L': (25 + pl * 2, 0, 0) for f in ('index', 'middle', 'ring', 'pinky')},
            **{f'{f}.R': (25 + pr * 2, 0, 0) for f in ('index', 'middle', 'ring', 'pinky')}}


def hands_on_table_pose():
    return {'upper_arm.L': (-30, 0, -10), 'upper_arm.R': (-30, 0, 10), 'forearm.L': (-65, 0, 20), 'forearm.R': (-65, 0, -20), 'hand.L': (-5, 0, 0), 'hand.R': (-5, 0, 0)}


def point_pose(side, pitch=0.0, yaw=0.0):
    s = 1 if side == 'L' else -1
    p = {f'upper_arm.{side}': (-78 + pitch, 0, -s * 8 + yaw), f'forearm.{side}': (-8, 0, 0), f'hand.{side}': (0, 0, 0),
         f'index.{side}': (0, 0, 0), f'thumb.{side}': (20, 0, 0)}
    for f in ('middle', 'ring', 'pinky'):
        p[f'{f}.{side}'] = (85, 0, 0)
    return p


def hold_phone_pose(side, up=0.0):
    s = 1 if side == 'L' else -1
    return {f'upper_arm.{side}': (-32 - up * 25, 0, -s * 4), f'forearm.{side}': (-112, s * 25, s * 18), f'hand.{side}': (-15, s * 25, 0),
            'neck': (12 - up * 10, 0, 0), 'head': (8 - up * 8, 0, 0),
            **{f'{f}.{side}': (55, 0, 0) for f in ('index', 'middle', 'ring', 'pinky')}, f'thumb.{side}': (35, 0, 0)}


def show_phone_pose(side):
    s = 1 if side == 'L' else -1
    return {f'upper_arm.{side}': (-58, 0, -s * 6), f'forearm.{side}': (-52, s * 15, s * 18), f'hand.{side}': (-20, s * 40, 0),
            **{f'{f}.{side}': (55, 0, 0) for f in ('index', 'middle', 'ring', 'pinky')}, f'thumb.{side}': (35, 0, 0)}


def explain_pose(t, k=1.0):
    a = math.sin(t * 1.3) * 10 * k
    b = math.sin(t * 1.7 + 1) * 10 * k
    return {'upper_arm.L': (-30 + a, 0, -22), 'upper_arm.R': (-30 - b, 0, 22), 'forearm.L': (-80 + a, -30, 18), 'forearm.R': (-80 - b, 30, -18),
            'hand.L': (10, -25, 20 + a), 'hand.R': (10, 25, -20 - b), **{f'{f}.{s}': (8, 0, 0) for f in ('index', 'middle', 'ring', 'pinky') for s in ('L', 'R')}}


def talk_hand_pose(t, side, k=1.0, seed=0):
    s = 1 if side == 'L' else -1
    a = math.sin(t * 1.1 + seed) * 12 * k
    b = math.sin(t * 1.6 + seed * 3) * 12 * k
    return {f'upper_arm.{side}': (-24 + a, 0, -s * 12), f'forearm.{side}': (-85 + b, -s * 20, s * 10), f'hand.{side}': (5 + a, -s * 15, s * 15)}


def hands_on_hips_pose():
    return {'upper_arm.L': (8, 0, -32), 'upper_arm.R': (8, 0, 32), 'forearm.L': (-70, -70, 20), 'forearm.R': (-70, 70, -20), 'hand.L': (20, 0, 0), 'hand.R': (20, 0, 0)}


def hand_on_shoulder_pose(side):
    s = 1 if side == 'L' else -1
    return {f'upper_arm.{side}': (-55, 0, -s * 18), f'forearm.{side}': (-48, s * 15, s * 6), f'hand.{side}': (28, 0, 0)}


def hand_over_pose(side, reach=1.0):
    s = 1 if side == 'L' else -1
    return {f'upper_arm.{side}': (-52 * reach, 0, -s * 6), f'forearm.{side}': (-34 * reach, 0, 0), f'hand.{side}': (-18, s * 70, 0),
            **{f'{f}.{side}': (20, 0, 0) for f in ('index', 'middle', 'ring', 'pinky')}, f'thumb.{side}': (30, 0, 0)}


def receive_pose():
    return {'upper_arm.L': (-40, 0, -8), 'upper_arm.R': (-40, 0, 8), 'forearm.L': (-58, -20, 0), 'forearm.R': (-58, 20, 0), 'hand.L': (18, 75, 0), 'hand.R': (18, -75, 0)}


def hug_pose(lean=1.0):
    return {'spine': (7, 0, 0), 'neck': (3, 0, 14 * lean), 'head': (6, 10 * lean, 12 * lean),
            'upper_arm.L': (-70, 0, -38), 'upper_arm.R': (-78, 0, 32), 'forearm.L': (-75, -18, 12), 'forearm.R': (-63, 18, -12), 'hand.L': (12, 0, 0), 'hand.R': (12, 0, 0)}


def celebrate_pose(t):
    pump = math.sin(t * 5) * 14
    return {'spine': (-6, 0, 0), 'neck': (-9, 0, 0), 'head': (-11, 0, 0),
            'upper_arm.L': (-150 + pump, 0, -34), 'upper_arm.R': (-150 - pump, 0, 34), 'forearm.L': (-52 - pump, 0, 0), 'forearm.R': (-52 + pump, 0, 0),
            **{f'{f}.{s}': (85, 0, 0) for f in ('index', 'middle', 'ring', 'pinky') for s in ('L', 'R')}, 'thumb.L': (40, 0, 0), 'thumb.R': (40, 0, 0)}


def slump_pose():
    return {'spine': (13, 0, 0), 'chest': (5, 0, 0), 'neck': (17, 0, 0), 'head': (20, 0, 3), 'upper_arm.L': (7, 0, -3), 'upper_arm.R': (7, 0, 3), 'forearm.L': (-5, 0, 0), 'forearm.R': (-5, 0, 0)}


def face_in_hands_pose():
    return {'spine': (20, 0, 0), 'chest': (6, 0, 0), 'neck': (17, 0, 0), 'head': (20, 0, 0),
            'upper_arm.L': (-63, 0, -14), 'upper_arm.R': (-63, 0, 14), 'forearm.L': (-140, -20, 17), 'forearm.R': (-140, 20, -17), 'hand.L': (-23, 29, 11), 'hand.R': (-23, -29, -11)}


def wipe_tears_pose(k, side='R'):
    s = 1 if side == 'L' else -1
    w = math.sin(min(1.0, k) * math.pi)
    return {f'upper_arm.{side}': (-52 * w, 0, -s * 14), f'forearm.{side}': (-140 * w, -s * 12, s * 17), f'hand.{side}': (-34 * w, s * 23, 0), 'head': (9 * w, -s * 6 * w, 0)}


def crouch_pose():
    return {'thigh.L': (-108, 0, -14), 'thigh.R': (-108, 0, 14), 'shin.L': (130, 0, 0), 'shin.R': (130, 0, 0), 'foot.L': (-17, 0, 0), 'foot.R': (-17, 0, 0),
            'spine': (26, 0, 0), 'neck': (6, 0, 0), 'head': (11, 0, 0), 'upper_arm.L': (-52, 0, -11), 'upper_arm.R': (-63, 0, 6), 'forearm.L': (-46, 0, 0), 'forearm.R': (-34, 0, 0)}


def carry_pose():
    return {'upper_arm.L': (-28, 0, -12), 'upper_arm.R': (-28, 0, 12), 'forearm.L': (-80, 12, 0), 'forearm.R': (-80, -12, 0), 'hand.L': (-12, 0, 0), 'hand.R': (-12, 0, 0),
            **{f'{f}.{s}': (45, 0, 0) for f in ('index', 'middle', 'ring', 'pinky') for s in ('L', 'R')}}


def work_pose(t, seed=0):
    a = math.sin(t * 1.4 + seed) * 14
    b = math.sin(t * 1.7 + 3 + seed) * 14
    return {'spine': (10, 0, 0), 'neck': (11, 0, 0), 'head': (9, a * 0.3, 0),
            'upper_arm.L': (-32 + a, 0, -12), 'upper_arm.R': (-32 + b, 0, 12), 'forearm.L': (-63 - b * 0.5, -12, 0), 'forearm.R': (-63 - a * 0.5, 12, 0),
            'hand.L': (-12 + b, 0, 0), 'hand.R': (-12 + a, 0, 0), **{f'{f}.{s}': (30, 0, 0) for f in ('index', 'middle', 'ring', 'pinky') for s in ('L', 'R')}}


def walk_cycle_pose(phase, energy=1.0, run=False):
    p = phase * 2 * math.pi
    s, c = math.sin(p), math.cos(p)
    A = (55 if run else 27) * energy
    kneeL = (95 if run else 55) * max(0.0, c) ** 1.3 + (14 if run else 5)
    kneeR = (95 if run else 55) * max(0.0, -c) ** 1.3 + (14 if run else 5)
    lean = 12 if run else 3
    return {'hips': (lean * 0.3, 0, 4 * s), 'spine': (lean, 0, -4 * s), 'chest': (0, 0, -2 * s), 'neck': (-lean * 0.4, 0, 2 * s), 'head': (-lean * 0.5, 0, 1 * s),
            'upper_arm.L': (0.6 * A * s - (12 if run else 0), 0, -8), 'upper_arm.R': (-0.6 * A * s - (12 if run else 0), 0, 8),
            'forearm.L': ((-95 if run else -20) - 12 * max(0, -s), 0, 5), 'forearm.R': ((-95 if run else -20) - 12 * max(0, s), 0, -5),
            'thigh.L': (-A * s - (6 if run else 0), 0, -2), 'thigh.R': (A * s - (6 if run else 0), 0, 2),
            'shin.L': (kneeL, 0, 0), 'shin.R': (kneeR, 0, 0),
            'foot.L': (12 * s - 3, 0, 0), 'foot.R': (-12 * s - 3, 0, 0),
            **{f'{f}.{sd}': ((60 if run else 20), 0, 0) for f in ('index', 'middle', 'ring', 'pinky') for sd in ('L', 'R')}}


# ----------------------------------------------------------------------------
# higher level actions
# ----------------------------------------------------------------------------

def _hold(obj, frame):
    """Key the object's currently animated transform one frame earlier so a new key snaps instead of drifting."""
    hold_fcurves(_fcurves(obj, 'location'), frame, 1)
    hold_fcurves(_fcurves(obj, 'rotation_euler'), frame, 1)


def place(ch, frame, x, y, yaw_deg, z=0.0, hold=True):
    """Put the character at (x, y) facing yaw_deg at `frame`. By default the previous placement is
    held until the frame before, so characters never drift between placements."""
    if hold:
        _hold(ch.arm, frame)
    ch.arm.location = (x, y, z)
    ch.arm.rotation_euler = (0, 0, math.radians(yaw_deg))
    ch.arm.keyframe_insert('location', frame=frame)
    ch.arm.keyframe_insert('rotation_euler', frame=frame)


def turn(ch, t0, t1, yaw_deg):
    """Turn on the spot (smoothly) from the current facing to yaw_deg between t0 and t1."""
    sc = bpy.context.scene
    sc.frame_set(F(t0))
    loc, rot = ch.arm.location.copy(), ch.arm.rotation_euler.copy()
    cur = math.degrees(rot.z)
    place(ch, F(t0), loc.x, loc.y, cur, hold=False)
    d = (yaw_deg - cur + 180) % 360 - 180
    place(ch, F(t1), loc.x, loc.y, cur + d, hold=False)


def yaw_to(a, b):
    """Yaw (deg) so that a character at a faces point b. Characters face -Y at yaw 0."""
    dx, dy = b[0] - a[0], b[1] - a[1]
    return math.degrees(math.atan2(dx, -dy))


def walk(ch, t0, t1, points, run=False, face_end=None, stride=None):
    """Keyframe a walk along points [(x, y), ...] between t0 and t1 seconds."""
    H = ch.H
    pts = [Vector((p[0], p[1], 0)) for p in points]
    segs = [(pts[i], pts[i + 1], (pts[i + 1] - pts[i]).length) for i in range(len(pts) - 1)]
    total = sum(s[2] for s in segs) or 1e-6
    dur = max(0.05, t1 - t0)
    speed = total / dur
    stride = stride or H * (1.35 if run else 0.62 + 0.18 * min(1.0, speed / 1.6))
    cycles = total / stride
    n = max(2, int(cycles * 4))  # keyframe every quarter cycle
    prev_yaw = 0.0
    for i in range(n + 1):
        k = i / n
        d = k * total
        # position on the path
        acc = 0.0
        pos, fwd = pts[0], (pts[1] - pts[0]).normalized() if len(pts) > 1 else Vector((0, -1, 0))
        for a, b, L in segs:
            if d <= acc + L or (a, b, L) is segs[-1]:
                u = 0 if L == 0 else max(0.0, min(1.0, (d - acc) / L))
                pos = a.lerp(b, u)
                fwd = (b - a).normalized() if L > 0 else fwd
                break
            acc += L
        yaw = math.degrees(math.atan2(-fwd.x, fwd.y)) + 180
        if i > 0:
            yaw = prev_yaw + ((yaw - prev_yaw + 180) % 360 - 180)
        if face_end is not None and k > 0.85:
            w = (k - 0.85) / 0.15
            dyaw = (face_end - yaw + 180) % 360 - 180
            yaw += dyaw * w
        fr = F(t0 + k * dur)
        place(ch, fr, pos.x, pos.y, yaw, hold=(i == 0))
        prev_yaw = yaw
        phase = (d / stride) % 1.0
        bob = -abs(math.cos(phase * 2 * math.pi)) * (0.045 if run else 0.02) * H
        pose(ch, fr, walk_cycle_pose(phase, run=run), base=stand_pose(), hold=(HOLD if i == 0 else 0))
        hips_offset(ch, fr, dz=bob, hold=(HOLD if i == 0 else 0))
        if i % 2 == 0 and i > 0:
            sfx('footstep', t0 + k * dur, 0.35 if run else 0.22)
    # settle into a stand
    fr = F(t1 + 0.4)
    pose(ch, fr, stand_pose())
    hips_offset(ch, fr, 0)
    if face_end is not None:
        fe = prev_yaw + ((face_end - prev_yaw + 180) % 360 - 180)
        place(ch, fr, pts[-1].x, pts[-1].y, fe, hold=False)


def idle(ch, t0, t1, seed=0, seated=False, step=0.5):
    """Breathing and subtle sway keyframed on spine/chest/head (additive on top of whatever pose keys exist is not
    possible in Blender without NLA, so this re-keys the base pose with the breathing offsets)."""
    rnd = random.Random(seed)
    base = sit_pose() if seated else stand_pose()
    t = t0
    while t <= t1:
        b = math.sin(t * 2 * math.pi * 0.27 + seed)
        n1, n2 = math.sin(t * 0.37 + seed) * 2.5, math.sin(t * 0.23 + seed * 2) * 3
        p = dict(base)
        p['spine'] = (base['spine'][0] - b * 0.8, 0, n2 * 0.3)
        p['chest'] = (-b * 0.7, 0, 0)
        p['neck'] = (base['neck'][0] + b * 0.4, 0, 0)
        p['head'] = (n1, 0, n2)
        pose(ch, F(t), p)
        t += step


def blink(ch, t0, t1, seed=0, every=(2.6, 5.2)):
    rnd = random.Random(seed * 7 + 1)
    t = t0 + rnd.uniform(0.3, 1.5)
    while t < t1:
        C.set_face(ch, eyes_open=_eyes_open_at(ch, t), frame=F(t) - 2) if False else None
        C.set_face(ch, eyes_open=1.0, frame=F(t))
        C.set_face(ch, eyes_open=0.02, frame=F(t) + 2)
        C.set_face(ch, eyes_open=1.0, frame=F(t) + 5)
        t += rnd.uniform(*every)


def _eyes_open_at(ch, t):
    return 1.0


# expressions over time (keyframe the face with transitions)
def _face_blocks(ch):
    blocks = list(ch.lids.values()) + list(ch.brows.values())
    for lip in (ch.lips['upper'], ch.lips['lower']):
        blocks.append(lip.data.shape_keys)
    blocks += list(ch.lips['mouth'].children)
    return blocks


def expression(ch, name, t, strength=1.0, hold=None, fade=0.4, **kw):
    """Blend the face into `name` at time t (seconds), transitioning over ~0.4 s from the held previous face."""
    for b in _face_blocks(ch):
        hold_object(b, F(t), HOLD)
    C.expression(ch, name, F(t), strength, **kw)
    if hold is not None:
        C.expression(ch, name, F(t + hold), strength, **kw)
        C.expression(ch, 'neutral', F(t + hold + fade), 1.0)


# ----------------------------------------------------------------------------
# lip-sync
# ----------------------------------------------------------------------------

VISEMES = {
    'rest': (0.0, 0.0, 0.0), 'A': (0.75, 0.25, 0.0), 'E': (0.4, 0.75, 0.0), 'I': (0.3, 0.8, 0.0), 'O': (0.6, -0.4, 0.75),
    'U': (0.35, -0.6, 0.95), 'M': (0.0, 0.05, 0.1), 'F': (0.15, 0.3, 0.0), 'L': (0.4, 0.2, 0.0), 'S': (0.2, 0.55, 0.0), 'T': (0.25, 0.3, 0.0), 'W': (0.3, -0.5, 0.8),
}


def _viseme_for(c):
    if c in 'a': return 'A'
    if c in 'e': return 'E'
    if c in 'iy': return 'I'
    if c in 'o': return 'O'
    if c in 'u': return 'U'
    if c in 'mbp': return 'M'
    if c in 'fv': return 'F'
    if c in 'l': return 'L'
    if c in 'szcj': return 'S'
    if c in 'w': return 'W'
    return 'T'


def lipsync(ch, t0, text, duration, expression_name=None, strength=1.0):
    """Keyframe mouth shapes for `text` spoken from t0 for `duration` seconds."""
    letters = ''.join(ch_ for ch_ in text.lower() if ch_.isalpha() or ch_ == ' ')
    words = [w for w in letters.split(' ') if w]
    total = max(1, sum(len(w) for w in words))
    speak = duration * 0.88
    t = t0 + 0.04
    base = dict(C.EXPRESSIONS.get(expression_name or 'neutral', {}))
    def key(tt, v):
        o, w, p = v
        C.set_face(ch, frame=F(tt), eyes_open=base.get('eyes_open', 1.0), smile=base.get('smile', 0) * strength,
                   frown=base.get('frown', 0) * strength, open_=max(o, base.get('open_', 0) * 0.3), wide=max(w, base.get('wide', 0)),
                   pucker=max(p, base.get('pucker', 0)), brow_up=base.get('brow_up', 0) * strength, brow_inner=base.get('brow_inner', 0) * strength,
                   brow_down=base.get('brow_down', 0) * strength)
    key(t0, VISEMES['rest'])
    for w in words:
        for c in w:
            key(t, VISEMES[_viseme_for(c)])
            t += (speak / total) * 0.92
        key(t, VISEMES['rest'])
        t += (speak / total) * 0.9
    key(t0 + duration, VISEMES['rest'])


def look_at(ch, t, target, influence=1.0, transition=0.35):
    hold_fcurves(_fcurves(ch.eye_target, 'location'), F(t), F(transition))
    C.look_at(ch, F(t), Vector(target), influence)


def talk_body(ch, t0, duration, hands='right', seated=False, k=0.8, seed=0, step=0.25):
    """Conversational body language while talking (re-keys the full pose every `step` seconds)."""
    base = sit_pose() if seated else stand_pose()
    t = t0
    while t <= t0 + duration:
        p = dict(base)
        nod = math.sin(t * 2.3 + seed) * 2.5 * k + max(0.0, math.sin(t * 1.6 + seed)) * 2 * k
        p['head'] = (nod, math.sin(t * 0.7 + seed) * 3 * k, math.sin(t * 0.5 + seed * 2) * 3 * k)
        p['neck'] = (base['neck'][0] + nod * 0.5, 0, 0)
        if hands in ('right', 'both'):
            p.update(talk_hand_pose(t, 'R', k, seed))
        if hands in ('left', 'both'):
            p.update(talk_hand_pose(t, 'L', k, seed + 1))
        pose(ch, F(t), p, hold=(HOLD if t == t0 else 0))
        t += step
    pose(ch, F(t0 + duration + 0.5), base)


def dialogue_line(ch, line, t0, hands='none', seated=False, expression_name=None, k=0.8, seed=0):
    """Speak a line (dict from lines.json) at t0: lip-sync + body language. Returns the end time."""
    TIMING['dialogue'].append({'id': line['id'], 'speaker': line['speaker'], 'text': line['text'], 'file': line['file'], 't': round(t0, 3), 'duration': line['duration']})
    lipsync(ch, t0, line['text'], line['duration'], expression_name)
    if hands != 'none':
        talk_body(ch, t0, line['duration'], hands, seated, k, seed)
    return t0 + line['duration']


def fade(scene, t0, t1, to_black=True, dark=-14.0, normal=-0.1):
    """Fade the picture to/from black by keyframing the view exposure."""
    vs = scene.view_settings
    vs.exposure = normal if to_black else dark
    vs.keyframe_insert('exposure', frame=F(t0))
    vs.exposure = dark if to_black else normal
    vs.keyframe_insert('exposure', frame=F(t1))
