# PATCH-URL-002B — Unified Product Image Engine

## Changed files
- lib/url-import/image-engine.ts
- lib/url-import/image-validator.ts
- lib/url-import/extractor.ts
- lib/url-import/service.ts

## Deployment
```bash
cd /opt/deals-ads && \
BACKUP="/opt/deals-ads-backup-url002b-$(date +%Y%m%d-%H%M%S)" && \
cp -a /opt/deals-ads "$BACKUP" && \
rm -rf /tmp/PATCH-URL-002B && \
mkdir -p /tmp/PATCH-URL-002B && \
unzip -o PATCH-URL-002B-image-engine-refactor.zip -d /tmp/PATCH-URL-002B && \
cp -a /tmp/PATCH-URL-002B/. /opt/deals-ads/ && \
docker compose up -d --build deals && \
docker compose ps && \
docker compose logs --tail=120 deals
```

## Validation
Open `/admin/url-import`, analyse the same Zepto URL, and expand Extraction timeline.
The image stage now lists each candidate source, HTTP status, content type and rejection reason.
The user-facing failure reason now contains the detailed image-engine result instead of only the generic message.
