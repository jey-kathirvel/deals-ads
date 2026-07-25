import assert from "node:assert/strict";

import {
  DealExpiryManager,
} from "../../lib/deals-engine/publish/deal-expiry-manager";

const manager =
new DealExpiryManager({

now:
new Date(
"2026-07-25T00:00:00Z",
),

expiringSoonHours:24,

});

const result =
manager.process([

{
id:"1",
expiresAt:
"2026-07-28T00:00:00Z",
},

{
id:"2",
expiresAt:
"2026-07-25T06:00:00Z",
},

{
id:"3",
expiresAt:
"2026-07-24T00:00:00Z",
},

{
id:"4",
},

]);

assert.equal(
result.active.length,
3,
);

assert.equal(
result.expired.length,
1,
);

assert.equal(
result.expiringSoon.length,
1,
);

assert.equal(
result.expiringSoon[0].id,
"2",
);

console.log(
JSON.stringify(
{
status:"passed",
active:
result.active.map(
d=>d.id,
),
expired:
result.expired.map(
d=>d.id,
),
expiringSoon:
result.expiringSoon.map(
d=>d.id,
),
},
null,
2,
),
);
