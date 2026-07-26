"use client";

import {useEffect,useState} from "react";

export default function ManualDeals(){

const[list,setList]=useState<any[]>([]);

const[form,setForm]=useState({

productName:"",
category:"",
dealPrice:"",
originalPrice:"",
discount:"",
coupon:"",
dealUrl:"",
imageUrl:"",
publishMode:"review"

});

async function load(){

const r=await fetch("/api/admin/manual-deals",{cache:"no-store"});

setList(await r.json());

}

useEffect(()=>{load();},[]);

async function save(){

await fetch("/api/admin/manual-deals",{

method:"POST",

headers:{
"Content-Type":"application/json"
},

body:JSON.stringify(form)

});

load();

}

return(

<div className="max-w-7xl mx-auto p-8 space-y-5">

<h1 className="text-3xl font-bold">

Manual Deal Entry

</h1>

<div className="grid grid-cols-2 gap-3">

<input placeholder="Product Name" onChange={e=>setForm({...form,productName:e.target.value})}/>

<input placeholder="Category" onChange={e=>setForm({...form,category:e.target.value})}/>

<input placeholder="Deal Price" onChange={e=>setForm({...form,dealPrice:e.target.value})}/>

<input placeholder="Original Price" onChange={e=>setForm({...form,originalPrice:e.target.value})}/>

<input placeholder="Discount %" onChange={e=>setForm({...form,discount:e.target.value})}/>

<input placeholder="Coupon" onChange={e=>setForm({...form,coupon:e.target.value})}/>

<input placeholder="Deal URL" onChange={e=>setForm({...form,dealUrl:e.target.value})}/>

<input placeholder="Image URL" onChange={e=>setForm({...form,imageUrl:e.target.value})}/>

<select onChange={e=>setForm({...form,publishMode:e.target.value})}>

<option value="review">Review Queue</option>

<option value="publish">Publish Directly</option>

</select>

<button
className="rounded bg-blue-600 text-white p-2"
onClick={save}
>

Save Deal

</button>

</div>

<table className="w-full">

<thead>

<tr>

<th>Name</th>

<th>Price</th>

<th>Discount</th>

<th>Status</th>

</tr>

</thead>

<tbody>

{list.map(x=>

<tr key={x.id}>

<td>{x.productName}</td>

<td>{x.dealPrice}</td>

<td>{x.discount}%</td>

<td>{x.status}</td>

</tr>

)}

</tbody>

</table>

</div>

);

}
