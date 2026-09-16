// scripts/verify_ui.js
// Author: ibochivincent-lang <ibochivincent-lang@users.noreply.github.com>
// Verification suite for decoupled Marketing Landing Page and dedicated DApp workspace.

async function verify() {
  // 1. Verify Landing Page (index.html)
  const resLanding = await fetch('http://localhost:3000');
  if (!resLanding.ok) throw new Error(`Landing page HTTP status: ${resLanding.status}`);
  const htmlLanding = await resLanding.text();
  console.log('Landing page loaded successfully. Length:', htmlLanding.length);

  const landingChecks = {
    hikariHeader: htmlLanding.includes('hikari-header') || htmlLanding.includes('topnav'),
    exploreProtocolBtn: htmlLanding.includes('id="btnOpenNavSlider"'),
    stellarTestnetBadge: htmlLanding.includes('Stellar Testnet'),
    launchAppTopNav: htmlLanding.includes('id="btnLaunchAppNav"'),
    topNavLinksRemoved: !htmlLanding.includes('data-menu="products"') && !htmlLanding.includes('data-menu="institutional"') && !htmlLanding.includes('data-menu="node-operators"') && !htmlLanding.includes('data-menu="governance"'),
    // These metrics are now populated at runtime from live endpoints, not baked into the HTML —
    // the check just confirms the honest placeholder ids exist for that live fetch to target.
    testnetTvlEarnXlm: htmlLanding.includes('id="earnXlmTvl"'),
    testnetTvlEarnUsd: htmlLanding.includes('id="earnUsdTvl"'),
    testnetTvlEarnMultiNotImplemented: htmlLanding.includes('Not implemented') && htmlLanding.includes('Earn Multichain'),
    noFourMillionClaims: !htmlLanding.includes('Over $4M') && !htmlLanding.includes('$4M invested'),
    noBugBountyPill: !htmlLanding.includes('pill-bounty') && !htmlLanding.includes('Bug Bounty'),
    safeHarborPill: htmlLanding.includes('pill-harbor') && htmlLanding.includes('Safe Harbor'),
    stellarAuditCard: htmlLanding.includes('stellar-audit-card') && htmlLanding.includes('Stellar Soroban Formal Security Audits'),
    comingSoonBadges: htmlLanding.includes('sec-badge-coming-soon') && htmlLanding.includes('sec-badge-coming-soon-pill'),
    noWeb3socBanner: !htmlLanding.includes('sec-web3soc-banner') && !htmlLanding.includes('Web3SOC'),
    sdkModal: htmlLanding.includes('id="sdkModal"'),
    invariantsModal: htmlLanding.includes('id="invariantsModal"'),
    faqModal: htmlLanding.includes('id="faqModal"'),
    mobileDrawer: htmlLanding.includes('id="hikariMobileDrawer"'),
    btnOpenShardsModal: htmlLanding.includes('id="btnOpenShardsModal"'),
    shardsModal: htmlLanding.includes('id="shardsModal"'),
    depositXlmLink: htmlLanding.includes('href="app.html?vault=xlm"'),
    depositUsdLink: htmlLanding.includes('href="app.html?vault=usd"'),
    depositMultiLink: htmlLanding.includes('href="app.html?vault=multichain"'),
    // Verification that live protocol grid is completely removed from landing page
    noLiveProtocolGridOnLanding: !htmlLanding.includes('class="metrics-grid"') && !htmlLanding.includes('id="chartSection"') && !htmlLanding.includes('id="vaultPortalSection"')
  };

  console.log('Landing Page Verification Results:');
  console.table(landingChecks);

  const landingPassed = Object.values(landingChecks).every(Boolean);
  if (!landingPassed) {
    console.error('Landing page checks failed!');
    process.exit(1);
  }

  // 2. Verify Dedicated DApp Workspace (app.html)
  const resApp = await fetch('http://localhost:3000/app.html');
  if (!resApp.ok) throw new Error(`App page HTTP status: ${resApp.status}`);
  const htmlApp = await resApp.text();
  console.log('DApp page loaded successfully. Length:', htmlApp.length);

  const appChecks = {
    appLayoutContainer: htmlApp.includes('app-layout-container'),
    appTopbar: htmlApp.includes('app-topbar'),
    vaultSwitcherPill: htmlApp.includes('id="vaultSwitcherPill"'),
    pillVaultXlm: htmlApp.includes('id="pillVaultXlm"'),
    pillVaultUsd: htmlApp.includes('id="pillVaultUsd"'),
    pillVaultMulti: htmlApp.includes('id="pillVaultMulti"'),
    vaultContextBanner: htmlApp.includes('id="vaultContextBanner"'),
    metricsGrid: htmlApp.includes('class="metrics-grid"'),
    modeSwitchBar: htmlApp.includes('mode-switch-bar'),
    btnSimpleMode: htmlApp.includes('id="btnSimpleMode"'),
    btnProMode: htmlApp.includes('id="btnProMode"'),
    vaultTierSelector: htmlApp.includes('vault-tier-selector'),
    optLobstr: htmlApp.includes('id="optLobstr"'),
    optXbull: htmlApp.includes('id="optXbull"'),
    rationaleBox: htmlApp.includes('rationale-box'),
    chartSection: htmlApp.includes('id="chartSection"'),
    tradingBotsTab: htmlApp.includes('id="btnTabTradingBots"'),
    agentSection: htmlApp.includes('id="agentSection"'),
    securitySection: htmlApp.includes('id="securitySection"')
  };

  console.log('DApp Page Verification Results:');
  console.table(appChecks);

  const appPassed = Object.values(appChecks).every(Boolean);
  if (!appPassed) {
    console.error('DApp page checks failed!');
    process.exit(1);
  }

  // 3. Verify Direct Vault & Trading Redirect Pages
  for (const slug of ['earn-xlm', 'earn-usd', 'earn-multichain', 'app', 'trading']) {
    const resRedirect = await fetch(`http://localhost:3000/${slug}`);
    if (!resRedirect.ok) throw new Error(`Redirect route /${slug} failed with status: ${resRedirect.status}`);
  }
  console.log('✓ Direct redirect routes (/app, /earn-xlm, /earn-usd, /earn-multichain, /trading) respond with 200 OK');

  console.log('✓ ALL 38 landing page decoupling, dedicated DApp workspace, vault routing, and security assertions PASSED successfully!');
}

verify().catch(err => {
  console.error(err);
  process.exit(1);
});
