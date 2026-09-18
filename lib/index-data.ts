import {cached,database} from './storage.ts';
import {iso,num,type Candle} from './market.ts';
export type IntradayPoint={time:string;timestamp:number;close:number;amount:number|null};
export type IndexIntraday={date:string;previous:number|null;points:IntradayPoint[]};
export function parseIndexIntraday(payload:unknown):IndexIntraday{
 const d=payload as {rtcode?:string;infoArray?:Record<string,string>[];ohlcArray?:Record<string,string>[]};const info=d?.infoArray?.find(r=>r.c==='t00'&&r.ex==='tse');
 if(d?.rtcode!=='0000'||!info||!/^\d{8}$/.test(info.d)||!Array.isArray(d.ohlcArray))throw new Error('證交所分時資料格式不完整。');
 const date=iso(info.d);const points=d.ohlcArray.flatMap(r=>{if(!/^\d{6}$/.test(r.ts))return [];const time=`${r.ts.slice(0,2)}:${r.ts.slice(2,4)}:${r.ts.slice(4,6)}`;const timestamp=Date.parse(`${date}T${time}+08:00`),close=num(r.c),amount=num(r.s);if(!Number.isFinite(timestamp)||close==null||close<=0||time<'09:00:00'||time>'13:35:00'||new Date(timestamp+8*3600000).toISOString().slice(0,19)!==`${date}T${time}`)return [];return [{time,timestamp,close,amount:amount!=null&&amount>=0?amount/100:null}];});
 if(!points.length)throw new Error('盤中分時資料尚未公布。');
 return {date,previous:num(info.y),points:[...new Map(points.map(p=>[p.timestamp,p])).values()].sort((a,b)=>a.timestamp-b.timestamp)};
}
let pending:ReturnType<typeof loadIntraday>|null=null;
async function loadIntraday(){return cached('taiex-intraday-v1',15000,async()=>{const r=await fetch('https://mis.twse.com.tw/stock/data/mis_ohlc_TSE.txt?_='+Date.now(),{headers:{Referer:'https://mis.twse.com.tw/stock/index.html','User-Agent':'Chipfolio/1.0 personal dashboard'},signal:AbortSignal.timeout(10000),cache:'no-store'});if(!r.ok)throw new Error('MIS '+r.status);const data=parseIndexIntraday(await r.json());const old=database().prepare('SELECT payload FROM market_cache WHERE key=?').bind('taiex-intraday-v1').first<{payload:string}>();if(old&&JSON.parse(old.payload).date>data.date)throw new Error('来源回傳較舊日期。');return data;});}
export async function indexIntraday(){if(pending)return pending;pending=loadIntraday();try{return await pending;}finally{pending=null;}}
export function parseIndexDaily(d:unknown):Candle[]{const payload=d as {stat?:string;data?:string[][]};if(payload?.stat!=='OK'||!Array.isArray(payload.data))throw new Error('指數歷史未公布。');const rows=payload.data.flatMap(r=>{const [open,high,low,close]=r.slice(1,5).map(num);if([open,high,low,close].some(v=>v==null))return [];return [{date:iso(r[0]),open:open!,high:high!,low:low!,close:close!}];});if(!rows.length)throw new Error('指數歷史沒有有效資料。');return rows;}
export async function indexDaily(force=false){return cached('taiex-daily-v1',3600000,async()=>{
 const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());const end=new Date(date+'T12:00:00Z');const months=Array.from({length:6},(_,i)=>new Date(Date.UTC(end.getUTCFullYear(),end.getUTCMonth()-i,1)).toISOString().slice(0,10).replaceAll('-',''));
 const rows:Candle[]=[];let failures=0;
 for(let i=0;i<months.length;i+=3){await Promise.all(months.slice(i,i+3).map(async month=>{const r=await cached('taiex-month:'+month,month===months[0]?3600000:7*86400000,async()=>{const response=await fetch('https://www.twse.com.tw/indicesReport/MI_5MINS_HIST?response=json&date='+month,{signal:AbortSignal.timeout(15000)});if(!response.ok)throw new Error('TWSE '+response.status);return parseIndexDaily(await response.json());},force);if(r.error)failures++;if(r.data)rows.push(...r.data);}));}
 if(failures)throw new Error('指數歷史部分月份未取得，保留前次資料。');
 const db=database();const old=db.prepare('SELECT payload FROM market_cache WHERE key=?').bind('taiex-daily-saved').first<{payload:string}>();const data=[...new Map([...(old?JSON.parse(old.payload):[]),...rows.filter(r=>r.date<date)].map((r:Candle)=>[r.date,r])).values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(-1500);
 if(!data.length)throw new Error('指數日線尚無資料。');db.prepare('INSERT INTO market_cache(key,payload,updated) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET payload=excluded.payload,updated=excluded.updated').bind('taiex-daily-saved',JSON.stringify(data),Date.now()).run();return data;
 },force);}
