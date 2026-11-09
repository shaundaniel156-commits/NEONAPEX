"""Shared scene runner: builds the set and the three characters, loads dialogue timings,
applies render settings, saves the .blend, writes timing.json and renders on request.

Usage inside a scene script:
    ctx = SceneContext('scene1', duration=45, env='home', preset='morning')
    ... ctx.daniel / ctx.grace / ctx.brian / ctx.cam / ctx.lines ...
    ctx.finish()
CLI:  xvfb-run -a blender -b --python scripts/scene1.py -- [W H] [render] [frames=1,2,3] [timing]
"""
import bpy, sys, os, json, math
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
sys.path.insert(0, os.path.join(ROOT, 'scripts', 'lib'))
import blib as B, charlib as C, anim as A
from cinema import Camera, render_settings


class SceneContext:
    def __init__(self, name, duration, env, preset, characters=('daniel', 'grace', 'brian')):
        self.name = name
        self.duration = duration
        argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
        self.argv = argv
        nums = [a for a in argv if a.isdigit()]
        self.W, self.H = (int(nums[0]), int(nums[1])) if len(nums) >= 2 else (640, 360)
        self.scene = B.clear_scene()
        A.reset_timing()
        if env == 'home':
            import env_home as E
        elif env == 'street':
            import env_street as E
        elif env == 'market':
            import env_market as E
        else:
            import env_bedroom as E
        self.E = E
        E.build(self.scene, preset)
        self.S = E.SPOTS
        self.lines = {l['id']: l for l in json.load(open(os.path.join(ROOT, 'audio', 'dialogue', 'lines.json')))}
        self.daniel = C.build_character(C.SPECS['Daniel'], B.collection('Daniel')) if 'daniel' in characters else None
        self.grace = C.build_character(C.SPECS['Grace'], B.collection('Grace')) if 'grace' in characters else None
        self.brian = C.build_character(C.SPECS['Brian'], B.collection('Brian')) if 'brian' in characters else None
        for ch in (self.daniel, self.grace, self.brian):
            if ch is not None:
                A.place(ch, 1, 0, -50, 0)  # parked off-set until the script places them
        self.cam = Camera(self.scene)
        self.out_dir = os.path.join(ROOT, 'renders', name)
        os.makedirs(self.out_dir, exist_ok=True)

    def line(self, lid):
        return self.lines[lid]

    def say(self, ch, lid, t, **kw):
        """Dialogue line by id at time t. Returns end time."""
        return A.dialogue_line(ch, self.lines[lid], t, **kw)

    def finish(self, extra_blend=None):
        render_settings(self.scene, self.W, self.H, self.duration, os.path.join(self.out_dir, 'frame_'))
        A.write_timing(os.path.join(self.out_dir, 'timing.json'), self.duration, self.name)
        argv = self.argv
        if 'timing' in argv:
            print('TIMING_WRITTEN')
            return
        bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'blender', f'{self.name}.blend'))
        print('BLEND_SAVED')
        frames = [a for a in argv if a.startswith('frames=')]
        if frames:
            for fr in frames[0][7:].split(','):
                self.scene.frame_set(int(fr))
                self.scene.render.filepath = os.path.join(self.out_dir, f'test_{int(fr):04d}.png')
                bpy.ops.render.render(write_still=True)
            print('FRAMES_DONE')
        elif 'render' in argv:
            start = [a for a in argv if a.startswith('start=')]
            if start:
                self.scene.frame_start = int(start[0][6:])
            bpy.ops.render.render(animation=True)
            print('RENDER_DONE')
