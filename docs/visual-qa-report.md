# Visual QA report

The matrix covers the 33 confirmed HTML routes in [the route list](../scripts/visual-matrix.mjs). It includes the ten requested viewports: 320×700, 360×800, 375×812, 390×844, 430×932, 768×1024, 1024×768, 1280×800, 1440×900 and 1920×1080.

## Reproduce the results

Install Chromium with `npx playwright install chromium`, or set `QA_BROWSER_CHANNEL=chrome` to run against installed Google Chrome. Run `npm run dev` for the local app in a separate terminal.

```sh
npm test
npm run qa:capture -- --target both --resume
npm run qa:compare
```

Use `--route /about --viewport 390x844` to narrow capture to one case. `--only viewport` captures the initial view without waiting for the full-page scan. `QA_LOCAL_URL` changes the app origin and can include a deployment subpath such as `/Dental`.

- Reference screenshots are under `visual-qa/reference/<route>/<size>/`.
- Local screenshots are under `visual-qa/local/<route>/<size>/`.
- Pixelmatch images are under `visual-qa/diff/<route>/<size>/`.
- Per-case mismatched pixels, percentages, dimensions and artifact paths are in `visual-qa/reports/pixelmatch.json` and `visual-qa/reports/pixelmatch.md`.
- Playwright test output is in `visual-qa/reports/playwright.json`. Each captured case has `capture.json` with document width, loaded fonts, errors, broken rendered images, and link and heading inventories.

## Capture and comparison conditions

Both origins use Chromium at a device scale factor of 1, light color scheme, `en-US`, and `America/New_York`. Static captures request reduced motion. The capture waits for fonts, checks that intro overlays cleared and requests the visible hero video at 0.5s when metadata is available. Each capture log records whether the overlays cleared and the actual video playback position. The full-page scan advances through the route to activate lazy media before capturing the document in bands and joining the PNGs. Offscreen animated layers can appear in full-page captures at their rendered document positions.

Pixelmatch uses a threshold of 0.1 and anti-alias filtering. No pixel masks are applied. If full-page sizes differ, the diff compares the equal-sized overlapping area from the top left and records both original dimensions. A missing pair remains marked missing in the generated report.

## Early comparison and corrections

The first six 390×844 comparisons measured a mean mismatch of 50.251%. The largest visible differences included unloaded original fonts and a stalled local intro. The screenshots and comparison report for that first build are archived under `visual-qa/baseline/`. The post-change results use the primary `visual-qa/` directories.
