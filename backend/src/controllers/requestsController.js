const db = require('../config/db');

const ALLOWED_URGENCY = ['low', 'normal', 'high', 'critical'];
const ALLOWED_STATUS = ['pending', 'matched', 'fulfilled', 'cancelled'];

/**
 * List blood requests with optional filters
 * Query params:
 * - status: 'pending' (default) or other allowed status, or 'all'
 * - urgency: 'critical', 'high', 'normal', 'low'
 * - hospital_id: filter by hospital
 */
async function getRequests(req, res, next) {
  try {
    const { status = 'pending', urgency, hospital_id } = req.query;

    const conditions = [];
    const params = [];

    if (status && status !== 'all') {
      if (!ALLOWED_STATUS.includes(status)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Invalid status '${status}'. Allowed: ${ALLOWED_STATUS.join(', ')} or 'all'`
          }
        });
      }
      conditions.push('r.status = ?');
      params.push(status);
    }

    if (urgency) {
      if (!ALLOWED_URGENCY.includes(urgency)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_URGENCY',
            message: `Invalid urgency '${urgency}'. Allowed: ${ALLOWED_URGENCY.join(', ')}`
          }
        });
      }
      conditions.push('r.urgency = ?');
      params.push(urgency);
    }

    if (hospital_id) {
      const parsedHospitalId = parseInt(hospital_id, 10);
      if (isNaN(parsedHospitalId)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_HOSPITAL_ID',
            message: 'hospital_id must be an integer'
          }
        });
      }
      conditions.push('r.hospital_id = ?');
      params.push(parsedHospitalId);
    }

    const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const sql = `
      SELECT
        r.request_id,
        r.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city,
        h.phone AS hospital_phone,
        r.blood_group_id,
        bg.group_code AS blood_group,
        r.units_requested,
        r.urgency,
        r.status,
        r.fulfilled_by_blood_bank_id,
        bb.name AS fulfilled_by_blood_bank_name,
        r.requested_at,
        r.fulfilled_at,
        r.notes
      FROM requests r
      JOIN hospitals h ON h.hospital_id = r.hospital_id
      JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
      LEFT JOIN blood_banks bb ON bb.blood_bank_id = r.fulfilled_by_blood_bank_id
      ${whereClause}
      ORDER BY FIELD(r.urgency, 'critical', 'high', 'normal', 'low'), r.requested_at DESC
    `;

    const requests = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      count: requests.length,
      data: requests
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Get request by ID
 */
async function getRequestById(req, res, next) {
  try {
    const requestId = parseInt(req.params.id, 10);
    if (isNaN(requestId)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_ID', message: 'Request ID must be a valid number' }
      });
    }

    const sql = `
      SELECT
        r.request_id,
        r.hospital_id,
        h.name AS hospital_name,
        h.city AS hospital_city,
        h.phone AS hospital_phone,
        r.blood_group_id,
        bg.group_code AS blood_group,
        r.units_requested,
        r.urgency,
        r.status,
        r.fulfilled_by_blood_bank_id,
        bb.name AS fulfilled_by_blood_bank_name,
        r.requested_at,
        r.fulfilled_at,
        r.notes
      FROM requests r
      JOIN hospitals h ON h.hospital_id = r.hospital_id
      JOIN blood_groups bg ON bg.blood_group_id = r.blood_group_id
      LEFT JOIN blood_banks bb ON bb.blood_bank_id = r.fulfilled_by_blood_bank_id
      WHERE r.request_id = ?
    `;

    const rows = await db.query(sql, [requestId]);

    if (!rows.length) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_FOUND', message: `Request with ID ${requestId} not found` }
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Create a new blood request (hospital raises a request)
 * Body:
 * - hospital_id: (required) integer
 * - blood_group_id OR blood_group: (required) integer (1-8) or string ('O+', etc.)
 * - units_requested: (required) integer > 0
 * - urgency: (optional) 'low' | 'normal' | 'high' | 'critical' (default: 'normal')
 * - notes: (optional) string max 500 chars
 */
async function createRequest(req, res, next) {
  try {
    const { hospital_id, blood_group_id, blood_group, units_requested, urgency = 'normal', notes } = req.body;

    // Validation
    const errors = [];

    const parsedHospitalId = parseInt(hospital_id, 10);
    if (!hospital_id || isNaN(parsedHospitalId) || parsedHospitalId <= 0) {
      errors.push('hospital_id is required and must be a positive integer');
    }

    let targetGroupId = blood_group_id ? parseInt(blood_group_id, 10) : null;

    if (!targetGroupId && blood_group) {
      const groupRows = await db.query('SELECT blood_group_id FROM blood_groups WHERE group_code = ?', [blood_group.trim().toUpperCase()]);
      if (groupRows.length > 0) {
        targetGroupId = groupRows[0].blood_group_id;
      } else {
        errors.push(`Invalid blood_group '${blood_group}'. Allowed: A+, A-, B+, B-, AB+, AB-, O+, O-`);
      }
    }

    if (!targetGroupId) {
      errors.push('Either a valid blood_group_id (1-8) or blood_group code (e.g. O+) is required');
    }

    const parsedUnits = parseInt(units_requested, 10);
    if (!units_requested || isNaN(parsedUnits) || parsedUnits <= 0) {
      errors.push('units_requested is required and must be an integer greater than 0');
    }

    if (!ALLOWED_URGENCY.includes(urgency)) {
      errors.push(`urgency must be one of: ${ALLOWED_URGENCY.join(', ')}`);
    }

    if (notes && typeof notes === 'string' && notes.length > 500) {
      errors.push('notes cannot exceed 500 characters');
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request payload',
          details: errors
        }
      });
    }

    // Verify hospital exists
    const hospitalRows = await db.query('SELECT hospital_id, name, city FROM hospitals WHERE hospital_id = ?', [parsedHospitalId]);
    if (!hospitalRows.length) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'HOSPITAL_NOT_FOUND',
          message: `Hospital with ID ${parsedHospitalId} does not exist in database`
        }
      });
    }

    // Parameterized INSERT into requests
    const insertSql = `
      INSERT INTO requests (hospital_id, blood_group_id, units_requested, urgency, status, notes)
      VALUES (?, ?, ?, ?, 'pending', ?)
    `;

    const result = await db.query(insertSql, [
      parsedHospitalId,
      targetGroupId,
      parsedUnits,
      urgency,
      notes ? notes.trim() : null
    ]);

    const newRequestId = result.insertId;

    return res.status(201).json({
      success: true,
      message: 'Blood request created successfully',
      data: {
        request_id: newRequestId,
        hospital_id: parsedHospitalId,
        hospital_name: hospitalRows[0].name,
        hospital_city: hospitalRows[0].city,
        blood_group_id: targetGroupId,
        units_requested: parsedUnits,
        urgency,
        status: 'pending',
        notes: notes ? notes.trim() : null,
        requested_at: new Date().toISOString()
      }
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getRequests,
  getRequestById,
  createRequest
};
