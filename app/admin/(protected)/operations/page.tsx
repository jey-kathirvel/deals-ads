"use client";

import { useEffect, useState } from "react";

export default function OperationsDashboard() {

  const [data,setData]=useState<any>();

  async function load(){

    const r=await fetch("/api/admin/operations/dashboard",{cache:"no-store"});

    setData(await r.json());

  }

  useEffect(()=>{

    load();

    const t=setInterval(load,5000);

    return ()=>clearInterval(t);

  },[]);

  if(!data) return <div className="p-8">Loading...</div>;

  return (

    <main className="p-8 space-y-6">

      <h1 className="text-3xl font-bold">
        Operations Dashboard
      </h1>

      <div className="grid grid-cols-4 gap-4">

        <Card title="Scheduler" value={data.scheduler.enabled ? "Enabled":"Disabled"} />

        <Card title="Running Jobs" value={data.summary.runningJobs} />

        <Card title="Success Jobs" value={data.summary.successfulJobs} />

        <Card title="Failed Jobs" value={data.summary.failedJobs} />

      </div>

      <div className="rounded border p-4">

        <h2 className="font-semibold mb-3">
          Latest Job
        </h2>

        <pre>{JSON.stringify(data.latestJob,null,2)}</pre>

      </div>

      <div className="rounded border p-4">

        <h2 className="font-semibold mb-3">
          Scheduler
        </h2>

        <pre>{JSON.stringify(data.scheduler,null,2)}</pre>

      </div>

      <div className="rounded border p-4">

        <h2 className="font-semibold mb-3">
          Analytics
        </h2>

        <pre>{JSON.stringify(data.analytics,null,2)}</pre>

      </div>

    </main>

  );

}

function Card({title,value}:{title:string,value:any}){

  return(

    <div className="rounded border p-4">

      <div className="text-gray-500 text-sm">{title}</div>

      <div className="text-3xl font-bold">{value}</div>

    </div>

  );

}
