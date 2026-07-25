import assert from "node:assert/strict";

import {
PublishPipeline,
} from "../../lib/deals-engine/publish";

const pipeline =
new PublishPipeline();

const result =
pipeline.run([

{
id:"1",
score:95,
expiresAt:"2026-08-01",
quality:{
score:95,
grade:"excellent",
publishable:true,
breakdown:{} as any,
issues:[],
},
},

{
id:"2",
score:20,
expiresAt:"2026-08-01",
quality:{
score:20,
grade:"poor",
publishable:false,
breakdown:{} as any,
issues:[],
},
},

{
id:"3",
score:92,
expiresAt:"2026-07-01",
quality:{
score:92,
grade:"excellent",
publishable:true,
breakdown:{} as any,
issues:[],
},
},

]);

assert.equal(
result.published.length,
1,
);

assert.equal(
result.archived.length,
1,
);

assert.equal(
result.expired.length,
1,
);

assert.equal(
result.published[0].id,
"1",
);

console.log(
JSON.stringify(
{
status:"passed",
published:
result.published.length,
archived:
result.archived.length,
expired:
result.expired.length,
},
null,
2,
),
);
