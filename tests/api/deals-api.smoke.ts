import assert from "node:assert/strict";

import {
DealSource,
DealStatus,
} from "../../lib/database/models";

import {
InMemoryDealRepository,
} from "../../lib/database/repositories";

import {
DealsApi,
} from "../../lib/api";

const repo =
new InMemoryDealRepository();

const now =
new Date();

function create(
id:string,
score:number,
){

return{

id,

externalId:id,

source:DealSource.AMAZON,

status:DealStatus.PUBLISHED,

title:"Product "+id,

url:"https://example.com",

imageUrl:"https://example.com/img.jpg",

category:"Electronics",

currency:"INR",

currentPrice:100,

originalPrice:200,

discountPercentage:50,

score,

discoveredAt:now,

expiresAt:null,

publishedAt:now,

archivedAt:null,

createdAt:now,

updatedAt:now,

};

}

await repo.createMany([

create(
"a",
95,
),

create(
"b",
80,
),

create(
"c",
60,
),

]);

const api =
new DealsApi(repo);

const response =
await api.listDeals({

minimumScore:70,

});

assert.equal(
response.total,
2,
);

assert.equal(
response.items.length,
2,
);

assert.equal(
response.items[0].id,
"a",
);

const single =
await api.getDeal("b");

assert.equal(
single?.id,
"b",
);

const missing =
await api.getDeal("unknown");

assert.equal(
missing,
null,
);

console.log(
JSON.stringify(
{
status:"passed",
returned:
response.items.length,
total:
response.total,
},
null,
2,
),
);

