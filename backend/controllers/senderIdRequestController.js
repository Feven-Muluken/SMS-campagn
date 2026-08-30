const { SenderIdRequest, CompanySenderId, Company, User, sequelize } = require('../models');

const normalizeSenderId = (value) => String(value || '').trim();
const isValidSenderId = (senderId) => /^[a-zA-Z0-9]{1,11}$/.test(senderId);
const normalizeCountryCodes = (input) => {
	if (!input) return [];
	const list = Array.isArray(input) ? input : [input];
	return Array.from(
		new Set(
			list
				.map((x) => String(x || '').trim().toUpperCase())
				.filter((x) => /^[A-Z]{2}$/.test(x))
		)
	);
};

const createSenderIdRequest = async (req, res) => {
	try {
		const companyId = Number(req.companyContext?.companyId || req.auth?.activeCompanyId || req.body?.companyId);
		if (!companyId) {
			return res.status(400).json({ message: 'Active company context is required.' });
		}

		const senderId = normalizeSenderId(req.body?.senderId);
		const reason = String(req.body?.reason || '').trim() || null;
		const countryCodes = normalizeCountryCodes(req.body?.countryCodes);

		if (!senderId || !isValidSenderId(senderId)) {
			return res.status(400).json({ message: 'Invalid senderId. Use 1-11 alphanumeric characters.' });
		}

		const approvedAlready = await CompanySenderId.findOne({
			where: { companyId, senderId, status: 'approved', isActive: true },
		});
		if (approvedAlready) {
			return res.status(400).json({ message: 'This sender ID is already approved for your company.' });
		}

		const pendingRequest = await SenderIdRequest.findOne({
			where: { companyId, senderId, status: 'pending' },
		});

		if (pendingRequest) {
			return res.status(400).json({ message: 'A pending request for this sender ID already exists.' });
		}

		const requestRow = await SenderIdRequest.create({
			companyId,
			requestedById: req.user.id,
			senderId,
			countryCodes,
			status: 'pending',
			reason,
		});

		return res.status(201).json({
			message: 'Sender ID request submitted to super admin.',
			data: requestRow,
		});
	} catch (error) {
		console.error('createSenderIdRequest error:', error);
		return res.status(500).json({ message: 'Failed to submit sender ID request' });
	}
};

const listMySenderIdRequests = async (req, res) => {
	try {
		const where = { requestedById: req.user.id };
		const companyId = Number(req.companyContext?.companyId || req.auth?.activeCompanyId || req.query?.companyId);
		if (companyId) where.companyId = companyId;

		const rows = await SenderIdRequest.findAll({
			where,
			include: [
				{ model: Company, as: 'company', attributes: ['id', 'name', 'slug'] },
				{ model: User, as: 'reviewer', attributes: ['id', 'name', 'email'] },
			],
			order: [['createdAt', 'DESC']],
		});

		return res.json({ data: rows });
	} catch (error) {
		console.error('listMySenderIdRequests error:', error);
		return res.status(500).json({ message: 'Failed to load sender ID requests' });
	}
};

const listPendingSenderIdRequests = async (req, res) => {
	try {
		const rows = await SenderIdRequest.findAll({
			where: { status: 'pending' },
			include: [
				{ model: Company, as: 'company', attributes: ['id', 'name', 'slug'] },
				{ model: User, as: 'requester', attributes: ['id', 'name', 'email', 'phoneNumber'] },
			],
			order: [['createdAt', 'ASC']],
		});

		return res.json({ data: rows });
	} catch (error) {
		// console.error('listPendingSenderIdRequests error:', error);
		return res.status(500).json({ message: 'Failed to load pending sender ID requests' });
	}
};

const upsertApprovedSenderId = async ({ companyId, senderId, countryCodes, approvedById }) => {
	const existing = await CompanySenderId.findOne({ where: { companyId, senderId } });
	if (existing) {
		existing.status = 'approved';
		existing.isActive = true;
		existing.approvedById = approvedById;
		existing.countryCodes = Array.isArray(existing.countryCodes) && existing.countryCodes.length ? existing.countryCodes : countryCodes;
		await existing.save();
		return existing;
	}

	try {
		return await CompanySenderId.create({
			companyId,
			senderId,
			countryCodes,
			status: 'approved',
			isActive: true,
			approvedById,
		});
	} catch (error) {
		if (error?.original?.code !== 'ER_NO_DEFAULT_FOR_FIELD') throw error;

		const now = new Date();
		const [result] = await sequelize.query(
			`INSERT INTO company_sender_ids
			 (company_id, sender_id, country_codes, status, is_active, approved_by_id, created_at, updated_at)
			 VALUES (?, ?, ?, 'approved', 1, ?, ?, ?)` ,
			{
				replacements: [companyId, senderId, JSON.stringify(countryCodes || []), approvedById, now, now],
			}
		);
		return result;
	}
};

const reviewSenderIdRequest = async (req, res) => {
	try {
		const id = Number(req.params.id);
		if (!id) return res.status(400).json({ message: 'Invalid request id' });

		const decision = String(req.body?.status || '').toLowerCase();
		if (!['approved', 'rejected'].includes(decision)) {
			return res.status(400).json({ message: 'status must be approved or rejected' });
		}

		const row = await SenderIdRequest.findByPk(id);
		if (!row) return res.status(404).json({ message: 'Request not found' });
		if (row.status !== 'pending') {
			return res.status(400).json({ message: 'This request has already been reviewed.' });
		}

		row.status = decision;
		row.reviewedById = req.user.id;
		row.reviewedAt = new Date();
		await row.save();

		if (decision === 'approved') {
			await upsertApprovedSenderId({
				companyId: row.companyId,
				senderId: row.senderId,
				countryCodes: row.countryCodes || [],
				approvedById: req.user.id,
			});
		}

		return res.json({ message: `Sender ID request ${decision}.`, data: row });
	} catch (error) {
		console.error('reviewSenderIdRequest error:', error);
		return res.status(500).json({ message: 'Failed to review sender ID request' });
	}
};

const removeCompanySenderId = async (req, res) => {
	try {
		const senderId = normalizeSenderId(req.params.senderId);
		if (!senderId) return res.status(400).json({ message: 'Invalid sender ID' });

		const companyId = Number(req.companyContext?.companyId || req.auth?.activeCompanyId || req.body?.companyId || req.query?.companyId);
		if (!companyId) {
			return res.status(400).json({ message: 'Active company context is required.' });
		}

		const row = await CompanySenderId.findOne({ where: { companyId, senderId } });
		if (!row) return res.status(404).json({ message: 'Sender ID not found for this company.' });

		row.isActive = false;
		row.status = 'rejected';
		await row.save();

		return res.json({ message: 'Sender ID removed successfully.', data: row });
	} catch (error) {
		console.error('removeCompanySenderId error:', error);
		return res.status(500).json({ message: 'Failed to remove sender ID' });
	}
};

module.exports = {
	createSenderIdRequest,
	listMySenderIdRequests,
	listPendingSenderIdRequests,
	reviewSenderIdRequest,
	removeCompanySenderId,
};
