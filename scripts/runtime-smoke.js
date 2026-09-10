import { spawn } from 'node:child_process';
import { chromium } from 'playwright';

const vite=spawn('npm',['run','preview','--','--port','4173'],{stdio:['ignore','pipe','pipe'],shell:process.platform==='win32'});
let output='';
vite.stdout.on('data',d=>output+=d.toString());
vite.stderr.on('data',d=>output+=d.toString());

const stopVite=()=>{try{vite.kill('SIGTERM')}catch{}};
process.on('exit',stopVite);
let browser=null;

try{
  await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error(`Vite preview did not start. ${output}`)),15000);
    const check=()=>output.includes('4173')?(clearTimeout(timer),resolve()):setTimeout(check,100);
    check();
  });

  browser=await chromium.launch({headless:true,args:['--use-gl=swiftshader','--disable-gpu-sandbox']});
  const page=await browser.newPage({viewport:{width:1280,height:720}});
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
  await page.goto('http://127.0.0.1:4173/',{waitUntil:'domcontentloaded',timeout:10000});
  await page.waitForFunction(()=>document.getElementById('menu')?.classList.contains('hidden')===false,{timeout:8000});
  if(document.querySelector('#boot')) throw new Error('Boot screen still exists after startup.');
  if(errors.length) throw new Error(`Browser errors: ${errors.join(' | ')}`);
  await page.screenshot({path:'runtime-smoke.png'});
  console.log('Runtime smoke test passed: boot completed and menu is visible.');
}finally{
  if(browser) await browser.close().catch(()=>{});
  stopVite();
}
