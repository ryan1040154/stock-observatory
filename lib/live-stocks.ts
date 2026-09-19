export type LiveStock={symbol:string;name:string;close:number;date:string;time:string;quoteAt:number};
export function parseLiveStocks(payload:unknown):LiveStock[]{
 const d=payload as {rtcode?:string;msgArray?:Record<string,string>[]};
 if(d?.rtcode!=='0000'||!Array.isArray(d.msgArray))throw new Error('盤中來源未提供資料');
 return d.msgArray.flatMap(r=>{
  if(!/^\d{4,6}[A-Z]?$/.test(r.c)||!['tse','otc'].includes(r.ex)||!/^\d{8}$/.test(r.d)||!/^\d{2}:\d{2}:\d{2}$/.test(r.t))return [];
  const close=Number(r.z),date=`${r.d.slice(0,4)}-${r.d.slice(4,6)}-${r.d.slice(6,8)}`,quoteAt=Date.parse(`${date}T${r.t}+08:00`);
  if(!Number.isFinite(close)||close<=0||!Number.isFinite(quoteAt)||new Date(quoteAt+28800000).toISOString().slice(0,19)!==`${date}T${r.t}`)return [];
  return [{symbol:r.c,name:r.n||r.c,close,date,time:r.t,quoteAt}];
 });
}
export function createLiveStocksService(loader:(symbols:string[])=>Promise<unknown>,now=()=>Date.now()){
 const cache=new Map<string,{data:LiveStock[];checked:number;missing:string[];error?:string}>();
 const pending=new Map<string,Promise<{data:LiveStock[];checked:number;missing:string[];error?:string}>>();
 return async(symbols:string[])=>{
  const list=[...new Set(symbols)].sort(),key=list.join(','),old=cache.get(key);
  if(pending.has(key))return pending.get(key)!;
  if(old&&now()-old.checked<15000)return old;
  const task=(async()=>{
   let result;
   try{const fresh=parseLiveStocks(await loader(list));const data=fresh.filter(q=>list.includes(q.symbol)&&(!old?.data.find(p=>p.symbol===q.symbol)||q.quoteAt>=old.data.find(p=>p.symbol===q.symbol)!.quoteAt));const missing=list.filter(s=>!data.some(q=>q.symbol===s));result={data,checked:now(),missing,...(missing.length?{error:'部分股票沒有有效最近成交價，改用收盤估值。'}:{})};}
   catch{result={data:old?.data||[],checked:now(),missing:old?.missing||list,error:'盤中來源暫時無法更新，保留上次報價；請核對成交時間。'};}
   if(cache.size>=100&&!cache.has(key))cache.delete(cache.keys().next().value!);cache.set(key,result);return result;
  })();pending.set(key,task);try{return await task;}finally{pending.delete(key);}
 };
}
export const liveStocks=createLiveStocksService(async symbols=>{
 const channels=symbols.flatMap(s=>[`tse_${s}.tw`,`otc_${s}.tw`]).join('|');
 const r=await fetch('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch='+encodeURIComponent(channels)+'&json=1&delay=0&_='+Date.now(),{headers:{Accept:'application/json',Referer:'https://mis.twse.com.tw/stock/index.html','User-Agent':'Chipfolio/1.0 personal dashboard'},signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!r.ok)throw new Error('MIS HTTP '+r.status);return r.json();
});
