import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,sep,extname} from 'node:path';
import {GET as portfolioGet,POST as portfolioPost} from '../app/api/portfolio/route.ts';
import {GET as marketGet} from '../app/api/market/route.ts';
const root=fileURLToPath(new URL('../',import.meta.url));
const publicRoot=resolve(root,'local-dist');
const port=Number(process.env.CHIPFOLIO_PORT||47831);
const mime:Record<string,string>={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=createServer(async(req,res)=>{
 try{
  const address=server.address();const actualPort=typeof address==='object'&&address?address.port:port;
  const origin=`http://127.0.0.1:${actualPort}`;
  res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
  if(req.headers.host!==`127.0.0.1:${actualPort}`||(req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site'){res.writeHead(403);res.end('Forbidden');return;}
  const url=new URL(req.url||'/',origin);
  if(url.pathname==='/api/health'&&req.method==='GET'){res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify({app:'chipfolio-local',root,pid:process.pid}));return;}
  let response:Response;
  if(url.pathname==='/api/portfolio'&&req.method==='GET')response=await portfolioGet();
  else if(url.pathname==='/api/portfolio'&&req.method==='POST'){
   let size=0;const chunks:Buffer[]=[];for await(const chunk of req){size+=chunk.length;if(size>4_000_000){res.writeHead(413);res.end('Too large');return;}chunks.push(chunk);}
   response=await portfolioPost(new Request(url,{method:'POST',headers:{origin},body:Buffer.concat(chunks).toString('utf8')}));
  }else if(url.pathname==='/api/market'&&req.method==='GET')response=await marketGet(new Request(url));
  else if(req.method==='GET'&&!url.pathname.startsWith('/api/')){
   const file=resolve(publicRoot,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));
   if(!file.startsWith(publicRoot+sep)){res.writeHead(404);res.end();return;}
   try{const body=await readFile(file);res.setHeader('Content-Type',mime[extname(file)]||'application/octet-stream');res.end(body);}catch{res.writeHead(404);res.end('Not found');}return;
  }else{res.writeHead(404);res.end('Not found');return;}
  res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));
 }catch(error){console.error(error);if(!res.headersSent)res.writeHead(500);res.end('Local server error');}
});
server.listen(port,'127.0.0.1',()=>console.log(JSON.stringify({url:`http://127.0.0.1:${(server.address() as {port:number}).port}`,pid:process.pid})));
server.on('error',error=>{console.error(error);process.exitCode=1;});
