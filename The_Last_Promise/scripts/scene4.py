"""SCENE 4 - THE UNEXPECTED PROBLEM (02:25-03:28). Daniel's bedroom at night, rain."""
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts', 'lib'))
from scenebase import SceneContext
import anim as A, env_bedroom as BD

DUR = 63.0
ctx = SceneContext('scene4', DUR, 'bedroom', 'night', characters=('daniel', 'grace'))
D, G = ctx.daniel, ctx.grace
S = ctx.S
F = A.F
BD.animate_rain(0, DUR)
BD.flash(3.4); BD.flash(36.0, 9); BD.flash(61.0, 8)
A.ambience('night_bed', 0, DUR, 0.5)
A.music('tense', 0.5, 40, 0.2)
A.music('sad', 40, DUR, 0.22)
A.sfx('thunder', 3.6, 0.7); A.sfx('thunder', 36.3, 0.5); A.sfx('thunder', 61.3, 0.6)
A.sfx('typing_bed', 0.3, 0.3)
A.sfx('laptop_crash', 12.2, 0.7); A.sfx('keypress', 13.6, 0.5); A.sfx('keypress', 13.9, 0.5); A.sfx('keypress', 14.3, 0.5)
A.sfx('keypress', 18.6, 0.5); A.sfx('keypress', 19.4, 0.5); A.sfx('phone_buzz', 21.0, 0.5); A.sfx('door', 38.2, 0.4); A.sfx('sigh', 34.0, 0.3)

chair, bed = S['desk_chair'], S['bed_sit']
laptop = BD.LAPTOP
# ---- Daniel coding at the desk ----
A.place(D, 1, chair[0], chair[1], chair[2])
drop = D.H * 0.47 - 0.47
for t in (0.0, 29.0):
    A.pose(D, F(t), A.sit_pose())
    A.hips_offset(D, F(t), dz=-drop)
t = 0.0
while t < 12.0:
    A.pose(D, F(t), A.typing_pose(t), base=A.sit_pose())
    t += 0.25
A.look_at(D, 0.0, (laptop[0], laptop[1] - 0.05, laptop[2]))
A.blink(D, 0, DUR, seed=1)
A.expression(D, 'determined', 0.5, 0.6)
# the laptop freezes and crashes
BD.screen_state(11.6, on=True, error=True)
A.expression(D, 'surprised', 11.8, 0.6)
A.pose(D, F(12.0), A.hands_on_table_pose(), base=A.sit_pose())
A.expression(D, 'shocked', 12.6, 0.9)
t = ctx.say(D, 's4_00_daniel', 12.9, hands='none', seated=True, expression_name='shocked', seed=1)
t = 13.2
while t < 16.5:
    p = A.typing_pose(t * 1.8); p['spine'] = (16, 0, 0); p['head'] = (10, 0, 0)
    A.pose(D, F(t), p, base=A.sit_pose())
    t += 0.2
BD.screen_state(16.4, on=False)
# tries restarting it
A.pose(D, F(17.2), {'spine': (12, 0, 0), 'upper_arm.R': (-45, 0, 8), 'forearm.R': (-70, 0, -10), 'hand.R': (-20, 0, 0), 'index.R': (0, 0, 0), 'middle.R': (70, 0, 0), 'ring.R': (75, 0, 0), 'pinky.R': (80, 0, 0)}, base=A.sit_pose())
A.pose(D, F(18.6), {'hand.R': (-35, 0, 0)}, base=None)
A.pose(D, F(19.0), {'hand.R': (-15, 0, 0)}, base=None)
A.pose(D, F(19.4), {'hand.R': (-35, 0, 0)}, base=None)
A.pose(D, F(20.0), A.hands_on_table_pose(), base=A.sit_pose())
A.expression(D, 'worried', 17.5, 0.9)
BD.screen_state(19.6, on=False)
# phone buzzes: Brian calls
A.look_at(D, 21.0, (0.45, laptop[1] - 0.05, 0.8))
A.pose(D, F(21.6), {'upper_arm.R': (-50, 0, 6), 'forearm.R': (-55, 0, 0), 'hand.R': (-10, 60, 0)}, base=A.sit_pose())
A.pose(D, F(22.6), A.hold_phone_pose('R', 0.9), base=A.sit_pose())
A.pose(D, F(22.6), {'upper_arm.R': (-25, 0, 4), 'forearm.R': (-135, 25, 18), 'hand.R': (-30, 20, 0), 'head': (0, 0, 10)}, base=A.sit_pose())
A.look_at(D, 22.8, (-0.8, 0.5, 1.2))
A.expression(D, 'worried', 22.6, 0.8)
# BRIAN (on the phone): "Wait. Didn't you save a backup?"
t = ctx.say(ctx.brian if ctx.brian else D, 's4_01_brian', 23.2, hands='none') if False else None
import anim as _A
_A.TIMING['dialogue'].append({'id': 's4_01_brian', 'speaker': 'Brian', 'text': ctx.lines['s4_01_brian']['text'], 'file': ctx.lines['s4_01_brian']['file'], 't': 23.2, 'duration': ctx.lines['s4_01_brian']['duration']})
# DANIEL: "I forgot..."
A.expression(D, 'sad', 26.4, 0.9)
t = ctx.say(D, 's4_02_daniel', 26.8, hands='none', seated=True, expression_name='sad', seed=1)
A.pose(D, F(28.4), A.sit_pose())
# gets up, sits on the bed, frustrated
A.walk(D, 29.2, 32.0, [(chair[0], chair[1]), (0.8, -0.3), (1.15, 0.2)], face_end=bed[2])
A.place(D, F(32.6), bed[0], bed[1], bed[2])
for tt in (32.6, DUR):
    A.pose(D, F(tt), A.sit_pose())
    A.hips_offset(D, F(tt), dz=-(D.H * 0.47 - 0.5))
