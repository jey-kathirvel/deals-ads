interface Props{
children:React.ReactNode;
type?:
"success"|
"danger"|
"warning"|
"default";
}

const styles={
success:"bg-green-100 text-green-700",
danger:"bg-red-100 text-red-700",
warning:"bg-amber-100 text-amber-700",
default:"bg-slate-100 text-slate-700"
};

export default function Badge({
children,
type="default"
}:Props){

return(

<span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${styles[type]}`}>

{children}

</span>

);

}
