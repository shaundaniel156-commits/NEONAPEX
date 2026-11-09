"""Cinematic camera and render settings."""
import bpy, math
from mathutils import Vector
from anim import F


class Camera:
    def __init__(self, scene, name='FilmCamera'):
        self.scene = scene
        cam = bpy.data.cameras.new(name)
        cam.lens_unit = 'FOV'
        cam.dof.use_dof = True
        cam.dof.aperture_fstop = 2.8
        self.obj = bpy.data.objects.new(name, cam)
        scene.collection.objects.link(self.obj)
        self.target = bpy.data.objects.new(name + '_target', None)
        scene.collection.objects.link(self.target)
        c = self.obj.constraints.new('TRACK_TO')
        c.target = self.target
        c.track_axis = 'TRACK_NEGATIVE_Z'
        c.up_axis = 'UP_Y'
        cam.dof.focus_object = self.target
        scene.camera = self.obj

    def _key(self, t, pos, look, fov, fr=None):
        fr = F(t) if fr is None else fr
        self.obj.location = pos
        self.obj.keyframe_insert('location', frame=fr)
        self.target.location = look
        self.target.keyframe_insert('location', frame=fr)
        self.obj.data.angle = math.radians(fov)
        self.obj.data.keyframe_insert('lens', frame=fr)

    def shot(self, t0, t1, pos, look, fov=40, end_pos=None, end_look=None, handheld=0.0):
        """A shot from t0 to t1 (cut at both ends). Optional slow move to end_pos / end_look."""
        self._key(t0, pos, look, fov, fr=F(t0))
        self._key(t1, end_pos or pos, end_look or look, fov, fr=max(F(t0) + 1, F(t1) - 1))
        self.last_end = F(t1)
        # constant interpolation would be wrong for moves; we keep bezier but make cuts hard by
        # keying the next shot one frame later.
        for fc in (self.obj.animation_data.action.fcurves if self.obj.animation_data else []):
            for kp in fc.keyframe_points:
                kp.interpolation = 'LINEAR' if end_pos or end_look else 'LINEAR'
        if self.target.animation_data:
            for fc in self.target.animation_data.action.fcurves:
                for kp in fc.keyframe_points:
                    kp.interpolation = 'LINEAR'


def render_settings(scene, w, h, duration, filepath, samples=None, quality='preview'):
    scene.render.engine = 'BLENDER_EEVEE'
    scene.render.resolution_x, scene.render.resolution_y = w, h
    scene.render.fps = 24
    scene.frame_start = 1
    scene.frame_end = F(duration)
    scene.render.filepath = filepath
    scene.render.image_settings.file_format = 'PNG'
    scene.render.image_settings.color_mode = 'RGB'
    scene.render.image_settings.compression = 50
    ev = scene.eevee
    if w >= 1600:      # final
        ev.taa_render_samples = samples or 16
        ev.shadow_cube_size = '1024'; ev.shadow_cascade_size = '2048'
        ev.use_soft_shadows = True
        ev.use_gtao = True; ev.use_ssr = True
    elif w >= 1000:    # 720p
        ev.taa_render_samples = samples or 8
        ev.shadow_cube_size = '512'; ev.shadow_cascade_size = '1024'
        ev.use_soft_shadows = False
        ev.use_gtao = True; ev.use_ssr = False
    else:              # preview
        ev.taa_render_samples = samples or 4
        ev.shadow_cube_size = '512'; ev.shadow_cascade_size = '512'
        ev.use_soft_shadows = False
        ev.use_gtao = False; ev.use_ssr = False
    ev.gtao_distance = 0.4
    ev.use_bloom = True
    ev.bloom_intensity = 0.04
    ev.bloom_threshold = 1.2
    ev.use_motion_blur = False
    scene.view_settings.view_transform = 'Filmic'
    scene.view_settings.look = 'Medium Contrast'
    scene.view_settings.exposure = -0.1
