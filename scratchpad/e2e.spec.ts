import { test, expect, Page, ConsoleMessage } from '@playwright/test';

function attachLogging(page: Page, label: string, logs: string[]) {
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() === 'error' || msg.type() === 'warning') {
      logs.push(`[${label}][console:${msg.type()}] ${msg.text()}`);
    }
  });
  page.on('pageerror', (err) => {
    logs.push(`[${label}][pageerror] ${err.message}`);
  });
  page.on('requestfailed', (req) => {
    logs.push(`[${label}][requestfailed] ${req.method()} ${req.url()} -> ${req.failure()?.errorText}`);
  });
  page.on('response', (res) => {
    if (res.status() >= 400) {
      logs.push(`[${label}][http${res.status()}] ${res.request().method()} ${res.url()}`);
    }
  });
}

const ADMIN_URL = 'http://localhost:3000';
const MOBILE_URL = 'http://localhost:8081';
const LANDING_URL = 'http://localhost:5173/mokineveto/';

test.describe('MokineVeto E2E visual audit', () => {
  test('Landing page loads, APK link correct, no console errors', async ({ page }) => {
    const logs: string[] = [];
    attachLogging(page, 'landing', logs);
    await page.goto(LANDING_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'scratchpad/landing-home.png', fullPage: true });

    const apkLink = await page.locator('a[href*="downloads/app.apk"], a[href*="app.apk"]').first();
    const apkHref = await apkLink.getAttribute('href').catch(() => null);
    console.log('APK href found:', apkHref);

    const logoImg = page.locator('img[src*="logo.jpg"]').first();
    const logoVisible = await logoImg.isVisible().catch(() => false);
    console.log('Logo visible:', logoVisible);

    console.log('LANDING_LOGS:', JSON.stringify(logs));
  });

  test('Admin login flow', async ({ page }) => {
    const logs: string[] = [];
    attachLogging(page, 'admin', logs);
    page.on('response', async (res) => {
      if (res.url().includes('/auth/login')) {
        let body = '';
        try { body = await res.text(); } catch {}
        logs.push(`[admin][login-response] status=${res.status()} body=${body}`);
      }
    });
    await page.goto(ADMIN_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'scratchpad/admin-login.png', fullPage: true });

    const emailInput = page.locator('input[type="email"], input[type="text"], input[name="emailOrPhone"]').first();
    const pwInput = page.locator('input[type="password"]').first();
    if (await emailInput.isVisible().catch(() => false)) {
      await emailInput.fill('admin@mokineveto.cm');
      await pwInput.fill('admin123456');
      await page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Login")').first().click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'scratchpad/admin-after-login.png', fullPage: true });
    }
    console.log('ADMIN_URL_AFTER:', page.url());
    console.log('ADMIN_LOCALSTORAGE:', await page.evaluate(() => JSON.stringify({ token: localStorage.getItem('admin_token'), data: localStorage.getItem('admin_data') })));
    console.log('ADMIN_LOGS:', JSON.stringify(logs));
  });

  test('Mobile web - welcome and signup screen render', async ({ page }) => {
    const logs: string[] = [];
    attachLogging(page, 'mobile', logs);
    await page.goto(MOBILE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'scratchpad/mobile-welcome.png', fullPage: true });
    console.log('MOBILE_LOGS_WELCOME:', JSON.stringify(logs));
  });

  async function mobileLogin(page: Page, label: string, email: string, password: string, logs: string[]) {
    page.on('console', (msg) => logs.push(`[${label}][console:${msg.type()}] ${msg.text()}`));
    page.on('dialog', async (d) => {
      logs.push(`[${label}][dialog] ${d.type()}: ${d.message()}`);
      await d.dismiss().catch(() => {});
    });
    page.on('response', async (res) => {
      if (res.url().includes('/auth/login')) {
        let body = '';
        try { body = await res.text(); } catch {}
        logs.push(`[${label}][login-response] status=${res.status()} body=${body}`);
      }
    });
    await page.goto(MOBILE_URL, { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForTimeout(2000);
    await page.getByText('Connexion', { exact: true }).first().click();
    await page.waitForTimeout(1000);
    await page.getByPlaceholder('Entrez votre email').fill(email);
    await page.getByPlaceholder('Entrez votre mot de passe').fill(password);
    await page.screenshot({ path: `scratchpad/mobile-${label}-login-filled.png` });
    const all = page.getByText('Connexion', { exact: true });
    const cnt = await all.count();
    const box = await all.nth(cnt - 1).boundingBox();
    console.log(`[${label}] chosen last idx=${cnt - 1} box:`, JSON.stringify(box));
    if (box) {
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
    await page.waitForTimeout(8000);
    await page.screenshot({ path: `scratchpad/mobile-${label}-home.png`, fullPage: true });
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 500));
    console.log(`[${label}] body text after login:`, bodyText);
    console.log(`MOBILE_${label.toUpperCase()}_LOGS:`, JSON.stringify(logs));
  }

  test('Mobile web - Eleveur login (Marly)', async ({ page }) => {
    const logs: string[] = [];
    attachLogging(page, 'marly', logs);
    await mobileLogin(page, 'marly', 'kowssimamarlyy@gmail.com', 'marly123456', logs);
  });

  test('Mobile web - Veterinaire login (Foka)', async ({ page }) => {
    const logs: string[] = [];
    attachLogging(page, 'foka', logs);
    await mobileLogin(page, 'foka', 'emm.foka@gmail.com', 'foka123456', logs);
  });

  test('Mobile web - Fiches tile + paywall (Marly)', async ({ page }) => {
    const logs: string[] = [];
    attachLogging(page, 'fiches', logs);
    await mobileLogin(page, 'fiches', 'kowssimamarlyy@gmail.com', 'marly123456', logs);
    await page.getByText('Fiches', { exact: true }).first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'scratchpad/mobile-fiches-list.png', fullPage: true });
    console.log('[fiches] Fiches screen text:', await page.evaluate(() => document.body.innerText.slice(0, 800)));

    const firstFiche = page.locator('text=/Fièvre aphteuse/i').first();
    if (await firstFiche.isVisible().catch(() => false)) {
      await firstFiche.click();
      await page.waitForTimeout(1500);
      await page.screenshot({ path: 'scratchpad/mobile-fiche-detail.png', fullPage: true });
      console.log('[fiches] Fiche detail text:', await page.evaluate(() => document.body.innerText.slice(0, 800)));
    }
    console.log('FICHES_LOGS:', JSON.stringify(logs));
  });

  test('Mobile web - Cheptel tile (Marly)', async ({ page }) => {
    const logs: string[] = [];
    attachLogging(page, 'cheptel', logs);
    await mobileLogin(page, 'cheptel', 'kowssimamarlyy@gmail.com', 'marly123456', logs);
    await page.getByText('Cheptel', { exact: true }).first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'scratchpad/mobile-cheptel.png', fullPage: true });
    console.log('[cheptel] Cheptel screen text:', await page.evaluate(() => document.body.innerText.slice(0, 800)));
    console.log('CHEPTEL_LOGS:', JSON.stringify(logs));
  });

  test('Mobile web - Assistant IA tile (Marly)', async ({ page }) => {
    const logs: string[] = [];
    attachLogging(page, 'assistant', logs);
    await mobileLogin(page, 'assistant', 'kowssimamarlyy@gmail.com', 'marly123456', logs);
    await page.getByText('Assistant IA', { exact: true }).first().click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'scratchpad/mobile-assistant.png', fullPage: true });
    console.log('[assistant] Assistant screen text:', await page.evaluate(() => document.body.innerText.slice(0, 800)));
    console.log('ASSISTANT_LOGS:', JSON.stringify(logs));
  });
});
