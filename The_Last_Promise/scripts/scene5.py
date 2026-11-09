"""SCENE 5 - THE FINAL ATTEMPT (03:28-04:27). Daniel's home, early morning."""
import os, sys, math
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'scripts', 'lib'))
from scenebase import SceneContext
import anim as A, env_home as HOME

DUR = 59.0
ctx = SceneContext('scene5', DUR, 'home', 'dawn')
D, G, Bn = ctx.daniel, ctx.grace, ctx.brian
S = ctx.S
F = A.F
A.ambience('room_tone', 0, DUR, 0.4)
A.music('resolve', 0.5, 50, 0.2)
A.music('triumph', 50, DUR, 0.26)
A.sfx('door', 2.4, 0.5); A.sfx('typing_bed', 12.0, 0.3); A.sfx('typing_bed', 32.0, 0.3)
A.sfx('notification', 49.6, 0.5); A.sfx('success', 50.3, 0.6); A.sfx('cheer', 52.6, 0.4)
HOME.screen_color(1.0, (0.0, 0.0, 0.0, 1), 0.0)                    # Daniel's old laptop is dead
brian_laptop = HOME.add_laptop('brian_laptop', -1.0, 0.15, 180, visible_from=9.0, silver=True)
HOME.screen_color(50.2, (0.2, 0.9, 0.4, 1), 2.0, name='brian_laptop_screen')
dead = HOME.add_laptop('dead_laptop', -1.65, -0.25, 25, visible_from=None)
# the built-in home laptop is replaced by the dead one, so hide it
import bpy
for n in ('laptop_base', 'laptop_lid', 'laptop_screen'):
    bpy.data.objects[n].hide_render = True
for r in range(4):
    for c in range(11):
        bpy.data.objects[f'key{r}{c}'].hide_render = True
HOME.clock_hand(12.0, 50.0, 2.0)

chair, side = S['daniel_chair'], S['side_chair']
# ---- Daniel at the table, tired, with his notebook ----
A.place(D, 1, chair[0], chair[1], chair[2])
drop = D.H * 0.47 - 0.47
for t in (0.0, 52.0):
    A.pose(D, F(t), A.sit_pose())
    A.hips_offset(D, F(t), dz=-drop)
A.pose(D, F(0.5), A.slump_pose(), base=A.sit_pose())
A.expression(D, 'tired', 0.5, 0.8)
A.look_at(D, 0.0, (chair[0], chair[1] - 0.4, 0.8))
A.blink(D, 0, DUR, seed=1)
A.blink(Bn, 0, DUR, seed=3)
A.blink(G, 0, DUR, seed=2)
# ---- Brian arrives with his laptop ----
A.place(Bn, 1, S['door_outside'][0], S['door_outside'][1], 0)
HOME.open_door(2.0, 3.2)
A.walk(Bn, 2.6, 8.4, [S['door_outside'][:2], S['doorway'][:2], (0.2, -1.6), (-1.6, -1.3), (-2.4, -0.3)], face_end=side[2])
t = 2.6
while t < 8.4:
    A.pose(Bn, F(t), A.carry_pose(), base=None)
    t += 0.5
A.look_at(Bn, 2.6, (chair[0], chair[1], 1.45))
A.expression(Bn, 'bigSmile', 3.0, 0.8)
A.look_at(D, 3.0, (S['doorway'][0], S['doorway'][1], 1.5))
A.expression(D, 'surprised', 3.2, 0.5)
A.expression(D, 'smile', 5.5, 0.7)
# BRIAN: "Move over, genius. We're not losing this competition today."
A.place(Bn, F(8.8), side[0], side[1], side[2])
t = ctx.say(Bn, 's5_00_brian', 6.8, hands='none', expression_name='bigSmile', seed=3)
A.pose(Bn, F(9.0), A.stand_pose())
# Brian sits on the side chair, both work
for tt in (9.6, 52.0):
    A.pose(Bn, F(tt), A.sit_pose())
    A.hips_offset(Bn, F(tt), dz=-(Bn.H * 0.47 - 0.47))
A.look_at(D, 9.5, (-1.0, 0.17, 0.92))
A.look_at(Bn, 9.5, (-1.0, 0.17, 0.92))
t = 10.5
while t < 49.0:
    A.pose(D, F(t), A.typing_pose(t), base=A.sit_pose())
    phase = int(t / 6) % 3
    if phase == 0:
        A.pose(Bn, F(t), A.point_pose('R', pitch=20, yaw=-30), base=A.sit_pose())
    elif phase == 1:
        A.pose(Bn, F(t), A.hold_phone_pose('L', 0.2), base=A.sit_pose())
    else:
        A.pose(Bn, F(t), A.explain_pose(t, 0.4), base=A.sit_pose())
    t += 0.25
