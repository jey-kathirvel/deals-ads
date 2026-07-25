import assert from "node:assert/strict";

import {
DealSource,
DealStatus,
} from "../../lib/database/models";

import {
InMemoryDealRepository,
} from "../../lib/database/repositories";

import {
DuplicateDetectionService,
} from "../../lib/database/services";

const repo =
new InMemoryDealRepository();

const service =
new DuplicateDetectionService(repo);

const now =
new Date();

function deal(
id:string,
external:string,
){

return{

id,

externalId:external,

source:DealSource.AMAZON,

status:DealStatus.DISCOVERED,

title:"Product",

url:"https://example.com",

imageUrl:"https://example.com/img.jpg",

category:"Electronics",

currency:"INR",

currentPrice:100,

originalPrice:200,

discountPercentage:50,

score:90,

discoveredAt:now,

expiresAt:null,

publishedAt:null,

archivedAt:null,

createdAt:now,

updatedAt:now,

};

}

await repo.create(
deal(
"existing",
"amazon-1",
),
);

const result =
await service.filter([

deal(
"a",
"amazon-2",
),

deal(
"b",
"amazon-2",
),

deal(
"c",
"amazon-1",
),

deal(
"d",
"amazon-3",
),

]);

assert.equal(
result.accepted.length,
2,
);

assert.equal(
result.duplicates.length,
2,
);

assert.equal(
result.accepted[0].externalId,
"amazon-2",
);

assert.equal(
result.accepted[1].externalId,
"amazon-3",
);

console.log(
JSON.stringify(
{
status:"passed",
accepted:
result.accepted.length,
duplicates:
result.duplicates.length,
},
null,
2,
),
);

