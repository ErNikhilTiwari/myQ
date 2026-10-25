const { chromium } = require('playwright-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:4000';

async function run() {
  console.log('--- Launching Chrome for Verification ---');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- Step 1: Navigate to Home ---');
  await page.goto(APP_URL, { waitUntil: 'networkidle' });

  console.log('--- Step 2: Login as Patient Rahul Verma ---');
  // Click Patient Login
  await page.locator('button:has-text("Patient Login")').first().click();
  await page.waitForTimeout(500);

  // Fill Phone Number
  await page.locator('input[type="tel"]').fill('9876510001');
  const sendOtpBtn = await page.waitForSelector('button:has-text("Send OTP & Login")');
  await sendOtpBtn.click();
  await page.waitForTimeout(1000);

  // Fill Default OTP
  await page.waitForSelector('input[placeholder="------"]', { timeout: 5000 });
  await page.fill('input[placeholder="------"]', '123456');
  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/verify-otp')),
    page.keyboard.press('Enter'),
  ]);
  await page.waitForTimeout(1500);

  console.log('Logged in successfully!');

  console.log('--- Step 3: Click Book Consultation ---');
  const bookBtn = page.locator('button:has-text("Book Consultation"), button:has-text("Book Another Appointment")').first();
  await bookBtn.click();
  await page.waitForTimeout(800);

  // Check that Appointment Booking Modal is visible in DETAILS step
  const modalHeader = await page.locator('h2:has-text("Book Doctor Appointment")').isVisible();
  console.log('Modal opened in DETAILS step:', modalHeader);
  if (!modalHeader) throw new Error('Modal did not open in DETAILS step!');

  // Select tomorrow date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  await page.locator('input[type="date"]').fill(tomorrowStr);
  await page.waitForTimeout(500);

  // Select doctor if available
  const selects = await page.$$('select');
  if (selects.length > 1) {
    const docSelect = selects[1];
    const docOpts = await docSelect.$$eval('option', (opts) =>
      opts.map((o) => ({ value: o.value, text: o.text }))
    );
    const rameshOpt = docOpts.find((o) => o.text.includes('Ramesh') || o.text.includes('Sharma') || o.value);
    if (rameshOpt) {
      await docSelect.selectOption(rameshOpt.value);
      await page.waitForTimeout(500);
    }
  }

  // Select available slot
  const slotSelects = await page.$$('select');
  for (const sel of slotSelects) {
    const options = await sel.$$eval('option', (opts) =>
      opts.map((o) => ({ value: o.value, text: o.text, disabled: o.disabled }))
    );
    const availableOpt = options.find(
      (o) => !o.disabled && (o.text.includes('AM') || o.text.includes('PM'))
    );
    if (availableOpt) {
      await sel.selectOption(availableOpt.value);
      console.log('Selected slot:', availableOpt.text);
      break;
    }
  }

  // Click Proceed to Payment
  await page.locator('button:has-text("Proceed to Payment")').click();
  await page.waitForTimeout(800);

  // Click Pay & Confirm
  const payBtn = page.locator('button:has-text("Confirm"), button:has-text("Pay")').first();
  const [bookRes] = await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/appointments') && r.request().method() === 'POST'),
    payBtn.click(),
  ]);
  const bookData = await bookRes.json();
  console.log('Book response:', bookRes.status(), bookData);

  const verifyRes = await page.waitForResponse(
    (r) => r.url().includes('/api/payments/verify') && r.request().method() === 'POST'
  );
  const verifyData = await verifyRes.json();
  console.log('Verify response:', verifyRes.status(), verifyData);

  await page.waitForTimeout(1000);

  console.log('--- Step 4: Verify SUCCESS screen and new Book Another Appointment button ---');
  const successHeader = await page.locator('h3:has-text("Appointment Confirmed!")').isVisible();
  console.log('Appointment Confirmed visible:', successHeader);
  if (!successHeader) {
    const bodyText = await page.evaluate(() => document.body.innerText);
    console.log('Body text:', bodyText);
    throw new Error('Did not reach confirmation screen!');
  }

  const bookAnotherInSuccess = await page.locator('[role="dialog"] button:has-text("Book Another Appointment")').isVisible();
  console.log('"Book Another Appointment" button visible in Success receipt:', bookAnotherInSuccess);
  if (!bookAnotherInSuccess) throw new Error('"Book Another Appointment" button NOT found in Success receipt!');

  const doneBtn = page.locator('[role="dialog"] button:has-text("Done")');
  console.log('"Done" button visible:', await doneBtn.isVisible());

  console.log('--- Step 5: Test Clicking "Book Another Appointment" directly from Success receipt ---');
  await page.locator('[role="dialog"] button:has-text("Book Another Appointment")').click();
  await page.waitForTimeout(800);

  const resetToDetails = await page.locator('[role="dialog"] h2:has-text("Book Doctor Appointment")').isVisible();
  console.log('Modal immediately reset to DETAILS step:', resetToDetails);
  if (!resetToDetails) throw new Error('Modal did not reset to DETAILS step when clicking Book Another Appointment!');

  console.log('--- Step 6: Close Modal with Done / X button and verify portal button transforms ---');
  // Close the modal using the top close button in dialog
  await page.locator('[role="dialog"] button:has(svg)').first().click();
  await page.waitForTimeout(800);

  // On Patient Portal, check that the button has transformed to "+ Book Another Appointment"
  const portalTransformedBtn = await page.locator('button:has-text("+ Book Another Appointment")').first().isVisible();
  console.log('Portal Header transformed button visible:', portalTransformedBtn);
  if (!portalTransformedBtn) throw new Error('Portal header button did not transform to "+ Book Another Appointment"!');

  console.log('--- Step 7: Click transformed "+ Book Another Appointment" button and ensure clean DETAILS modal opens ---');
  await page.locator('button:has-text("+ Book Another Appointment")').first().click();
  await page.waitForTimeout(800);

  const cleanModalHeader = await page.locator('h2:has-text("Book Doctor Appointment")').isVisible();
  const notStuckOnSuccess = !(await page.locator('h3:has-text("Appointment Confirmed!")').isVisible());
  console.log('Clean DETAILS modal opened without refresh:', cleanModalHeader && notStuckOnSuccess);

  if (!cleanModalHeader || !notStuckOnSuccess) {
    throw new Error('Modal reopened stuck on previous confirmation instead of fresh booking form!');
  }

  await browser.close();
  console.log('\n🎉 ALL VERIFICATIONS PASSED 100%! Modal resets seamlessly and offers immediate "Book Another Appointment" functionality!');
}

run().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
