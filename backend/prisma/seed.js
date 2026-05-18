const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash('admin123', 10);
  const studentHash = await bcrypt.hash('alumno123', 10);

  await prisma.user.upsert({
    where: { matricula: 'ADMIN001' },
    update: {},
    create: {
      matricula: 'ADMIN001',
      name: 'Carlos Mendoza',
      career: 'Coordinador de Infraestructura',
      role: 'ADMIN',
      passwordHash: adminHash,
    },
  });

  const students = [
    { matricula: '21030001', name: 'Juan Carlos Hernández', career: 'Ingeniería en Software', rfidUid: 'RFID001' },
    { matricula: '21030002', name: 'María López García', career: 'Ingeniería Civil', rfidUid: 'RFID002' },
    { matricula: '21030003', name: 'Roberto Sánchez Pérez', career: 'Ingeniería Mecánica', rfidUid: 'RFID003' },
    { matricula: '21030004', name: 'Ana Martínez Díaz', career: 'Ingeniería en Sistemas', rfidUid: 'RFID004' },
    { matricula: '21030005', name: 'Diego Ramírez Torres', career: 'Ingeniería Eléctrica', rfidUid: 'RFID005' },
  ];

  for (const s of students) {
    await prisma.user.upsert({
      where: { matricula: s.matricula },
      update: {},
      create: {
        ...s,
        passwordHash: studentHash,
        role: 'STUDENT',
      },
    });
  }

  await prisma.systemState.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      roofState: 'CLOSED',
      activePriority: 4,
      emergencyLock: false,
      rainAutoMode: true,
    },
  });

  console.log('Seed completado exitosamente');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
