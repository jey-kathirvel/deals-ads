interface Props{
title:string;
value:React.ReactNode;
trend?:string;
}

export default function StatCard({
title,
value,
trend
}:Props){

return(

<div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-xl transition-all duration-300">

<p className="text-sm text-slate-500">

{title}

</p>

<h2 className="mt-2 text-3xl font-bold text-slate-900">

{value}

</h2>

{trend &&

<p className="mt-3 text-sm font-medium text-emerald-600">

{trend}

</p>

}

</div>

);

}
