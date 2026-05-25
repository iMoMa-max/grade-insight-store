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

Before deploying to Cloudflare, create a KV namespace and replace the placeholder in `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "SCORE_STATE"
id = "REPLACE_WITH_CLOUDFLARE_KV_NAMESPACE_ID"
```

Then deploy with:

```bash
npm install
npm run deploy:cloudflare
```
