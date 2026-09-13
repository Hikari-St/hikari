const puppeteer = require('puppeteer-core');
const path = require('path');

const ARTIFACT_DIR = 'C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\cbf081a6-479b-4bd9-af21-8a642df38c72';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture() {
  console.log('Launching browser for mobile visual proof...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });

  // 1. Landing Page: AI Notification Simulation Banner
  console.log('Navigating to http://localhost:3000...');
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle2' });

  // Wait for the loader to complete and fade away
  console.log('Waiting for loader to dismiss...');
  await page.waitForSelector('#preloader, .loader, #loader', { hidden: true, timeout: 6000 }).catch(() => {});
  await new Promise(r => setTimeout(r, 1500));

  await page.evaluate(() => {
    const el = document.querySelector('.connect-sim-banner');
    if (el) el.scrollIntoView({ behavior: 'instant', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 600));

  const pathBanner = path.join(ARTIFACT_DIR, 'mobile_sim_banner.png');
  await page.screenshot({ path: pathBanner });
  console.log('Saved mobile_sim_banner.png');

  // 2. Click Simulation Button & Capture Toast
  console.log('Clicking Highest APY Alert button...');
  await page.click('#btnSimHighestApy');
  await new Promise(r => setTimeout(r, 600));

  const pathToast = path.join(ARTIFACT_DIR, 'mobile_sim_toast.png');
  await page.screenshot({ path: pathToast });
  console.log('Saved mobile_sim_toast.png');

  // 3. DApp Workspace: Stake Tab
  console.log('Navigating to http://localhost:3000/app...');
  await page.goto('http://localhost:3000/app', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));
  const pathStakeTop = path.join(ARTIFACT_DIR, 'mobile_stake_top.png');
  await page.screenshot({ path: pathStakeTop });
  console.log('Saved mobile_stake_top.png');

  // 4. DApp Workspace: Wrap Tab
  console.log('Switching to Wrap tab...');
  await page.click('#btnNavWrap');
  await new Promise(r => setTimeout(r, 600));
  const pathWrapTop = path.join(ARTIFACT_DIR, 'mobile_wrap_top.png');
  await page.screenshot({ path: pathWrapTop });
  console.log('Saved mobile_wrap_top.png');

  // 5. DApp Workspace: Withdrawals Tab (Card on TOP)
  console.log('Switching to Withdrawals tab...');
  await page.click('#btnNavWithdrawals');
  await new Promise(r => setTimeout(r, 600));

  const pathWithdrawalsTop = path.join(ARTIFACT_DIR, 'mobile_withdrawals_top.png');
  await page.screenshot({ path: pathWithdrawalsTop });
  console.log('Saved mobile_withdrawals_top.png');

  // Scroll to FAQ in Withdrawals (FAQ UNDER)
  await page.evaluate(() => {
    const faq = document.querySelector('#viewTabWithdrawals .hikari-faq-section');
    if (faq) faq.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));

  const pathWithdrawalsFaq = path.join(ARTIFACT_DIR, 'mobile_withdrawals_faq.png');
  await page.screenshot({ path: pathWithdrawalsFaq });
  console.log('Saved mobile_withdrawals_faq.png');

  // 6. DApp Workspace: Rewards Tab (Card on TOP)
  console.log('Switching to Rewards tab...');
  await page.click('#btnNavRewards');
  await new Promise(r => setTimeout(r, 600));

  const pathRewardsTop = path.join(ARTIFACT_DIR, 'mobile_rewards_top.png');
  await page.screenshot({ path: pathRewardsTop });
  console.log('Saved mobile_rewards_top.png');

  // Scroll to FAQ in Rewards (FAQ UNDER)
  await page.evaluate(() => {
    const faq = document.querySelector('#viewTabRewards .hikari-faq-section');
    if (faq) faq.scrollIntoView({ behavior: 'instant', block: 'start' });
  });
  await new Promise(r => setTimeout(r, 600));

  const pathRewardsFaq = path.join(ARTIFACT_DIR, 'mobile_rewards_faq.png');
  await page.screenshot({ path: pathRewardsFaq });
  console.log('Saved mobile_rewards_faq.png');

  // 7. DApp Workspace: Earn Tab
  console.log('Switching to Earn tab...');
  await page.click('#btnNavEarn');
  await new Promise(r => setTimeout(r, 600));
  const pathEarnTop = path.join(ARTIFACT_DIR, 'mobile_earn_top.png');
  await page.screenshot({ path: pathEarnTop });
  console.log('Saved mobile_earn_top.png');

  await browser.close();
  console.log('All mobile screenshots captured successfully!');
}

capture().catch(err => {
  console.error('Error capturing proofs:', err);
  process.exit(1);
});
