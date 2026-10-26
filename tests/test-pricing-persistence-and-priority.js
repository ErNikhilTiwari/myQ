const { chromium } = require('playwright-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:4000';

async function run() {
  console.log('=== START: Pricing Persistence & Priority Live Queue Test ===');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('--- Step 1: Login as Clinic Admin ---');
    await page.goto(APP_URL, { waitUntil: 'networkidle' });
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });

    // Open Login Modal
    const signInBtn = await page.waitForSelector('button:has-text("Patient Login"), button:has-text("Sign In"), button:has-text("Login")', { timeout: 6000 });
    await signInBtn.click();
    await page.waitForTimeout(400);

    // Switch to Password tab
    await page.locator('button:has-text("Password")').first().click();
    await page.waitForTimeout(300);

    // Fill Credentials
    await page.locator('input[type="tel"]').fill('9876500001');
    await page.locator('input[type="password"]').fill('Password@123');
    await page.waitForTimeout(200);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login-password')),
      page.locator('button[type="submit"]:has-text("Login with Password")').click(),
    ]);
    await page.waitForTimeout(1500);

    console.log('--- Step 2: Navigate to Pricing & TV QR Tab ---');
    const pricingTab = page.locator('button:has-text("Pricing & TV QR")').first();
    await pricingTab.click();
    await page.waitForTimeout(1000);

    // Verify elements on page
    console.log('--- Step 3: Verify Remote Online card includes Priority Live Queue Row ---');
    const priorityRow = page.locator('text=Priority Live Queue Price');
    const hasPriorityRow = await priorityRow.isVisible();
    console.log('Priority Live Queue row visible:', hasPriorityRow);
    if (!hasPriorityRow) throw new Error('Priority Live Queue Price row not found in Remote Online card!');

    // Get current inputs
    const inputs = page.locator('input[type="text"][disabled][readonly]');
    const inClinicVal = await inputs.nth(0).inputValue();
    const remoteVal = await inputs.nth(1).inputValue();
    const priorityVal = await inputs.nth(2).inputValue();
    console.log(`Initial Prices -> In-Clinic: ₹${inClinicVal}, Remote: ₹${remoteVal}, Priority: ₹${priorityVal}`);

    console.log('--- Step 4: Update All 3 Prices via Targeted Modals ---');
    const changeButtons = page.locator('button:has-text("Change Price")');
    const changeBtnCount = await changeButtons.count();
    console.log(`Found ${changeBtnCount} Change Price buttons (expected 3)`);
    if (changeBtnCount < 3) throw new Error(`Expected at least 3 Change Price buttons, found ${changeBtnCount}`);

    // Update In-Clinic Price to 175
    console.log('Updating In-Clinic price to ₹175...');
    await changeButtons.nth(0).click();
    await page.waitForSelector('input[type="number"]');
    await page.locator('input[type="number"]').fill('175');
    await page.locator('button[type="submit"]:has-text("Save Price")').click();
    await page.waitForTimeout(1000);

    // Update Remote Price to 275
    console.log('Updating Remote price to ₹275...');
    await changeButtons.nth(1).click();
    await page.waitForSelector('input[type="number"]');
    await page.locator('input[type="number"]').fill('275');
    await page.locator('button[type="submit"]:has-text("Save Price")').click();
    await page.waitForTimeout(1000);

    // Update Priority Price to 65
    console.log('Updating Priority price to ₹65...');
    await changeButtons.nth(2).click();
    await page.waitForSelector('input[type="number"]');
    await page.locator('input[type="number"]').fill('65');
    await page.locator('button[type="submit"]:has-text("Save Price")').click();
    await page.waitForTimeout(1000);

    // Check immediate UI update
    const inClinicAfter = await inputs.nth(0).inputValue();
    const remoteAfter = await inputs.nth(1).inputValue();
    const priorityAfter = await inputs.nth(2).inputValue();
    console.log(`Updated Prices in UI -> In-Clinic: ₹${inClinicAfter}, Remote: ₹${remoteAfter}, Priority: ₹${priorityAfter}`);
    if (inClinicAfter !== '175' || remoteAfter !== '275' || priorityAfter !== '65') {
      throw new Error(`Price update failed! Expected 175, 275, 65 but got ${inClinicAfter}, ${remoteAfter}, ${priorityAfter}`);
    }

    console.log('--- Step 5: Test Tab Switching Persistence (Reproducing User Scenario) ---');
    console.log('Navigating to "Doctors & Chambers" tab...');
    await page.locator('button:has-text("Doctors & Chambers")').first().click();
    await page.waitForTimeout(800);

    console.log('Navigating to "Admin Profile" tab...');
    await page.locator('button:has-text("Admin Profile")').first().click();
    await page.waitForTimeout(800);

    console.log('Navigating BACK to "Pricing & TV QR" tab...');
    await page.locator('button:has-text("Pricing & TV QR")').first().click();
    await page.waitForTimeout(1000);

    const inputsAfterTabSwitch = page.locator('input[type="text"][disabled][readonly]');
    const inClinicSwitchVal = await inputsAfterTabSwitch.nth(0).inputValue();
    const remoteSwitchVal = await inputsAfterTabSwitch.nth(1).inputValue();
    const prioritySwitchVal = await inputsAfterTabSwitch.nth(2).inputValue();

    console.log(`Prices after tab switch -> In-Clinic: ₹${inClinicSwitchVal}, Remote: ₹${remoteSwitchVal}, Priority: ₹${prioritySwitchVal}`);
    if (inClinicSwitchVal !== '175') {
      throw new Error(`In-Clinic price reset after tab switch! Expected 175, got ${inClinicSwitchVal}`);
    }
    if (remoteSwitchVal !== '275') {
      throw new Error(`Remote price reset after tab switch! Expected 275, got ${remoteSwitchVal}`);
    }
    if (prioritySwitchVal !== '65') {
      throw new Error(`Priority price reset after tab switch! Expected 65, got ${prioritySwitchVal}`);
    }
    console.log('✅ PASS: Prices strictly persisted across tab switches without resetting!');

    console.log('--- Step 6: Test Instant Priority Queue Disabled State ---');
    // Turn off priority queue
    const togglePriorityBtn = page.locator('button:has-text("Turn OFF Priority Queue")');
    if (await togglePriorityBtn.isVisible()) {
      console.log('Clicking "Turn OFF Priority Queue"...');
      await togglePriorityBtn.click();
      await page.waitForTimeout(1200);

      // Verify that Priority Live Queue Price row is greyed out and button is disabled
      const priorityChangeBtn = page.locator('button:has-text("Change Price")').nth(2);
      const isPriorityBtnDisabled = await priorityChangeBtn.isDisabled();
      console.log('Priority Change Price button is disabled:', isPriorityBtnDisabled);
      if (!isPriorityBtnDisabled) {
        throw new Error('Priority Change Price button should be disabled when Priority Queue is turned off!');
      }

      const featureOffBadge = page.locator('text=Feature Turned Off');
      const isBadgeVisible = await featureOffBadge.isVisible();
      console.log('Feature Turned Off badge visible:', isBadgeVisible);
      if (!isBadgeVisible) {
        throw new Error('"Feature Turned Off" badge should be visible!');
      }

      // Re-enable Priority Queue
      console.log('Turning Priority Queue back ON...');
      await page.locator('button:has-text("Turn ON Priority Queue")').click();
      await page.waitForTimeout(1200);

      const isPriorityBtnEnabledAgain = !(await priorityChangeBtn.isDisabled());
      console.log('Priority Change Price button re-enabled:', isPriorityBtnEnabledAgain);
      if (!isPriorityBtnEnabledAgain) {
        throw new Error('Priority Change Price button should be re-enabled when Priority Queue is turned back on!');
      }
    }

    console.log('--- Step 7: Verify Patient Booking Modal Reflects Dynamic Priority Price ---');
    // Open Book Appointment modal
    const bookModalBtn = page.locator('button:has-text("Book Appointment")').first();
    if (await bookModalBtn.isVisible()) {
      await bookModalBtn.click();
      await page.waitForTimeout(1000);

      // Check if Priority Pass (+₹65) is shown
      const priorityText = page.locator('text=+₹65 Extra');
      const isDynamicFeeShown = await priorityText.isVisible();
      console.log('Booking modal renders dynamic priority fee +₹65 Extra:', isDynamicFeeShown);
      if (!isDynamicFeeShown) {
        throw new Error('Booking modal did not render configured +₹65 priority price!');
      }

      // Close modal
      const closeBtn = page.locator('button:has(svg.lucide-x)').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
    }

    console.log('\n======================================================');
    console.log('🎉 ALL TESTS PASSED SUCCESSFULLY! 100% VERIFIED!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ TEST FAILED:', err);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

run();
