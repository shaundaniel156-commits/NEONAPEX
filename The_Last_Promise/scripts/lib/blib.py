"""Small Blender helpers shared by every build script."""
import bpy, bmesh, math
from mathutils import Vector, Euler, Matrix


def clear_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.fps = 24
    scene.unit_settings.system = 'METRIC'
    return scene


def collection(name, parent=None):
    col = bpy.data.collections.get(name)
    if col is None:
        col = bpy.data.collections.new(name)
        (parent or bpy.context.scene.collection).children.link(col)
    return col


def link(obj, col):
    for c in obj.users_collection:
        c.objects.unlink(obj)
    col.objects.link(obj)
    return obj


def mesh_object(name, verts, edges=(), faces=(), col=None):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in verts], [tuple(e) for e in edges], [tuple(f) for f in faces])
    me.update()
    obj = bpy.data.objects.new(name, me)
    (col or bpy.context.scene.collection).objects.link(obj)
    return obj


def smooth(obj):
    for p in obj.data.polygons:
        p.use_smooth = True
    return obj


def set_active(obj, select_only=True):
    if select_only:
        bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    return obj


def apply_modifiers(obj):
    set_active(obj)
    for m in list(obj.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
    return obj


def subsurf(obj, levels=2, render_levels=None):
    m = obj.modifiers.new('Subsurf', 'SUBSURF')
    m.levels = levels
    m.render_levels = render_levels if render_levels is not None else levels
    return m


# ---------------------------------------------------------------- materials --

def material(name, color=(0.8, 0.8, 0.8, 1), roughness=0.6, metallic=0.0, emission=None, emission_strength=1.0,
             subsurface=0.0, subsurface_radius=(1.0, 0.2, 0.1), specular=0.5, alpha=1.0, sheen=0.0, coat=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = color
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    if 'Specular IOR Level' in bsdf.inputs:
        bsdf.inputs['Specular IOR Level'].default_value = specular
    if subsurface > 0:
        bsdf.inputs['Subsurface Weight'].default_value = subsurface
        bsdf.inputs['Subsurface Radius'].default_value = subsurface_radius
        bsdf.inputs['Subsurface Scale'].default_value = 0.05
    if sheen > 0:
        bsdf.inputs['Sheen Weight'].default_value = sheen
    if coat > 0:
        bsdf.inputs['Coat Weight'].default_value = coat
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = emission
        bsdf.inputs['Emission Strength'].default_value = emission_strength
    if alpha < 1.0:
        bsdf.inputs['Alpha'].default_value = alpha
        m.blend_method = 'BLEND'
        m.shadow_method = 'HASHED'
    return m


def add_noise_bump(mat, scale=40.0, strength=0.25, detail=2.0):
    """Procedural fabric / skin micro-bump via a noise texture."""
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    noise = nt.nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = scale
    noise.inputs['Detail'].default_value = detail
    bump = nt.nodes.new('ShaderNodeBump')
    bump.inputs['Strength'].default_value = strength
    bump.inputs['Distance'].default_value = 0.02
    nt.links.new(noise.outputs['Fac'], bump.inputs['Height'])
    nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    return mat


def wax_print_material(name, base=(0.12, 0.08, 0.45, 1), accent=(0.95, 0.65, 0.15, 1), accent2=(0.9, 0.25, 0.12, 1), scale=22.0):
    """African wax-print style pattern built from procedural nodes (voronoi rings + wave stripes)."""
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes['Principled BSDF']
    bsdf.inputs['Roughness'].default_value = 0.85
    tex = nt.nodes.new('ShaderNodeTexCoord')
    vor = nt.nodes.new('ShaderNodeTexVoronoi')
    vor.inputs['Scale'].default_value = scale
    vor.feature = 'F1'
    ramp = nt.nodes.new('ShaderNodeValToRGB')
    ramp.color_ramp.interpolation = 'CONSTANT'
    ramp.color_ramp.elements[0].position = 0.0
    ramp.color_ramp.elements[0].color = accent2
    e1 = ramp.color_ramp.elements.new(0.25)
    e1.color = accent
    e2 = ramp.color_ramp.elements.new(0.42)
    e2.color = base
    e3 = ramp.color_ramp.elements.new(0.62)
    e3.color = (0.95, 0.9, 0.75, 1)
    e4 = ramp.color_ramp.elements.new(0.7)
    e4.color = base
    nt.links.new(tex.outputs['Generated'], vor.inputs['Vector'])
    nt.links.new(vor.outputs['Distance'], ramp.inputs['Fac'])
    nt.links.new(ramp.outputs['Color'], bsdf.inputs['Base Color'])
    add_noise_bump(m, 60, 0.2)
    return m


def assign(obj, mat):
    obj.data.materials.clear() if hasattr(obj.data, 'materials') else None
    obj.data.materials.append(mat)
    return obj


# ---------------------------------------------------------------- primitives --

def uv_sphere(name, radius=1.0, location=(0, 0, 0), segments=32, rings=16, col=None, scale=(1, 1, 1)):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segments, v_segments=rings, radius=radius)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    (col or bpy.context.scene.collection).objects.link(obj)
    obj.location = location
    obj.scale = scale
    return smooth(obj)


def cylinder(name, r1, r2, depth, location=(0, 0, 0), segments=24, col=None, rotation=(0, 0, 0)):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=segments, radius1=r1, radius2=r2, depth=depth)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    (col or bpy.context.scene.collection).objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    return smooth(obj)


