// scripts/capture_cleanups.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>

const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

const artifactDir = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\cbf081a6-479b-4bd9-af21-8a642df38c72';
const browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  console.log('Launching browser from:', browserPath);
  const browser = await puppeteer.launch({
    executablePath: browserPath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=390,844']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // 1. Mobile Landing Hero
  console.log('1. Capturing Mobile Landing Hero...');
  await page.goto('http://localhost:3000/?skipLoader=true', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'mobile_clean_landing_hero.png') });

  // 2. Mobile Landing Footer & Social Channels
  console.log('2. Capturing Mobile Landing Footer & Social Channels...');
  await page.evaluate(() => {
    const el = document.querySelector('.rich-footer');
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo(0, top - 20);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'mobile_clean_landing_footer.png') });

  // 3. Mobile DApp Page - Open Pro Deck & Futures Direction Intelligence (Coming Soon)
  console.log('3. Navigating to DApp and opening Pro Deck...');
  await page.goto('http://localhost:3000/app.html?skipLoader=true', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 800));

  await page.click('#btnToggleProDeck');
  await new Promise(r => setTimeout(r, 500));

  await page.evaluate(() => {
    const el = document.getElementById('futuresDirectionSection');
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo(0, top - 10);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'mobile_clean_dapp_futures.png') });

  // 4. Mobile DApp Protocol Analytics Hub Subtabs & Streamlined 2 Bots
  console.log('4. Clicking AI Trading subtab in Protocol Analytics Hub...');
  await page.evaluate(() => {
    const btn = document.getElementById('btnTabTradingBots');
    if (btn) btn.click();
    const el = document.getElementById('chartSection');
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo(0, top - 10);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'mobile_clean_trading_bots.png') });

  // 5. Mobile DApp Agentic Section (Under Approved Strategies)
  console.log('5. Capturing Mobile DApp Agentic Section...');
  await page.evaluate(() => {
    const el = document.getElementById('agenticAiTradingSection');
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo(0, top - 10);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'mobile_clean_agentic_section.png') });

  // 6. Mobile DApp Workspace Footer
  console.log('6. Capturing Mobile DApp Workspace Footer...');
  await page.evaluate(() => {
    const el = document.querySelector('.app-workspace-footer');
    if (el) {
      const top = el.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo(0, top - 20);
    }
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(artifactDir, 'mobile_clean_dapp_footer.png') });

  await browser.close();
  console.log('All mobile screenshots captured successfully!');
}

run().catch(console.error);
