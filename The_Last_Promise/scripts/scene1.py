"""SCENE 1 - A PROMISE (00:00-00:45). Modest Kampala home, morning.
Grace prepares breakfast while Daniel works on his laptop."""
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts', 'lib'))
from scenebase import SceneContext
import anim as A, env_home as HOME

ctx = SceneContext('scene1', 45.0, 'home', 'morning', characters=('daniel', 'grace'))
D, G = ctx.daniel, ctx.grace
S = ctx.S
F = A.F
DUR = 45.0
A.ambience('room_tone', 0, DUR, 0.4)
A.music('warm', 0.5, DUR, 0.2)
A.sfx('typing_bed', 0.5, 0.2)

# ---- Daniel at the table on the laptop ----
dx, dy, dyaw = S['daniel_chair']
A.place(D, 1, dx, dy, dyaw)
drop = D.H * 0.47 - 0.47
for t in (0.0, DUR):
    A.pose(D, F(t), A.sit_pose())
    A.hips_offset(D, F(t), dz=-drop)
t = 0.0
while t < 10.0:
    A.pose(D, F(t), A.typing_pose(t), base=A.sit_pose())
    t += 0.25
laptop = (dx, dy - 0.42, 0.92)
A.look_at(D, 0.0, laptop)
A.blink(D, 0, DUR, seed=1)
A.expression(D, 'determined', 0.5, 0.5)

# ---- Grace at the counter preparing breakfast ----
gx, gy, gyaw = S['kitchen']
A.place(G, 1, gx, gy, gyaw)
t = 0.0
while t < 6.0:
    A.pose(G, F(t), A.work_pose(t, 2), base=A.stand_pose())
    t += 0.25
A.blink(G, 0, DUR, seed=2)
A.look_at(G, 0.0, (gx, gy + 0.6, 0.9))      # looking at the pans
# turns to Daniel: "Daniel, you're going to be late again."
A.turn(G, 6.2, 7.2, A.yaw_to((gx, gy), (dx, dy)))
A.pose(G, F(7.2), A.hands_on_hips_pose(), base=A.stand_pose())
A.look_at(G, 6.6, (dx, dy, 1.45))
A.expression(G, 'smile', 7.0, 0.5)
t_end = ctx.say(G, 's1_00_grace', 7.6, hands='none', expression_name='smile', seed=2)
# Daniel: "Mum, just five more minutes. I'm almost done." (keeps typing, glances up)
A.look_at(D, 10.4, (gx, gy, 1.5))
A.expression(D, 'smile', 10.6, 0.6)
t_end = ctx.say(D, 's1_01_daniel', 11.4, hands='none', seated=True, expression_name='smile', seed=1)
A.pose(D, F(11.0), A.hands_on_table_pose(), base=A.sit_pose())
A.look_at(D, 14.0, laptop)
t = 14.5
while t < 18.0:
    A.pose(D, F(t), A.typing_pose(t), base=A.sit_pose())
    t += 0.25
# Grace: "You've been saying five minutes since yesterday!" - walks to the table while talking
A.expression(G, 'bigSmile', 16.0, 0.7)
t_end = ctx.say(G, 's1_02_grace', 16.4, hands='right', expression_name='bigSmile', k=0.7, seed=2)
A.walk(G, 18.0, 21.5, [(gx, gy), (0.7, 1.2), (S['beside_daniel'][0], S['beside_daniel'][1])], face_end=S['beside_daniel'][2])
A.look_at(G, 18.0, (dx, dy, 1.45))
# they laugh
A.look_at(D, 20.5, (S['beside_daniel'][0], S['beside_daniel'][1], 1.5))
A.expression(D, 'laugh', 21.5, 0.9)
A.expression(G, 'laugh', 21.8, 0.9)
A.pose(D, F(21.8), A.hands_on_table_pose(), base=A.sit_pose())
t = 21.5
while t < 24.5:
    p = dict(A.sit_pose()); p.update(A.hands_on_table_pose())
    p['spine'] = (6 + math.sin(t * 7) * 2.5, 0, 0); p['head'] = (-6 + math.sin(t * 7) * 3, 0, 0)
    A.pose(D, F(t), p)
    q = dict(A.stand_pose()); q['spine'] = (3 + math.sin(t * 6.5) * 2.5, 0, 0); q['head'] = (-8 + math.sin(t * 6.5) * 3, 0, 0)
    A.pose(G, F(t), q)
    t += 0.15
