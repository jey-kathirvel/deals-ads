# PATCH-URL-003 — Chromium Browser Renderer

## Purpose

Adds a server-side Chromium fallback for Zepto product pages that return an HTTP 202 lightweight application shell.

## Changed files

- `Dockerfile`
- `lib/url-import/rendered-fetch.ts`
- `lib/url-import/extractor.ts`
- `lib/url-import/types.ts`
- `lib/url-import/service.ts`

## Runtime behaviour

1. Perform the existing secure static HTTP fetch.
2. Detect a Zepto lightweight shell.
3. Launch system Chromium in headless mode.
4. Execute page JavaScript and dump the rendered DOM.
5. Send the rendered HTML through the existing provider, image, price, category, duplicate, and preview pipeline.

## New failures

- `BROWSER_RENDER_TIMEOUT`
- `BROWSER_RENDER_FAILED`
- `PRODUCT_CONTENT_NOT_RENDERED`

## Docker impact

The runtime image installs Alpine Chromium and related fonts/libraries. Docker image size will increase.
