# PATCH-URL-002A — Smart Image Engine

Deploy over PATCH-URL-001.

```bash
cd /opt/deals-ads
cp -a . "../deals-ads-backup-url002a-$(date +%Y%m%d-%H%M%S)"
unzip -o PATCH-URL-002A-smart-image-engine.zip -d /tmp/PATCH-URL-002A
cp -a /tmp/PATCH-URL-002A/PATCH-URL-002A-smart-image-engine/. /opt/deals-ads/
docker compose up -d --build deals
docker compose ps
docker compose logs --tail=120 deals
```
