import { PrismaClient } from '@prisma/client';
import { UserRole } from '@queueapp/shared';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting clean database wipe and production seed...');

  const defaultPasswordHash = await bcrypt.hash('Password@123', 10);

  // 1. Wipe all previous data completely
  await prisma.auditLog.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.subscriptionInvoice.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.service.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.clinicStaff.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.pushSubscription.deleteMany();
  await prisma.whatsAppMessage.deleteMany();
  await prisma.whatsAppConversation.deleteMany();
  await prisma.displayDevice.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.advertisement.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.oTPVerification.deleteMany();
  await prisma.user.deleteMany();

  console.log('🧹 Cleaned all previous tables and records.');

  // 2. Platform Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      phoneNumber: '+919999999999',
      name: 'System Super Admin',
      email: 'admin@queueapp.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log(`✅ Super Admin created: ${superAdmin.name} (${superAdmin.phoneNumber})`);

  // 3. Clinic 1: With Receptionist
  const clinic1 = await prisma.clinic.create({
    data: {
      name: 'City Health Multispecialty Clinic',
      slug: 'city-health',
      phoneNumber: '+919876500001',
      email: 'care@cityhealth.com',
      address: '102 Metro Towers, Ring Road, Indiranagar, Bengaluru',
      inClinicPrice: 200,
      remotePrice: 200,
      enableBookingTime: true,
      enablePriorityQueue: true,
      workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
      openTime: '09:00 AM',
      closeTime: '06:00 PM',
      holidays: '[]',
      voiceAnnouncementMode: 'TOKEN_PATIENT_DOCTOR_ROOM',
    },
  });

  // Active Subscription for Clinic 1
  await prisma.subscription.create({
    data: {
      clinicId: clinic1.id,
      plan: 'PROFESSIONAL',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      amountPaid: 2499,
      maxDoctors: 5,
      maxStaff: 10,
      maxDisplays: 3,
      hasAds: false,
    },
  });

  // Clinic 1 Admin (Doctor Ramesh Sharma)
  const clinicAdmin1 = await prisma.user.create({
    data: {
      phoneNumber: '+919876500011',
      name: 'Dr. Ramesh Sharma',
      email: 'ramesh.sharma@cityhealth.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.CLINIC_ADMIN,
    },
  });

  await prisma.clinicStaff.create({
    data: {
      clinicId: clinic1.id,
      userId: clinicAdmin1.id,
      role: UserRole.CLINIC_ADMIN,
    },
  });

  // Clinic 1 Receptionist (Priya Verma)
  const receptionist1 = await prisma.user.create({
    data: {
      phoneNumber: '+919876500012',
      name: 'Priya Verma',
      email: 'reception@cityhealth.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.RECEPTIONIST,
    },
  });

  await prisma.clinicStaff.create({
    data: {
      clinicId: clinic1.id,
      userId: receptionist1.id,
      role: UserRole.RECEPTIONIST,
    },
  });

  // Clinic 1 Doctors
  const drRamesh = await prisma.doctor.create({
    data: {
      clinicId: clinic1.id,
      name: 'Dr. Ramesh Sharma',
      specialization: 'General Physician & Internal Medicine',
      roomNumber: 'Room 101',
    },
  });

  const drMeera = await prisma.doctor.create({
    data: {
      clinicId: clinic1.id,
      name: 'Dr. Meera Rao',
      specialization: 'Consultant Cardiologist',
      roomNumber: 'Room 102',
    },
  });

  // Clinic 1 Services
  const serviceGen = await prisma.service.create({
    data: {
      clinicId: clinic1.id,
      name: 'General Consultation',
      durationMinutes: 20,
      priceAmount: 200,
    },
  });

  const serviceCardio = await prisma.service.create({
    data: {
      clinicId: clinic1.id,
      name: 'Cardiology Consultation',
      durationMinutes: 30,
      priceAmount: 500,
    },
  });

  // Clinic 1 Queues
  await prisma.queue.create({
    data: {
      clinicId: clinic1.id,
      doctorId: drRamesh.id,
      serviceId: serviceGen.id,
      name: 'Dr. Ramesh Sharma - General OPD',
    },
  });

  await prisma.queue.create({
    data: {
      clinicId: clinic1.id,
      doctorId: drMeera.id,
      serviceId: serviceCardio.id,
      name: 'Dr. Meera Rao - Cardiology OPD',
    },
  });

  console.log(`✅ Clinic 1 created: "${clinic1.name}" (Admin: ${clinicAdmin1.name}, Receptionist: ${receptionist1.name})`);

  // 4. Clinic 2: Without Receptionist (Doctor/Admin direct operated)
  const clinic2 = await prisma.clinic.create({
    data: {
      name: 'CareWell Family Clinic',
      slug: 'carewell-family',
      phoneNumber: '+919876500002',
      email: 'contact@carewellfamily.com',
      address: '45 Greenfield Avenue, Koramangala 4th Block, Bengaluru',
      inClinicPrice: 200,
      remotePrice: 200,
      enableBookingTime: true,
      enablePriorityQueue: true,
      workingDays: 'MONDAY,TUESDAY,WEDNESDAY,THURSDAY,FRIDAY,SATURDAY',
      openTime: '10:00 AM',
      closeTime: '07:00 PM',
      holidays: '[]',
      voiceAnnouncementMode: 'TOKEN_PATIENT_DOCTOR_ROOM',
    },
  });

  // Active Subscription for Clinic 2
  await prisma.subscription.create({
    data: {
      clinicId: clinic2.id,
      plan: 'BASIC',
      status: 'ACTIVE',
      billingCycle: 'MONTHLY',
      amountPaid: 999,
      maxDoctors: 2,
      maxStaff: 3,
      maxDisplays: 1,
      hasAds: true,
    },
  });

  // Clinic 2 Admin (Dr. Ananya Singh - Doctor & Owner)
  const clinicAdmin2 = await prisma.user.create({
    data: {
      phoneNumber: '+919876500021',
      name: 'Dr. Ananya Singh',
      email: 'ananya.singh@carewellfamily.com',
      passwordHash: defaultPasswordHash,
      role: UserRole.CLINIC_ADMIN,
    },
  });

  await prisma.clinicStaff.create({
    data: {
      clinicId: clinic2.id,
      userId: clinicAdmin2.id,
      role: UserRole.CLINIC_ADMIN,
    },
  });

  // Clinic 2 Doctor
  const drAnanya = await prisma.doctor.create({
    data: {
      clinicId: clinic2.id,
      name: 'Dr. Ananya Singh',
      specialization: 'Family Physician & Pediatrician',
      roomNumber: 'Suite A',
    },
  });

  // Clinic 2 Service
  const serviceFamily = await prisma.service.create({
    data: {
      clinicId: clinic2.id,
      name: 'Family Health Consultation',
      durationMinutes: 20,
      priceAmount: 200,
    },
  });

  // Clinic 2 Queue
  await prisma.queue.create({
    data: {
      clinicId: clinic2.id,
      doctorId: drAnanya.id,
      serviceId: serviceFamily.id,
      name: 'Dr. Ananya Singh - Family OPD',
    },
  });

  console.log(`✅ Clinic 2 created: "${clinic2.name}" (Admin: ${clinicAdmin2.name}, No Receptionist)`);

  // 5. 5 Patients with complete profiles
  const patientsData = [
    { name: 'Rahul Verma', phone: '+919876510001', age: 32, gender: 'Male' },
    { name: 'Sunita Sharma', phone: '+919876510002', age: 45, gender: 'Female' },
    { name: 'Amit Patel', phone: '+919876510003', age: 28, gender: 'Male' },
    { name: 'Neha Gupta', phone: '+919876510004', age: 36, gender: 'Female' },
    { name: 'Vikram Malhotra', phone: '+919876510005', age: 54, gender: 'Male' },
  ];

  for (const p of patientsData) {
    const user = await prisma.user.create({
      data: {
        phoneNumber: p.phone,
        name: p.name,
        email: `${p.name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
        passwordHash: defaultPasswordHash,
        role: UserRole.PATIENT,
        patientProfile: {
          create: {
            age: p.age,
            gender: p.gender,
          },
        },
      },
    });
    console.log(`✅ Patient created: ${user.name} (${user.phoneNumber}) - Age: ${p.age}, Gender: ${p.gender}`);
  }

  console.log('🎉 Production seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
