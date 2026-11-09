"""20-second SAMPLE: all three characters in the home set with dialogue, lip-sync, walking, gestures and
cinematic cameras. Produces blender/sample.blend and renders renders/sample/frame_####.png
Run: xvfb-run -a blender -b --python scripts/build_sample.py -- 1280 720 [render]
"""
import bpy, sys, os, math, json
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'lib'))
import blib as B, charlib as C, anim as A, env_home as HOME
from cinema import Camera, render_settings

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
W, H = (int(argv[0]), int(argv[1])) if len(argv) >= 2 else (1280, 720)
DO_RENDER = 'render' in argv
DUR = 20.0

scene = B.clear_scene()
HOME.build(scene, 'morning')
lines = {l['id']: l for l in json.load(open(os.path.join(ROOT, 'audio', 'dialogue', 'lines.json')))}

daniel = C.build_character(C.SPECS['Daniel'], B.collection('Daniel'))
grace = C.build_character(C.SPECS['Grace'], B.collection('Grace'))
brian = C.build_character(C.SPECS['Brian'], B.collection('Brian'))
S = HOME.SPOTS
F = A.F
A.reset_timing()
A.ambience('room_tone', 0, DUR, 0.4)
A.music('warm', 0, DUR, 0.22)
A.sfx('door', 12.6, 0.5)
A.sfx('typing_bed', 0.3, 0.25)

# ---- Daniel sits at the table typing, facing the kitchen (+Y) -------------------------------------
dx, dy, dyaw = S['daniel_chair']
A.place(daniel, 1, dx, dy, dyaw)
drop = daniel.H * 0.47 - 0.47
for t in (0.0, DUR):
    A.pose(daniel, F(t), A.sit_pose())
    A.hips_offset(daniel, F(t), dz=-drop, dy=0.0)
t = 0.0
while t < 9.0:
    A.pose(daniel, F(t), A.typing_pose(t), base=A.sit_pose())
    t += 0.25
A.pose(daniel, F(9.6), A.hands_on_table_pose(), base=A.sit_pose())
A.look_at(daniel, 0.0, (dx, dy - 0.42, 0.92))          # the laptop screen
A.look_at(daniel, 9.0, (dx, dy - 0.42, 0.92))
A.blink(daniel, 0, DUR, seed=1)

# ---- Grace at the counter, turns, walks to the table ------------------------------------------------
gx, gy, gyaw = S['kitchen']
A.place(grace, 1, gx, gy, gyaw)
t = 0.0
while t < 4.0:
    A.pose(grace, F(t), A.work_pose(t, 2), base=A.stand_pose())
    t += 0.25
A.pose(grace, F(4.6), A.stand_pose())
# turn to Daniel and speak
A.turn(grace, 4.4, 5.4, A.yaw_to((gx, gy), (dx, dy)))
A.look_at(grace, 4.5, (dx, dy, 1.45))
A.blink(grace, 0, DUR, seed=2)
l = lines['s1_00_grace']
A.expression(grace, 'smile', 5.0, 0.6)
A.dialogue_line(grace, l, 5.6, hands='right', expression_name='smile', k=0.6, seed=2)
# Daniel looks up and answers
A.look_at(daniel, 9.2, (gx, gy, 1.5))
A.expression(daniel, 'smile', 9.4, 0.7)
l2 = lines['s1_01_daniel']
A.dialogue_line(daniel, l2, 9.8, hands='right', seated=True, expression_name='smile', k=0.7, seed=1)
# Grace walks over while Daniel talks
A.walk(grace, 11.0, 14.0, [(gx, gy), (0.7, 1.2), (S['beside_daniel'][0], S['beside_daniel'][1])], face_end=S['beside_daniel'][2])
A.look_at(grace, 11.0, (dx, dy, 1.45))
A.pose(grace, F(15.0), A.hand_on_shoulder_pose('R'), base=A.stand_pose())
l3 = lines['s1_02_grace']
A.expression(grace, 'bigSmile', 14.6, 0.8)
A.dialogue_line(grace, l3, 15.0, hands='none', expression_name='bigSmile', seed=2)
A.expression(daniel, 'laugh', 17.0, 0.9)
A.pose(daniel, F(17.5), A.explain_pose(17.5, 0.6), base=A.sit_pose())
A.pose(daniel, F(19.5), A.hands_on_table_pose(), base=A.sit_pose())

# ---- Brian bursts in through the door -------------------------------------------------------------
A.place(brian, 1, S['door_outside'][0], S['door_outside'][1], 0)
HOME.open_door(12.0, 13.2)
A.walk(brian, 12.5, 16.0, [S['door_outside'][:2], S['doorway'][:2], (1.0, -1.4), (0.45, -0.95)], run=True, face_end=A.yaw_to((0.45, -0.95), (dx, dy)))
A.look_at(brian, 12.5, (dx, dy, 1.45))
A.blink(brian, 0, DUR, seed=3)
l4 = lines['s2_00_brian']
A.expression(brian, 'bigSmile', 16.0, 1.0)
A.pose(brian, F(16.4), A.show_phone_pose('R'), base=A.stand_pose())
A.dialogue_line(brian, l4, 16.4, hands='left', expression_name='bigSmile', k=0.9, seed=3)
A.look_at(grace, 16.2, (0.45, -0.95, 1.6))
A.look_at(daniel, 16.4, (0.45, -0.95, 1.6))
A.expression(daniel, 'surprised', 16.8, 0.8)
A.expression(grace, 'surprised', 16.9, 0.6)

# ---- camera -------------------------------------------------------------------------------------
cam = Camera(scene)
cam.shot(0.0, 5.0, (2.4, -2.2, 1.75), (-0.6, 0.6, 1.0), fov=44, end_pos=(1.7, -1.5, 1.55), end_look=(-0.7, 0.5, 1.05))
cam.shot(5.0, 9.6, (0.1, -0.1, 1.45), (gx, gy, 1.45), fov=32)                       # Grace at the counter
cam.shot(9.6, 12.5, (-0.55, -0.75, 1.3), (dx, dy - 0.05, 1.4), fov=30)                 # Daniel answers (from across the table)
cam.shot(12.5, 16.2, (-2.4, -2.3, 1.5), (1.0, -1.4, 1.1), fov=42, end_look=(0.3, -0.5, 1.2))  # Brian bursts in
cam.shot(16.2, 20.0, (-2.7, -1.3, 1.7), (-0.1, -0.2, 1.2), fov=46, end_pos=(-2.4, -1.1, 1.65))   # three-shot from the west

render_settings(scene, W, H, DUR, os.path.join(ROOT, 'renders', 'sample', 'frame_'))
A.write_timing(os.path.join(ROOT, 'renders', 'sample', 'timing.json'), DUR, 'sample')
os.makedirs(os.path.join(ROOT, 'blender'), exist_ok=True)
if 'timing' not in argv:
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'blender', 'sample.blend'))
print('SAMPLE_SAVED')
frames = [a for a in argv if a.startswith('frames=')]
if frames:
    for fr in frames[0][7:].split(','):
        scene.frame_set(int(fr))
        scene.render.filepath = os.path.join(ROOT, 'renders', 'sample', f'test_{int(fr):04d}.png')
        bpy.ops.render.render(write_still=True)
    print('SAMPLE_FRAMES_DONE')
elif DO_RENDER:
    bpy.ops.render.render(animation=True)
    print('SAMPLE_RENDERED')
