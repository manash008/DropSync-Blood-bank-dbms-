const db = require("../config/db");

/**
 * Get all blood groups
 */
async function getBloodGroups(req, res, next) {
  try {
    const groups = await db.query(
      "SELECT blood_group_id, group_code FROM blood_groups ORDER BY blood_group_id ASC",
    );
    return res
      .status(200)
      .json({ success: true, count: groups.length, data: groups });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all blood banks (with optional city filter)
 */
async function getBloodBanks(req, res, next) {
  try {
    const { city } = req.query;
    let sql =
      "SELECT blood_bank_id, name, address, city, phone, latitude, longitude FROM blood_banks";
    const params = [];

    if (city && city.trim()) {
      sql += " WHERE LOWER(city) = LOWER(?)";
      params.push(city.trim());
    }

    sql += " ORDER BY name ASC";
    const banks = await db.query(sql, params);
    return res
      .status(200)
      .json({ success: true, count: banks.length, data: banks });
  } catch (error) {
    next(error);
  }
}

/**
 * Get all hospitals (with optional city filter)
 */
async function getHospitals(req, res, next) {
  try {
    const { city } = req.query;
    let sql =
      "SELECT hospital_id, name, address, city, phone, latitude, longitude FROM hospitals";
    const params = [];

    if (city && city.trim()) {
      sql += " WHERE LOWER(city) = LOWER(?)";
      params.push(city.trim());
    }

    sql += " ORDER BY name ASC";
    const hospitals = await db.query(sql, params);
    return res
      .status(200)
      .json({ success: true, count: hospitals.length, data: hospitals });
  } catch (error) {
    next(error);
  }
}

/**
 * Search donors by blood group and city
 */
async function getDonors(req, res, next) {
  try {
    const { blood_group, city } = req.query;
    const conditions = [];
    const params = [];

    if (blood_group && blood_group.trim()) {
      conditions.push("bg.group_code = ?");
      params.push(blood_group.trim().toUpperCase());
    }

    if (city && city.trim()) {
      conditions.push("LOWER(d.city) = LOWER(?)");
      params.push(city.trim());
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const sql = `
      SELECT
        d.donor_id,
        d.full_name,
        d.email,
        d.phone,
        bg.group_code AS blood_group,
        d.city,
        d.latitude,
        d.longitude,
        d.last_donation_date
      FROM donors d
      JOIN blood_groups bg ON bg.blood_group_id = d.blood_group_id
      ${whereClause}
      ORDER BY (d.last_donation_date IS NULL) DESC, d.last_donation_date ASC
    `;

    const donors = await db.query(sql, params);
    return res
      .status(200)
      .json({ success: true, count: donors.length, data: donors });
  } catch (error) {
    next(error);
  }
}

/**
 * Record a donation and atomically update inventory using an explicit SQL transaction.
 * Direct demonstration of atomic transaction from database/queries.sql.
 */
async function recordDonation(req, res, next) {
  const {
    donor_id,
    blood_bank_id,
    blood_group_id,
    units_collected = 1,
    notes,
  } = req.body;

  // Validation
  if (!donor_id || !blood_bank_id || !blood_group_id) {
    return res.status(400).json({
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "donor_id, blood_bank_id, and blood_group_id are required",
      },
    });
  }

  const units = parseInt(units_collected, 10) || 1;
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1. Insert donation record
    const insertDonationSql = `
      INSERT INTO donations (donor_id, blood_bank_id, blood_group_id, units_collected, notes)
      VALUES (?, ?, ?, ?, ?)
    `;
    const [donationResult] = await connection.execute(insertDonationSql, [
      donor_id,
      blood_bank_id,
      blood_group_id,
      units,
      notes || "Donation via API",
    ]);

    // 2. Upsert inventory stock atomically
    const upsertInventorySql = `
      INSERT INTO inventory (blood_bank_id, blood_group_id, units_available)
      VALUES (?, ?, ?) AS incoming
      ON DUPLICATE KEY UPDATE units_available = inventory.units_available + incoming.units_available
    `;
    await connection.execute(upsertInventorySql, [
      blood_bank_id,
      blood_group_id,
      units,
    ]);

    // 3. Update donor's last_donation_date
    const updateDonorSql = `UPDATE donors SET last_donation_date = CURDATE() WHERE donor_id = ?`;
    await connection.execute(updateDonorSql, [donor_id]);

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Donation recorded and inventory incremented atomically",
      data: {
        donation_id: donationResult.insertId,
        donor_id,
        blood_bank_id,
        blood_group_id,
        units_collected: units,
      },
    });
  } catch (error) {
    await connection.rollback();
    next(error);
  } finally {
    connection.release();
  }
}

module.exports = {
  getBloodGroups,
  getBloodBanks,
  getHospitals,
  getDonors,
  recordDonation,
};
