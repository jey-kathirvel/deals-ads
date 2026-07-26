"use client";

interface Props extends React.ButtonHTMLAttributes<HTMLButtonElement>{
variant?:"primary"|"secondary"|"danger"|"success";
loading?:boolean;
}

const variants={
primary:"bg-blue-600 hover:bg-blue-700 text-white",
secondary:"bg-slate-200 hover:bg-slate-300 text-slate-700",
danger:"bg-red-600 hover:bg-red-700 text-white",
success:"bg-emerald-600 hover:bg-emerald-700 text-white"
};

export default function Button({
variant="primary",
loading,
children,
...props
}:Props){

return(

<button
{...props}
disabled={loading || props.disabled}
className={`rounded-xl px-5 py-2 font-medium transition-all duration-200 disabled:opacity-50 ${variants[variant]}`}
>

{loading ? "Loading..." : children}

</button>

);

}
