# Notion → Ghost Publisher

Small Node.js/TypeScript app that reads posts from a Notion database and publishes them to a Ghost blog using the Ghost Admin API.

You can run it locally as a CLI or deploy it to Vercel and trigger publishing via HTTPS or a scheduled cron job.

## Prerequisites

- Node.js 18+ and npm
- A Notion integration with access to your posts database
- A Ghost Admin API key
- (For deployment) A Vercel account (`liviogama`) and the Vercel CLI installed

## Environment variables

Create a `.env` file (you can copy from `.env.example`) with:

```bash
NOTION_TOKEN=ntn_...
NOTION_DATABASE_ID=your_notion_database_id
GHOST_URL=https://yourblog.ghost.io
GHOST_ADMIN_KEY=admin_id:admin_secret
GHOST_API_VERSION=v5.0
PUBLISH_SECRET=some-long-random-string
```

### Notion database expectations

The Notion database used for posts should have at least:

- `Status` – Select property with value `Ready to Publish` used to identify posts to send to Ghost
- `Name` – Title property used as the Ghost post title
- (Optional) `Slug` – Rich text property; if present, used as the Ghost slug. Otherwise a slug is auto-generated from the title.

## Local usage

Install dependencies:

```bash
npm install
```

Build the TypeScript sources:

```bash
npm run build
```

Run the publisher locally:

```bash
npm start
```

This will:

1. Fetch pages from Notion with `Status = "Ready to Publish"` in the configured database.
2. Convert the content to Markdown via `notion-to-md`.
3. Create draft posts in Ghost via the Admin API.

## Vercel deployment

This repo includes a Vercel serverless function at `api/publish.ts`.

### 1. Install and log into Vercel CLI

```bash
npm install -g vercel
vercel login
```

Log in with the `liviogama` account.

### 2. Link and deploy the project

From the project root:

```bash
vercel
```

- Select the `liviogama` scope when prompted.
- Create or link to a project named `notion-ghost-publisher`.

Then deploy to production:

```bash
vercel --prod
```

### 3. Configure environment variables on Vercel

In the Vercel dashboard for this project:

1. Go to **Settings → Environment Variables**.
2. Add the following variables for the `Production` (and optionally `Preview`) environment:

```text
NOTION_TOKEN=ntn_...
NOTION_DATABASE_ID=your_notion_database_id
GHOST_URL=https://yourblog.ghost.io
GHOST_ADMIN_KEY=admin_id:admin_secret
GHOST_API_VERSION=v5.0
PUBLISH_SECRET=some-long-random-string
```

After saving env vars, redeploy:

```bash
vercel --prod
```

## Triggering the publisher via HTTP

Once deployed, the publish endpoint will be available at:

```text
https://<your-vercel-domain>/api/publish
```

The endpoint only accepts `POST` and is optionally protected with `PUBLISH_SECRET`. If `PUBLISH_SECRET` is set, you must include it in the request, either as an `Authorization` header or an `x-publish-secret` header.

Examples:

```bash
curl -X POST \
  -H "x-publish-secret: $PUBLISH_SECRET" \
  https://<your-vercel-domain>/api/publish
```

or

```bash
curl -X POST \
  -H "Authorization: Bearer $PUBLISH_SECRET" \
  https://<your-vercel-domain>/api/publish
```

Responses:

- `200 OK` with `{ "message": "No posts with Status = \"Ready to Publish\" found in Notion." }` when nothing to publish.
- `200 OK` with `{ "message": "Publishing complete", "count": N }` on success.
- `401 Unauthorized` if the secret is incorrect/missing when `PUBLISH_SECRET` is set.
- `405 Method Not Allowed` for non-POST requests.

## Scheduling with Vercel Cron

You can have Vercel call the publisher on a schedule.

1. In the Vercel dashboard, open the project.
2. Go to **Settings → Cron Jobs**.
3. Create a new cron job with:
   - Path: `/api/publish`
   - Method: `POST`
   - Schedule: e.g. `0 * * * *` (every hour) or as desired.
4. Ensure the `PUBLISH_SECRET` is set in your environment variables.

Vercel will then regularly trigger the publish function, which will only act on Notion pages whose `Status` is `Ready to Publish`.

## Security notes

- Keep your Ghost Admin key and Notion token secret; never commit them to git.
- Use `PUBLISH_SECRET` in production so only authorized callers (or Vercel cron) can trigger `/api/publish`.
- Consider rotating the secret periodically and updating any clients or automations that call the endpoint.
