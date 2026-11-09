"""SCENE 2 - THE OPPORTUNITY (00:45-01:35). Busy Kampala street near a school."""
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts', 'lib'))
from scenebase import SceneContext
import anim as A, env_street as ST

DUR = 50.0
ctx = SceneContext('scene2', DUR, 'street', 'day', characters=('daniel', 'brian'))
D, Bn = ctx.daniel, ctx.brian
S = ctx.S
F = A.F
ST.animate_vehicles(0, DUR)
ST.animate_people(0, DUR)
A.ambience('street_bed', 0, DUR, 0.45)
A.music('hopeful', 0.5, DUR, 0.18)
A.sfx('boda', 2.5, 0.35); A.sfx('horn', 19.5, 0.25); A.sfx('boda', 43.5, 0.3)

walk_start, meet, brian_start, brian_meet = S['walk_start'], S['meet'], S['brian_start'], S['brian_meet']
# Daniel walks home from school along the pavement
A.walk(D, 0.4, 11.0, [walk_start[:2], (4.9, 8.0), meet[:2]], face_end=0)
A.blink(D, 0, DUR, seed=1)
A.blink(Bn, 0, DUR, seed=3)
A.look_at(D, 0.0, (4.8, -20, 1.5))
# Brian runs after him
A.walk(Bn, 5.5, 10.6, [brian_start[:2], (5.1, -6.0), brian_meet[:2]], run=True, face_end=180)
A.look_at(Bn, 5.5, (meet[0], meet[1], 1.5))
A.expression(Bn, 'bigSmile', 5.5, 0.8)
# Daniel turns, surprised; Brian: "Bro! Have you seen this?..."
A.look_at(D, 9.6, (brian_meet[0], brian_meet[1], 1.55))
A.expression(D, 'surprised', 10.0, 0.7)
A.pose(Bn, F(11.2), A.show_phone_pose('R'), base=A.stand_pose())
t = ctx.say(Bn, 's2_00_brian', 11.4, hands='left', expression_name='bigSmile', k=0.9, seed=3)
A.look_at(D, 12.5, (brian_meet[0] + 0.1, brian_meet[1] + 0.35, 1.25))   # looks at the phone
# Daniel: "A scholarship? You're joking!"
A.expression(D, 'bigSmile', 17.0, 0.9)
A.look_at(D, 17.0, (brian_meet[0], brian_meet[1], 1.55))
t = ctx.say(D, 's2_01_daniel', 17.4, hands='right', expression_name='bigSmile', k=0.8, seed=1)
# Brian: "I'm serious. But there's one problem..."
A.pose(Bn, F(20.4), A.stand_pose())
A.expression(Bn, 'determined', 20.6, 0.7)
t = ctx.say(Bn, 's2_02_brian', 20.8, hands='right', expression_name='determined', k=0.7, seed=3)
# Daniel: "I don't even have enough money..."
A.expression(D, 'worried', 26.4, 0.8)
A.look_at(D, 27.0, (4.6, 0.2, 0.6))     # looks down
t = ctx.say(D, 's2_03_daniel', 27.0, hands='none', expression_name='worried', seed=1)
A.pose(D, F(27.5), A.slump_pose(), base=A.stand_pose())
A.look_at(D, 31.5, (brian_meet[0], brian_meet[1], 1.55))
# Brian: hand on shoulder, "We'll figure something out..."
A.pose(Bn, F(32.6), A.hand_on_shoulder_pose('R'), base=A.stand_pose())
A.expression(Bn, 'smile', 32.4, 0.8)
t = ctx.say(Bn, 's2_04_brian', 32.8, hands='none', expression_name='smile', seed=3)
A.expression(D, 'listening', 33.0, 0.7)
A.expression(D, 'determined', 37.6, 0.9)
A.pose(D, F(37.8), A.stand_pose())
A.pose(D, F(38.6), {'head': (6, 0, 0)}, base=A.stand_pose())
A.pose(D, F(39.2), {'head': (-3, 0, 0)}, base=A.stand_pose())
A.expression(D, 'smile', 39.5, 0.8)
A.pose(Bn, F(39.5), A.stand_pose())
# they set off together down the road
A.walk(Bn, 40.5, 49.5, [brian_meet[:2], (5.6, -3.0), (5.6, -10.0)], face_end=0)
A.walk(D, 41.0, 49.5, [meet[:2], (4.8, -3.0), (4.8, -10.0)], face_end=0)
A.look_at(D, 41.0, (4.8, -30, 1.5))
A.look_at(Bn, 41.0, (5.6, -30, 1.5))
A.fade(ctx.scene, 48.6, 50.0)

cam = ctx.cam
cam.shot(0.0, 5.6, (-1.5, 20, 3.6), (5, 2, 1.3), fov=50, end_pos=(0.5, 15, 2.6), end_look=(5, 4, 1.3))                           # establishing
cam.shot(5.6, 11.2, (3.6, 5.3, 1.5), (4.9, 7.6, 1.45), fov=36, end_pos=(3.6, -1.3, 1.5), end_look=(4.8, 1.0, 1.45))                 # tracking Daniel, Brian catching up behind
cam.shot(11.2, 17.2, (2.3, 0.3, 1.5), (4.85, 0.25, 1.35), fov=38, end_pos=(2.6, 0.2, 1.5))                                           # two-shot from the road
cam.shot(17.2, 20.6, (5.55, -1.05, 1.62), (4.75, 1.0, 1.45), fov=30)                                                                # OTS Brian -> Daniel
cam.shot(20.6, 26.8, (4.15, 1.55, 1.62), (4.95, -0.5, 1.5), fov=30, end_pos=(4.1, 1.5, 1.6))                                         # OTS Daniel -> Brian
cam.shot(26.8, 32.6, (5.5, -1.0, 1.55), (4.75, 1.0, 1.42), fov=27, end_pos=(5.4, -0.9, 1.55))                                        # CU Daniel, the fee
cam.shot(32.6, 37.6, (2.4, 0.6, 1.5), (4.85, 0.25, 1.35), fov=36, end_pos=(2.7, 0.5, 1.5))                                           # two-shot, hand on shoulder
cam.shot(37.6, 40.6, (5.45, -0.95, 1.55), (4.75, 1.0, 1.45), fov=27, end_pos=(5.3, -0.8, 1.55))                                      # CU Daniel resolve
cam.shot(40.6, 50.0, (-3.0, 2.0, 2.0), (5.2, -2.0, 1.2), fov=42, end_pos=(-2.5, 0.0, 1.9), end_look=(5.2, -6.0, 1.2))                # wide from across the road as they go
ctx.finish()
