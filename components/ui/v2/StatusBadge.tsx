interface Props{
status:string;
}

const map:Record<string,string>={
healthy:"bg-emerald-100 text-emerald-700",
approved:"bg-emerald-100 text-emerald-700",
success:"bg-emerald-100 text-emerald-700",
running:"bg-blue-100 text-blue-700",
pending:"bg-amber-100 text-amber-700",
warning:"bg-amber-100 text-amber-700",
failed:"bg-red-100 text-red-700",
rejected:"bg-red-100 text-red-700",
error:"bg-red-100 text-red-700"
};

export default function StatusBadge({status}:Props){

const cls=map[status.toLowerCase()] ?? "bg-slate-100 text-slate-700";

return(

<span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${cls}`}>

{status}

</span>

);

}
