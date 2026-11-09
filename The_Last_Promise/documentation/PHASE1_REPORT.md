# Phase 1 — environment and tools report

Inspected on the build machine before any asset was created.

| Item | Finding |
|------|---------|
| CPU / RAM | 4 cores, 15 GB RAM, no GPU (software OpenGL only) |
| Blender | not installed initially; `download.blender.org` is blocked by the network policy, but Ubuntu's `apt` repository is allowed → **Blender 4.0.2** installed from apt |
| Headless rendering | Eevee needs an OpenGL context: works under `xvfb-run` with Mesa llvmpipe. Cycles (CPU) works without a display once denoising is disabled (no OpenImageDenoise in this build) |
| FFmpeg | 6.1.1 with libx264, AAC and libass (subtitle burn-in) |
| Python | 3.13 system Python with numpy (used for synthesised music / SFX); Blender bundles its own 3.10 |
| Text-to-speech | No neural TTS reachable (PyPI `piper-tts` installs but its voice models live on huggingface.co, which is blocked). **espeak-ng** (apt) is used for clearly-labelled placeholder voices with distinct settings per character. Real recordings drop into `audio/dialogue/recorded/` |
| Video generation services | the configured connector refused to connect through the proxy; no AI video/image generation is used anywhere |

## Measured render cost (Eevee, animation render, per frame)

| Resolution | Samples | s/frame | 7,200 frames |
|-----------:|--------:|--------:|-------------:|
| 640 × 360 | 4–6 | ~1.0 | ~2 h |
| 1280 × 720 | 8–12 | ~3.4 | ~7 h |
| 1920 × 1080 | 16–24 | ~11 | ~22 h |

Decision: preview the whole film at 640 × 360, render the approval sample at 1280 × 720, and
ship the scripts + settings for the 1920 × 1080 final (minutes on any machine with a GPU).