A.sfx('sigh', 24.4, 0.3)
A.expression(D, 'smile', 24.8, 0.6)
A.expression(G, 'smile', 24.8, 0.6)
# Grace, hand on his shoulder: the promise
A.pose(G, F(25.5), A.hand_on_shoulder_pose('R'), base=A.stand_pose())
A.expression(G, 'proud', 26.0, 0.8)
A.look_at(D, 26.0, (S['beside_daniel'][0], S['beside_daniel'][1], 1.5))
t_end = ctx.say(G, 's1_03_grace', 26.6, hands='none', expression_name='proud', seed=2)   # ~10 s
A.expression(D, 'listening', 27.0, 0.7)
A.expression(D, 'sad', 33.0, 0.4)
# Daniel: "I promise."
A.expression(D, 'determined', 37.2, 0.9)
A.pose(D, F(37.6), {'head': (6, 0, 0), 'neck': (3, 0, 0)}, base=dict(A.sit_pose(), **A.hands_on_table_pose()))
A.pose(D, F(38.1), {'head': (-2, 0, 0)}, base=dict(A.sit_pose(), **A.hands_on_table_pose()))
t_end = ctx.say(D, 's1_04_daniel', 37.8, hands='none', seated=True, expression_name='determined', seed=1)
A.expression(D, 'smile', 39.6, 0.8)
A.expression(G, 'bigSmile', 39.4, 0.9)
A.pose(G, F(40.5), A.stand_pose())
# Grace pats his shoulder, goes back to the kitchen; Daniel back to the laptop
A.walk(G, 41.0, 44.5, [(S['beside_daniel'][0], S['beside_daniel'][1]), (0.7, 1.2), (gx, gy)], face_end=gyaw)
A.look_at(D, 41.5, laptop)
t = 41.5
while t < DUR:
    A.pose(D, F(t), A.typing_pose(t), base=A.sit_pose())
    t += 0.25
A.idle(G, 0, 0)  # no-op placeholder

# ---- camera ----
cam = ctx.cam
cam.shot(0.0, 6.4, (2.4, -2.2, 1.75), (-0.5, 0.7, 1.0), fov=44, end_pos=(1.7, -1.5, 1.55), end_look=(-0.6, 0.6, 1.05))       # establishing push-in
cam.shot(6.4, 10.6, (0.1, -0.2, 1.45), (gx, gy, 1.45), fov=32, end_pos=(0.15, 0.0, 1.45))                                        # Grace at the counter
cam.shot(10.6, 15.0, (-0.55, -0.75, 1.3), (dx, dy - 0.05, 1.42), fov=30)                                                           # Daniel answers, across the table
cam.shot(15.0, 18.0, (-1.0, 0.1, 1.5), (gx, gy, 1.45), fov=34, end_pos=(-0.8, 0.2, 1.5))                                           # Grace "since yesterday"
cam.shot(18.0, 22.0, (2.3, -1.8, 1.6), (-0.3, 0.6, 1.2), fov=42, end_pos=(1.9, -1.6, 1.55), end_look=(-0.5, 0.5, 1.2))             # she walks over
cam.shot(22.0, 25.5, (-2.4, -1.5, 1.5), (-0.7, 0.4, 1.3), fov=38)                                                                  # two-shot laughing
cam.shot(25.5, 31.5, (-1.5, -0.7, 1.45), (S['beside_daniel'][0] - 0.05, S['beside_daniel'][1], 1.42), fov=30, end_pos=(-1.35, -0.6, 1.45))   # CU Grace, the promise
cam.shot(31.5, 37.4, (-2.2, -1.0, 1.4), (-0.75, 0.5, 1.3), fov=34, end_pos=(-2.0, -0.9, 1.4))                                      # two-shot, Daniel listening
cam.shot(37.4, 40.4, (-0.5, -0.65, 1.35), (dx, dy - 0.05, 1.42), fov=27, end_pos=(-0.45, -0.58, 1.36))                             # ECU Daniel "I promise."
cam.shot(40.4, 45.0, (2.6, -2.3, 1.7), (-0.5, 0.6, 1.05), fov=44, end_pos=(2.2, -2.0, 1.65))                                        # wide, Grace returns to the kitchen
ctx.finish()
