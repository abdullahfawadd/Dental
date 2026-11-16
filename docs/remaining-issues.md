# Remaining issues

- GitHub Pages serves a static build. Booking validates the user's input and offers the clinic's contact information. Live delivery requires a clinic-approved HTTPS endpoint configured through `DENTAL_BOOKING_ENDPOINT`. The external patient portal continues to use its original destination.
- The captured public data returned empty before-and-after and case study collections. The original treatment and technology detail pages and their available imagery are included.
- The editable reconstruction consists of the snapshot generator, route and content manifests, build and integration code. Component markup, styles, and animation timelines are retained as generated Nuxt browser artifacts from the authorized reference. The original prebuild Vue component project was unavailable.
- Reduced-motion handling covers decorative autoplay video and CSS animation and transition duration. The original script-driven menu, scroll, and hero timelines retain their timing.
- See [Visual QA](visual-qa-report.md) and [Animation audit](animation-audit.md) for measured differences and evidence coverage.
