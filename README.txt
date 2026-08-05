PATCH-URL-003C - Renderer Debug Capture

Changed file:
  lib/url-import/rendered-fetch.ts

On every Chromium render, artifacts are stored under:
  data/url-import/renderer-debug/<timestamp-provider-product>/

Artifacts:
  rendered.html
  rendered.png
  chromium.stderr.log
  metadata.json

The failure reason includes the artifact directory path.
