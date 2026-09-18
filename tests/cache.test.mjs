import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
test('manual refresh bypasses fresh cache and failures preserve successful data',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'chipfolio-cache-'));process.env.CHIPFOLIO_DATA_DIR=dir;
 const {cached,closeDatabase}=await import('../lib/storage.ts');let count=0;const loader=async()=>++count;
 try{let r=await cached('test',3600000,loader);assert.equal(r.data,1);assert.equal(r.cached,false);
 r=await cached('test',3600000,loader);assert.equal(r.data,1);assert.equal(r.cached,true);
 r=await cached('test',3600000,loader,true);assert.equal(r.data,2);assert.equal(r.cached,false);
 r=await cached('test',3600000,async()=>{throw new Error('offline');},true);assert.equal(r.data,2);assert.ok(r.error);
 }finally{closeDatabase();await rm(dir,{recursive:true,force:true});}
});
