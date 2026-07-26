interface Props{
title:string;
description?:string;
}

export default function EmptyState({
title,
description
}:Props){

return(

<div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">

<h3 className="text-lg font-semibold text-slate-700">

{title}

</h3>

{description &&

<p className="mt-2 text-slate-500">

{description}

</p>

}

</div>

);

}
