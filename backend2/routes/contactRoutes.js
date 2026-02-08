const express = require('express');
const router = express.Router();
const { authMiddleware, checkRole } = require('../middleware/authMiddleware');
const {
  createContact,
  getAllContacts,
  updateContact,
  deleteContact
} = require('../controllers/contactController');

router.get('/', authMiddleware, getAllContacts);
router.post('/', authMiddleware, checkRole(['admin', 'staff']), createContact);
router.put('/:id', authMiddleware, checkRole(['admin', 'staff']), updateContact);
router.delete('/:id', authMiddleware, checkRole(['admin', 'staff']), deleteContact);

module.exports = router;
