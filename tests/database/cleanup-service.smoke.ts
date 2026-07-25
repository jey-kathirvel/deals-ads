import assert from "node:assert/strict";

import {
DealSource,
DealStatus,
} from "../../lib/database/models";

import {
InMemoryDealRepository,
} from "../../lib/database/repositories";

import {
CleanupService,
} from "../../lib/database/services";

const repo =
new InMemoryDealRepository();

const now =
new Date(
"2026-07-25T00:00:00Z",
);

function create(
id: string,
status: DealStatus,
){

return{

id,

externalId:id,

source:DealSource.AMAZON,

status,

title:id,

url:"https://example.com",

imageUrl:"https://example.com/img.jpg",

category:"Electronics",

currency:"INR",

currentPrice:100,

originalPrice:200,

discountPercentage:50,

score:90,

discoveredAt:now,

expiresAt:
status===DealStatus.DISCOVERED
?new Date(
"2026-07-20T00:00:00Z",
)
:null,

publishedAt:
status===DealStatus.PUBLISHED
?new Date(
"2026-06-01T00:00:00Z",
)
:null,

archivedAt:
status===DealStatus.ARCHIVED
?new Date(
"2026-03-01T00:00:00Z",
)
:null,

createdAt:now,

updatedAt:now,

};

}

await repo.createMany([

create(
"expired",
DealStatus.DISCOVERED,
),

create(
"archive",
DealStatus.PUBLISHED,
),

create(
"delete",
DealStatus.ARCHIVED,
),

]);

const service =
new CleanupService(
repo,
);

const result =
await service.run({

now,

archivePublishedAfterDays:30,

deleteArchivedAfterDays:90,

});

assert.deepEqual(
result,
{

expired:1,

archived:1,

deleted:1,

},
);

assert.equal(
await repo.count(),
2,
);

console.log(
JSON.stringify(
{
status:"passed",
result,
},
null,
2,
),
);

