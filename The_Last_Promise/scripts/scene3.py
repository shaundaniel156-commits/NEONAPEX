"""SCENE 3 - THE SACRIFICE (01:35-02:25). Busy local market."""
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts', 'lib'))
from scenebase import SceneContext
import anim as A, env_market as MK

DUR = 50.0
ctx = SceneContext('scene3', DUR, 'market', 'afternoon', characters=('daniel', 'grace'))
D, G = ctx.daniel, ctx.grace
S = ctx.S
F = A.F
MK.animate_people(0, DUR)
A.ambience('market_bed', 0, DUR, 0.45)
A.music('warm', 0.5, 24, 0.16)
A.music('tender', 24, DUR, 0.22)
A.sfx('coin', 23.8, 0.35)

stall, cust = S['grace_stall'], S['customer']
tin = MK.TIN
# Grace at her stall arranging tomatoes, counting coins from the tin
A.place(G, 1, stall[0], stall[1], stall[2])
t = 0.0
while t < 4.0:
    A.pose(G, F(t), A.work_pose(t, 4), base=A.stand_pose())
    t += 0.25
A.look_at(G, 0.0, (2.6, -1.5, 0.85))
# counting her small earnings
A.pose(G, F(4.6), {'spine': (18, 0, 0), 'neck': (12, 0, 0), 'head': (10, 0, 0), 'upper_arm.R': (-40, 0, 6), 'forearm.R': (-60, 0, 0), 'hand.R': (-20, 40, 0), 'upper_arm.L': (-35, 0, -6), 'forearm.L': (-70, -20, 0), 'hand.L': (-10, -30, 0)}, base=A.stand_pose())
A.look_at(G, 4.4, (tin[0] - 0.1, tin[1], tin[2] + 0.1))
for tt in (5.2, 6.1, 7.0, 7.9):
    A.pose(G, F(tt), {'hand.R': (-20 + (8 if int(tt * 10) % 2 else -8), 40, 0)}, base=None)
A.blink(G, 0, DUR, seed=2)
A.blink(D, 0, DUR, seed=1)
# Daniel arrives through the market
A.walk(D, 2.0, 10.4, [S['walk_in'][:2], (0.3, 4.0), (1.0, 0.2), cust[:2]], face_end=cust[2])
A.look_at(D, 2.0, (stall[0], stall[1], 1.5))
A.expression(D, 'smile', 2.0, 0.5)
A.look_at(G, 8.8, (cust[0], cust[1], 1.5))
A.expression(G, 'surprised', 9.2, 0.6)
A.pose(G, F(9.6), A.stand_pose())
# Daniel explains the competition (gesturing, no scripted line here)
A.expression(D, 'bigSmile', 10.6, 0.8)
t = 10.8
while t < 14.2:
    A.pose(D, F(t), A.explain_pose(t, 0.9), base=A.stand_pose())
    t += 0.25
