import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculate,validateTrade,type Trade} from '../lib/portfolio.ts';
const trade=(x:Partial<Trade>):Trade=>({id:'test-transaction-001',date:'2025-01-01',broker:'新光',symbol:'2330',name:'台積電',kind:'buy',shares:1000,price:100,fee:100,tax:0,amount:0,note:'',...x});
test('partial sale allocates weighted cost including fee, with separate dividend',()=>{const [p]=calculate([trade({}),trade({price:200,fee:200}),trade({kind:'sell',shares:500,price:220,fee:100,tax:330}),trade({kind:'dividend',amount:1234})]);assert.equal(p.shares,1500);assert.equal(p.cost,225225);assert.equal(p.realized,34495);assert.equal(p.dividends,1234);});
test('full sale removes rounding residue and brokers stay separate',()=>{const p=calculate([trade({shares:3,price:10,fee:1}),trade({shares:1,kind:'sell',price:11,fee:0}),trade({shares:2,kind:'sell',price:11,fee:0}),trade({broker:'中信'})]);assert.equal(p[0].cost,0);assert.equal(p[0].shares,0);assert.equal(p[0].realized,2);assert.equal(p[1].shares,1000);});
test('overselling rejected including backdated sale',()=>{assert.throws(()=>calculate([trade({}),trade({kind:'sell',shares:1001})]),/超過/);assert.throws(()=>calculate([trade({date:'2025-01-02'}),trade({kind:'sell'})]),/超過/);});
test('validation rejects NaN, invalid calendar days and fractional shares',()=>{for(const x of [{price:NaN},{date:'2025-02-30'},{shares:0.1},{date:'2099-01-01'}])assert.throws(()=>validateTrade(trade(x)));assert.equal(validateTrade(trade({})).symbol,'2330');});
