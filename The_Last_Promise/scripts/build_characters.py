"""Build Daniel, Grace and Brian, save blender/characters.blend and render a line-up still.
Run:  xvfb-run -a blender -b --python scripts/build_characters.py -- [width] [height]
"""
import bpy, sys, os, math
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'lib'))
import blib as B
import charlib as C

argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
W, H = (int(argv[0]), int(argv[1])) if len(argv) >= 2 else (1280, 720)

scene = B.clear_scene()
chars = {}
for i, (name, x) in enumerate((('Brian', -1.1), ('Grace', 0.0), ('Daniel', 1.1))):
    ch = C.build_character(C.SPECS[name], B.collection(name), (x, 0, 0))
    chars[name] = ch

# a few test poses / expressions so the still shows the controls working
C.expression(chars['Daniel'], 'smile', None)
C.expression(chars['Grace'], 'proud', None)
C.expression(chars['Brian'], 'bigSmile', None)
for ch in chars.values():
    C.look_at(ch, 1, (0.4, -4.0, 1.5))
C.rotate_bone(chars['Daniel'], 'upper_arm.R', x=-70, z=-10)
C.rotate_bone(chars['Daniel'], 'forearm.R', x=-60)
C.rotate_bone(chars['Brian'], 'upper_arm.L', x=-40, z=30)
C.rotate_bone(chars['Brian'], 'forearm.L', x=-90)
for fn in ('index', 'middle', 'ring', 'pinky'):
    C.rotate_bone(chars['Grace'], f'{fn}.L', x=60)
    C.rotate_bone(chars['Grace'], f'{fn}.R', x=20)

# set
floor = B.box('floor', (12, 12, 0.05), (0, 0, -0.025))
B.assign(floor, B.material('floor', (0.32, 0.22, 0.14, 1), roughness=0.8))
wall = B.box('wall', (12, 0.1, 4), (0, 1.5, 2))
B.assign(wall, B.material('wall', (0.72, 0.68, 0.58, 1), roughness=0.95))

def light(name, kind, loc, energy, color=(1, 1, 1), size=1.0):
    d = bpy.data.lights.new(name, kind)
    d.energy = energy
    d.color = color
    if kind == 'AREA':
        d.size = size
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.location = loc
    return o
key = light('key', 'AREA', (2.5, -3.5, 3.2), 900, (1, 0.93, 0.85), 2.5)
key.rotation_euler = (math.radians(55), 0, math.radians(35))
fill = light('fill', 'AREA', (-3, -3.5, 2.0), 350, (0.85, 0.9, 1.0), 3.0)
fill.rotation_euler = (math.radians(65), 0, math.radians(-40))
rim = light('rim', 'SPOT', (0, 2.5, 3.0), 600, (1, 0.95, 0.9))
rim.rotation_euler = (math.radians(-130), 0, 0)
sun = light('sun', 'SUN', (0, 0, 5), 1.5)
sun.rotation_euler = (math.radians(50), 0, math.radians(20))
sun.data.use_shadow = True

cam_d = bpy.data.cameras.new('cam')
cam_d.lens = 45
cam = bpy.data.objects.new('cam', cam_d)
scene.collection.objects.link(cam)
cam.location = (0.3, -4.4, 1.35)
cam.rotation_euler = (math.radians(86), 0, math.radians(3))
scene.camera = cam
world = bpy.data.worlds.new('world')
scene.world = world
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.35, 0.4, 0.5, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.5

scene.render.engine = 'BLENDER_EEVEE'
scene.eevee.taa_render_samples = 24
scene.eevee.use_gtao = True
scene.eevee.use_bloom = True
scene.eevee.bloom_intensity = 0.03
scene.eevee.use_soft_shadows = True
scene.eevee.use_ssr = True
scene.eevee.shadow_cube_size = '1024'
scene.eevee.shadow_cascade_size = '2048'
scene.render.resolution_x, scene.render.resolution_y = W, H
scene.view_settings.view_transform = 'Filmic'
scene.view_settings.look = 'Medium Contrast'
os.makedirs(os.path.join(ROOT, 'blender'), exist_ok=True)
os.makedirs(os.path.join(ROOT, 'renders', 'tests'), exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'blender', 'characters.blend'))
scene.render.filepath = os.path.join(ROOT, 'renders', 'tests', 'lineup.png')
bpy.ops.render.render(write_still=True)
print('LINEUP_DONE', scene.render.filepath)
# face close-ups
for name, x in (('Grace', 0.0), ('Daniel', 1.1)):
    hc = chars[name].arm.matrix_world @ chars[name].head_center
    cam.location = (x + 0.22, -0.72, hc.z + 0.01)
    cam.rotation_euler = (math.radians(90), 0, math.radians(18))
    cam_d.lens = 70
    scene.render.filepath = os.path.join(ROOT, 'renders', 'tests', f'face_{name}.png')
    bpy.ops.render.render(write_still=True)
    print('FACE_DONE', scene.render.filepath)
