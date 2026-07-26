"use client";

import {useEffect,useState} from "react";

export default function Settings(){

const[data,setData]=useState<any>();

async function load(){
const r=await fetch("/api/admin/settings",{cache:"no-store"});
setData(await r.json());
}

useEffect(()=>{load();},[]);

async function save(){

await fetch("/api/admin/settings",{
method:"PUT",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify(data)
});

alert("Settings Saved");

}

if(!data) return null;

return(

<div className="max-w-5xl mx-auto p-8 space-y-6">

<h1 className="text-3xl font-bold">
System Settings
</h1>

<label>
Application Name
<input
className="border w-full p-2"
value={data.applicationName}
onChange={e=>setData({...data,applicationName:e.target.value})}
/>
</label>

<label>
Default Deal Source
<select
className="border w-full p-2"
value={data.defaultDealSource}
onChange={e=>setData({...data,defaultDealSource:e.target.value})}
>
<option>quickcommerce</option>
<option>amazon</option>
</select>
</label>

<label>
Maximum Deals Per Run
<input
type="number"
className="border w-full p-2"
value={data.maxDealsPerRun}
onChange={e=>setData({...data,maxDealsPerRun:Number(e.target.value)})}
/>
</label>

<label className="flex gap-3">

<input
type="checkbox"
checked={data.autoPublish}
onChange={e=>setData({...data,autoPublish:e.target.checked})}
/>

Auto Publish Deals

</label>

<label className="flex gap-3">

<input
type="checkbox"
checked={data.reviewBeforePublish}
onChange={e=>setData({...data,reviewBeforePublish:e.target.checked})}
/>

Review Before Publish

</label>

<label className="flex gap-3">

<input
type="checkbox"
checked={data.schedulerEnabled}
onChange={e=>setData({...data,schedulerEnabled:e.target.checked})}
/>

Enable Scheduler

</label>

<label className="flex gap-3">

<input
type="checkbox"
checked={data.analyticsEnabled}
onChange={e=>setData({...data,analyticsEnabled:e.target.checked})}
/>

Enable Analytics

</label>

<label className="flex gap-3">

<input
type="checkbox"
checked={data.maintenanceMode}
onChange={e=>setData({...data,maintenanceMode:e.target.checked})}
/>

Maintenance Mode

</label>

<button
onClick={save}
className="bg-blue-600 text-white px-5 py-2 rounded"
>

Save Settings

</button>

</div>

);

}
