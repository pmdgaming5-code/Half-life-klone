import fs from 'node:fs';

const manifest='android/app/src/main/AndroidManifest.xml';
if(!fs.existsSync(manifest)) throw new Error(`Android manifest not found: ${manifest}`);
let xml=fs.readFileSync(manifest,'utf8');
const activity=/(<activity\b[^>]*android:name="\.MainActivity"[^>]*)(>)/;
if(!activity.test(xml)) throw new Error('MainActivity declaration not found in AndroidManifest.xml');
xml=xml.replace(activity,(m,open,end)=>open.includes('android:screenOrientation=')?open.replace(/android:screenOrientation="[^"]*"/,'android:screenOrientation="landscape"')+end:open+' android:screenOrientation="landscape"'+end);
fs.writeFileSync(manifest,xml);
console.log('Android orientation: landscape');
