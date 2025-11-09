import prisma from '../../src/config/database.js';
import bcrypt from 'bcrypt';

const firstNames = [
  'Agus',
  'Ahmad',
  'Andi',
  'Budi',
  'Bambang',
  'Dedi',
  'Dwi',
  'Eko',
  'Fajar',
  'Hadi',
  'Hendra',
  'Imam',
  'Joko',
  'Wahyu',
  'Rudi',
  'Slamet',
  'Sugeng',
  'Tri',
  'Yudi',
  'Wawan',
  'Siti',
  'Dewi',
  'Rina',
  'Sri',
  'Ratna',
  'Wati',
  'Indah',
  'Lia',
  'Maya',
  'Fitri',
];
const lastNames = [
  'Santoso',
  'Setiawan',
  'Prasetyo',
  'Wijaya',
  'Susilo',
  'Hartono',
  'Nugroho',
  'Rahmanto',
  'Widodo',
  'Kurniawan',
  'Purwanto',
  'Hidayat',
  'Suprapto',
  'Hermawan',
  'Firmansyah',
  'Saputra',
  'Wibowo',
  'Utomo',
  'Putra',
  'Rahman',
];

export const seedUsers = async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const users = [];
  const createdUsers = [];

  const adminData = {
    username: 'admin',
    email: 'admin@ptbarasakti.co.id',
    password: hashedPassword,
    fullName: 'System Administrator',
    role: 'ADMIN',
    isActive: true,
    lastLogin: new Date(),
  };

  const existingAdmin = await prisma.user
    .findUnique({ where: { username: adminData.username } })
    .catch(() => null);
  if (!existingAdmin) {
    const createdAdmin = await prisma.user.create({ data: adminData });
    createdUsers.push(createdAdmin);
  } else {
    createdUsers.push(existingAdmin);
  }
  const roles = ['ADMIN', 'SUPERVISOR', 'OPERATOR', 'DISPATCHER', 'MAINTENANCE_STAFF'];
  const roleDistribution = [5, 60, 480, 30, 25];

  let userIndex = 1;

  for (let roleIdx = 0; roleIdx < roles.length; roleIdx++) {
    const role = roles[roleIdx];
    const count = roleDistribution[roleIdx];

    for (let i = 0; i < count; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const username = `${role.toLowerCase()}${userIndex}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${userIndex}@ptbarasakti.co.id`;
      const lastLoginDays = Math.floor(Math.random() * 30);

      users.push({
        username,
        email,
        password: hashedPassword,
        fullName: `${firstName} ${lastName}`,
        role,
        isActive: Math.random() > 0.05,
        lastLogin: new Date(Date.now() - lastLoginDays * 24 * 60 * 60 * 1000),
      });

      userIndex++;
    }
  }

  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData,
    });
    createdUsers.push(user);
  }

  return createdUsers;
};