A.pose(D, F(14.6), A.stand_pose())
A.expression(G, 'thinking', 12.5, 0.7)
# Grace: "How much do you need?"
t = ctx.say(G, 's3_00_grace', 14.6, hands='none', expression_name='worried', seed=2)
# Daniel: "Mum, forget it. I'll find another way."
A.expression(D, 'sad', 17.3, 0.7)
A.look_at(D, 17.5, (2.6, -1.4, 0.6))
t = ctx.say(D, 's3_01_daniel', 17.6, hands='right', expression_name='sad', k=0.5, seed=1)
A.look_at(D, 21.8, (stall[0], stall[1], 1.5))
# Grace reaches into the savings tin, takes the money
A.look_at(G, 21.6, (tin[0], tin[1], tin[2]))
A.pose(G, F(22.2), {'spine': (28, 0, 0), 'neck': (10, 0, 0), 'head': (8, 0, 0), 'upper_arm.R': (-55, 0, 8), 'forearm.R': (-25, 0, 0), 'hand.R': (15, 0, 0)}, base=A.stand_pose())
A.pose(G, F(24.6), {'spine': (10, 0, 0), 'upper_arm.R': (-40, 0, 4), 'forearm.R': (-60, 0, 0), 'hand.R': (-10, 60, 0), 'index.R': (30, 0, 0), 'middle.R': (35, 0, 0), 'ring.R': (40, 0, 0), 'pinky.R': (45, 0, 0), 'thumb.R': (30, 0, 0)}, base=A.stand_pose())
A.look_at(G, 25.0, (cust[0], cust[1], 1.5))
A.expression(G, 'determined', 24.8, 0.7)
# Grace: "Take this." - holds out the money
A.pose(G, F(26.0), A.hand_over_pose('R'), base=A.stand_pose())
t = ctx.say(G, 's3_02_grace', 26.2, hands='none', expression_name='determined', seed=2)
# Daniel: "Mum, no. You need that money."
A.expression(D, 'worried', 27.8, 0.9)
A.pose(D, F(28.4), {'head': (0, 0, 12)}, base=A.stand_pose())
A.pose(D, F(28.9), {'head': (0, 0, -12)}, base=A.stand_pose())
A.pose(D, F(29.4), {'head': (0, 0, 8)}, base=A.stand_pose())
A.pose(D, F(29.9), {'head': (0, 0, 0)}, base=A.stand_pose())
t = ctx.say(D, 's3_03_daniel', 28.2, hands='right', expression_name='worried', k=0.6, seed=1)
# Grace: "Daniel, opportunities don't come every day. Go and do your best."
A.expression(G, 'proud', 32.0, 0.8)
A.pose(G, F(32.2), A.hand_over_pose('R'), base=A.stand_pose())
t = ctx.say(G, 's3_04_grace', 32.4, hands='none', expression_name='proud', seed=2)
A.expression(D, 'listening', 33.0, 0.6)
# Daniel takes the money: "I won't disappoint you."
A.pose(D, F(38.6), A.receive_pose(), base=A.stand_pose())
A.pose(G, F(39.4), A.stand_pose())
A.expression(D, 'cry', 38.8, 0.5)
A.expression(D, 'smile', 40.2, 0.8)
t = ctx.say(D, 's3_05_daniel', 39.6, hands='none', expression_name='smile', seed=1)
A.pose(D, F(41.8), A.wipe_tears_pose(0.5, 'R'), base=A.stand_pose())
A.pose(D, F(42.6), A.stand_pose())
# They hug: Grace comes round the stall
A.walk(G, 42.2, 44.8, [stall[:2], (3.4, -0.3), (2.45, -0.35)], face_end=A.yaw_to((2.45, -0.35), (1.85, -0.9)))
A.walk(D, 43.2, 44.6, [cust[:2], (1.95, -0.85)], face_end=A.yaw_to((1.95, -0.85), (2.45, -0.35)))
A.look_at(D, 43.0, (2.45, -0.35, 1.45))
A.look_at(G, 43.0, (1.95, -0.85, 1.5))
A.pose(G, F(45.4), A.hug_pose(-1), base=A.stand_pose())
A.pose(D, F(45.6), A.hug_pose(1), base=A.stand_pose())
A.expression(G, 'smile', 45.0, 0.8)
A.expression(D, 'smile', 45.0, 0.7)
A.fade(ctx.scene, 48.6, 50.0)

cam = ctx.cam
cam.shot(0.0, 4.6, (0.3, 13.0, 2.3), (0.0, -2.0, 1.1), fov=50, end_pos=(0.3, 9.0, 1.9))                                             # establishing: the market walkway
cam.shot(4.6, 9.0, (2.0, -2.9, 1.3), (3.0, -1.6, 1.0), fov=32, end_pos=(1.9, -2.7, 1.3))                                           # Grace counting coins (tin insert)
cam.shot(9.0, 10.8, (0.9, -3.0, 1.55), (1.3, 1.5, 1.45), fov=40, end_look=(1.6, -0.6, 1.45))                                        # Daniel arrives
cam.shot(10.8, 14.6, (1.3, -0.3, 1.62), (3.45, -1.5, 1.42), fov=30)                                                               # OTS Daniel -> Grace (surprised)
cam.shot(14.6, 17.6, (3.9, -2.1, 1.6), (1.85, -1.3, 1.45), fov=32)                                                                 # OTS Grace -> Daniel: how much
cam.shot(17.6, 22.0, (3.6, -2.3, 1.52), (1.85, -1.3, 1.42), fov=27, end_pos=(3.5, -2.2, 1.52))                                     # CU Daniel: forget it
cam.shot(22.0, 26.2, (2.35, -2.5, 1.15), (3.0, -1.85, 0.9), fov=30, end_pos=(2.45, -2.4, 1.12))                                    # the savings tin
cam.shot(26.2, 28.2, (1.45, -0.4, 1.58), (3.45, -1.5, 1.42), fov=28)                                                                # CU Grace: take this
cam.shot(28.2, 32.4, (2.6, 0.9, 1.4), (2.65, -1.4, 1.15), fov=38, end_pos=(2.6, 0.7, 1.4))                                         # two-shot across the stall
cam.shot(32.4, 38.6, (1.65, -0.55, 1.55), (3.45, -1.5, 1.42), fov=27, end_pos=(1.7, -0.6, 1.55))                                   # CU Grace: opportunities
cam.shot(38.6, 42.2, (3.5, -2.25, 1.52), (1.85, -1.3, 1.42), fov=27, end_pos=(3.4, -2.15, 1.5))                                    # CU Daniel: I won't disappoint you
cam.shot(42.2, 50.0, (-0.5, 2.5, 1.8), (2.2, -0.6, 1.2), fov=40, end_pos=(-1.0, 3.5, 2.0), end_look=(2.2, -0.6, 1.15))              # the hug, slow pull back
ctx.finish()
