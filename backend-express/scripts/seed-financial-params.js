import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedFinancialParams() {
  console.log('=== SEEDING FINANCIAL PARAMETERS ===\n');

  const financialConfigs = [
    {
      configKey: 'COAL_PRICE_IDR',
      configValue: '900000',
      description: 'Harga jual batubara per ton (IDR)',
    },
    {
      configKey: 'FUEL_PRICE_IDR',
      configValue: '15000',
      description: 'Harga solar per liter (IDR)',
    },
    {
      configKey: 'VESSEL_PENALTY_IDR',
      configValue: '100000000',
      description: 'Denda keterlambatan kapal (IDR)',
    },
    {
      configKey: 'DEMURRAGE_COST_IDR',
      configValue: '5000000',
      description: 'Biaya demurrage per jam (IDR)',
    },
    {
      configKey: 'OPERATOR_SALARY_IDR',
      configValue: '7500000',
      description: 'Gaji rata-rata operator per bulan (IDR)',
    },
    {
      configKey: 'QUEUE_COST_PER_HOUR_IDR',
      configValue: '100000',
      description: 'Biaya antrian per jam (IDR)',
    },
    {
      configKey: 'INCIDENT_COST_AVG_IDR',
      configValue: '500000',
      description: 'Biaya rata-rata insiden (IDR)',
    },
  ];

  try {
    for (const config of financialConfigs) {
      const existing = await prisma.systemConfig.findFirst({
        where: { configKey: config.configKey },
      });

      if (existing) {
        await prisma.systemConfig.update({
          where: { id: existing.id },
          data: {
            configValue: config.configValue,
            description: config.description,
          },
        });
        console.log(`✅ Updated: ${config.configKey} = ${config.configValue}`);
      } else {
        await prisma.systemConfig.create({
          data: {
            configKey: config.configKey,
            configValue: config.configValue,
            description: config.description,
            category: 'FINANCIAL',
          },
        });
        console.log(`✅ Created: ${config.configKey} = ${config.configValue}`);
      }
    }

    console.log('\n✅ Financial parameters seeded successfully!');
    console.log('\nVerifying saved parameters:');

    const savedConfigs = await prisma.systemConfig.findMany({
      where: {
        configKey: { in: financialConfigs.map((c) => c.configKey) },
      },
    });

    savedConfigs.forEach((config) => {
      const value = parseFloat(config.configValue);
      console.log(`   ${config.configKey}: ${value.toLocaleString('id-ID')} IDR`);
    });
  } catch (error) {
    console.error('❌ Error seeding financial parameters:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

seedFinancialParams();
