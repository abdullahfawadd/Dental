# Dental

A frontend reconstruction of the authorized public Aventura Dental Arts website. It contains 33 pages, retains the reference's Nuxt/Vue and GSAP browser runtime, and serves original page media and public page data locally.

## Run

```sh
npm ci
npm run dev
```

The preview defaults to http://127.0.0.1:4173/. `npm run build` writes a static site to `dist/`. Set `DENTAL_BASE=/Dental/` to build and preview the GitHub Pages path.

## Project structure

- `config/routes.json` lists the public HTML routes.
- `public/` contains the authorized generated snapshot and the editable integration code under `runtime/`.
- `scripts/snapshot-reference.mjs` regenerates the snapshot and asset inventory from the approved public source. Clear the local `.reference-cache/` to refresh the source release. A normal build uses the checked-in snapshot and requires no requests to the clinic.
- `tests/` and `docs/` contain verification tooling and evidence summaries.

## Verify

With the preview running, install the Playwright browser and run the test and screenshot workflows.

```sh
npx playwright install chromium
npm test
npm run qa:capture -- --target both --resume
npm run qa:compare
```

Use `--route /contact` or `--viewport 390x844` to capture a smaller visual QA set. See [visual QA](docs/visual-qa-report.md) and the [Reanimate workflow](docs/animation-audit.md) for evidence and capture options.

## Booking

The static preview validates booking inputs and shows the clinic contact link after a valid submission. To enable delivery, set `DENTAL_BOOKING_ENDPOINT` to an authorized HTTPS integration at build time. The endpoint must allow requests from the deployed origin and accept JSON with `name`, `phone`, `location`, and `message`. Return a successful HTTP status and `{"accepted":true}` only after accepting the request. The original patient portal remains an external link.

## Deployment

The GitHub Pages workflow builds and deploys `dist/` from `main` after the repository's Pages publishing source is set to GitHub Actions. To configure booking on a deployment, set the repository variable `DENTAL_BOOKING_ENDPOINT`.
