"use client";

import {usePathname} from "next/navigation";

export default function Breadcrumb(){

const path=usePathname();

const parts=path.split("/").filter(Boolean);

return(

<div className="text-sm text-slate-500">

{parts.map((p,i)=>

<span key={p}>

{i>0 && " / "}

<span className="capitalize">

{p.replaceAll("-"," ")}

</span>

</span>

)}

</div>

);

}
