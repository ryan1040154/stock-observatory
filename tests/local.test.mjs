import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
const root=new URL('../',import.meta.url);
test('local account-free storage, validation, import, origin protection and restart',{timeout:30000},async()=>{
 const data=await mkdtemp(join(tmpdir(),'chipfolio-test-'));let child;
 async function start(){child=spawn(process.execPath,['local/server.ts'],{cwd:root,env:{...process.env,CHIPFOLIO_PORT:'0',CHIPFOLIO_DATA_DIR:data},stdio:['ignore','pipe','pipe']});let text='';return await new Promise((resolve,reject)=>{child.stdout.on('data',chunk=>{text+=chunk;try{resolve(JSON.parse(text.trim()).url);}catch{}});child.on('exit',code=>reject(new Error('server exit '+code)));});}
 async function stop(){const exited=once(child,'exit');child.kill();await exited;}
 try{
 let url=await start();let r=await fetch(url+'/api/portfolio');assert.equal(r.status,200);assert.equal((await r.json()).revision,0);
 const post=(body,origin=url)=>fetch(url+'/api/portfolio',{method:'POST',headers:{'content-type':'application/json',origin},body:JSON.stringify(body)});
 const trade={id:'test-trade-0001',date:'2025-01-01',broker:'新光',symbol:'2330',name:'台積電',kind:'buy',shares:100,price:1000,fee:20,tax:0,amount:0,note:''};
 r=await post({revision:0,action:'add',trade});assert.equal(r.status,200);
 assert.equal((await post({revision:0,action:'watch',symbols:[]})).status,409);
 assert.equal((await post({revision:1,action:'watch',symbols:[]},'https://example.com')).status,403);
 const backup={version:1,trades:[trade],watchlist:['2330']};r=await post({revision:1,action:'import',backup});assert.equal(r.status,200);assert.equal((await r.json()).portfolio.trades.length,1);
 r=await post({revision:2,action:'import',backup:{...backup,trades:[{...trade,price:999}]}});assert.equal(r.status,400);
 r=await post({revision:2,action:'add',trade:{...trade,id:'test-sell-0002',kind:'sell',shares:101}});assert.equal(r.status,400);
 r=await post({revision:2,action:'import',backup:{...backup,watchlist:['evil']}});assert.equal(r.status,400);
 assert.equal((await fetch(url+'/data/chipfolio.sqlite')).status,404);
 assert.equal((await fetch(url+'/api/portfolio',{headers:{'sec-fetch-site':'cross-site'}})).status,403);
 await stop();url=await start();r=await fetch(url+'/api/portfolio');const saved=await r.json();assert.equal(saved.revision,2);assert.equal(saved.portfolio.trades[0].price,1000);
 }finally{if(child&&!child.killed)await stop();await rm(data,{recursive:true,force:true});}
});
