export type LiveIndex={symbol:string;name:string;close:number;previous:number;change:number;pct:number;date:string;time:string;quoteAt:number;source:string;url:string;open?:number;high?:number;low?:number};
export function parseLiveIndex(payload:unknown):LiveIndex{
 const d=payload as {rtcode?:string;msgArray?:Record<string,string>[]};
 const r=d?.msgArray?.find(r=>r.c==='t00'&&r.ex==='tse');
 const number=(v:unknown)=>typeof v==='string'&&v.trim()!==''&&v!=='-'?Number(v.replaceAll(',','')):NaN;
 if(d?.rtcode!=='0000'||!r||!/^\d{8}$/.test(r.d)||!/^\d{2}:\d{2}:\d{2}$/.test(r.t))throw new Error('證交所盤中資料未提供有效報價。');
 const close=number(r.z),previous=number(r.y),date=`${r.d.slice(0,4)}-${r.d.slice(4,6)}-${r.d.slice(6,8)}`;
 const quoteAt=Date.parse(`${date}T${r.t}+08:00`);
 if(!Number.isFinite(close)||close<=0||!Number.isFinite(previous)||previous<=0||!Number.isFinite(quoteAt)||new Date(quoteAt+8*3600000).toISOString().slice(0,19)!==`${date}T${r.t}`)throw new Error('證交所盤中資料格式不完整。');
 const open=number(r.o),high=number(r.h),low=number(r.l);const valid=[open,high,low].every(v=>Number.isFinite(v)&&v>0)&&high>=Math.max(open,close)&&low<=Math.min(open,close);
 return {symbol:'TAIEX',name:'加權指數',close,previous,change:close-previous,pct:(close/previous-1)*100,date,time:r.t,quoteAt,source:'證交所 MIS',url:'https://mis.twse.com.tw/stock/index.html',...(valid?{open,high,low}:{})};
}
export function createLiveIndexService(loader:()=>Promise<unknown>,now=()=>Date.now()){
 let data:LiveIndex|null=null,checked=0,error:string|undefined,pending:Promise<{data:LiveIndex|null;checked:number;error?:string}>|null=null;
 return async()=>{
  if(pending)return pending;
  if(checked&&now()-checked<15000)return {data,checked,error};
  pending=(async()=>{
   try{const next=parseLiveIndex(await loader());if(data&&next.quoteAt<data.quoteAt)throw new Error('來源回傳較早報價，保留上次資料。');data=next;error=undefined;}
   catch{error='盤中來源暫時無法更新'+(data?'，保留上次報價。':'。');}
   checked=now();return {data,checked,error};
  })();
  try{return await pending;}finally{pending=null;}
 };
}
export const liveIndex=createLiveIndexService(async()=>{
 const r=await fetch('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_t00.tw&json=1&delay=0&_='+Date.now(),{headers:{Accept:'application/json',Referer:'https://mis.twse.com.tw/stock/index.html','User-Agent':'Chipfolio/1.0 personal dashboard'},signal:AbortSignal.timeout(10000),cache:'no-store'});
 if(!r.ok)throw new Error('MIS HTTP '+r.status);return r.json();
});
