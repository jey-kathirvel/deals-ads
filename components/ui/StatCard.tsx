interface Props{
title:string;
value:any;
color?:
"blue"|
"green"|
"red"|
"amber";
}

const colors={
blue:"bg-blue-50 text-blue-700",
green:"bg-green-50 text-green-700",
red:"bg-red-50 text-red-700",
amber:"bg-amber-50 text-amber-700"
};

export default function StatCard({
title,
value,
color="blue"
}:Props){

return(

<div className={`rounded-xl p-6 ${colors[color]}`}>

<div className="text-sm opacity-70">

{title}

</div>

<div className="mt-2 text-3xl font-bold">

{value}

</div>

</div>

);

}
