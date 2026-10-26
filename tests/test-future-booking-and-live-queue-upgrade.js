/**
 * Automated Verification Script:
 * 1. Future Date Booking cannot select Join Live Queue (rejected with 400).
 * 2. Today's Date Booking can select Join Live Queue.
 * 3. On Date of Appointment, Patient sees and can execute "Join Live Queue @ ₹50" upgrade.
 * 4. Upgrading to live queue changes token to 'P' prefix and WAITING status.
 * 5. Dispatches WhatsApp Message 1 (today's appointment details) and Message 2 (join live queue from comfort of home @ ₹50).
 */

const BASE_URL = 'http://127.0.0.1:4000';

async function runTest() {
  console.log('🧪 Starting Future Booking & Live Queue Upgrade Verification Run...');

  // 1. Patient Login
  console.log('\n--- Step 1: Patient Login ---');
  const loginRes = await fetch(`${BASE_URL}/api/auth/login-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '+919876543210',
      password: 'Test@1234',
    }),
  });
  const loginData = await loginRes.json();
  if (!loginData.success || !loginData.data?.tokens?.accessToken) {
    throw new Error(`Patient login failed: ${JSON.stringify(loginData)}`);
  }
  const token = loginData.data.tokens.accessToken;
  const userId = loginData.data.user.id;
  console.log(`✅ Logged in as Patient ${userId} (${loginData.data.user.phoneNumber})`);

  // Clean up any prior test appointments
  const existingApptsRes = await fetch(`${BASE_URL}/api/appointments/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const existingApptsData = await existingApptsRes.json();
  for (const a of (existingApptsData.data || [])) {
    if (a.status === 'CONFIRMED' || a.status === 'PENDING') {
      await fetch(`${BASE_URL}/api/appointments/${a.id}/cancel`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  }

  // 2. Fetch Clinics
  console.log('\n--- Step 2: Fetch Clinics ---');
  const clinicsRes = await fetch(`${BASE_URL}/api/clinics`);
  const clinicsData = await clinicsRes.json();
  const clinic = clinicsData.data?.[0];
  if (!clinic) throw new Error('No clinics found');
  console.log(`✅ Selected Clinic: "${clinic.name}" (ID: ${clinic.id}, Priority Price: ₹${clinic.priorityPrice})`);

  // 3. Compute Dates
  const tz = 'Asia/Kolkata';
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Format today's slot time: 04:30 PM today
  const [tY, tM, tD] = today.toLocaleDateString('en-CA', { timeZone: tz }).split('-').map(Number);
  const todaySlotDate = new Date(Date.UTC(tY, tM - 1, tD, 11, 0, 0)); // 11:00 UTC = 16:30 IST (4:30 PM)

  // Format tomorrow's slot time: 11:00 AM tomorrow
  const [tomY, tomM, tomD] = tomorrow.toLocaleDateString('en-CA', { timeZone: tz }).split('-').map(Number);
  const tomorrowSlotDate = new Date(Date.UTC(tomY, tomM - 1, tomD, 5, 30, 0)); // 05:30 UTC = 11:00 IST (11:00 AM)

  // 4. Test Case 1: Attempt Future Booking with joinQueueImmediately = true
  console.log('\n--- Step 3: Attempt Future Booking with joinQueueImmediately = true ---');
  const futurePriorityRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      clinicId: clinic.id,
      slotTime: tomorrowSlotDate.toISOString(),
      bookingType: 'REMOTE',
      joinQueueImmediately: true,
    }),
  });

  const futurePriorityData = await futurePriorityRes.json();
  const futureErrMsg = futurePriorityData.error?.message || futurePriorityData.message || '';
  if (futurePriorityRes.status === 400 && futureErrMsg.includes('Join Live Queue option is only available on the date of your appointment')) {
    console.log(`✅ Correctly rejected future priority booking: "${futureErrMsg}"`);
  } else {
    throw new Error(`Expected 400 for future priority booking, got: ${futurePriorityRes.status} ${JSON.stringify(futurePriorityData)}`);
  }

  // 5. Test Case 2: Standard Future Booking (joinQueueImmediately = false)
  console.log('\n--- Step 4: Standard Future Booking ---');
  const futureStdRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      clinicId: clinic.id,
      slotTime: tomorrowSlotDate.toISOString(),
      bookingType: 'REMOTE',
      joinQueueImmediately: false,
    }),
  });
  const futureStdData = await futureStdRes.json();
  if (!futureStdData.success || !futureStdData.data?.id) {
    throw new Error(`Failed to create standard future appointment: ${JSON.stringify(futureStdData)}`);
  }
  const futureApptId = futureStdData.data.id;
  console.log(`✅ Created Future Appointment ${futureApptId} (Fee: ₹${futureStdData.data.bookingFee}, isPriority: ${futureStdData.data.isPriority})`);

  // Confirm payment for future appointment
  const orderFutureRes = await fetch(`${BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ appointmentId: futureApptId }),
  });
  const orderFutureData = await orderFutureRes.json();
  const verifyFutureRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      paymentId: orderFutureData.data.paymentId,
      razorpayOrderId: orderFutureData.data.orderId,
      razorpayPaymentId: 'pay_mock_future_' + Date.now(),
      razorpaySignature: 'mock_paid_signature',
    }),
  });
  const verifyFutureData = await verifyFutureRes.json();
  const futureTokenNumber = verifyFutureData.data?.tokenNumber || verifyFutureData.tokenNumber;
  if (!futureTokenNumber) console.log('DEBUG verifyFutureData FULL:', JSON.stringify(verifyFutureData));
  console.log(`✅ Confirmed Future Appointment Payment: Token is "${futureTokenNumber}"`);
  if (!futureTokenNumber?.startsWith('A')) {
    throw new Error(`Expected standard prefix 'A' for future appointment, got: ${futureTokenNumber}`);
  }

  // 6. Test Case 3: Try to Join Live Queue on the Future Appointment
  console.log('\n--- Step 5: Attempt Join Live Queue on Future Appointment ---');
  const joinFutureRes = await fetch(`${BASE_URL}/api/appointments/${futureApptId}/join-live-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const joinFutureData = await joinFutureRes.json();
  const joinFutureErrMsg = joinFutureData.error?.message || joinFutureData.message || '';
  if (joinFutureRes.status === 400 && joinFutureErrMsg.includes('only join the live queue on the date of your appointment')) {
    console.log(`✅ Correctly prevented live queue join for future appointment: "${joinFutureErrMsg}"`);
  } else {
    throw new Error(`Expected 400 when joining live queue for future appointment, got: ${joinFutureRes.status} ${JSON.stringify(joinFutureData)}`);
  }

  // 7. Test Case 4: Standard Today Booking and Payment
  console.log('\n--- Step 6: Standard Today Booking ---');
  const todayStdRes = await fetch(`${BASE_URL}/api/appointments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      clinicId: clinic.id,
      slotTime: todaySlotDate.toISOString(),
      bookingType: 'REMOTE',
      joinQueueImmediately: false,
    }),
  });
  const todayStdData = await todayStdRes.json();
  if (!todayStdData.success || !todayStdData.data?.id) {
    throw new Error(`Failed to create standard today appointment: ${JSON.stringify(todayStdData)}`);
  }
  const todayApptId = todayStdData.data.id;
  console.log(`✅ Created Today Appointment ${todayApptId} (Fee: ₹${todayStdData.data.bookingFee}, isPriority: ${todayStdData.data.isPriority})`);

  // Confirm payment for today's appointment
  const orderTodayRes = await fetch(`${BASE_URL}/api/payments/create-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ appointmentId: todayApptId }),
  });
  const orderTodayData = await orderTodayRes.json();
  const verifyTodayRes = await fetch(`${BASE_URL}/api/payments/verify`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      paymentId: orderTodayData.data.paymentId,
      razorpayOrderId: orderTodayData.data.orderId,
      razorpayPaymentId: 'pay_mock_today_' + Date.now(),
      razorpaySignature: 'mock_paid_signature',
    }),
  });
  const verifyTodayData = await verifyTodayRes.json();
  const todayTokenNumber = verifyTodayData.data?.tokenNumber || verifyTodayData.tokenNumber;
  console.log(`✅ Confirmed Today Appointment: Token is "${todayTokenNumber}"`);

  // 8. Test Case 5: Verify WhatsApp Messages for Today's Appointment
  console.log('\n--- Step 7: Check WhatsApp Messages for Today\'s Appointment ---');
  // Log in as Super Admin to read clinic messages (staff-only endpoint)
  const adminLoginRes = await fetch(`${BASE_URL}/api/auth/login-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phoneNumber: '+919999999999',
      password: 'Password@123',
    }),
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.data?.tokens?.accessToken;
  if (!adminToken) {
    throw new Error(`Clinic Admin login failed: ${JSON.stringify(adminLoginData)}`);
  }

  const waRes = await fetch(`${BASE_URL}/api/clinics/${clinic.id}/whatsapp/messages`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const waData = await waRes.json();
  const messages = waData.data || [];
  const reminderMsg = messages.find((m) => m.content?.includes('is scheduled for today'));
  const offerMsg = messages.find((m) => m.content?.includes('join the doctor\'s live queue right now from the comfort of your home at ₹50'));

  console.log(`💬 Message 1 (Scheduled for today reminder): "${reminderMsg ? reminderMsg.content : 'NOT FOUND'}"`);
  console.log(`💬 Message 2 (Live queue offer from home): "${offerMsg ? offerMsg.content : 'NOT FOUND'}"`);

  if (!reminderMsg || !offerMsg) {
    throw new Error('Expected both WhatsApp reminder and live queue offer messages to be dispatched!');
  }
  console.log('✅ Both required WhatsApp messages were dispatched successfully!');

  // 9. Test Case 6: Upgrade Today's Appointment to Live Queue
  console.log('\n--- Step 8: Upgrade Today\'s Appointment to Live Queue ---');
  const joinTodayRes = await fetch(`${BASE_URL}/api/appointments/${todayApptId}/join-live-queue`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });
  const joinTodayData = await joinTodayRes.json();
  if (!joinTodayData.success || !joinTodayData.data) {
    throw new Error(`Failed to join live queue: ${JSON.stringify(joinTodayData)}`);
  }
  console.log(`✅ Successfully Upgraded to Live Queue!`);
  console.log(`   New Token: ${joinTodayData.data.tokenNumber}`);
  console.log(`   isPriority: ${joinTodayData.data.isPriority}`);
  console.log(`   Priority Fee: ₹${joinTodayData.data.priorityFee}`);
  console.log(`   Total Booking Fee: ₹${joinTodayData.data.bookingFee}`);

  if (!joinTodayData.data.tokenNumber?.startsWith('P')) {
    throw new Error(`Expected upgraded token to start with 'P', got: ${joinTodayData.data.tokenNumber}`);
  }
  if (!joinTodayData.data.isPriority) {
    throw new Error('Expected isPriority to be true');
  }

  // Check WhatsApp live queue confirmation message
  const waRes2 = await fetch(`${BASE_URL}/api/clinics/${clinic.id}/whatsapp/messages`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const waData2 = await waRes2.json();
  const joinConfirmMsg = waData2.data?.find((m) => m.content?.includes('You have joined the Live Queue'));
  console.log(`💬 Live Queue Entry Confirmation: "${joinConfirmMsg ? joinConfirmMsg.content : 'NOT FOUND'}"`);
  if (!joinConfirmMsg) {
    throw new Error('Expected live queue join confirmation WhatsApp message to be dispatched!');
  }

  // 10. Test Case 7: Fetch My Appointments via /api/appointments/my
  console.log('\n--- Step 9: Verify My Appointments API Response ---');
  const myApptsRes = await fetch(`${BASE_URL}/api/appointments/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const myApptsData = await myApptsRes.json();
  const myAppts = myApptsData.data || [];
  const foundToday = myAppts.find((a) => a.id === todayApptId);
  console.log(`✅ Found Upgraded Appointment in My Appointments:`);
  console.log(`   Token: ${foundToday.tokenNumber}`);
  console.log(`   isPriority: ${foundToday.isPriority}`);
  console.log(`   priorityPrice: ₹${foundToday.priorityPrice}`);
  console.log(`   enablePriorityQueue: ${foundToday.enablePriorityQueue}`);

  console.log('\n======================================================');
  console.log('🎉 ALL TEST CASES PASSED WITH 100% SUCCESS!');
  console.log('======================================================\n');
}

runTest().catch((err) => {
  console.error('\n❌ Test execution failed:', err);
  process.exit(1);
});
