"use client";

import {useEffect,useState} from "react";

export default function Campaigns(){

const[campaigns,setCampaigns]=useState<any[]>([]);

const[form,setForm]=useState({

name:"",
title:"",
subtitle:"",
iframeUrl:"",
priority:1

});

async function load(){

const r=await fetch("/api/admin/campaigns",{cache:"no-store"});

setCampaigns(await r.json());

}

useEffect(()=>{load();},[]);

async function save(){

await fetch("/api/admin/campaigns",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify({

...form,

placement:"deals",

type:"iframe",

enabled:true,

showOnce:true

})

});

setForm({

name:"",
title:"",
subtitle:"",
iframeUrl:"",
priority:1

});

load();

}

return(

<div className="max-w-6xl mx-auto p-8 space-y-6">

<h1 className="text-3xl font-bold">

Campaign Manager

</h1>

<div className="grid gap-3">

<input placeholder="Campaign Name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/>

<input placeholder="Title" value={form.title} onChange={e=>setForm({...form,title:e.target.value})}/>

<input placeholder="Subtitle" value={form.subtitle} onChange={e=>setForm({...form,subtitle:e.target.value})}/>

<input placeholder="Iframe URL" value={form.iframeUrl} onChange={e=>setForm({...form,iframeUrl:e.target.value})}/>

<button onClick={save}>

Save Campaign

</button>

</div>

<table className="w-full">

<thead>

<tr>

<th>Name</th>

<th>Priority</th>

<th>Status</th>

</tr>

</thead>

<tbody>

{campaigns.map(c=>

<tr key={c.id}>

<td>{c.name}</td>

<td>{c.priority}</td>

<td>{c.enabled?"Enabled":"Disabled"}</td>

</tr>

)}

</tbody>

</table>

</div>

);

}
