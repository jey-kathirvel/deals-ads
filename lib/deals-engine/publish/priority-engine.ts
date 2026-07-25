import {
  PublishCandidate,
} from "./publish-queue";

export class PriorityEngine {

  rank(
    deals: PublishCandidate[],
  ): PublishCandidate[]{

    return [...deals].sort(
      (a,b)=>{

        if(b.score!==a.score){
          return b.score-a.score;
        }

        const ad =
          new Date(
            a.discoveredAt ?? 0,
          ).getTime();

        const bd =
          new Date(
            b.discoveredAt ?? 0,
          ).getTime();

        return bd-ad;

      },
    );

  }

}
