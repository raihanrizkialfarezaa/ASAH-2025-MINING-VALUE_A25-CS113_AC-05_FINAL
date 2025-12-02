import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function updateOperatorSalaries() {
  try {
    console.log('=== UPDATING OPERATOR SALARIES ===\n');

    const salaryRanges = {
      SHIFT_1: { min: 4500000, max: 6500000 },
      SHIFT_2: { min: 5000000, max: 7000000 },
      SHIFT_3: { min: 5500000, max: 7500000 },
    };

    const operators = await prisma.operator.findMany({
      include: { user: true },
    });

    console.log(`Found ${operators.length} operators to update\n`);

    let updateCount = 0;

    for (const operator of operators) {
      const shift = operator.shift || 'SHIFT_1';
      const range = salaryRanges[shift] || salaryRanges.SHIFT_1;

      const experienceYears = operator.competency?.years_experience || 0;
      const baseMultiplier = 1 + experienceYears * 0.03;
      const ratingMultiplier = 1 + (operator.rating - 3) * 0.05;

      const baseSalary = range.min + Math.random() * (range.max - range.min);
      const salary = Math.round(baseSalary * baseMultiplier * ratingMultiplier);

      await prisma.operator.update({
        where: { id: operator.id },
        data: { salary },
      });

      updateCount++;
      if (updateCount <= 10) {
        console.log(
          `Updated ${operator.employeeNumber} (${operator.user?.name || 'N/A'}): ` +
            `Shift ${shift}, Experience ${experienceYears}y, Rating ${operator.rating.toFixed(1)} → ` +
            `Rp ${salary.toLocaleString('id-ID')}`
        );
      }
    }

    console.log(`\n✅ Updated ${updateCount} operator salaries successfully`);

    const stats = await prisma.operator.aggregate({
      _avg: { salary: true },
      _min: { salary: true },
      _max: { salary: true },
    });

    console.log('\n=== SALARY STATISTICS ===');
    console.log(`Average: Rp ${Math.round(stats._avg.salary || 0).toLocaleString('id-ID')}`);
    console.log(`Minimum: Rp ${Math.round(stats._min.salary || 0).toLocaleString('id-ID')}`);
    console.log(`Maximum: Rp ${Math.round(stats._max.salary || 0).toLocaleString('id-ID')}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('Error:', error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

updateOperatorSalaries();
