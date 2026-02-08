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

router.get('/', authMiddleware, checkRole(['admin', 'staff', 'viewer']), getAllAppointments);
router.get('/:id', authMiddleware, checkRole(['admin', 'staff', 'viewer']), getAppointmentById);
router.post('/', authMiddleware, checkRole(['admin', 'staff']), createAppointment);
router.put('/:id', authMiddleware, checkRole(['admin', 'staff']), updateAppointment);
router.post('/:id/cancel', authMiddleware, checkRole(['admin', 'staff']), cancelAppointment);

module.exports = router;
