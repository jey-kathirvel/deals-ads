interface Props{
title:string;
subtitle?:string;
actions?:React.ReactNode;
}

export default function PageHeader({
title,
subtitle,
actions
}:Props){

return(

<div className="mb-8 flex items-center justify-between">

<div>

<h1 className="text-3xl font-bold text-slate-800">

{title}

</h1>

{subtitle &&

<p className="mt-2 text-slate-500">

{subtitle}

</p>

}

</div>

<div>

{actions}

</div>

</div>

);

}
