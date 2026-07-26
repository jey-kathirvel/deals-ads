interface Props{
title?:string;
subtitle?:string;
actions?:React.ReactNode;
children:React.ReactNode;
}

export default function AppCard({
title,
subtitle,
actions,
children
}:Props){

return(

<div className="rounded-2xl border border-slate-200 bg-white shadow-sm hover:shadow-xl transition-all duration-300">

{(title || actions) &&

<div className="flex items-center justify-between border-b px-6 py-4">

<div>

{title && <h3 className="font-semibold text-slate-800">{title}</h3>}

{subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}

</div>

{actions}

</div>

}

<div className="p-6">

{children}

</div>

</div>

);

}
