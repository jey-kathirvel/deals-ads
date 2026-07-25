import assert from "node:assert/strict";

import {
  PublishQueue,
} from "../../lib/deals-engine/publish/publish-queue";

import {
  PriorityEngine,
} from "../../lib/deals-engine/publish/priority-engine";

const deals=[

{
id:"1",
score:95,
discoveredAt:"2026-07-25T10:00:00Z",
},

{
id:"2",
score:60,
discoveredAt:"2026-07-25T11:00:00Z",
},

{
id:"3",
score:85,
discoveredAt:"2026-07-25T09:00:00Z",
},

{
id:"4",
score:95,
discoveredAt:"2026-07-25T12:00:00Z",
},

];

const queue =
new PublishQueue({
minimumScore:70,
maximumQueueSize:2,
});

const result=
queue.process(
deals,
);

assert.equal(
result.accepted.length,
2,
);

assert.equal(
result.rejected.length,
2,
);

assert.equal(
result.accepted[0].id,
"4",
);

assert.equal(
result.accepted[1].id,
"1",
);

const priority=
new PriorityEngine();

const ranked=
priority.rank(
deals,
);

assert.equal(
ranked[0].id,
"4",
);

assert.equal(
ranked[1].id,
"1",
);

console.log(
JSON.stringify(
{
status:"passed",
accepted:
result.accepted.map(
d=>d.id,
),
rejected:
result.rejected.map(
d=>d.id,
),
},
null,
2,
),
);
