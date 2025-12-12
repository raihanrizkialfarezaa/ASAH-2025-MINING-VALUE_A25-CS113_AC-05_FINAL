import prisma from '../src/config/database.js';

async function updateSchedulesToDecember2025() {
  console.log('Starting schedule update to December 2025...');

  try {
    // 1. Get all schedules
    const schedules = await prisma.sailingSchedule.findMany();
    console.log(`Found ${schedules.length} schedules to update.`);

    let updatedCount = 0;

    for (const schedule of schedules) {
      // Generate a random day in December 2025 (12-31)
      const randomDay = Math.floor(Math.random() * 20) + 12;

      // Create new ETA Loading date
      const newEtaLoading = new Date(Date.UTC(2025, 11, randomDay, 8, 0, 0)); // Month is 0-indexed (11 = Dec)

      // Calculate ETS (Estimated Time of Sailing) - usually 2-4 days after loading
      const loadingDurationDays = Math.floor(Math.random() * 3) + 2; // 2 to 4 days
      const newEtsLoading = new Date(newEtaLoading);
      newEtsLoading.setDate(newEtaLoading.getDate() + loadingDurationDays);

      // Calculate ETA Destination - usually 5-10 days sailing
      const sailingDurationDays = Math.floor(Math.random() * 6) + 5; // 5 to 10 days
      const newEtaDestination = new Date(newEtsLoading);
      newEtaDestination.setDate(newEtsLoading.getDate() + sailingDurationDays);

      // Determine status based on date relative to "now" (assuming "now" is early Dec 2025)
      // If we want them to be active/upcoming, we can set status accordingly.
      // Or just reset to SCHEDULED for simplicity unless it's very early in the month.
      let newStatus = 'SCHEDULED';

      // Optional: Clear actual times to make them "fresh"
      const updateData = {
        etaLoading: newEtaLoading,
        etsLoading: newEtsLoading,
        etaDestination: newEtaDestination,
        status: newStatus,
        // Reset actuals
        ataLoading: null,
        loadingStart: null,
        loadingComplete: null,
        atsLoading: null,
        ataDestination: null,
        actualQuantity: null,
        remarks: `Rescheduled to Dec 2025 (Auto-update)`,
      };

      await prisma.sailingSchedule.update({
        where: { id: schedule.id },
        data: updateData,
      });

      updatedCount++;
      console.log(
        `Updated Schedule ${schedule.scheduleNumber}: ETA ${newEtaLoading.toISOString().split('T')[0]}`
      );
    }

    console.log(`\nSuccessfully updated ${updatedCount} schedules to December 2025.`);
  } catch (error) {
    console.error('Error updating schedules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateSchedulesToDecember2025();
