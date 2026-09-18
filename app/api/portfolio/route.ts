
import {database} from '../../../lib/storage.ts';
import {calculate,emptyPortfolio,validateTrade,normalizePortfolio,accountName,type Portfolio} from '../../../lib/portfolio.ts';
export const dynamic='force-dynamic';
const response=(v:unknown,status=200)=>Response.json(v,{status,headers:{'Cache-Control':'no-store'}});
export async function GET(){try{const row=await database().prepare('SELECT payload,revision FROM portfolios WHERE user_id=?').bind('local').first<{payload:string;revision:number}>();return response({portfolio:row?normalizePortfolio(JSON.parse(row.payload)):emptyPortfolio(),revision:row?.revision??0});}catch{return response({error:'無法讀取庫存，請稍後重試。'},503);}}
export async function POST(request:Request){
 try{
 const origin=request.headers.get('origin');if(origin&&origin!==new URL(request.url).origin)return response({error:'不允許跨網站修改。'},403);
 const raw=await request.text();if(raw.length>4000000)return response({error:'資料過大。'},413);const input=JSON.parse(raw);const db=database();
 await db.prepare('INSERT OR IGNORE INTO portfolios(user_id,payload,revision) VALUES(?,?,0)').bind('local',JSON.stringify(emptyPortfolio())).run();
 const row=await db.prepare('SELECT payload,revision FROM portfolios WHERE user_id=?').bind('local').first<{payload:string;revision:number}>();if(!row)throw new Error('無法取得庫存。');
 if(input.revision!==row.revision)return response({error:'資料已在其他視窗更新，請重新整理後再儲存。'},409);
 const p:Portfolio=normalizePortfolio(JSON.parse(row.payload));
 if(input.action==='add'){const t=validateTrade(input.trade);if(!p.accounts.includes(t.broker))throw new Error('請先新增此證券帳戶。');if(!p.trades.some(x=>x.id===t.id)){if(p.trades.length>=4000)throw new Error('交易紀錄已達上限。');p.trades.push(t);}calculate(p.trades);}
 else if(input.action==='account'){
 const name=accountName(input.name);
 if(input.operation==='add'){if(p.accounts.includes(name))throw new Error('帳戶名称已存在。');if(p.accounts.length>=50)throw new Error('最多 50 個帳戶。');p.accounts.push(name);}
 else if(input.operation==='rename'){const old=accountName(input.old);if(!p.accounts.includes(old)||p.accounts.includes(name)&&old!==name)throw new Error('帳戶不存在或名稱重複。');p.accounts=p.accounts.map(a=>a===old?name:a);p.trades=p.trades.map(t=>t.broker===old?{...t,broker:name}:t);}
 else if(input.operation==='delete'){if(p.trades.some(t=>t.broker===name))throw new Error('帳戶有交易紀錄，請保留或改名。');if(p.accounts.length<=1)throw new Error('至少保留一個帳戶。');p.accounts=p.accounts.filter(a=>a!==name);}
 else throw new Error('未知帳戶操作。');
 }
 else if(input.action==='delete'){if(typeof input.id!=='string')throw new Error('紀錄格式錯誤。');p.trades=p.trades.filter(t=>t.id!==input.id);calculate(p.trades);}
 else if(input.action==='watch'){if(!Array.isArray(input.symbols)||input.symbols.length>50||input.symbols.some((s:unknown)=>typeof s!=='string'||!/^\d{4,6}[A-Z]?$/.test(s)))throw new Error('自選最多 50 檔，請輸入有效股票代號。');p.watchlist=[...new Set<string>(input.symbols)];}
 else if(input.action==='import'){
 const backup=input.backup;if(!backup||backup.version!==1||!Array.isArray(backup.trades)||backup.trades.length>4000||!Array.isArray(backup.watchlist)||backup.watchlist.length>50||backup.watchlist.some((s:unknown)=>typeof s!=='string'||!/^\d{4,6}[A-Z]?$/.test(s)))throw new Error('備份格式錯誤，請選擇 Chipfolio 匯出的 JSON。');
 const entries=new Map(p.trades.map(t=>[t.id,t]));
 for(const rawTrade of backup.trades){const t=validateTrade(rawTrade);const existing=entries.get(t.id);if(existing&&JSON.stringify(validateTrade(existing))!==JSON.stringify(t))throw new Error('相同交易編號內容不同，未匯入任何資料。');entries.set(t.id,t);}
 if(entries.size>4000)throw new Error('交易紀錄超過 4,000 筆。');p.trades=[...entries.values()];calculate(p.trades);if(backup.accounts!==undefined&&(!Array.isArray(backup.accounts)||backup.accounts.length>50))throw new Error('帳戶備份格式錯誤。');p.accounts=[...new Set([...p.accounts,...(backup.accounts||[]).map(accountName),...p.trades.map(t=>t.broker)])];if(p.accounts.length>50)throw new Error('帳戶超過 50 個。');p.watchlist=[...new Set<string>([...p.watchlist,...backup.watchlist])];if(p.watchlist.length>50)throw new Error('合併後自選超過 50 檔。');
 }
 else throw new Error('未知操作。');
 const result=await db.prepare('UPDATE portfolios SET payload=?,revision=revision+1 WHERE user_id=? AND revision=?').bind(JSON.stringify(p),'local',row.revision).run();
 if(result.meta.changes!==1)return response({error:'資料已更新，請重新整理後再試。'},409);
 return response({portfolio:p,revision:row.revision+1});
 }catch(e){return response({error:e instanceof Error?e.message:'儲存失敗，請稍後重試。'},400);}
}
