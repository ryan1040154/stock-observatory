import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
export const dataDirectory=resolve(process.env.CHIPFOLIO_DATA_DIR||fileURLToPath(new URL('../data/',import.meta.url)));
let connection:DatabaseSync;
export function database(){
 if(!connection){mkdirSync(dataDirectory,{recursive:true});connection=new DatabaseSync(resolve(dataDirectory,'chipfolio.sqlite'));connection.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS portfolios(user_id TEXT PRIMARY KEY,payload TEXT NOT NULL,revision INTEGER NOT NULL DEFAULT 0); CREATE TABLE IF NOT EXISTS market_cache(key TEXT PRIMARY KEY,payload TEXT NOT NULL,updated INTEGER NOT NULL);');}
 return {
  prepare(sql:string){
   const statement=connection.prepare(sql);
   return {bind(...values:(string|number|null)[]){
    return {
     first<T>():T|null{return (statement.get(...values) as T)||null;},
     run(){const r=statement.run(...values);return {meta:{changes:Number(r.changes)}};}
    };
   }};
  }
 };
}
export async function cached<T>(key:string,ttl:number,loader:()=>Promise<T>):Promise<{data:T|null;updated:number|null;error?:string}>{
 const db=database();const row=await db.prepare('SELECT payload, updated FROM market_cache WHERE key=?').bind(key).first<{payload:string;updated:number}>();
 if(row&&Date.now()-row.updated<ttl)return {data:JSON.parse(row.payload),updated:row.updated};
 try{const data=await loader();const updated=Date.now();await db.prepare('INSERT INTO market_cache (key,payload,updated) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(key,JSON.stringify(data),updated).run();return {data,updated};}
 catch(e){console.error('Market source unavailable',key,e instanceof Error?e.message:'error');return {data:row?JSON.parse(row.payload):null,updated:row?.updated||null,error:'來源暫時無法更新'+(row?'，保留上次成功資料。':'，請稍後重試。')};}
}
