const db = require("../config/db");

/**
 * Search blood availability by blood group and city.
 * Supports joins across inventory, blood_banks, and blood_groups.
 *
 * Query params:
 * - blood_group: (optional) e.g. "O+", "A-"
 * - city: (optional) e.g. "Pune", "Mumbai"
 * - min_units: (optional) minimum units available, defaults to 1
 */
async function searchInventory(req, res, next) {
  try {
    const { blood_group, city, min_units } = req.query;

    const conditions = ["i.units_available >= ?"];
    const params = [parseInt(min_units, 10) || 1];

    if (blood_group && blood_group.trim()) {
      conditions.push("bg.group_code = ?");
      params.push(blood_group.trim().toUpperCase());
    }

    if (city && city.trim()) {
      conditions.push("LOWER(bb.city) = LOWER(?)");
      params.push(city.trim());
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const sql = `
      SELECT
        bb.blood_bank_id,
        bb.name AS blood_bank_name,
        bb.address,
        bb.city,
        bb.phone,
        bb.latitude,
        bb.longitude,
        bg.blood_group_id,
        bg.group_code AS blood_group,
        i.units_available,
        i.updated_at
      FROM inventory i
      JOIN blood_banks bb ON bb.blood_bank_id = i.blood_bank_id
      JOIN blood_groups bg ON bg.blood_group_id = i.blood_group_id
      ${whereClause}
      ORDER BY i.units_available DESC, bb.name ASC
    `;

    const results = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      count: results.length,
      filters: {
        blood_group: blood_group ? blood_group.trim().toUpperCase() : null,
        city: city ? city.trim() : null,
        min_units: parseInt(min_units, 10) || 1,
      },
      data: results,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Aggregated inventory report: total units per blood group and city.
 * Corresponds directly to the DBMS aggregation example in queries.sql.
 */
async function getInventorySummary(req, res, next) {
  try {
    const { city } = req.query;
    const params = [];
    let whereClause = "";

    if (city && city.trim()) {
      whereClause = "WHERE LOWER(bb.city) = LOWER(?)";
      params.push(city.trim());
    }

    const sql = `
      SELECT
        bb.city,
        bg.group_code AS blood_group,
        SUM(i.units_available) AS total_units,
        COUNT(DISTINCT bb.blood_bank_id) AS bank_count
      FROM inventory i
      JOIN blood_banks bb ON bb.blood_bank_id = i.blood_bank_id
      JOIN blood_groups bg ON bg.blood_group_id = i.blood_group_id
      ${whereClause}
      GROUP BY bb.city, bg.blood_group_id, bg.group_code
      ORDER BY bb.city ASC, bg.blood_group_id ASC
    `;

    const summary = await db.query(sql, params);

    return res.status(200).json({
      success: true,
      count: summary.length,
      data: summary,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  searchInventory,
  getInventorySummary,
};
