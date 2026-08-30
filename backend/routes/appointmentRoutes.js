const express = require('express');
const router = express.Router();

const {
  getAllAppointments,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  cancelAppointment,
} = require('../controllers/appointmentController');

const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const { requireCompanyMembership, requireCompanyPermission } = require('../middleware/companyAuthMiddleware');

router.get(
  '/',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff', 'viewer']),
  requireCompanyPermission('appointment.view'),
  getAllAppointments
);
router.get(
  '/:id',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff', 'viewer']),
  requireCompanyPermission('appointment.view'),
  getAppointmentById
);
router.post(
  '/',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff']),
  requireCompanyPermission('appointment.manage'),
  createAppointment
);
router.put(
  '/:id',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff']),
  requireCompanyPermission('appointment.manage'),
  updateAppointment
);
router.post(
  '/:id/cancel',
  authMiddleware,
  requireCompanyMembership,
  checkRole(['admin', 'staff']),
  requireCompanyPermission('appointment.manage'),
  cancelAppointment
);

module.exports = router;
