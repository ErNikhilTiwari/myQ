const { chromium } = require('playwright-core');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const APP_URL = 'http://localhost:4000';

async function run() {
  console.log('--- Launching Chrome for Edit & Disabled Save Button UX Verification ---');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: true,
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('--- Step 1: Login as Clinic Admin (Dr. Ramesh Sharma) ---');
  await page.goto(APP_URL, { waitUntil: 'networkidle' });
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload({ waitUntil: 'networkidle' });

  // Open Login Modal
  const signInBtn = await page.waitForSelector('button:has-text("Patient Login"), button:has-text("Sign In"), button:has-text("Login")', { timeout: 6000 });
  await signInBtn.click();
  await page.waitForTimeout(500);

  // Switch to Password tab
  await page.locator('button:has-text("Password")').first().click();
  await page.waitForTimeout(400);

  // Check that Login button is disabled before typing
  const initialLoginBtnDisabled = await page.locator('button[type="submit"]:has-text("Login with Password")').isDisabled();
  console.log('Password Login button disabled before entering credentials:', initialLoginBtnDisabled);
  if (!initialLoginBtnDisabled) throw new Error('Password Login button should be disabled when fields are empty!');

  // Fill Phone and Password
  await page.locator('input[type="tel"]').fill('9876500001');
  await page.locator('input[type="password"]').fill('Password@123');
  await page.waitForTimeout(300);

  const loginBtnEnabledNow = !(await page.locator('button[type="submit"]:has-text("Login with Password")').isDisabled());
  console.log('Password Login button enabled after filling:', loginBtnEnabledNow);
  if (!loginBtnEnabledNow) throw new Error('Password Login button should be enabled after filling valid credentials!');

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login-password')),
    page.locator('button[type="submit"]:has-text("Login with Password")').click(),
  ]);
  await page.waitForTimeout(1500);

  console.log('--- Step 2: Navigate to Clinic Profile & Settings Tab ---');
  // Click on Admin Profile tab
  const profileTab = page.locator('button:has-text("Admin Profile")').first();
  await profileTab.click();
  await page.waitForTimeout(1000);

  console.log('--- Step 3: Verify Admin Account Details Read-Only by Default ---');
  // Check that admin name input is disabled
  const adminNameInput = page.locator('input[placeholder*="Rajesh Gupta"], input[placeholder*="Clinic Admin"]').first();
  const isAdminNameDisabled = await adminNameInput.isDisabled();
  console.log('Admin Name input disabled by default:', isAdminNameDisabled);
  if (!isAdminNameDisabled) throw new Error('Admin Name input must be disabled before clicking Edit Details!');

  // Check that "Edit Admin Details" button is visible
  const editAdminBtn = page.locator('button:has-text("Edit Admin Details")');
  console.log('"Edit Admin Details" button visible:', await editAdminBtn.isVisible());
  if (!(await editAdminBtn.isVisible())) throw new Error('"Edit Admin Details" button not found!');

  console.log('--- Step 4: Click "Edit Admin Details" and test Disabled Save when empty ---');
  await editAdminBtn.click();
  await page.waitForTimeout(500);

  const isAdminNameNowEditable = !(await adminNameInput.isDisabled());
  console.log('Admin Name input now editable:', isAdminNameNowEditable);
  if (!isAdminNameNowEditable) throw new Error('Admin Name should be editable after clicking Edit!');

  // Clear admin name
  await adminNameInput.fill('');
  await page.waitForTimeout(300);

  // Verify "Save Admin Details" is disabled & greyed out
  const saveAdminBtn = page.locator('button:has-text("Save Admin Details")');
  const isSaveAdminDisabled = await saveAdminBtn.isDisabled();
  console.log('"Save Admin Details" button disabled when Name is empty:', isSaveAdminDisabled);
  if (!isSaveAdminDisabled) throw new Error('"Save Admin Details" should be disabled when Name is empty!');

  // Refill valid name
  await adminNameInput.fill('Dr. Ramesh Sharma');
  await page.waitForTimeout(300);
  const isSaveAdminNowEnabled = !(await saveAdminBtn.isDisabled());
  console.log('"Save Admin Details" enabled when valid:', isSaveAdminNowEnabled);
  if (!isSaveAdminNowEnabled) throw new Error('"Save Admin Details" should be enabled when valid details filled!');

  // Click Cancel to exit edit mode
  await page.locator('button:has-text("Cancel")').first().click();
  await page.waitForTimeout(500);
  console.log('Exited edit mode on Cancel:', await adminNameInput.isDisabled());

  console.log('--- Step 5: Verify Clinic Information Read-Only and Edit Details ---');
  const clinicNameInput = page.locator('input[placeholder*="Apollo Medical Center"]').first();
  const isClinicNameDisabled = await clinicNameInput.isDisabled();
  console.log('Clinic Name input disabled by default:', isClinicNameDisabled);
  if (!isClinicNameDisabled) throw new Error('Clinic Name input must be disabled before clicking Edit!');

  const editClinicBtn = page.locator('button:has-text("Edit Clinic Details")');
  console.log('"Edit Clinic Details" button visible:', await editClinicBtn.isVisible());
  await editClinicBtn.click();
  await page.waitForTimeout(500);

  console.log('Clinic Name editable after clicking Edit:', !(await clinicNameInput.isDisabled()));

  // Test Save Clinic button disabled when empty
  const saveClinicBtn = page.locator('button:has-text("Save Clinic Details")');
  await clinicNameInput.fill('');
  await page.waitForTimeout(300);
  console.log('"Save Clinic Details" disabled when Name is empty:', await saveClinicBtn.isDisabled());
  if (!(await saveClinicBtn.isDisabled())) throw new Error('"Save Clinic Details" should be disabled when Name is empty!');

  // Cancel to revert
  await page.locator('button:has-text("Cancel")').first().click();
  await page.waitForTimeout(500);

  console.log('--- Step 6: Verify Operating Days & Timings Edit Mode ---');
  const editScheduleBtn = page.locator('button:has-text("Edit Timings & Holidays")');
  console.log('"Edit Timings & Holidays" button visible:', await editScheduleBtn.isVisible());
  if (!(await editScheduleBtn.isVisible())) throw new Error('"Edit Timings & Holidays" button should be visible!');

  console.log('--- Step 7: Verify Update Password Button Disabled when Empty ---');
  const updatePasswordBtn = page.locator('button:has-text("Update Password")');
  const isPasswordBtnDisabled = await updatePasswordBtn.isDisabled();
  console.log('"Update Password" button disabled when password fields empty:', isPasswordBtnDisabled);
  if (!isPasswordBtnDisabled) throw new Error('"Update Password" button must be disabled when password fields are empty!');

  console.log('--- Step 8: Patient Profile Modal & Edit Details Button ---');
  // Logout clinic admin
  await page.locator('button:has-text("Logout")').first().click();
  await page.waitForTimeout(1000);

  // Login as Patient Rahul Verma using official demo credentials
  await page.locator('button:has-text("Patient Login")').first().click();
  await page.waitForTimeout(500);
  await page.locator('button:has-text("Password")').first().click();
  await page.waitForTimeout(300);
  await page.locator('input[type="tel"]').fill('9876510001');
  await page.locator('input[type="password"]').fill('Password@123');
  await page.waitForTimeout(200);

  await Promise.all([
    page.waitForResponse((r) => r.url().includes('/api/auth/login-password')),
    page.locator('button[type="submit"]:has-text("Login with Password")').click(),
  ]);
  await page.waitForTimeout(1500);

  // Check that "Edit Details" button is visible on patient portal
  const editPatientProfileBtn = page.locator('button:has-text("Edit Details")').first();
  console.log('Patient portal "Edit Details" button visible:', await editPatientProfileBtn.isVisible());
  if (!(await editPatientProfileBtn.isVisible())) throw new Error('Patient portal "Edit Details" button should be visible!');

  // Click "Edit Details" to open PatientProfileModal
  await editPatientProfileBtn.click();
  await page.waitForTimeout(500);

  // In modal, clear name and check save button is disabled
  const patientNameInput = page.locator('input[placeholder*="Rahul Verma"]');
  await patientNameInput.fill('');
  await page.waitForTimeout(300);

  const saveProfileBtn = page.locator('button:has-text("Save & Complete Profile")');
  console.log('"Save & Complete Profile" disabled when name is cleared:', await saveProfileBtn.isDisabled());
  if (!(await saveProfileBtn.isDisabled())) throw new Error('"Save & Complete Profile" button should be disabled when name is cleared!');

  // Close modal
  await page.locator('button:has-text("Skip for now"), button[title="Skip for now"]').first().click();
  await page.waitForTimeout(500);

  await browser.close();
  console.log('\n🎉 ALL EDIT / SAVE DISABLED UX TESTS PASSED 100%!');
}

run().catch((err) => {
  console.error('TEST ERROR:', err);
  process.exit(1);
});
