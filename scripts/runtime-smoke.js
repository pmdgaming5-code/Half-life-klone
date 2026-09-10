import { spawn } from 'node:child_process';
import { chromium } from 'playwright';
import http from 'node:http';

const viteScript=new URL('../node_modules/vite/bin/vite.js',import.meta.url).pathname;
const vite=spawn(process.execPath,[viteScript,'preview','--host','127.0.0.1','--port','4173'],{stdio:['ignore','pipe','pipe']});
let output='';
vite.stdout.on('data',d=>output+=d.toString());
vite.stderr.on('data',d=>output+=d.toString());

const stopVite=()=>{if(vite.exitCode===null)try{vite.kill('SIGKILL')}catch{}};
let browser=null;
const watchdog=setTimeout(()=>{console.error('Runtime smoke test timed out.');stopVite();process.exit(1)},30000);

async function waitForServer(){
  const deadline=Date.now()+15000;
  while(Date.now()<deadline){
    try{await new Promise((resolve,reject)=>{const r=http.get('http://127.0.0.1:4173/',res=>{res.resume();res.statusCode===200?resolve():reject(new Error(`HTTP ${res.statusCode}`));});r.on('error',reject);r.setTimeout(1000,()=>{r.destroy();reject(new Error('timeout'))});});return;}
    catch{await new Promise(r=>setTimeout(r,100));}
  }
  throw new Error(`Vite preview did not start. ${output}`);
}

try{
  await waitForServer();
  browser=await chromium.launch({headless:true,timeout:10000,args:['--use-gl=swiftshader','--disable-gpu-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:10000});
  await page.waitForFunction(()=>document.getElementById('menu')?.classList.contains('hidden')===false,{timeout:8000});
  const bootExists=await page.locator('#boot').count();
  if(bootExists)throw new Error('Boot screen still exists after startup.');
  if(errors.length)throw new Error(`Browser errors: ${errors.join(' | ')}`);
  console.log('Runtime smoke test passed: boot completed and menu is visible.');
  clearTimeout(watchdog);
  stopVite();
  process.exit(0);
}catch(error){
  console.error(error?.stack||error);
  clearTimeout(watchdog);
  if(browser)await browser.close().catch(()=>{});
  stopVite();
  process.exit(1);
}
