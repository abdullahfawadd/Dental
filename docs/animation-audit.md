# Animation audit

Target. Public load, scroll, hover, and interaction motion on Aventura Dental Arts.

Destination. The corresponding first-party pages in this reconstruction.

Fidelity target. Pixel-faithful, with a mean frame mismatch target of 2% on deterministic captures.

## Tool setup

The audit uses the upstream [Reanimate](https://github.com/NiazMorshed2007/reanimate) capture, timing, frame comparison, and filmstrip scripts at commit `3f7a55a2986a84ca2173e86ee9127eefe31d046d`. Its `SKILL.md` and capture, analysis, verification, and implementation references describe the workflow. `capture.ts` records Chromium via Playwright and extracts PNG frames with ffmpeg. `compare.ts` measures frame-wise mismatch and motion timing, and `sheet.ts` creates labelled filmstrips and side-by-sides.

Upstream documents macOS/Linux and Bun. This Windows audit ran the TypeScript directly in Node 24, configured Playwright to use installed Chrome, and resolved ffmpeg through `ffmpeg.exe`. The changes were applied to a temporary tool checkout. They leave frame sampling and comparison code as shipped upstream.

```powershell
node scripts/animation-audit.mjs setup
# Assign the scripts directory printed by setup before running the following commands.
$env:REANIMATE_SCRIPTS_DIR = 'C:\path\to\reanimate\skills\reanimate\scripts'
node scripts/animation-audit.mjs reference goal
node scripts/animation-audit.mjs local goal http://127.0.0.1:4173
node scripts/animation-audit.mjs compare goal
```

Use `filmstrip` to generate a labelled reference filmstrip. Set `ANIMATION_ROUND` to a positive integer to retain a new set of local captures and comparison outputs beside earlier rounds. Paths in the tables below are relative to `visual-qa/animation/`.

## Reference observations

| Trigger | Observation | Capture evidence |
| --- | --- | --- |
| Desktop cold load | Early frames were blank during reference startup. The initial 3.5-second cold capture cannot establish hero entrance fidelity. | `hero/reference/sheets/sheet-01.png` |
| Mobile cold load | The first 3 seconds also captured the startup blank state. The desktop video element has a zero-size box at 390 px. | `mobile-hero/reference/sheets/sheet-01.png` and `track.json` |
| Desktop virtual-time load | The heading node steps from opacity 0 to 1 at 1,216.7 ms in 60 Hz track sampling. Its position and opacity then hold while the looping video continues. The 109 captured frames cover 9 seconds of virtual time. | `hero-entrance/reference/` |
| Desktop scroll toward Our Goal | The pinned hero starts as a two-panel layout. During scrolling, the video panel moves left and expands and the headline transitions to the second headline. The goal section initially sits at y=2520 CSS px and reaches y=228 at scrollY=2292 in the track samples. | `goal/reference/sheets/sheet-01.png` and `track.json` |
| Click desktop Services | The Services panel comes down from the top and shows the four treatments as photographic links. A darkened, blurred backdrop covers the hero. | `services/reference/` |
| Click mobile Menu | The overlay opens full-screen with the light logo, centered links, a consultation button, patient and FAQ links, and a close button. | `mobile-menu/reference/` |

The desktop capture detects Lenis smooth scroll, Nuxt and a carousel library. Browser inspection reports the Instrument Serif regular and italic faces and Inter Tight weights 400, 500, 600, and 700. The hero uses a native muted, looping WebM video. Its wall-clock playback can differ after load and during a real-time capture, even when the scroll or click is identical.

The CSS animation inventory measured a 50,000 ms linear looping spin for `img.experts-bg`, a 1,000 ms cursor blink controlled by `steps(1, start)`, and a 15,000 ms looping path transform in the pre-footer. At the pre-footer midpoint the path translates 480 px and rotates 15 degrees, with `ease-in` on the captured keyframe intervals. An observed mobile icon transition is 450 ms with `ease-in-out`, rotating from 90 to -90 degrees.

The desktop Services panel declares a 450 ms clip-path transition from zero height to full height. Its overlay uses the same duration for opacity. The mobile menu declares a 1,000 ms open and 800 ms close for the background scale, content clip-path, and animated content translation. Both use `cubic-bezier(.6, .14, 0, 1)`.

## Local verification

Initial local clicks timed out because the preloader intercepted pointer events. After the font and Lottie asset repairs, both the mobile menu and desktop Services dropdown opened successfully in Reanimate's local recordings.

The settled mobile menu images (`mobile-menu/reference/final.png` and `mobile-menu/local-2/final.png`) had identical SHA-256 hashes. The real-time mobile menu comparison measured 84.71% mean mismatch over 20 frames, with a 167 ms start difference in its activity curves. The comparison sheet shows that the exported frames started with the local preloader against the reference's already visible hero, then paired different stages of the transition. This run did not meet the motion comparison target.

- Raw comparison and frame metrics. `mobile-menu/comparison-2/report.json`
- Inspected comparison sheet. `mobile-menu/comparison-2/sheets/compare-01.png`

The settled desktop Services panel matched at 0 of 248,160 pixels in its 940 × 264 crop. The 1,440 × 900 viewport had 17.60% mismatch with a different point in the autoplay hero behind the blurred overlay. The real-time frame comparison measured 74.63% mean mismatch, with no measurable reference animation in the recorded frame window.

- Full viewport and panel counts. `services/comparison-2/settled.json` and `services/comparison-2/settled-panel.json`
- Raw animation frame metrics. `services/comparison-2/report.json`

The first local scroll recording ended at scrollY=0 because the wheel sequence started before the local preloader released scrolling. The reference ended at scrollY=2292. The reported 92.50% real-time mean mismatch reflects those different scroll states. The `goal-settled` scenario gives both origins a 4-second settle and tracks the moving headline and video alongside the target section.

- Raw scroll comparison. `goal/comparison-2/report.json`
- Local and reference scroll samples. `goal/local-2/track.json` and `goal/reference/track.json`

The virtual-time hero retest recorded 109 frames per origin at 12 fps. The title reached opacity 1 at 1,216.7 ms on the reference and 1,200.0 ms locally, a 16.7 ms difference in the 60 Hz track. The settled title bounding box and transform values match exactly in the tracks. The right panel's first 56 frames, through 4.58 seconds, had 0% Pixelmatch mismatch. The full 109-frame recording measured 22.11% mean mismatch after the autoplay video diverged in playback position. Its settled screenshot measured 55.92% mismatch with different video frames.

- Title opacity fit and track comparison. `hero-entrance/comparison-2/easing-opacity.json`
- Right panel settled comparison. `hero-entrance/comparison-2/settled.json`
- Capture comparison and frame sheets. `hero-entrance/comparison-2/report.json` and `hero-entrance/comparison-2/sheets/`
