import assert from "node:assert/strict";

import {
DailyRotationEngine,
} from "../../lib/deals-engine/publish/daily-rotation-engine";

const deals=[];

for(let i=1;i<=120;i++){

deals.push({

id:String(i),

score:121-i,

discoveredAt:
new Date(
Date.UTC(
2026,
6,
25,
0,
i,
0,
),
),

});

}

const engine=
new DailyRotationEngine({

maximumActiveDeals:100,

});

const result=
engine.rotate(
deals,
);

assert.equal(
result.published.length,
100,
);

assert.equal(
result.archived.length,
20,
);

assert.equal(
result.published[0].id,
"1",
);

assert.equal(
result.archived[0].id,
"101",
);

console.log(
JSON.stringify(
{
status:"passed",
published:
result.published.length,
archived:
result.archived.length,
},
null,
2,
),
);
