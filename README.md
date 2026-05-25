# Grade Insight Store

A lightweight class score entry app for mobile-first classroom use.

## Features

- Create and manage classes by class name, student count, and inactive student numbers.
- Create exams with class, name, date, and total score.
- Bulk import scores with compact input, for example `11.66..13.77`.
- Tap a student number to enter or update a single score.
- Store only student numbers, not student names.

## Project Structure

- `public/` contains the app UI.
- `cloudflare/worker.js` contains the Cloudflare Worker API for `/api/state`.
- `netlify/functions/state.mjs` is the older Netlify API version.
- `wrangler.toml` is prepared for Cloudflare Workers + Assets deployment.

## Cloudflare Notes

`wrangler.toml` is already configured with the `SCORE_STATE` KV namespace binding used by the Worker API.

Deploy with:

```bash
npm install
npm run deploy:cloudflare
```

Cloudflare Workers is the recommended deployment target when scores should sync across devices.

## GitHub Pages Notes

The GitHub Pages workflow publishes the static files in `public/`. Because GitHub Pages does not run `/api/state`, the app automatically uses browser local storage there.

The workflow is configured to enable Pages for GitHub Actions during deployment.
