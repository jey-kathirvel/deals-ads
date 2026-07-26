"use client";

import PageHeader from "@/components/ui/PageHeader";
import StatCard from "@/components/ui/StatCard";
import Card from "@/components/ui/Card";
import Section from "@/components/ui/Section";

import {useEffect,useState} from "react";

export default function Dashboard(){

const[data,setData]=useState<any>();

async function load(){

const r=await fetch("/api/admin/dashboard",{cache:"no-store"});

setData(await r.json());

}

useEffect(()=>{

load();

const t=setInterval(load,5000);

return () => clearInterval(t);

},[]);

if(!data) return null;

const o=data.overview;

return(

<div className="space-y-8">

<div className="flex items-center justify-between">

<div>


<div className="max-w-7xl mx-auto p-8 space-y-6">

<PageHeader
title="Executive Dashboard"
subtitle="Real-time monitoring of Deals AI platform"
/>

</div>

<div className="text-sm text-gray-500 bg-gray-100 rounded-lg px-4 py-2">
Auto Refresh • 5 sec
</div>

</div>

<div className="grid grid-cols-2 xl:grid-cols-4 gap-6">

<StatCard title="Visitors" value={o.totalVisits} color="blue"/>
<StatCard title="Unique Users" value={o.uniqueVisitors} color="green"/>
<StatCard title="Running Jobs" value={o.runningJobs} color="amber"/>
<StatCard title="Failed Jobs" value={o.failedJobs} color="red"/>


<Card title="Unique Users" value={o.uniqueVisitors}/>

<Card title="Running Jobs" value={o.runningJobs}/>

<Card title="Failed Jobs" value={o.failedJobs}/>

<Card title="Campaigns" value={o.totalCampaigns}/>

<Card title="Manual Deals" value={o.manualDeals}/>

<Card title="Success Jobs" value={o.successfulJobs}/>

<Card title="Active Campaigns" value={o.activeCampaigns}/>

</div>

<div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

<Section
title="Latest Job"
data={data.latestJob}
/>

<Section
title="Scheduler"
data={data.scheduler}
/>

<Section
title="Provider Health"
data={data.providerHealth}
/>

<Section
title="Recent Campaigns"
data={data.campaigns}
/>

<Section
title="Recent Manual Deals"
data={data.manualDeals}
/>

<Section
title="Recent Audit"
data={data.audit}
/>

</div>

</div>

</div>

);

}


