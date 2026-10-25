const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE_URL = 'http://localhost:4000';

const logs = {
  consoleErrors: [],
  pageErrors: [],
  networkFailures: [],
  apiTraffic: [],
  steps: [],
  discrepancies: [],
  bugsFound: [],
};

function logStep(stepNum, action, detail, status = 'PASS', error = null) {
  const entry = { stepNum, action, detail, status, error, timestamp: new Date().toISOString() };
  logs.steps.push(entry);
  const mark = status === 'PASS' ? '✅ PASS' : status === 'FAIL' ? '❌ FAIL' : status === 'WARN' ? '⚠️ WARN' : 'ℹ️ INFO';
  console.log(`[STEP ${stepNum}] [${mark}] ${action}: ${detail}`);
  if (error) {
    console.error(`       ERROR DETAIL:`, error);
  }
}

async function runAutonomousTesting() {
  console.log('===============================================================');
  console.log('🤖 AUTONOMOUS TESTING AGENT: END-TO-END VERIFICATION RUN');
  console.log(`🎯 URL: ${BASE_URL}`);
  console.log('===============================================================\n');

  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const context = await browser.newContext({
    viewport: { width: 1366, height: 900 },
  });

  const page = await context.newPage();

  // Listen for browser console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      logs.consoleErrors.push({ text: msg.text(), location: msg.location() });
      console.log(`  [CONSOLE ERROR] ${msg.text()}`);
    }
  });

  // Listen for page errors (uncaught JS exceptions)
  page.on('pageerror', (err) => {
    logs.pageErrors.push({ text: err.message, stack: err.stack });
    console.error(`  [UNCAUGHT PAGE ERROR]`, err.message);
  });

  // Monitor Network Tab Activity
  page.on('request', (req) => {
    if (req.url().includes('/api/')) {
      logs.apiTraffic.push({
        type: 'REQUEST',
        method: req.method(),
        url: req.url(),
        postData: req.postData(),
        time: new Date().toISOString(),
      });
    }
  });

  page.on('response', async (res) => {
    if (res.url().includes('/api/')) {
      const status = res.status();
      let responseBody = '';
      try {
        responseBody = await res.text();
      } catch {}

      logs.apiTraffic.push({
        type: 'RESPONSE',
        status,
        url: res.url(),
        body: responseBody.slice(0, 1000),
        time: new Date().toISOString(),
      });

      if (status >= 400) {
        logs.networkFailures.push({
          method: res.request().method(),
          url: res.url(),
          status,
          response: responseBody,
        });
      }
    }
  });

  try {
    // =========================================================================
    // STEP 1: AUTHENTICATION FLOWS (LANDING PAGE, OTP COOLDOWN, PASSWORD LOGIN)
    // =========================================================================
    console.log('\n--- [STEP 1] AUTHENTICATION & SESSION MANAGEMENT ---');

    // 1.1 Landing page navigation
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const pageTitle = await page.title();
    logStep(1.1, 'Landing Page Load', `Successfully loaded. Title: "${pageTitle}"`);

    // Reset storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload({ waitUntil: 'networkidle' });

    // 1.2 Open Login Modal
    const signInBtn = await page.waitForSelector('button:has-text("Patient Login"), button:has-text("Sign In"), button:has-text("Login")', { timeout: 6000 });
    await signInBtn.click();
    await page.waitForSelector('input[type="tel"]', { timeout: 5000 });
    logStep(1.2, 'Login Modal Interaction', 'Opened Login Modal via navigation button');

    // 1.3 Test Phone Validation (10 digits)
    await page.fill('input[type="tel"]', '9876510001');
    const typedPhone = await page.$eval('input[type="tel"]', (el) => el.value);
    logStep(1.3, 'Phone Field Sanitization', `Entered digits: ${typedPhone} (Expected: 9876510001)`);

    // 1.4 Test Send OTP (OTP Method)
    const sendOtpBtn = await page.waitForSelector('button:has-text("Send OTP & Login")');
    const [sendOtpRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/send-otp')),
      sendOtpBtn.click(),
    ]);
    const sendOtpData = await sendOtpRes.json();
    logStep(
      1.4,
      'Send OTP API Call',
      `POST /api/auth/send-otp -> Status: ${sendOtpRes.status()}, Success: ${sendOtpData.success}`,
      sendOtpData.success ? 'PASS' : 'FAIL'
    );

    // 1.5 OTP Screen Verification & Dynamic Cooldown Policy Check
    await page.waitForSelector('input[placeholder="------"]', { timeout: 5000 });
    const resendBtn = await page.$('button:has-text("Resend")');
    const isResendDisabled = await resendBtn?.getAttribute('disabled');
    logStep(
      1.5,
      'OTP Input & Cooldown UI',
      `OTP input rendered. Resend button state: disabled=${isResendDisabled !== null}`
    );

    // 1.6 Verify OTP Submission (Patient 1: Rahul Verma)
    await page.fill('input[placeholder="------"]', '123456');
    const [verifyOtpRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/verify-otp')),
      page.keyboard.press('Enter'),
    ]);
    const verifyOtpData = await verifyOtpRes.json();
    logStep(
      1.6,
      'Verify OTP API Call',
      `POST /api/auth/verify-otp -> Status: ${verifyOtpRes.status()}, User: ${verifyOtpData.data?.user?.name} (${verifyOtpData.data?.user?.role})`,
      verifyOtpData.success ? 'PASS' : 'FAIL'
    );

    // 1.7 Patient Session Storage Parity Check
    await page.waitForTimeout(1000);
    const storedPatientJson = await page.evaluate(() => localStorage.getItem('user'));
    const storedPatient = JSON.parse(storedPatientJson || '{}');
    if (storedPatient.phoneNumber !== '+919876510001' || storedPatient.role !== 'PATIENT') {
      const err = `Stored user mismatch: ${JSON.stringify(storedPatient)}`;
      logs.discrepancies.push(err);
      logStep(1.7, 'Patient Auth Session Comparison', err, 'FAIL');
    } else {
      logStep(1.7, 'Patient Auth Session Comparison', `Local storage matches backend user payload: ${storedPatient.name}`);
    }

    // 1.8 Logout
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });
    logStep(1.8, 'Session Reset / Logout', 'Cleared patient session');

    // 1.9 Test Password Sign-in for Clinic Admin (+919876500011 / Password@123)
    const signInBtn2 = await page.waitForSelector('button:has-text("Patient Login"), button:has-text("Sign In"), button:has-text("Login")');
    await signInBtn2.click();
    await page.waitForSelector('button:has-text("Login with Password")');
    await page.click('button:has-text("Login with Password")');

    await page.fill('input[type="tel"]', '9876500011');
    await page.fill('input[type="password"]', 'Password@123');

    const [adminLoginRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login-password')),
      page.click('button[type="submit"]:has-text("Login with Password")'),
    ]);
    const adminLoginData = await adminLoginRes.json();
    logStep(
      1.9,
      'Clinic Admin Password Login',
      `POST /api/auth/login-password -> Status: ${adminLoginRes.status()}, Role: ${adminLoginData.data?.user?.role}, ClinicId: ${adminLoginData.data?.user?.clinicId}`,
      adminLoginData.success ? 'PASS' : 'FAIL'
    );

    // 1.10 Verify Clinic Admin Dashboard UI Transition
    await page.waitForTimeout(1500);
    const adminUser = await page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}'));
    if (adminUser.role !== 'CLINIC_ADMIN') {
      logStep(1.10, 'Clinic Admin Navigation', `Expected CLINIC_ADMIN, received ${adminUser.role}`, 'FAIL');
    } else {
      logStep(1.10, 'Clinic Admin Navigation', `Successfully navigated to Clinic Admin Suite for ${adminUser.name}`);
    }

    // 1.11 Test Super Admin Login (+919999999999 / Password@123)
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    const signInBtn3 = await page.waitForSelector('button:has-text("Patient Login"), button:has-text("Sign In"), button:has-text("Login")');
    await signInBtn3.click();
    await page.waitForSelector('button:has-text("Login with Password")');
    await page.click('button:has-text("Login with Password")');

    await page.fill('input[type="tel"]', '9999999999');
    await page.fill('input[type="password"]', 'Password@123');

    const [superLoginRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login-password')),
      page.click('button[type="submit"]:has-text("Login with Password")'),
    ]);
    const superLoginData = await superLoginRes.json();
    logStep(
      1.11,
      'Super Admin Login API Call',
      `POST /api/auth/login-password -> Status: ${superLoginRes.status()}, Role: ${superLoginData.data?.user?.role}`,
      superLoginData.success ? 'PASS' : 'FAIL'
    );

    await page.waitForTimeout(1500);
    const superUser = await page.evaluate(() => JSON.parse(localStorage.getItem('user') || '{}'));
    if (superUser.role !== 'SUPER_ADMIN') {
      logStep(1.12, 'Super Admin Navigation', `Expected SUPER_ADMIN, received ${superUser.role}`, 'FAIL');
    } else {
      logStep(1.12, 'Super Admin Navigation', `Navigated to Super Admin Control Panel for ${superUser.name}`);
    }

    // =========================================================================
    // STEP 2: PATIENT APPOINTMENT BOOKING & PRICING VERIFICATION
    // =========================================================================
    console.log('\n--- [STEP 2] PATIENT APPOINTMENT BOOKING & PRICING VERIFICATION ---');

    // 2.1 Re-login as Patient 1 (Rahul Verma)
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    const signInBtn4 = await page.waitForSelector('button:has-text("Patient Login"), button:has-text("Sign In"), button:has-text("Login")');
    await signInBtn4.click();
    await page.waitForSelector('button:has-text("Login with Password")');
    await page.click('button:has-text("Login with Password")');
    await page.fill('input[type="tel"]', '9876510001');
    await page.fill('input[type="password"]', 'Password@123');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login-password')),
      page.click('button[type="submit"]:has-text("Login with Password")'),
    ]);
    await page.waitForTimeout(1000);
    logStep(2.1, 'Patient Logged in', 'Authenticated as Patient Rahul Verma (+919876510001)');

    // 2.2 Trigger Appointment Booking Modal
    const bookBtn = await page.waitForSelector('button:has-text("Book Consultation"), button:has-text("Book Another Appointment"), button:has-text("Book Another Consultation")', { timeout: 6000 });
    await bookBtn.click();
    await page.waitForSelector('input[type="date"]', { timeout: 6000 });
    logStep(2.2, 'Open Booking Modal', 'Clicked Book Consultation / Book Another Appointment, Appointment Booking Modal rendered');

    // 2.3 Inspect Base Appointment Price (₹200)
    const modalText = await page.evaluate(() => document.body.innerText);
    const has200 = modalText.includes('200') || modalText.includes('₹200') || modalText.includes('₹ 200');
    logStep(
      2.3,
      'Base Price Verification',
      `Base consultation fee of ₹200 displayed in UI: ${has200}`,
      has200 ? 'PASS' : 'FAIL'
    );

    // 2.4 Verify Date Picker Horizon (Today & Next 2 Days Only, No Past Dates)
    const dateInput = await page.$('input[type="date"]');
    const minDate = await dateInput.getAttribute('min');
    const maxDate = await dateInput.getAttribute('max');
    const todayStr = new Date().toISOString().split('T')[0];

    const todayDateObj = new Date();
    const maxDateExpectedObj = new Date();
    maxDateExpectedObj.setDate(todayDateObj.getDate() + 2);
    const maxExpectedStr = maxDateExpectedObj.toISOString().split('T')[0];

    const isDateWindowValid = minDate === todayStr && maxDate === maxExpectedStr;
    logStep(
      2.4,
      'Date Picker Horizon Constraint',
      `min: "${minDate}" (today), max: "${maxDate}" (today + 2 days). Valid: ${isDateWindowValid}`,
      isDateWindowValid ? 'PASS' : 'FAIL'
    );

    // 2.5 Inspect Instant Priority Queue Checkbox (+₹50)
    const priorityCheckbox = await page.$('input[type="checkbox"]');
    if (!priorityCheckbox) {
      logStep(2.5, 'Priority Queue Checkbox', 'Priority queue checkbox not found in modal', 'FAIL');
    } else {
      const isInitiallyChecked = await priorityCheckbox.isChecked();
      logStep(2.5, 'Priority Checkbox Discovery', `Checkbox discovered. Initial checked state: ${isInitiallyChecked}`);

      // Toggle to Checked
      if (!isInitiallyChecked) {
        await priorityCheckbox.check();
      }
      await page.waitForTimeout(400);

      const feeAfterPriority = await page.evaluate(() => {
        const text = document.body.innerText;
        return text.includes('250') || text.includes('₹250') || text.includes('₹ 250');
      });
      logStep(
        2.6,
        'Priority Fee Calculation',
        `UI fee correctly updated from ₹200 to ₹250 upon checking instant queue: ${feeAfterPriority}`,
        feeAfterPriority ? 'PASS' : 'FAIL'
      );
    }

    // 2.7 Select Clinic (City Health Multispecialty Clinic) & Doctor
    const allSelects = await page.$$('select');
    if (allSelects.length > 0) {
      const clinicSelect = allSelects[0];
      const clinicOpts = await clinicSelect.$$eval('option', (opts) =>
        opts.map((o) => ({ value: o.value, text: o.text }))
      );
      const cityHealthOpt = clinicOpts.find((o) => o.text.includes('City Health'));
      if (cityHealthOpt) {
        await clinicSelect.selectOption(cityHealthOpt.value);
        logStep(2.7, 'Clinic Selection', `Selected clinic: ${cityHealthOpt.text}`);
        await page.waitForTimeout(800);
      }
    }

    // Select Dr. Ramesh Sharma specifically so his queue reflects the booking in Step 3
    const afterClinicSelects = await page.$$('select');
    if (afterClinicSelects.length > 1) {
      const docSelect = afterClinicSelects[1];
      const docOpts = await docSelect.$$eval('option', (opts) =>
        opts.map((o) => ({ value: o.value, text: o.text }))
      );
      const rameshOpt = docOpts.find((o) => o.text.includes('Ramesh'));
      if (rameshOpt) {
        await docSelect.selectOption(rameshOpt.value);
        logStep(2.75, 'Doctor Selection', `Selected doctor: ${rameshOpt.text}`);
        await page.waitForTimeout(600);
      }
    }

    // Select an available time slot from the slot select
    const slotSelects = await page.$$('select');
    let selectedSlot = '';
    for (const sel of slotSelects) {
      const options = await sel.$$eval('option', (opts) =>
        opts.map((o) => ({ value: o.value, text: o.text, disabled: o.disabled }))
      );
      const availableOpt = options.find(
        (o) => !o.disabled && (o.text.includes('AM') || o.text.includes('PM'))
      );
      if (availableOpt) {
        await sel.selectOption(availableOpt.value);
        selectedSlot = availableOpt.text;
        break;
      }
    }
    logStep(2.8, 'Time Slot Selection', `Selected consultation slot: "${selectedSlot}"`);

    // 2.9 Transition to Payment Screen
    const proceedToPayBtn = await page.waitForSelector('button:has-text("Proceed to Payment")');
    await proceedToPayBtn.click();
    await page.waitForTimeout(600);
    logStep(2.9, 'Payment Step Navigation', 'Navigated to Payment Summary screen');

    // 2.10 Confirm and Pay
    const payAndConfirmBtn = await page.waitForSelector('button:has-text("Confirm"), button:has-text("Pay")');
    const [bookRes] = await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/appointments') && r.request().method() === 'POST'),
      payAndConfirmBtn.click(),
    ]);

    const bookStatus = bookRes.status();
    const bookData = await bookRes.json();
    logStep(
      2.10,
      'Create Appointment API Call',
      `POST /api/appointments -> Status: ${bookStatus}, Success: ${bookData.success}, Fee: ₹${bookData.data?.bookingFee}`,
      bookStatus === 201 && bookData.data?.bookingFee === 250 ? 'PASS' : 'FAIL'
    );

    // Await the subsequent payment verification call
    const verifyRes = await page.waitForResponse(
      (r) => r.url().includes('/api/payments/verify') && r.request().method() === 'POST'
    );
    const verifyStatus = verifyRes.status();
    const verifyData = await verifyRes.json();
    const finalToken = verifyData.data?.tokenNumber;
    logStep(
      2.11,
      'Payment Verification & Token Allocation API',
      `POST /api/payments/verify -> Status: ${verifyStatus}, Token Assigned: ${finalToken}`,
      (verifyStatus === 200 || verifyStatus === 201) && Boolean(finalToken) ? 'PASS' : 'FAIL'
    );

    // 2.12 UI Confirmation State Parity
    await page.waitForTimeout(1500);
    const confirmationText = await page.evaluate(() => document.body.innerText);
    const uiReflectsToken = Boolean(finalToken && confirmationText.includes(finalToken));
    logStep(
      2.12,
      'UI Confirmation State Parity',
      `UI reflects booked token "${finalToken}": ${uiReflectsToken}`,
      uiReflectsToken ? 'PASS' : 'FAIL'
    );

    // =========================================================================
    // STEP 3: CLINIC ADMIN & RECEPTIONIST QUEUE OPERATIONS
    // =========================================================================
    console.log('\n--- [STEP 3] CLINIC ADMIN & RECEPTIONIST QUEUE OPERATIONS ---');

    // 3.1 Login as Clinic Admin (+919876500011)
    await page.evaluate(() => localStorage.clear());
    await page.reload({ waitUntil: 'networkidle' });

    const signInBtn5 = await page.waitForSelector('button:has-text("Patient Login"), button:has-text("Sign In"), button:has-text("Login")');
    await signInBtn5.click();
    await page.waitForSelector('button:has-text("Login with Password")');
    await page.click('button:has-text("Login with Password")');
    await page.fill('input[type="tel"]', '9876500011');
    await page.fill('input[type="password"]', 'Password@123');
    await Promise.all([
      page.waitForResponse((r) => r.url().includes('/api/auth/login-password')),
      page.click('button[type="submit"]:has-text("Login with Password")'),
    ]);
    await page.waitForTimeout(1500);
    logStep(3.1, 'Clinic Admin Authenticated', 'Logged in as Dr. Ramesh Sharma (City Health Multispecialty Clinic)');

    // 3.2 Verify Live Queue Horizon Navigation (Today, Tomorrow, Day After)
    await page.waitForSelector('button:has-text("Today")', { timeout: 8000 }).catch(() => null);
    const horizonButtons = await page.$$('button:has-text("Today"), button:has-text("Tomorrow")');
    logStep(3.2, 'Queue Date Horizon Buttons', `Found ${horizonButtons.length} date horizon buttons in console`);

    // Click "Tomorrow" and check network query param
    const tomorrowBtn = await page.$('button:has-text("Tomorrow")');
    if (tomorrowBtn) {
      const [tomorrowRes] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/queues/') && r.url().includes('date=')),
        tomorrowBtn.click(),
      ]);
      const tomorrowData = await tomorrowRes.json();
      logStep(
        3.3,
        'Tomorrow Queue Date Isolation API',
        `GET /queues/:id?date=... responded with Status ${tomorrowRes.status()}, Waiting: ${tomorrowData.data?.waiting?.length || 0}, Booked: ${tomorrowData.data?.booked?.length || 0}`,
        tomorrowRes.status() === 200 ? 'PASS' : 'FAIL'
      );

      await page.waitForTimeout(1000);
      const tomorrowText = await page.evaluate(() => document.body.innerText);
      const hasPatientName = tomorrowText.includes('Rahul Verma');
      const hasPhone = tomorrowText.includes('9876510001');
      const hasAgeGender = tomorrowText.includes('32') || tomorrowText.includes('MALE') || tomorrowText.includes('Male');
      const hasPriority = tomorrowText.includes('Priority') || tomorrowText.includes('PRIORITY') || tomorrowText.includes('⚡');

      logStep(
        3.4,
        'Patient Metadata in Tomorrow Queue',
        `Patient Name: ${hasPatientName}, Phone: ${hasPhone}, Age/Sex: ${hasAgeGender}, Priority Tag: ${hasPriority}`,
        hasPatientName && hasPhone ? 'PASS' : 'WARN'
      );

      // Return to "Today"
      const todayBtn = await page.$('button:has-text("Today")');
      if (todayBtn) {
        await Promise.all([
          page.waitForResponse((r) => r.url().includes('/queues/') && r.url().includes('date=')),
          todayBtn.click(),
        ]);
        await page.waitForTimeout(1000);
        logStep(3.5, 'Return to Today Queue', 'Successfully switched back to Today queue view');
      }
    }

    // 3.6 Register a Walk-in Patient to Test "Call Next" in Real-Time
    const walkinBtn = await page.$('button:has-text("New Walk-in Patient")');
    if (walkinBtn) {
      await walkinBtn.click();
      await page.waitForSelector('input[placeholder*="Patient Full Name"], input[type="text"]', { timeout: 4000 });

      const textInputs = await page.$$('input[type="text"]');
      if (textInputs.length > 0) {
        await textInputs[0].fill('Walkin Patient Test');
      }
      const telInput = await page.$('input[type="tel"]');
      if (telInput) {
        await telInput.fill('9876500099');
      }

      const issueTokenBtn = await page.waitForSelector('button:has-text("Generate Token")');
      const [walkinRes] = await Promise.all([
        page.waitForResponse((r) => r.url().includes('/receptionist/walk-in')),
        issueTokenBtn.click(),
      ]);
      const walkinData = await walkinRes.json();
      logStep(
        3.6,
        'Issue Walk-in Token',
        `POST /receptionist/walk-in Status: ${walkinRes.status()}, Token: ${walkinData.data?.entry?.tokenNumber || walkinData.data?.tokenNumber}`,
        walkinRes.status() === 201 || walkinRes.status() === 200 ? 'PASS' : 'FAIL'
      );
    }

    // 3.7 Test Call Next Patient Button
    await page.waitForTimeout(1000);
    const callNextBtn = await page.$('button:has-text("Call Next")');
    if (callNextBtn) {
      const isCallDisabled = await callNextBtn.getAttribute('disabled');
      if (isCallDisabled === null) {
        const [callRes] = await Promise.all([
          page.waitForResponse((r) => r.url().includes('/call-next') || r.url().includes('/call')),
          callNextBtn.click(),
        ]);
        const callData = await callRes.json();
        logStep(
          3.7,
          'Call Next Patient Action',
          `API Call Next Status: ${callRes.status()}, Token Called: ${callData.data?.tokenNumber || 'N/A'}`,
          callRes.status() === 200 ? 'PASS' : 'FAIL'
        );
      } else {
        logStep(3.7, 'Call Next Patient Action', 'Call Next button is disabled (no patients waiting in queue)', 'INFO');
      }
    }

    // 3.7 Verify Clinic Operating Hours & Holiday Calendar in Admin Profile
    const profileTabBtn = await page.$('button:has-text("Admin Profile")');
    if (profileTabBtn) {
      await profileTabBtn.click();
      await page.waitForTimeout(1000);

      const profileViewText = await page.evaluate(() => document.body.innerText);
      const hasWorkingDays = profileViewText.includes('Operating Hours') || profileViewText.includes('Working Days');
      const hasHolidays = profileViewText.includes('Holiday') || profileViewText.includes('Mark Clinic Holiday');

      logStep(
        3.7,
        'Clinic Schedule & Holiday Management',
        `Operating Hours & Working Days: ${hasWorkingDays}, Marked Holidays Section: ${hasHolidays}`,
        hasWorkingDays && hasHolidays ? 'PASS' : 'FAIL'
      );
    }

    console.log('\n===============================================================');
    console.log('🎉 ALL AUTONOMOUS TESTING STEPS COMPLETED');
    console.log('===============================================================');

  } catch (fatalErr) {
    console.error('\n❌ Unhandled Fatal Error:', fatalErr);
    logStep(999, 'Fatal Runner Error', fatalErr.message, 'FATAL', fatalErr.stack);
  } finally {
    const reportPath = path.resolve(process.cwd(), 'tests/e2e-verification-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(logs, null, 2));
    console.log(`\n📄 Execution Report saved to: ${reportPath}`);
    await browser.close();
  }
}

runAutonomousTesting().catch(console.error);
