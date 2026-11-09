"""SCENE 6 - THE REAL VICTORY (04:27-05:00). The same home, a few days later. Ends with the title card."""
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts', 'lib'))
from scenebase import SceneContext
import anim as A, env_home as HOME, blib as B
import bpy

DUR = 33.0
ctx = SceneContext('scene6', DUR, 'home', 'evening', characters=('daniel', 'grace'))
D, G = ctx.daniel, ctx.grace
S = ctx.S
F = A.F
A.ambience('room_tone', 0, 27, 0.35)
A.music('triumph', 0.3, 27.5, 0.24)
A.music('tender', 27.5, DUR, 0.26)
A.sfx('notification', 1.0, 0.5); A.sfx('chair', 3.3, 0.3) if False else None
HOME.screen_color(1.0, (0.2, 0.9, 0.4, 1), 2.0)

chair, kitchen = S['daniel_chair'], S['kitchen']
stand = (-0.35, 0.95, 90)       # Daniel stands beside the table facing +X (toward Grace)
grace_spot = (0.55, 1.05, -90)  # Grace in front of him facing -X
# ---- Daniel reads the email ----
A.place(D, 1, chair[0], chair[1], chair[2])
drop = D.H * 0.47 - 0.47
for t in (0.0, 3.4):
    A.pose(D, F(t), A.hands_on_table_pose(), base=A.sit_pose())
    A.hips_offset(D, F(t), dz=-drop)
A.look_at(D, 0.0, (chair[0], chair[1] - 0.42, 0.92))
A.blink(D, 0, DUR, seed=1); A.blink(G, 0, DUR, seed=2)
A.expression(D, 'neutral', 0.2)
A.expression(D, 'surprised', 1.4, 0.9)
A.expression(D, 'bigSmile', 2.6, 1.0)
A.pose(D, F(2.4), {'spine': (-5, 0, 0), 'head': (-6, 0, 0)}, base=dict(A.sit_pose(), **A.hands_on_table_pose()))
# stands up: "Mum! We made it!"
A.place(D, F(3.6), stand[0], stand[1], stand[2])
A.hips_offset(D, F(3.6), 0)
A.pose(D, F(3.6), A.stand_pose())
A.place(G, 1, kitchen[0], kitchen[1], kitchen[2])
A.pose(G, F(1), A.work_pose(1.0, 2), base=A.stand_pose())
A.look_at(D, 3.4, (kitchen[0], kitchen[1], 1.5))
t = 3.8
while t < 7.0:
    A.pose(D, F(t), A.celebrate_pose(t), base=A.stand_pose())
    t += 0.2
