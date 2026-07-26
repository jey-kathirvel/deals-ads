"use client";

import {useEffect} from "react";

export default function VisitTracker(){

useEffect(()=>{

fetch("/api/analytics/visit",{
method:"POST"
});

},[]);

return null;

}
