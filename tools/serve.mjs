import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {spawn} from 'node:child_process';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const port=Number(process.env.PORT||8400);const origin=`http://127.0.0.1:${port}`;
const types={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.wasm':'application/wasm','.pdf':'application/pdf','.svg':'image/svg+xml','.png':'image/png'};
const server=http.createServer((req,res)=>{
 if(![`127.0.0.1:${port}`,`localhost:${port}`].includes(req.headers.host)){res.writeHead(403);res.end('Invalid host');return;}
 if(req.headers.origin&&![origin,`http://localhost:${port}`].includes(req.headers.origin)){res.writeHead(403);res.end('Invalid origin');return;}
 let url;try{url=new URL(req.url,origin)}catch{res.writeHead(400);res.end();return;}
 if(url.pathname==='/health'){res.setHeader('Content-Type','application/json');res.end(JSON.stringify({application:'Schedule Studio',version:'8.0.0',url:origin}));return;}
 // Narrow local Ollama bridge: no arbitrary proxy URL or credential forwarding.
 if(url.pathname.startsWith('/ollama/')){
  const endpoint=url.pathname.slice('/ollama'.length);if(!/^\/api\/(tags|show|chat|generate|ps|version)$/.test(endpoint)||!['GET','POST'].includes(req.method)){res.writeHead(404);res.end();return;}
  const upstream=http.request({hostname:'127.0.0.1',port:11434,path:endpoint,method:req.method,headers:{'Content-Type':'application/json'},timeout:600000},reply=>{res.writeHead(reply.statusCode,{'Content-Type':reply.headers['content-type']||'application/json'});reply.pipe(res)});
  upstream.on('timeout',()=>upstream.destroy(new Error('Ollama timeout')));upstream.on('error',error=>{if(!res.headersSent)res.writeHead(502,{'Content-Type':'application/json'});res.end(JSON.stringify({error:'Local Ollama unavailable: '+error.message}))});let size=0;req.on('data',chunk=>{size+=chunk.length;if(size>20*1024*1024){upstream.destroy();res.destroy()}});req.pipe(upstream);return;
 }
 if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}
 let pathname;try{pathname=decodeURIComponent(url.pathname)}catch{res.writeHead(400);res.end();return;}
 const file=path.resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
 if(!file.startsWith(root+path.sep)||file.split(path.sep).some(x=>x.startsWith('.'))){res.writeHead(403);res.end();return;}
 fs.stat(file,(error,stat)=>{if(error||!stat.isFile()){res.writeHead(404);res.end('Not found');return;}res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Content-Length':stat.size,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff'});if(req.method==='HEAD')res.end();else fs.createReadStream(file).pipe(res)});
});
server.on('error',error=>{console.error(error.code==='EADDRINUSE'?`Port ${port} is already in use. Open ${origin}/health to identify the running application, or run with PORT set to another port.`:error.message);process.exitCode=1});
server.listen(port,'127.0.0.1',()=>{console.log(`Schedule Studio v8.0.0\n${origin}\nKeep this terminal open. Ctrl+C stops the server.`);if(!process.argv.includes('--no-browser')){const args=process.platform==='win32'?['cmd',['/c','start','',origin]]:process.platform==='darwin'?['open',[origin]]:['xdg-open',[origin]];const child=spawn(args[0],args[1],{stdio:'ignore',detached:true});child.on('error',()=>{});child.unref()}});
