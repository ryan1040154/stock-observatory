import {getChatGPTUser} from '@/app/chatgpt-auth';
import {database} from '@/lib/storage';
import {calculate,emptyPortfolio,validateTrade,type Portfolio} from '@/lib/portfolio';
export const dynamic='force-dynamic';
const response=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{const user=await getChatGPTUser();if(!user)return response({error:'請先登入以儲存庫存。'},401);const row=await database().prepare('SELECT payload,revision FROM portfolios WHERE user_id=?').bind(user.userId).first<{payload:string;revision:number}>();return response({portfolio:row?JSON.parse(row.payload):emptyPortfolio(),revision:row?.revision??0});}catch{return response({error:'無法讀取庫存，請稍後重試。'},503);}}
export async function POST(request:Request){
 try{const user=await getChatGPTUser();if(!user)return response({error:'請先登入。'},401);
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'不允許跨網站修改。'},403);
 const raw=await request.text();if(raw.length>10000)return response({error:'資料過大。'},413);const input=JSON.parse(raw);const db=database();
 await db.prepare('INSERT OR IGNORE INTO portfolios(user_id,payload,revision) VALUES(?,?,0)').bind(user.userId,JSON.stringify(emptyPortfolio())).run();
 const row=await db.prepare('SELECT payload,revision FROM portfolios WHERE user_id=?').bind(user.userId).first<{payload:string;revision:number}>();if(!row)throw new Error('無法取得庫存。');
 if(input.revision!==row.revision)return response({error:'資料已在其他視窗更新，請重新整理後再儲存。'},409);
 const p:Portfolio=JSON.parse(row.payload);
 if(input.action==='add'){const t=validateTrade(input.trade);if(!p.trades.some(x=>x.id===t.id)){if(p.trades.length>=4000)throw new Error('交易紀錄已達上限。');p.trades.push(t);}calculate(p.trades);}
 else if(input.action==='delete'){if(typeof input.id!=='string')throw new Error('紀錄格式錯誤。');p.trades=p.trades.filter(t=>t.id!==input.id);calculate(p.trades);}
 else if(input.action==='watch'){if(!Array.isArray(input.symbols)||input.symbols.length>50||input.symbols.some((s:unknown)=>typeof s!=='string'||!/^\d{4,6}[A-Z]?$/.test(s)))throw new Error('自選最多 50 檔，請輸入有效股票代號。');p.watchlist=[...new Set<string>(input.symbols)];}
 else throw new Error('未知操作。');
 const result=await db.prepare('UPDATE portfolios SET payload=?,revision=revision+1 WHERE user_id=? AND revision=?').bind(JSON.stringify(p),user.userId,row.revision).run();
 if(result.meta.changes!==1)return response({error:'資料已更新，請重新整理後再試。'},409);
 return response({portfolio:p,revision:row.revision+1});
 }catch(e){return response({error:e instanceof Error?e.message:'儲存失敗，請稍後重試。'},400);}
}
