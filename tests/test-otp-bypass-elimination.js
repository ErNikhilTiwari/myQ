async function testOtpBypassElimination() {
  console.log('=== START: Strict OTP Bypass Elimination & Security Verification ===');
  const baseUrl = 'http://127.0.0.1:4000/api/auth';

  // TEST 1: Attempt OTP verify with 123456 without active OTP request
  console.log('\n--- Test 1: Verify OTP 123456 with no pending request ---');
  const res1 = await fetch(`${baseUrl}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876510001', otp: '123456' }),
  });
  const data1 = await res1.json();
  console.log(`Status: ${res1.status}, Message: "${data1.error?.message || data1.message}"`);
  if (res1.status !== 401) {
    throw new Error(`Test 1 Failed! Expected status 401, got ${res1.status}`);
  }
  console.log('✅ PASS: Blocked without active OTP request.');

  // TEST 2: Send OTP to demo account Rahul Verma (+919876510001)
  console.log('\n--- Test 2: Request real OTP for demo account (+919876510001) ---');
  const sendRes = await fetch(`${baseUrl}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876510001' }),
  });
  const sendData = await sendRes.json();
  console.log(`Send OTP Status: ${sendRes.status}, Success: ${sendData.success}`);
  if (!sendData.success) throw new Error('Send OTP failed');

  // TEST 3: Try to verify with 123456 on active request
  console.log('\n--- Test 3: Attempt OTP verify with 123456 bypass code ---');
  const res3 = await fetch(`${baseUrl}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876510001', otp: '123456' }),
  });
  const data3 = await res3.json();
  console.log(`Status: ${res3.status}, Message: "${data3.error?.message || data3.message}"`);
  if (res3.status !== 401) {
    throw new Error(`Test 3 Failed! Expected status 401, got ${res3.status}`);
  }
  console.log('✅ PASS: 123456 bypass code strictly rejected on demo account!');

  // TEST 4: Try to verify with 999999 bypass code
  console.log('\n--- Test 4: Attempt OTP verify with 999999 bypass code ---');
  const res4 = await fetch(`${baseUrl}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876510001', otp: '999999' }),
  });
  const data4 = await res4.json();
  console.log(`Status: ${res4.status}, Message: "${data4.error?.message || data4.message}"`);
  if (res4.status !== 401) {
    throw new Error(`Test 4 Failed! Expected status 401, got ${res4.status}`);
  }
  console.log('✅ PASS: 999999 bypass code strictly rejected on demo account!');

  // TEST 5: Real / other number OTP bypass check (+919876599999)
  console.log('\n--- Test 5: Real number (+919876599999) OTP bypass check ---');
  await fetch(`${baseUrl}/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876599999' }),
  });
  const res5 = await fetch(`${baseUrl}/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phoneNumber: '+919876599999', otp: '123456' }),
  });
  const data5 = await res5.json();
  console.log(`Status: ${res5.status}, Message: "${data5.error?.message || data5.message}"`);
  if (res5.status !== 401) {
    throw new Error(`Test 5 Failed! Expected status 401, got ${res5.status}`);
  }
  console.log('✅ PASS: 123456 bypass code strictly rejected on real accounts!');

  // TEST 6: Demo accounts logging in with official default password (Password@123)
  console.log('\n--- Test 6: Demo accounts password login with "Password@123" ---');
  const accountsToTest = [
    { name: 'Patient Rahul Verma', phone: '9876510001' },
    { name: 'Clinic 1 Admin', phone: '9876500001' },
    { name: 'Clinic 2 Admin', phone: '9876500002' },
    { name: 'Receptionist', phone: '9876500012' },
    { name: 'Super Admin', phone: '9999999999' },
  ];

  for (const acc of accountsToTest) {
    const pwRes = await fetch(`${baseUrl}/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: `+91${acc.phone}`, password: 'Password@123' }),
    });
    const pwData = await pwRes.json();
    console.log(`Account ${acc.name} (${acc.phone}): Status ${pwRes.status}, Success: ${pwData.success}, Role: ${pwData.data?.user?.role}`);
    if (pwRes.status !== 200 || !pwData.success) {
      throw new Error(`Failed to log in ${acc.name} with Password@123`);
    }
  }
  console.log('✅ PASS: All demo accounts log in successfully with official default password!');

  // TEST 7: Verify backdoor passwords (123456, admin123) are rejected
  console.log('\n--- Test 7: Verify backdoor passwords (123456, admin123) are rejected ---');
  for (const backdoor of ['123456', 'admin123', 'wrongpassword']) {
    const backdoorRes = await fetch(`${baseUrl}/login-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phoneNumber: '+919876510001', password: backdoor }),
    });
    const backdoorData = await backdoorRes.json();
    console.log(`Backdoor "${backdoor}": Status ${backdoorRes.status}, Message: "${backdoorData.error?.message || backdoorData.message}"`);
    if (backdoorRes.status !== 401) {
      throw new Error(`Backdoor password "${backdoor}" was NOT rejected! Got status ${backdoorRes.status}`);
    }
  }
  console.log('✅ PASS: All backdoor passwords strictly rejected!');

  console.log('\n======================================================');
  console.log('🎉 ALL SECURITY & OTP VERIFICATION CHECKS PASSED 100%!');
  console.log('======================================================\n');
}

testOtpBypassElimination().catch((err) => {
  console.error('❌ TEST FAILED:', err);
  process.exit(1);
});
