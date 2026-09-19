import {test} from 'node:test';
import assert from 'node:assert/strict';
import {parseLiveStocks,createLiveStocksService} from '../lib/live-stocks.ts';
const row={c:'2330',ex:'tse',n:'台積電',z:'100',d:'20260918',t:'10:30:00'};
const payload=(rows:object[])=>({rtcode:'0000',msgArray:rows});
test('最近成交價只接受有效成交與日期，不能用買賣掛單取代',()=>{
 assert.equal(parseLiveStocks(payload([row]))[0].close,100);
 assert.equal(parseLiveStocks(payload([{...row,z:'-',a:'101',b:'99'},{...row,d:'20260230'},{...row,z:'0'}])).length,0);
 assert.equal(parseLiveStocks(payload([{...row,c:'6488',ex:'otc'}]))[0].symbol,'6488');
});
test('庫存報價合併請求、15 秒快取、缺價與失敗保留時間',async()=>{
 let now=1000,calls=0,fail=false;
 const service=createLiveStocksService(async()=>{calls++;if(fail)throw Error();return payload([row]);},()=>now);
 const [a,b]=await Promise.all([service(['2330','0050']),service(['0050','2330'])]);
 assert.equal(calls,1);assert.deepEqual(a,b);assert.deepEqual(a.missing,['0050']);
 await service(['2330','0050']);assert.equal(calls,1);
 now+=15000;fail=true;const failed=await service(['0050','2330']);
 assert.equal(failed.data[0].quoteAt,a.data[0].quoteAt);assert.ok(failed.error);assert.equal(failed.checked,now);
});
test('較舊的成交資料不會取代較新的報價',async()=>{
 let now=1000,time='10:30:00';const service=createLiveStocksService(async()=>payload([{...row,t:time}]),()=>now);
 await service(['2330']);now+=15000;time='10:00:00';const result=await service(['2330']);
 assert.deepEqual(result.missing,['2330']);assert.equal(result.data.length,0);
});
