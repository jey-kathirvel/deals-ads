"use client";

import { useEffect, useRef, useState } from "react";

export default function DealsCampaignTrigger() {

  const ref = useRef<HTMLDivElement>(null);

  const [campaign,setCampaign] = useState<any>(null);

  const [visible,setVisible] = useState(false);

  useEffect(()=>{

    const observer=new IntersectionObserver(

      async(entries)=>{

        const entry=entries[0];

        if(!entry.isIntersecting) return;

        observer.disconnect();

        if(sessionStorage.getItem("deals_campaign_shown"))
          return;

        const r=await fetch("/api/campaigns/active?placement=deals",{
          cache:"no-store"
        });

        const data=await r.json();

        if(!data) return;

        sessionStorage.setItem("deals_campaign_shown","1");

        setCampaign(data);

        setVisible(true);

      },

      {
        threshold:0.4
      }

    );

    if(ref.current)
      observer.observe(ref.current);

    return()=>observer.disconnect();

  },[]);

  return(

    <>

      <div
        ref={ref}
        id="deals-campaign-trigger"
      />

      {

        visible && campaign?.type==="iframe" && (

          <div
            className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center"
            onClick={()=>setVisible(false)}
          >

            <div
              className="bg-white rounded-xl overflow-hidden w-[95vw] max-w-5xl h-[85vh]"
              onClick={e=>e.stopPropagation()}
            >

              <div className="flex justify-between items-center p-3 border-b">

                <div>

                  <h2 className="font-bold text-lg">

                    {campaign.title}

                  </h2>

                  <div className="text-sm text-gray-500">

                    {campaign.subtitle}

                  </div>

                </div>

                <button
                  onClick={()=>setVisible(false)}
                  className="text-2xl"
                >
                  ×
                </button>

              </div>

              <iframe
                src={campaign.iframeUrl}
                className="w-full h-full"
                allowFullScreen
              />

            </div>

          </div>

        )

      }

    </>

  );

}
