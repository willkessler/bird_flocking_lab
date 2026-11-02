// Loads the lab in headless Chromium and runs each spec through metrics.js. Playwright's fake clock
// is installed so the page's own render loop never ticks -- the physics is stepped directly.
import { chromium } from 'playwright'; import fs from 'fs';
const [,, url, specFile] = process.argv;
const specs = JSON.parse(fs.readFileSync(specFile,'utf8'));
const browser = await chromium.launch({ args: ['--use-angle=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
page.on('pageerror', e => console.log('PAGEERR', e.message));
await page.clock.install();
await page.goto(url);
await page.addScriptTag({ content: fs.readFileSync(new URL('./metrics.js', import.meta.url),'utf8') });
for (const s of specs) {
  const r = await page.evaluate(o => { try { return __run(o); } catch(e){ return {err:String(e.stack)}; } }, s);
  const {timeline, ...rest} = r;
  console.log(`== ${s.name}\n${JSON.stringify(rest)}`);
  if (timeline && timeline.length) console.log(timeline.join('\n'));
}
await browser.close();
