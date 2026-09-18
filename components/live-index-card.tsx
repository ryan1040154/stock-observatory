import type {LiveIndex} from '../lib/live-index';
import {AnimatedNumber} from './animated-number';
export function LiveIndexCard({quote,fallback,error,checked,onOpen}:{onOpen:()=>void;quote:LiveIndex|null;fallback:{close:number|null;pct:number|null;date:string}|null;error:string;checked:number}){
 const now=Date.now();const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(now));const part=(n:string)=>parts.find(p=>p.type===n)?.value||'';
 const date=`${part('year')}-${part('month')}-${part('day')}`,minutes=Number(part('hour'))*60+Number(part('minute'));
 const trading=minutes>=540&&minutes<810&&![0,6].includes(new Date(date+'T12:00:00+08:00').getDay());
 const stale=quote&&(quote.date!==date||(trading&&now-quote.quoteAt>90000));
 const value=quote||fallback;const pct=value?.pct;const format=(v:number|null|undefined)=>v==null?'—':v.toLocaleString('zh-TW',{maximumFractionDigits:2});
 return <article><span>加權指數 <small>{quote?(stale?'報價未跟上目前時間':trading?'盤中報價':'非交易時段 · 最新報價'):'盤後備援'}</small></span><strong><AnimatedNumber value={value?.close}/></strong><div className={pct==null||pct===0?'':pct>0?'positive':'negative'}>{pct!=null?<AnimatedNumber value={pct} signed suffix="%"/>:'—'}{quote&&<small> · {quote.change>0?'+':''}{format(quote.change)} 點</small>}</div><small style={{display:'block'}}>{checked?'上次更新 '+new Date(checked).toLocaleTimeString('zh-TW',{hour12:false,timeZone:'Asia/Taipei'}):'正在查詢盤中指數…'}</small>{error&&<small role="status" style={{display:'block',color:'#d70015'}}>{error}</small>}<button className="linkbutton" style={{marginTop:10}} onClick={onOpen}>查看走勢／K 線 ↗</button></article>;
}
