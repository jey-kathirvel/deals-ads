import { operationsDashboard } from "@/lib/operations/dashboard";
import { providerHealth } from "@/lib/providers/health";
import { analytics } from "@/lib/analytics/store";
import { listCampaigns } from "@/lib/campaigns/store";
import { listDeals } from "@/lib/manual-deals/store";
import { listAudit } from "@/lib/audit/store";

export function adminDashboard() {

  const ops = operationsDashboard();

  const providers = providerHealth();

  const stats = analytics();

  const campaigns = listCampaigns();

  const manualDeals = listDeals();

  const audit = listAudit();

  return {

    overview: {

      runningJobs: ops.summary.runningJobs,

      successfulJobs: ops.summary.successfulJobs,

      failedJobs: ops.summary.failedJobs,

      totalCampaigns: campaigns.length,

      activeCampaigns: campaigns.filter(x=>x.enabled).length,

      manualDeals: manualDeals.length,

      totalVisits: stats.totalVisits,

      uniqueVisitors: stats.uniqueVisitors

    },

    scheduler: ops.scheduler,

    latestJob: ops.latestJob,

    providerHealth: providers,

    campaigns: campaigns.slice(0,5),

    manualDeals: manualDeals.slice(0,5),

    audit: audit.slice(0,10)

  };

}
