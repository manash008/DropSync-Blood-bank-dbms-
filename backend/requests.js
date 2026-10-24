export const REQUEST_STATUSES = Object.freeze([
  "all",
  "pending",
  "matched",
  "fulfilled",
  "cancelled",
]);

export const URGENCIES = Object.freeze([
  "all",
  "low",
  "normal",
  "high",
  "critical",
]);

export function validateRequestsQuery(query = {}) {
  const status =
    typeof query.status === "string"
      ? query.status.trim().toLowerCase()
      : "pending";
  const urgency =
    typeof query.urgency === "string"
      ? query.urgency.trim().toLowerCase()
      : "all";
  const city = typeof query.city === "string" ? query.city.trim() : "";
  const errors = {};

  if (!REQUEST_STATUSES.includes(status)) {
    errors.status =
      "Status must be one of: " + REQUEST_STATUSES.join(", ") + ".";
  }

  if (!URGENCIES.includes(urgency)) {
    errors.urgency = "Urgency must be one of: " + URGENCIES.join(", ") + ".";
  }

  const hasControlChars = [...city].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint < 32 || codePoint === 127;
  });
  if (city.length > 100 || hasControlChars) {
    errors.city =
      "Enter a city name with no more than 100 printable characters.";
  }

  return {
    errors,
    values: { status, urgency, city },
  };
}

export async function fetchHospitalRequests(
  pool,
  { status = "pending", urgency = "all", city = "" } = {},
) {
  const whereClauses = [];
  const parameters = [];

  if (status && status !== "all") {
    whereClauses.push("r.status = ?");
    parameters.push(status);
  }

  if (urgency && urgency !== "all") {
    whereClauses.push("r.urgency = ?");
    parameters.push(urgency);
  }

  if (city) {
    whereClauses.push("h.city = ?");
    parameters.push(city);
  }

  const whereSql =
    whereClauses.length > 0 ? "WHERE " + whereClauses.join(" AND ") : "";

  const sql = [
    "SELECT",
    "  r.request_id AS requestId,",
    "  h.hospital_id AS hospitalId,",
    "  h.name AS hospitalName,",
    "  h.city AS hospitalCity,",
    "  h.phone AS hospitalPhone,",
    "  h.latitude AS hospitalLatitude,",
    "  h.longitude AS hospitalLongitude,",
    "  bg.group_code AS bloodGroup,",
    "  r.units_requested AS unitsRequested,",
    "  r.urgency,",
    "  r.status,",
    "  bb.name AS fulfilledByBloodBank,",
    "  DATE_FORMAT(r.requested_at, '%Y-%m-%dT%H:%i:%sZ') AS requestedAt,",
    "  DATE_FORMAT(r.fulfilled_at, '%Y-%m-%dT%H:%i:%sZ') AS fulfilledAt,",
    "  r.notes",
    "FROM requests AS r",
    "JOIN hospitals AS h ON h.hospital_id = r.hospital_id",
    "JOIN blood_groups AS bg ON bg.blood_group_id = r.blood_group_id",
    "LEFT JOIN blood_banks AS bb ON bb.blood_bank_id = r.fulfilled_by_blood_bank_id",
    whereSql,
    "ORDER BY FIELD(r.urgency, 'critical', 'high', 'normal', 'low'), r.requested_at DESC",
  ]
    .filter(Boolean)
    .join("\n");

  const [rows] = await pool.execute(sql, parameters);
  return rows.map((row) => ({
    requestId: String(row.requestId),
    hospitalId: String(row.hospitalId),
    hospitalName: row.hospitalName,
    hospitalCity: row.hospitalCity,
    hospitalPhone: row.hospitalPhone,
    hospitalLatitude:
      row.hospitalLatitude != null ? Number(row.hospitalLatitude) : null,
    hospitalLongitude:
      row.hospitalLongitude != null ? Number(row.hospitalLongitude) : null,
    bloodGroup: row.bloodGroup,
    unitsRequested: Number(row.unitsRequested),
    urgency: row.urgency,
    status: row.status,
    fulfilledByBloodBank: row.fulfilledByBloodBank || null,
    requestedAt: row.requestedAt,
    fulfilledAt: row.fulfilledAt || null,
    notes: row.notes || null,
  }));
}