A.expression(D, 'determined', 11.0, 0.8)
A.expression(Bn, 'determined', 11.0, 0.6)
A.expression(D, 'tired', 30.0, 0.5)
A.expression(D, 'determined', 40.0, 0.8)
A.look_at(D, 20.0, (-1.95, -0.1, 1.45)); A.look_at(D, 22.0, (-1.0, 0.17, 0.92))
A.look_at(Bn, 30.0, (chair[0], chair[1], 1.45)); A.look_at(Bn, 33.0, (-1.0, 0.17, 0.92))
# the submission
A.pose(D, F(49.2), {'upper_arm.R': (-35, 0, 8), 'forearm.R': (-75, 0, -20), 'hand.R': (-10, 0, 0), 'index.R': (0, 0, 0)}, base=A.sit_pose())
A.pose(D, F(49.8), {'hand.R': (-25, 0, 0)}, base=None)
A.expression(D, 'surprised', 50.4, 0.7)
A.expression(Bn, 'surprised', 50.6, 0.7)
A.expression(D, 'bigSmile', 51.6, 1.0)
A.expression(Bn, 'laugh', 52.0, 1.0)
# BRIAN: "WE DID IT!" - both stand and celebrate
t = ctx.say(Bn, 's5_01_brian', 52.4, hands='none', expression_name='laugh', seed=3)
A.place(Bn, F(53.4), -2.3, -0.9, 60)
A.place(D, F(53.4), -1.1, 1.05, 180 + 40)
A.hips_offset(D, F(53.4), 0); A.hips_offset(Bn, F(53.4), 0)
t = 53.4
while t < DUR:
    A.pose(Bn, F(t), A.celebrate_pose(t), base=A.stand_pose())
    A.pose(D, F(t), A.celebrate_pose(t + 1.0), base=A.stand_pose())
    A.hips_offset(D, F(t), dz=abs(math.sin(t * 5)) * 0.06)
    A.hips_offset(Bn, F(t), dz=abs(math.sin(t * 5 + 1)) * 0.06)
    t += 0.2
A.expression(D, 'laugh', 54.0, 1.0)
A.look_at(D, 53.4, (-2.3, -0.9, 1.6)); A.look_at(Bn, 53.4, (-1.1, 1.05, 1.6))
# Grace watches proudly from the doorway
A.place(G, 1, S['doorway'][0], S['doorway'][1], 180)
A.pose(G, F(1), A.stand_pose())
A.pose(G, F(50.0), {'upper_arm.L': (-20, 0, -8), 'forearm.L': (-100, -40, 20), 'hand.L': (0, -60, 0)}, base=A.stand_pose())   # hand to her chest
A.look_at(G, 44.0, (-1.3, 0.3, 1.4))
A.expression(G, 'smile', 44.0, 0.6)
A.expression(G, 'proud', 52.5, 1.0)
A.expression(G, 'cry', 56.0, 0.35)
A.fade(ctx.scene, 57.6, 59.0)

cam = ctx.cam
cam.shot(0.0, 2.6, (-0.6, -0.9, 1.3), (chair[0], chair[1] - 0.05, 1.4), fov=30, end_pos=(-0.55, -0.85, 1.3))                        # Daniel exhausted at dawn
cam.shot(2.6, 6.8, (-2.4, -2.3, 1.55), (1.0, -1.5, 1.2), fov=44, end_look=(-0.6, -0.6, 1.2))                                       # Brian in through the door with his laptop
cam.shot(6.8, 10.5, (-0.6, -0.5, 1.45), (-1.9, -0.2, 1.45), fov=32, end_pos=(-0.7, -0.55, 1.45))                                    # CU Brian: move over, genius
cam.shot(10.5, 15.0, (-2.5, -1.3, 1.55), (-1.3, 0.2, 1.15), fov=40, end_pos=(-2.3, -1.2, 1.5))                                      # two-shot working
cam.shot(15.0, 19.0, (-0.45, 0.75, 1.05), (-1.0, 0.25, 0.8), fov=32, end_pos=(-0.5, 0.7, 1.05))                                     # insert: hands typing
cam.shot(19.0, 23.0, (-0.6, -0.55, 1.35), (chair[0], chair[1] - 0.05, 1.42), fov=27, end_pos=(-0.55, -0.5, 1.35))                   # CU Daniel's face
cam.shot(23.0, 26.5, (-0.62, 0.62, 1.08), (-1.0, 0.1, 0.9), fov=28)                                                                # the laptop screen (over Daniel's shoulder)
cam.shot(26.5, 30.0, (-2.4, -0.8, 2.05), (-3.4, -0.8, 2.1), fov=24, end_pos=(-2.2, -0.8, 2.05))                                    # the clock
cam.shot(30.0, 34.5, (-1.3, -0.9, 1.45), (-1.95, -0.1, 1.42), fov=30)                                                               # CU Brian pointing
cam.shot(34.5, 39.0, (2.4, -2.2, 1.75), (-0.8, 0.3, 1.0), fov=44, end_pos=(1.8, -1.7, 1.6))                                         # wide, dawn light in the window
cam.shot(39.0, 44.0, (-0.45, 0.78, 1.0), (-1.0, 0.25, 0.8), fov=30, end_pos=(-0.5, 0.72, 1.0))                                      # hands again, faster
cam.shot(44.0, 49.0, (-0.5, -0.55, 1.35), (chair[0], chair[1] - 0.05, 1.42), fov=26, end_pos=(-0.45, -0.5, 1.35))                   # ECU Daniel, final push
cam.shot(49.0, 52.4, (-0.62, 0.62, 1.08), (-1.0, 0.1, 0.9), fov=26)                                                                # submission success screen
cam.shot(52.4, 54.0, (-0.6, -0.55, 1.45), (-1.9, -0.2, 1.45), fov=30)                                                               # Brian: WE DID IT
cam.shot(54.0, 56.8, (-3.0, -2.4, 1.7), (-1.5, 0.0, 1.2), fov=48, end_pos=(-2.7, -2.1, 1.65))                                       # celebration
cam.shot(56.8, 59.0, (1.95, -1.1, 1.45), (2.0, -2.2, 1.42), fov=30, end_pos=(1.95, -1.3, 1.45))                                     # Grace proud at the doorway
ctx.finish()
