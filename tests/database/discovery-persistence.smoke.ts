import assert from "node:assert/strict";

import {
DealSource,
DealStatus,
} from "../../lib/database/models";

import {
InMemoryDealRepository,
} from "../../lib/database/repositories";

import {
DiscoveryPersistenceService,
} from "../../lib/database/services";

const repo =
new InMemoryDealRepository();

const service =
new DiscoveryPersistenceService(
repo,
);

const now =
new Date();

function deal(
id:string,
price:number,
){

return{

id,

externalId:id,

source:
DealSource.AMAZON,

status:
DealStatus.DISCOVERED,

title:
"Product "+id,

url:
"https://example.com/"+id,

imageUrl:
"https://example.com/image.jpg",

category:
"Electronics",

currency:
"INR",

currentPrice:
price,

originalPrice:
1000,

discountPercentage:
20,

score:
90,

discoveredAt:
now,

expiresAt:
new Date(
now.getTime()+86400000,
),

publishedAt:
null,

archivedAt:
null,

createdAt:
now,

updatedAt:
now,

};

}

let result =
await service.persist([

deal(
"A",
800,
),

deal(
"B",
700,
),

]);

assert.equal(
result.inserted,
2,
);

assert.equal(
await repo.count(),
2,
);

result =
await service.persist([

deal(
"A",
800,
),

deal(
"B",
650,
),

]);

assert.equal(
result.updated,
1,
);

assert.equal(
result.skipped,
1,
);

const updated =
await repo.findById(
"B",
);

assert.equal(
updated?.currentPrice,
650,
);

console.log(
JSON.stringify(
{
status:"passed",
inserted:2,
updated:1,
skipped:1,
},
null,
2,
),
);

