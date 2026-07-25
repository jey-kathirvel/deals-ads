import assert from "node:assert/strict";

import {
SchedulerQueueService,
SchedulerJobStatus,
} from "../../lib/database/services";

const queue =
new SchedulerQueueService();

queue.enqueue({

id:"job-1",

provider:"amazon",

scheduledAt:
new Date("2026-07-25T00:00:00Z"),

status:
SchedulerJobStatus.PENDING,

attempts:0,

});

queue.enqueue({

id:"job-2",

provider:"flipkart",

scheduledAt:
new Date("2026-07-25T00:05:00Z"),

status:
SchedulerJobStatus.PENDING,

attempts:0,

});

let job =
queue.dequeue();

assert.equal(
job?.id,
"job-1",
);

queue.complete(
"job-1",
);

job =
queue.dequeue();

assert.equal(
job?.id,
"job-2",
);

queue.fail(
"job-2",
"Timeout",
);

const stats =
queue.statistics();

assert.deepEqual(
stats,
{

pending:0,

running:0,

completed:1,

failed:1,

},
);

console.log(
JSON.stringify(
{
status:"passed",
stats,
},
null,
2,
),
);

