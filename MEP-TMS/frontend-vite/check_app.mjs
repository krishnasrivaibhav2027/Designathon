import { chromium } from 'playwright';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', err => errors.push(`PAGE ERROR: ${err.message}`));

try {
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 15000 });
  
  const url = page.url();
  const formVisible = await page.$('form') !== null;
  const emailInput = await page.$('input[placeholder*="Email"]') !== null;
  const h1 = await page.$('h1') !== null ? await page.$eval('h1', el => el.textContent) : null;
  
  console.log('URL:', url);
  console.log('Form visible:', formVisible);
  console.log('Email input visible:', emailInput);
  console.log('H1 text:', h1);
  console.log('Console errors:', JSON.stringify(errors));
  
  const screenshotPath = 'd:\GitRepos\Designathon\MEP-TMS\frontend-vite\screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Screenshot saved');
} catch (e) {
  console.log('Error:', e.message);
}

await browser.close();
