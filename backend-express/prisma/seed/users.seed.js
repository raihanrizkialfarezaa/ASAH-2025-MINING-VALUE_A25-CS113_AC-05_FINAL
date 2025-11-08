import prisma from '../../src/config/database.js';
import bcrypt from 'bcrypt';

export const seedUsers = async () => {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const users = [
    {
      username: 'admin',
      email: 'admin@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Budi Santoso',
      role: 'ADMIN',
      isActive: true,
      lastLogin: new Date('2025-11-08T08:00:00Z'),
    },
    {
      username: 'supervisor1',
      email: 'agus.setiawan@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Agus Setiawan',
      role: 'SUPERVISOR',
      isActive: true,
      lastLogin: new Date('2025-11-08T06:30:00Z'),
    },
    {
      username: 'supervisor2',
      email: 'dewi.lestari@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Dewi Lestari',
      role: 'SUPERVISOR',
      isActive: true,
      lastLogin: new Date('2025-11-08T14:00:00Z'),
    },
    {
      username: 'dispatcher1',
      email: 'eko.prasetyo@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Eko Prasetyo',
      role: 'DISPATCHER',
      isActive: true,
      lastLogin: new Date('2025-11-08T07:00:00Z'),
    },
    {
      username: 'maintenance1',
      email: 'rudi.hartono@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Rudi Hartono',
      role: 'MAINTENANCE_STAFF',
      isActive: true,
      lastLogin: new Date('2025-11-07T16:00:00Z'),
    },
    {
      username: 'operator1',
      email: 'joko.widodo@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Joko Widodo',
      role: 'OPERATOR',
      isActive: true,
      lastLogin: new Date('2025-11-08T06:00:00Z'),
    },
    {
      username: 'operator2',
      email: 'ahmad.yani@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Ahmad Yani',
      role: 'OPERATOR',
      isActive: true,
      lastLogin: new Date('2025-11-08T06:00:00Z'),
    },
    {
      username: 'operator3',
      email: 'siti.rahayu@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Siti Rahayu',
      role: 'OPERATOR',
      isActive: true,
      lastLogin: new Date('2025-11-08T14:00:00Z'),
    },
    {
      username: 'operator4',
      email: 'bambang.susilo@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Bambang Susilo',
      role: 'OPERATOR',
      isActive: true,
      lastLogin: new Date('2025-11-08T14:00:00Z'),
    },
    {
      username: 'operator5',
      email: 'rina.kartika@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Rina Kartika',
      role: 'OPERATOR',
      isActive: true,
      lastLogin: new Date('2025-11-08T22:00:00Z'),
    },
    {
      username: 'operator6',
      email: 'hendra.wijaya@ptbarasakti.co.id',
      password: hashedPassword,
      fullName: 'Hendra Wijaya',
      role: 'OPERATOR',
      isActive: true,
      lastLogin: new Date('2025-11-08T22:00:00Z'),
    },
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.create({
      data: userData,
    });
    createdUsers.push(user);
  }

  return createdUsers;
};
