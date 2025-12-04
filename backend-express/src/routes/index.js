import express from 'express';
import authRoutes from './auth.routes.js';
import userRoutes from './user.routes.js';
import truckRoutes from './truck.routes.js';
import excavatorRoutes from './excavator.routes.js';
import operatorRoutes from './operator.routes.js';
import haulingRoutes from './hauling.routes.js';
import miningSiteRoutes from './miningSite.routes.js';
import locationRoutes from './location.routes.js';
import weatherRoutes from './weather.routes.js';
import maintenanceRoutes from './maintenance.routes.js';
import productionRoutes from './production.routes.js';
import dashboardRoutes from './dashboard.routes.js';
import mlProxyRoutes from './mlProxy.routes.js';
import vesselRoutes from './vessel.routes.js';
import aiRoutes from './ai.routes.js';
import supportEquipmentRoutes from './supportEquipment.routes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/trucks', truckRoutes);
router.use('/excavators', excavatorRoutes);
router.use('/operators', operatorRoutes);
router.use('/hauling', haulingRoutes);
router.use('/mining-sites', miningSiteRoutes);
router.use('/locations', locationRoutes);
router.use('/weather', weatherRoutes);
router.use('/maintenance', maintenanceRoutes);
router.use('/production', productionRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/ml', mlProxyRoutes);
router.use('/vessels', vesselRoutes);
router.use('/ai', aiRoutes);
router.use('/support-equipment', supportEquipmentRoutes);

export default router;
