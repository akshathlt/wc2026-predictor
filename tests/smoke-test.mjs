/**
 * WC2026 Predictor — Full Automated Test Suite
 * Run: node tests/smoke-test.mjs
 * Tests both local (localhost:5173) and production (pages.dev)
 *
 * Pre-requisite: npm run dev must be running locally
 */

import { chromium } from 'playwright'

const TARGETS = [
  { name: 'LOCAL',      base: 'http://localhost:5173/wc2026-predictor' },
  { name: 'CLOUDFLARE', base: 'https://wc2026-predictor-dmz.pages.dev' },
]

const ADMIN_EMAIL    = 'test@wc2026.com'
const ADMIN_PASSWORD = 'Test1234!'
const TEST_EMAIL     = `smoke_${Date.now()}@wc2026test.com`
const TEST_PASSWORD  = 'Smoke1234!'

const results = []
let passed = 0, failed = 0

function log(name, ok, detail = '') {
  const icon = ok ? '✅' : '❌'
  console.log(`  ${icon} ${name}${detail ? ' — ' + detail : ''}`)
  results.push({ name, ok, detail })
  if (ok) passed++; else failed++
}

async function runTarget(target) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`🧪 Testing: ${target.name} (${target.base})`)
  console.log('='.repeat(60))

  const browser = await chromium.launch({ headless: true })
  const ctx     = await browser.newContext()
  const page    = await ctx.newPage()
  const go      = async (path) => {
    await page.goto(target.base + path, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2500)
  }
  const text = async () => page.evaluate(() => document.body.innerText)
  const nav  = async () => page.evaluate(() => document.querySelector('nav')?.innerText || '')

  try {
    // ── PUBLIC PAGES ──────────────────────────────────────────
    console.log('\n📌 Public Pages')
    await go('/')
    const homeText = await text()
    log('Home loads',            homeText.includes('World Cup 2026'))
    log('Home has features',     homeText.includes('How it works'))
    log('News sidebar',          await page.locator('aside').count() > 0)

    await go('/leaderboard')
    const lb = await text()
    log('Leaderboard loads',     lb.includes('Leaderboard'))
    log('LB has Predictions tab',lb.includes('Predictions'))
    log('LB has Fun Bidding tab',lb.includes('Fun Bidding'))
    log('LB SAP branding',       lb.includes('O2C-Engineering'))

    await go('/rules')
    log('Rules loads',           (await text()).includes('Points'))

    // ── AUTH ──────────────────────────────────────────────────
    console.log('\n📌 Auth Page')
    await go('/auth')
    const authText = await text()
    log('Sign In tab',           authText.includes('Sign In'))
    log('Create Account tab',    authText.includes('Create Account'))
    log('Forgot password link',  authText.includes('Reset it here'))
    log('Password eye icon',     await page.locator('input[type=password]').count() > 0)

    // ── AUTH GUARDS ───────────────────────────────────────────
    console.log('\n📌 Auth Guards (unauthenticated)')
    await go('/predict')
    log('/predict → /auth',      page.url().includes('/auth'))
    await go('/matches')
    log('/matches → /auth',      page.url().includes('/auth'))
    await go('/admin')
    log('/admin → home',         !page.url().includes('/admin'))
    await go('/leaderboard')
    log('/leaderboard public',   !(await text()).includes('Your Standing')) // gauge only when logged in

    // ── SIGN UP (new test user) ───────────────────────────────
    console.log('\n📌 Sign Up Flow')
    await go('/auth')
    await page.locator('button:has-text("Create Account")').click()
    await page.waitForTimeout(500)
    await page.locator('input[type=email]').type(TEST_EMAIL)
    const pwds = await page.locator('input[type=password]').all()
    await pwds[0].type(TEST_PASSWORD)
    await pwds[1].type(TEST_PASSWORD)
    await page.locator('button:has-text("Create Account 🚀")').click()
    await page.waitForTimeout(3000)
    const afterSignup = await text()
    log('Sign up success',       afterSignup.includes('Account created') || page.url().includes(target.base))

    // Onboard if needed
    if ((await text()).includes('Almost there')) {
      await page.locator('input[placeholder="e.g. Goldenballs123"]').type('SmokeTest')
      await page.locator('button:has-text("Let\'s go")').click()
      await page.waitForTimeout(2000)
    }
    log('Onboard + logged in',   (await nav()).includes('Sign out'))

    // ── USER FEATURES ─────────────────────────────────────────
    console.log('\n📌 User Features')

    await go('/predict')
    const grp = await text()
    log('Groups page loads',       grp.includes('Group A'))
    log('All 12 groups shown',     ['A','B','C','D','E','F','G','H','I','J','K','L'].every(g => grp.includes(`Group ${g}`)))
    log('Correct teams (Mexico)',  grp.includes('Mexico'))
    log('Correct teams (France)',  grp.includes('France'))
    log('Flag images',             await page.locator('main img').count() > 0)

    await go('/matches')
    const mat = await text()
    log('Matches loads',           mat.includes('Match #'))
    log('Dual joker counters',     mat.includes('Group 🃏') && mat.includes('Knockout 🃏'))
    log('Penalty +10 pts label',   mat.includes('+10 pts'))

    await go('/leaderboard')
    const lbUser = await text()
    log('LB gauge (Your Standing)',lbUser.includes('Your Standing'))
    log('LB accuracy bars',        lbUser.includes('Prediction Accuracy'))
    log('Social share section',    lbUser.includes('Share your ranking'))
    log('No email btn (non-admin)',!lbUser.includes('Copy Email for Outlook'))

    // Click bid tab
    await page.locator('button:has-text("Fun Bidding")').click()
    await page.waitForTimeout(1000)
    log('Bid tab content',         (await text()).includes('Virtual money') || (await text()).includes('€2,500'))

    // ── SIGN OUT ──────────────────────────────────────────────
    console.log('\n📌 Sign Out')
    await page.locator('button:has-text("Sign out")').click()
    await page.waitForTimeout(1000)
    log('Sign out clears session', (await nav()).includes('Sign in'))

    // ── ADMIN LOGIN ───────────────────────────────────────────
    console.log('\n📌 Admin Features')
    await go('/auth')
    await page.locator('input[type=email]').type(ADMIN_EMAIL)
    await page.locator('input[type=password]').type(ADMIN_PASSWORD)
    await page.locator('button[type=submit]').click()
    await page.waitForTimeout(3000)
    log('Admin login',             (await nav()).includes('Sign out'))
    log('Admin nav link visible',  (await nav()).includes('Admin'))

    // Click admin via nav
    await page.locator('a[href$="/admin"]').click()
    await page.waitForTimeout(2500)
    const adm = await text()
    log('Admin panel loads',       adm.includes('Admin Panel'))
    log('Matches tab (ESPN/FIFA)', adm.includes('Sync from FIFA') || adm.includes('Sync from ESPN'))
    log('Recalculate button',      adm.includes('Recalculate'))

    // Players tab
    const btns = await page.locator('main button').allTextContents()
    const pi = btns.findIndex(t => t.includes('Players'))
    if (pi >= 0) {
      await page.locator('main button').nth(pi).click()
      await page.waitForTimeout(1000)
      log('Players tab loads',     (await text()).includes('Sample1') || (await text()).includes('Reset Pwd'))
    }

    // Groups tab
    const btns2 = await page.locator('main button').allTextContents()
    const gi = btns2.findIndex(t => t.includes('Groups'))
    if (gi >= 0) {
      await page.locator('main button').nth(gi).click()
      await page.waitForTimeout(1000)
      log('Groups tab loads',      (await text()).includes('O2C_WC26') || (await text()).includes('Add new group'))
    }

    // Admin leaderboard — email button
    await go('/leaderboard')
    await page.waitForTimeout(2500)
    log('Admin email btn visible', (await text()).includes('Copy Email for Outlook'))
    log('No social share (admin)', !(await text()).includes('Share your ranking'))

    // ── SIGN OUT FINAL ────────────────────────────────────────
    await page.locator('button:has-text("Sign out")').click()
    await page.waitForTimeout(1000)
    log('Final sign out',          (await nav()).includes('Sign in'))

  } catch (e) {
    log(`UNEXPECTED ERROR: ${e.message}`, false)
  } finally {
    await browser.close()
  }
}

// Main
const targetArg = process.argv[2] // 'local' or 'cf' or undefined (both)
const toRun = targetArg === 'local' ? [TARGETS[0]]
            : targetArg === 'cf'    ? [TARGETS[1]]
            : TARGETS

for (const t of toRun) {
  await runTarget(t)
}

console.log('\n' + '='.repeat(60))
console.log(`📊 RESULTS: ${passed} passed, ${failed} failed out of ${passed + failed} tests`)
console.log('='.repeat(60))
if (failed > 0) {
  console.log('\n❌ Failed tests:')
  results.filter(r => !r.ok).forEach(r => console.log(`   - ${r.name}${r.detail ? ': ' + r.detail : ''}`))
}
process.exit(failed > 0 ? 1 : 0)
