import type {Candle} from './market.ts';
export type ChartPeriod='day'|'week'|'month';
export type ChartRow=Candle&{ma5?:number;ma20?:number;ma60?:number};
export function aggregateCandles(input:Candle[],period:ChartPeriod):Candle[]{
 const rows=[...new Map(input.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&[r.open,r.high,r.low,r.close].every(Number.isFinite)).map(r=>[r.date,r])).values()].sort((a,b)=>a.date.localeCompare(b.date));
 if(period==='day')return rows;
 const buckets=new Map<string,Candle>();
 for(const r of rows){let key=r.date.slice(0,7);if(period==='week'){const d=new Date(r.date+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);key=d.toISOString().slice(0,10);}const prior=buckets.get(key);if(!prior)buckets.set(key,{...r});else buckets.set(key,{...prior,high:Math.max(prior.high,r.high),low:Math.min(prior.low,r.low),close:r.close,volume:prior.volume!=null&&r.volume!=null?prior.volume+r.volume:undefined,contract:prior.contract===r.contract?prior.contract:undefined});}
 return [...buckets.values()];
}
export function withMovingAverages(rows:Candle[]):ChartRow[]{return rows.map((r,i)=>{const result:ChartRow={...r};for(const n of [5,20,60] as const)if(i+1>=n)result[`ma${n}`]=rows.slice(i+1-n,i+1).reduce((sum,r)=>sum+r.close,0)/n;return result;});}