t = ctx.say(D, 's6_00_daniel', 3.9, hands='none', expression_name='bigSmile', seed=1)
# Grace turns and comes over: "I told you not to give up."
A.walk(G, 4.6, 7.0, [kitchen[:2], grace_spot[:2]], face_end=grace_spot[2])
A.look_at(G, 4.2, (stand[0], stand[1], 1.5))
A.expression(G, 'bigSmile', 4.6, 0.8)
A.pose(G, F(7.4), A.hands_on_hips_pose(), base=A.stand_pose())
t = ctx.say(G, 's6_01_grace', 7.3, hands='none', expression_name='proud', seed=2)
A.pose(D, F(7.4), A.stand_pose())
A.look_at(D, 7.0, (grace_spot[0], grace_spot[1], 1.45))
A.expression(D, 'smile', 7.4, 0.8)
# Daniel: "One day, Mum, I'll give you the life you deserve."
A.pose(D, F(10.8), {'upper_arm.R': (-25, 0, 10), 'forearm.R': (-110, 40, -15), 'hand.R': (-10, 40, 0)}, base=A.stand_pose())   # hand on his chest
A.expression(D, 'determined', 10.6, 0.6)
t = ctx.say(D, 's6_02_daniel', 10.9, hands='none', expression_name='smile', seed=1)
A.pose(G, F(11.2), A.stand_pose())
A.expression(G, 'listening', 11.0, 0.8)
# Grace: "Daniel, you've already given me something better..."
A.pose(G, F(15.4), A.hand_on_shoulder_pose('R'), base=A.stand_pose())
A.expression(G, 'proud', 15.2, 0.9)
A.expression(G, 'cry', 19.0, 0.3)
t = ctx.say(G, 's6_03_grace', 15.6, hands='none', expression_name='proud', seed=2)
A.expression(D, 'listening', 16.0, 0.7)
A.expression(D, 'cry', 20.0, 0.35)
A.expression(D, 'smile', 22.5, 0.9)
A.pose(D, F(15.6), A.stand_pose())
# They hug; the camera pulls away; narration
A.pose(D, F(23.4), A.hug_pose(1), base=A.stand_pose())
A.pose(G, F(23.6), A.hug_pose(-1), base=A.stand_pose())
A.place(D, F(23.4), stand[0] + 0.1, stand[1], stand[2])
A.place(G, F(23.4), grace_spot[0] - 0.1, grace_spot[1], grace_spot[2])
A.expression(G, 'smile', 24.0, 0.9)
narr = ctx.lines['s6_04_narrator']
A.TIMING['dialogue'].append({'id': narr['id'], 'speaker': 'Narrator', 'text': narr['text'], 'file': narr['file'], 't': 22.6, 'duration': narr['duration']})
A.fade(ctx.scene, 26.0, 27.4)
# ---- title card (a black box far below the set, white text, fading in) ----
tcol = B.collection('Title')
back = B.assign(B.box('title_back', (12, 0.1, 7), (0, 2, -60), tcol), B.material('title_black', (0, 0, 0, 1), roughness=1))
def text_obj(name, text, size, z):
    cu = bpy.data.curves.new(name, 'FONT')
    cu.body = text
    cu.size = size
    cu.align_x = 'CENTER'
    cu.extrude = 0.004
    o = bpy.data.objects.new(name, cu)
    tcol.objects.link(o)
    o.location = (0, 1.9, z)
    o.rotation_euler = (math.radians(90), 0, 0)
    o.data.materials.append(B.material(name + '_m', (1, 1, 1, 1), roughness=0.5, emission=(1, 0.92, 0.75, 1), emission_strength=2.5))
    return o
text_obj('title_main', 'THE LAST PROMISE', 0.42, -59.6)
text_obj('title_sub', 'A STORY ABOUT LOVE, SACRIFICE AND NEVER GIVING UP.', 0.13, -60.4)
A.fade(ctx.scene, 27.8, 29.0, to_black=False)
A.fade(ctx.scene, 31.6, 33.0)

cam = ctx.cam
cam.shot(0.0, 3.4, (-0.62, 0.62, 1.08), (-1.0, 0.1, 0.9), fov=26, end_pos=(-0.45, -0.45, 1.3), end_look=(-1.0, 0.5, 1.4))         # email on the screen, then Daniel's face
cam.shot(3.4, 7.2, (1.8, -1.4, 1.55), (-0.3, 0.9, 1.3), fov=42, end_pos=(1.5, -1.1, 1.5))                                           # Mum! We made it!
cam.shot(7.2, 10.8, (-0.5, 0.0, 1.45), (0.55, 1.05, 1.42), fov=30, end_pos=(-0.45, 0.05, 1.45))                                      # CU Grace (she faces -X)
cam.shot(10.8, 15.4, (0.95, 0.15, 1.45), (-0.35, 0.95, 1.45), fov=30, end_pos=(0.9, 0.2, 1.45))                                      # CU Daniel: the life you deserve
cam.shot(15.4, 22.6, (-0.55, 0.05, 1.45), (0.55, 1.05, 1.42), fov=28, end_pos=(-0.5, 0.1, 1.45))                                     # CU Grace: a reason to believe
cam.shot(22.6, 27.4, (1.0, -1.2, 1.5), (0.1, 1.0, 1.25), fov=40, end_pos=(2.8, -2.6, 1.9), end_look=(0.1, 1.0, 1.1))                 # the hug, slow pull away
cam.shot(27.4, 33.0, (0, -6.0, -60), (0, 2, -60), fov=40)                                                                           # title card
ctx.finish()
