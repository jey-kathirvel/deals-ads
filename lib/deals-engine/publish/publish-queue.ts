export interface PublishCandidate {
  id: string;
  score: number;
  discoveredAt?: Date | string;
  retailer?: string;
}

export interface PublishQueueOptions {
  minimumScore?: number;
  maximumQueueSize?: number;
}

export interface PublishQueueResult {
  accepted: PublishCandidate[];
  rejected: PublishCandidate[];
}

export class PublishQueue {

  private readonly minimumScore:number;
  private readonly maximumQueueSize:number;

  constructor(
    options: PublishQueueOptions = {},
  ){
    this.minimumScore =
      options.minimumScore ?? 70;

    this.maximumQueueSize =
      options.maximumQueueSize ?? 100;
  }

  process(
    deals: PublishCandidate[],
  ): PublishQueueResult {

    const accepted =
      deals
      .filter(
        d => d.score >= this.minimumScore,
      )
      .sort(
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
      )
      .slice(
        0,
        this.maximumQueueSize,
      );

    const acceptedIds =
      new Set(
        accepted.map(
          d=>d.id,
        ),
      );

    const rejected =
      deals.filter(
        d=>!acceptedIds.has(d.id),
      );

    return{
      accepted,
      rejected,
    };
  }
}
