import { PrismaClient } from '@prisma/client';
import { UserRole } from '@queueapp/shared';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Clean existing seed data
  await prisma.auditLog.deleteMany();
  await prisma.queueEntry.deleteMany();
  await prisma.queue.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.service.deleteMany();
  await prisma.doctor.deleteMany();
  await prisma.clinicStaff.deleteMany();
  await prisma.patientProfile.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.oTPVerification.deleteMany();
  await prisma.user.deleteMany();

  // 2. Super Admin
  const superAdmin = await prisma.user.create({
    data: {
      phoneNumber: '+919999999999',
      name: 'Platform Super Admin',
      email: 'admin@queueapp.com',
      role: UserRole.SUPER_ADMIN,
    },
  });
  console.log(`✅ Created Super Admin: ${superAdmin.name}`);

  // 3. Clinic 1: ABC Health Clinic
  const clinic1 = await prisma.clinic.create({
    data: {
      name: 'ABC Health Clinic',
      slug: 'abc-health',
      phoneNumber: '+919876543210',
      email: 'contact@abchealth.com',
      address: '123 MG Road, Indiranagar, Bengaluru',
    },
  });

  const receptionist1 = await prisma.user.create({
    data: {
      phoneNumber: '+919876500001',
      name: 'Priya Sharma (Receptionist)',
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

  const drSharma = await prisma.doctor.create({
    data: {
      clinicId: clinic1.id,
      name: 'Dr. Ramesh Sharma',
      specialization: 'General Physician',
      roomNumber: 'Room 101',
    },
  });

  const serviceGen = await prisma.service.create({
    data: {
      clinicId: clinic1.id,
      name: 'General Consultation',
      durationMinutes: 15,
      priceAmount: 500,
    },
  });

  const queue1 = await prisma.queue.create({
    data: {
      clinicId: clinic1.id,
      doctorId: drSharma.id,
      serviceId: serviceGen.id,
      name: 'Dr. Sharma - General OPD',
    },
  });

  // 4. Clinic 2: City Dental Care
  const clinic2 = await prisma.clinic.create({
    data: {
      name: 'City Dental Care',
      slug: 'city-dental',
      phoneNumber: '+919876543222',
      email: 'care@citydental.com',
      address: '45 Park Street, Koramangala, Bengaluru',
    },
  });

  const drSingh = await prisma.doctor.create({
    data: {
      clinicId: clinic2.id,
      name: 'Dr. Ananya Singh',
      specialization: 'Orthodontist',
      roomNumber: 'Dental Suite 1',
    },
  });

  const serviceDental = await prisma.service.create({
    data: {
      clinicId: clinic2.id,
      name: 'Dental Checkup & Cleaning',
      durationMinutes: 30,
      priceAmount: 800,
    },
  });

  await prisma.queue.create({
    data: {
      clinicId: clinic2.id,
      doctorId: drSingh.id,
      serviceId: serviceDental.id,
      name: 'Dental OPD',
    },
  });

  // 5. Sample Patients
  const patient1 = await prisma.user.create({
    data: {
      phoneNumber: '+919876511111',
      name: 'Rahul Verma',
      role: UserRole.PATIENT,
      patientProfile: {
        create: {
          gender: 'Male',
        },
      },
    },
  });

  // 6. Sample Active Token in Queue 1
  await prisma.queueEntry.create({
    data: {
      queueId: queue1.id,
      userId: patient1.id,
      tokenNumber: 'A-01',
      sequenceNumber: 1,
      status: 'WAITING',
      publicToken: 'pub_tok_abc_001',
      estimatedWait: 15,
    },
  });

  console.log(`✅ Seeded 2 Clinics: "${clinic1.name}" and "${clinic2.name}" with Doctors, Services, and Queue.`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