A.pose(D, F(34.0), A.slump_pose(), base=A.sit_pose())
A.pose(D, F(36.5), A.face_in_hands_pose(), base=A.sit_pose())
A.look_at(D, 33.0, (0.3, 0.2, 0.3))
A.expression(D, 'disappointed', 33.0, 0.9)
A.expression(D, 'cry', 37.0, 0.6)
# Grace enters
A.place(G, 1, S['doorway'][0], S['doorway'][1], S['doorway'][2])
A.walk(G, 38.6, 41.8, [S['doorway'][:2], (-0.3, -0.5), (0.5, -0.05)], face_end=A.yaw_to((0.5, -0.05), (bed[0], bed[1])))
A.look_at(G, 38.6, (bed[0], bed[1], 1.1))
A.blink(G, 38, DUR, seed=2)
A.expression(G, 'worried', 39.0, 0.8)
# GRACE: "What's wrong?"
t = ctx.say(G, 's4_03_grace', 42.5, hands='none', expression_name='worried', seed=2)
A.pose(D, F(43.0), A.slump_pose(), base=A.sit_pose())
A.look_at(D, 43.2, (0.5, -0.05, 1.5))
# DANIEL: "I think I've ruined everything, Mum."
A.expression(D, 'cry', 44.2, 0.8)
t = ctx.say(D, 's4_04_daniel', 44.6, hands='none', seated=True, expression_name='cry', seed=1)
# Grace sits beside him / hand on shoulder and speaks
A.pose(G, F(48.0), A.hand_on_shoulder_pose('L'), base=A.stand_pose())
A.expression(G, 'proud', 48.2, 0.7)
t = ctx.say(G, 's4_05_grace', 48.6, hands='none', expression_name='proud', seed=2)      # ~10 s
A.expression(D, 'sad', 49.0, 0.7)
A.expression(D, 'listening', 54.0, 0.7)
t = ctx.say(G, 's4_06_grace', 59.0, hands='none', expression_name='determined', seed=2)
# Daniel wipes his tears, nods, gets up to return to work
A.pose(D, F(60.6), A.wipe_tears_pose(0.5, 'R'), base=A.sit_pose())
A.pose(D, F(61.6), A.sit_pose())
A.expression(D, 'determined', 61.5, 0.9)
A.pose(D, F(62.0), {'head': (8, 0, 0)}, base=None)
A.pose(D, F(62.5), {'head': (-3, 0, 0)}, base=None)
A.fade(ctx.scene, 61.8, 63.0)

cam = ctx.cam
cam.shot(0.0, 5.2, (-1.5, -1.55, 1.7), (0.3, 1.1, 1.0), fov=46, end_pos=(-1.1, -1.2, 1.55))                                        # establishing: rain, desk, Daniel
cam.shot(5.2, 11.6, (0.65, -1.75, 1.5), (0.0, 1.42, 0.95), fov=34, end_pos=(0.55, -1.6, 1.45))                                      # OTS Daniel at the laptop
cam.shot(11.6, 14.6, (0.5, 0.35, 1.0), (0.0, 1.42, 0.92), fov=30)                                                                  # the screen freezes
cam.shot(14.6, 17.2, (0.35, 0.1, 1.42), (0.0, -0.85, 1.42), fov=27)                                                                # ECU Daniel: no no no
cam.shot(17.2, 21.0, (-1.0, -0.2, 1.35), (0.0, -0.75, 1.3), fov=34, end_pos=(-0.9, -0.1, 1.35))                                     # restart attempt
cam.shot(21.0, 29.2, (0.7, -0.05, 1.42), (0.0, -0.85, 1.42), fov=30, end_pos=(0.6, 0.0, 1.42))                                      # the phone call
cam.shot(29.2, 34.0, (-1.6, -1.6, 1.7), (0.9, -0.2, 1.0), fov=44, end_look=(1.3, 0.2, 1.0))                                        # to the bed
cam.shot(34.0, 38.6, (0.3, 0.45, 1.15), (1.45, 0.2, 1.08), fov=32, end_pos=(0.35, 0.4, 1.12))                                       # slumped on the bed
cam.shot(38.6, 42.5, (0.6, 1.4, 1.7), (-0.6, -0.9, 1.2), fov=44, end_look=(0.2, -0.3, 1.2))                                        # Grace enters
cam.shot(42.5, 44.5, (1.15, 0.7, 1.5), (0.5, -0.05, 1.42), fov=30)                                                                 # CU Grace: what's wrong
cam.shot(44.5, 48.4, (0.3, 0.55, 1.12), (1.45, 0.2, 1.08), fov=28)                                                                 # CU Daniel: ruined everything
cam.shot(48.4, 59.0, (-0.4, -1.6, 1.5), (0.95, 0.05, 1.15), fov=38, end_pos=(-0.2, -1.4, 1.45))                                     # two-shot, her words
cam.shot(59.0, 61.6, (1.15, 0.72, 1.5), (0.5, -0.05, 1.42), fov=28)                                                                # CU Grace: one bad night
cam.shot(61.6, 63.0, (0.35, 0.5, 1.12), (1.45, 0.2, 1.08), fov=30)                                                                 # Daniel wipes his tears
ctx.finish()
