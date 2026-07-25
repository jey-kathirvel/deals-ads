export interface RotationDeal {
  id: string;
  score: number;
  discoveredAt?: Date | string;
}

export interface RotationResult {
  published: RotationDeal[];
  archived: RotationDeal[];
}

export interface DailyRotationOptions {
  maximumActiveDeals?: number;
}

export class DailyRotationEngine {

  private readonly maximumActiveDeals:number;

  constructor(
    options:DailyRotationOptions={}
  ){
    this.maximumActiveDeals=
      options.maximumActiveDeals ?? 100;
  }

  rotate(
    deals:readonly RotationDeal[],
  ):RotationResult{

    const ranked=[...deals].sort(
      (a,b)=>{

        if(b.score!==a.score){
          return b.score-a.score;
        }

        const at=
          new Date(
            a.discoveredAt ?? 0,
          ).getTime();

        const bt=
          new Date(
            b.discoveredAt ?? 0,
          ).getTime();

        return bt-at;

      },
    );

    return{

      published:
        ranked.slice(
          0,
          this.maximumActiveDeals,
        ),

      archived:
        ranked.slice(
          this.maximumActiveDeals,
        ),

    };

  }

}