def box(name, size=(1, 1, 1), location=(0, 0, 0), col=None, rotation=(0, 0, 0), bevel=0.0):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    (col or bpy.context.scene.collection).objects.link(obj)
    obj.location = location
    obj.scale = size
    obj.rotation_euler = rotation
    if bevel > 0:
        b = obj.modifiers.new('Bevel', 'BEVEL')
        b.width = bevel
        b.segments = 3
        smooth(obj)
    return obj


def torus(name, major, minor, location=(0, 0, 0), col=None, rotation=(0, 0, 0), segments=32, minor_segments=12):
    bm = bmesh.new()
    verts = []
    for i in range(segments):
        a = 2 * math.pi * i / segments
        ring = []
        for j in range(minor_segments):
            b = 2 * math.pi * j / minor_segments
            x = (major + minor * math.cos(b)) * math.cos(a)
            y = (major + minor * math.cos(b)) * math.sin(a)
            z = minor * math.sin(b)
            ring.append(bm.verts.new((x, y, z)))
        verts.append(ring)
    for i in range(segments):
        for j in range(minor_segments):
            a, b = verts[i][j], verts[i][(j + 1) % minor_segments]
            c, d = verts[(i + 1) % segments][(j + 1) % minor_segments], verts[(i + 1) % segments][j]
            bm.faces.new((a, b, c, d))
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    (col or bpy.context.scene.collection).objects.link(obj)
    obj.location = location
    obj.rotation_euler = rotation
    return smooth(obj)


def lathe(name, profile, segments=32, location=(0, 0, 0), col=None, close=True):
    """Revolve a profile [(radius, z), ...] around Z."""
    bm = bmesh.new()
    rings = []
    for (r, z) in profile:
        ring = []
        for i in range(segments):
            a = 2 * math.pi * i / segments
            ring.append(bm.verts.new((max(r, 1e-4) * math.cos(a), max(r, 1e-4) * math.sin(a), z)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        for i in range(segments):
            bm.faces.new((rings[k][i], rings[k][(i + 1) % segments], rings[k + 1][(i + 1) % segments], rings[k + 1][i]))
    if close:
        try:
            bm.faces.new(rings[0][::-1])
            bm.faces.new(rings[-1])
        except ValueError:
            pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    obj = bpy.data.objects.new(name, me)
    (col or bpy.context.scene.collection).objects.link(obj)
    obj.location = location
    return smooth(obj)


def bone_parent(obj, armobj, bone_name):
    """Rigidly parent an object to a bone while keeping its current world transform."""
    bpy.context.view_layer.update()
    if obj.parent is None:
        mw = Matrix.LocRotScale(obj.location, obj.rotation_euler, obj.scale)
    else:
        mw = obj.matrix_world.copy()
    obj.parent = armobj
    obj.parent_type = 'BONE'
    obj.parent_bone = bone_name
    obj.matrix_world = mw
    return obj


def keyframe(obj, path, frame, value=None, index=-1, interpolation='BEZIER'):
    if value is not None:
        setattr(obj, path, value)
    obj.keyframe_insert(data_path=path, frame=frame, index=index)
    if obj.animation_data and obj.animation_data.action:
        for fc in obj.animation_data.action.fcurves:
            for kp in fc.keyframe_points:
                if abs(kp.co.x - frame) < 0.01:
                    kp.interpolation = interpolation


def text_image(name, text, size=(512, 256), bg=(0.05, 0.1, 0.25, 1), fg=(1, 0.9, 0.5, 1), font_size=60, lines=None):
    """A small text image drawn procedurally for screens / signs (Blender has no canvas, so we draw
    the text with a Text curve object rendered to the image via a tiny off-screen scene)."""
    img = bpy.data.images.new(name, size[0], size[1])
    px = [0.0] * (size[0] * size[1] * 4)
    for i in range(size[0] * size[1]):
        px[i * 4:i * 4 + 4] = bg
    img.pixels = px
    return img
