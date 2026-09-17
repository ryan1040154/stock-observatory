
import {twse,tpex,institutions,otcInstitutions,holdings,futures,overseas,usQuote,recordObservations,stockHistory} from '../../../lib/market.ts';
export const dynamic='force-dynamic';
export async function GET(request:Request){try{

 const q=new URL(request.url).searchParams;const group=q.get('group')||'quotes';const headers={'Cache-Control':'no-store'};
 if(group==='quotes'){const [a,b]=await Promise.all([twse(),tpex()]);return Response.json({quotes:[...(a.data?.quotes||[]),...(b.data||[])],index:a.data?.index,status:[{name:'上市收盤',updated:a.updated,error:a.error},{name:'上櫃收盤',updated:b.updated,error:b.error}]},{headers});}
 if(group==='global'){const all=await Promise.all([futures(),...overseas.map(([s,n])=>usQuote(s,n))]);return Response.json({items:all.map((r,i)=>({...(r.data||{symbol:i===0?'TX':overseas[i-1][0],name:i===0?'台指期夜盤':overseas[i-1][1]}),updated:r.updated,error:r.error}))},{headers});}
 if(group==='chips'){const symbols=(q.get('symbols')||'2330').split(',');if(symbols.length>50||symbols.some(s=>!/^\d{4,6}[A-Z]?$/.test(s)))return Response.json({error:'代號格式錯誤'},{status:400});const [a,b,c]=await Promise.all([institutions(),otcInstitutions(),holdings()]);const chips=[...(a.data||[]),...(b.data||[])].filter(x=>symbols.includes(x.symbol));const h=(c.data||[]).filter(x=>symbols.includes(x.symbol));return Response.json({chips,holdings:h,observations:await recordObservations(chips,h),status:[{name:'上市法人',updated:a.updated,error:a.error},{name:'上櫃法人',updated:b.updated,error:b.error},{name:'集保',updated:c.updated,error:c.error}]},{headers});}
 if(group==='history'){const symbol=q.get('symbol')||'';if(!/^\d{4,6}[A-Z]?$/.test(symbol))return Response.json({error:'代號格式錯誤'},{status:400});const market=q.get('market')==='上櫃'?'上櫃':'上市';const r=await stockHistory(symbol,market);return Response.json({...r,source:market==='上市'?'證交所':'Yahoo Finance（非官方介面）'},{headers});}
 return Response.json({error:'未知資料類型'},{status:400});
 }catch(e){console.error(e);return Response.json({error:'資料服務暫時不可用，請稍後重試。'},{status:503});}}
