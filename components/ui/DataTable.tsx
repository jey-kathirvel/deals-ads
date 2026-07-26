"use client";

import { useMemo, useState } from "react";

interface Column{
key:string;
title:string;
render?:(row:any)=>React.ReactNode;
}

interface Props{
columns:Column[];
rows:any[];
pageSize?:number;
}

export default function DataTable({
columns,
rows,
pageSize=10
}:Props){

const[query,setQuery]=useState("");

const[page,setPage]=useState(1);

const filtered=useMemo(()=>{

const q=query.toLowerCase();

if(!q) return rows;

return rows.filter(r=>
JSON.stringify(r).toLowerCase().includes(q)
);

},[rows,query]);

const totalPages=Math.max(
1,
Math.ceil(filtered.length/pageSize)
);

const data=filtered.slice(
(page-1)*pageSize,
page*pageSize
);

return(

<div className="rounded-xl border bg-white">

<div className="border-b p-4 flex justify-between">

<input
placeholder="Search..."
value={query}
onChange={e=>{
setQuery(e.target.value);
setPage(1);
}}
className="w-72 rounded-lg border px-4 py-2"
/>

<div className="text-sm text-slate-500">

{filtered.length} Records

</div>

</div>

<div className="overflow-auto max-h-[650px]">

<table className="min-w-full">

<thead className="sticky top-0 bg-slate-50 border-b">

<tr>

{columns.map(c=>

<th
key={c.key}
className="px-4 py-3 text-left font-semibold whitespace-nowrap"
>

{c.title}

</th>

)}

</tr>

</thead>

<tbody>

{data.map((row,i)=>

<tr
key={i}
className="border-b hover:bg-slate-50"
>

{columns.map(col=>

<td
key={col.key}
className="px-4 py-3 whitespace-nowrap"
>

{col.render
?col.render(row)
:String(row[col.key]??"")}

</td>

)}

</tr>

)}

{data.length===0&&

<tr>

<td
colSpan={columns.length}
className="text-center py-16 text-slate-400"
>

No Records Found

</td>

</tr>

}

</tbody>

</table>

</div>

<div className="border-t p-4 flex justify-between">

<button
disabled={page===1}
onClick={()=>setPage(p=>p-1)}
className="rounded border px-4 py-2 disabled:opacity-40"
>

Previous

</button>

<div>

Page {page} / {totalPages}

</div>

<button
disabled={page===totalPages}
onClick={()=>setPage(p=>p+1)}
className="rounded border px-4 py-2 disabled:opacity-40"
>

Next

</button>

</div>

</div>

);

}
