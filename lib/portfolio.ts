export type Trade={id:string;date:string;broker:string;symbol:string;name:string;kind:'buy'|'sell'|'dividend';shares:number;price:number;fee:number;tax:number;amount:number;note:string};
export type Portfolio={trades:Trade[];watchlist:string[];accounts:string[]};
export type Position={broker:string;symbol:string;name:string;shares:number;cost:number;realized:number;dividends:number};
export const emptyPortfolio=():Portfolio=>({trades:[],watchlist:['2330','2317','2454','2382','3231','6669'],accounts:['新光','中信']});
export function accountName(v:unknown):string{if(typeof v!=='string'||!v.trim()||v.trim().length>40||/[\u0000-\u001f]/.test(v)||v.trim()==='all')throw new Error('帳戶名稱需為 1–40 個字。');return v.trim();}
export function normalizePortfolio(p:Portfolio):Portfolio{return {...p,accounts:[...new Set([...(p.accounts||['新光','中信']),...p.trades.map(t=>t.broker)])]};}
export const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function calculate(trades:Trade[]):Position[]{
 const map=new Map<string,Position>();
 for(const t of [...trades].sort((a,b)=>a.date.localeCompare(b.date))){
  const key=t.broker+':'+t.symbol; const p=map.get(key)||{broker:t.broker,symbol:t.symbol,name:t.name,shares:0,cost:0,realized:0,dividends:0};
  p.name=t.name||p.name;
  if(t.kind==='buy'){p.cost+=Math.round(t.shares*t.price*100)+Math.round(t.fee*100);p.shares+=t.shares;}
  else if(t.kind==='sell'){if(t.shares>p.shares)throw new Error(`${t.date} ${t.broker} ${t.symbol} 賣出超過當時持股，請先補齊買進紀錄。`);const basis=t.shares===p.shares?p.cost:Math.round(p.cost*t.shares/p.shares);p.realized+=Math.round(t.shares*t.price*100)-Math.round((t.fee+t.tax)*100)-basis;p.cost-=basis;p.shares-=t.shares;}
  else p.dividends+=Math.round(t.amount*100);
  map.set(key,p);
 }
 return [...map.values()].map(p=>({...p,cost:p.cost/100,realized:p.realized/100,dividends:p.dividends/100}));
}
export function validateTrade(v:unknown):Trade{
 if(!v||typeof v!=='object')throw new Error('交易格式不正確');const t=v as Trade;
 accountName(t.broker);
 if(!/^[a-zA-Z0-9-]{10,64}$/.test(t.id)||!['buy','sell','dividend'].includes(t.kind)||!/^\d{4,6}[A-Z]?$/.test(t.symbol)||typeof t.name!=='string'||t.name.length>40||typeof t.note!=='string'||t.note.length>300)throw new Error('請確認帳戶、股票代號與交易類型。');
 if(!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))||new Date(t.date).toISOString().slice(0,10)!==t.date||t.date>today())throw new Error('請輸入有效且不晚於今天的日期。');
 for(const n of ['shares','price','fee','tax','amount'] as const)if(typeof t[n]!=='number'||!Number.isFinite(t[n])||t[n]<0||t[n]>1e9)throw new Error('金額與股數必須是有效的非負數。');
 if(!Number.isInteger(t.shares)||t.shares>1e7)throw new Error('股數必須是整數，請以股而非張輸入。');
 if(t.kind!=='dividend'&&(t.shares<=0||t.price<=0||t.price*t.shares>1e12))throw new Error('請輸入有效的股數與成交價格。');
 if(t.kind==='dividend'&&t.amount<=0)throw new Error('請輸入實際入帳的股息。');
 return {id:t.id,date:t.date,broker:t.broker,symbol:t.symbol,name:t.name.trim(),kind:t.kind,shares:t.kind==='dividend'?0:t.shares,price:t.kind==='dividend'?0:t.price,fee:t.kind==='dividend'?0:t.fee,tax:t.kind==='sell'?t.tax:0,amount:t.kind==='dividend'?t.amount:0,note:t.note.trim()};
}
