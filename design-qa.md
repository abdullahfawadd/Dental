# Design QA

The reviewed pairs use matching Chromium viewports at device scale factor 1. The reference appears on the left of each paired image.

- **Typography and layout.** At 390 × 844 the contact page matched the reference heading wrap, header placement, location spacing, address styling, and image crop. The homepage editorial type, supporting copy, logo, and mobile controls aligned after restoring the six font files.
- **Color and images.** The mobile homepage, About, and Contact pairs use the same backgrounds, imagery, and overlays. The first homepage pair displayed different video frames, and the first About pair caught separate phases of the rotating title. The later Playwright capture waits for a decoded video frame at the same timestamp.
- **Startup and navigation.** Deferred CSS, inline fonts, and Lottie assets were added after the first comparison found a stalled preloader. Reanimate captured matching settled mobile Menu and desktop Services panel images. Direct links and the booking form were exercised in Chromium.
- **Responsive layout.** The reference treatment carousel made the page horizontally scrollable at some mobile widths. Clipping horizontal overflow on the main content removed that scroll while preserving the visible viewport arrangement.

See the [visual QA report](docs/visual-qa-report.md) for route and viewport coverage, and the [animation audit](docs/animation-audit.md) for frame evidence.

Final result for the manually reviewed states: passed.
