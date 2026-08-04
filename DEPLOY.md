# Deals Job Permanent Fix

Copy these files over the matching paths in `/opt/deals-ads`, then rebuild the Docker service.

Recommended environment settings:

```env
QUICKCOMMERCE_MAX_SEARCHES=40
QUICKCOMMERCE_MAX_VALIDATIONS=150
GROCERY_MAX_SEARCHES=30
GROCERY_MAX_VALIDATIONS=100
DEALS_JOB_STALE_MS=300000
```

Deployment:

```bash
cd /opt/deals-ads
docker compose up -d --build deals
docker compose logs --tail=100 deals
```
