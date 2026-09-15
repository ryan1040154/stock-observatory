import {env} from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('資料庫暫時無法使用，請稍後再試。');return env.DB;}
export async function cached<T>(key:string,ttl:number,loader:()=>Promise<T>):Promise<{data:T|null;updated:number|null;error?:string}>{
 const db=database();const row=await db.prepare('SELECT payload, updated FROM market_cache WHERE key=?').bind(key).first<{payload:string;updated:number}>();
 if(row&&Date.now()-row.updated<ttl)return {data:JSON.parse(row.payload),updated:row.updated};
 try{const data=await loader();const updated=Date.now();await db.prepare('INSERT INTO market_cache (key,payload,updated) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind(key,JSON.stringify(data),updated).run();return {data,updated};}
 catch(e){console.error('Market source unavailable',key,e instanceof Error?e.message:'error');return {data:row?JSON.parse(row.payload):null,updated:row?.updated||null,error:'來源暫時無法更新'+(row?'，保留上次成功資料。':'，請稍後重試。')};}
}
