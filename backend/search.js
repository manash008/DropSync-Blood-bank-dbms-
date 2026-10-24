export const BLOOD_GROUPS = Object.freeze([
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
]);

const SEARCH_SQL = [
  "SELECT",
  "  bb.blood_bank_id AS bloodBankId,",
  "  bb.name,",
  "  bb.address,",
  "  bb.city,",
  "  bb.phone,",
  "  bb.latitude,",
  "  bb.longitude,",
  "  bg.group_code AS bloodGroup,",
  "  i.units_available AS unitsAvailable",
  "FROM inventory AS i",
  "INNER JOIN blood_banks AS bb",
  "  ON bb.blood_bank_id = i.blood_bank_id",
  "INNER JOIN blood_groups AS bg",
  "  ON bg.blood_group_id = i.blood_group_id",
].join("\n");

function calculateDistanceKm(latitude1, longitude1, latitude2, longitude2) {
  const radians = (degrees) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latitude2 - latitude1);
  const longitudeDelta = radians(longitude2 - longitude1);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(latitude1)) *
      Math.cos(radians(latitude2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return (
    Math.round(
      6371 *
        2 *
        Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine)) *
        10,
    ) / 10
  );
}

export function validateSearchQuery(query) {
  const bloodGroup =
    typeof query.bloodGroup === "string"
      ? query.bloodGroup.trim().toUpperCase()
      : "";
  const city = typeof query.city === "string" ? query.city.trim() : "";
  const errors = {};
  if (query.city !== undefined && typeof query.city !== "string") {
    errors.city = "Enter a single city name.";
  }

  if (bloodGroup !== "ALL" && !BLOOD_GROUPS.includes(bloodGroup)) {
    errors.bloodGroup = "Choose one of the supported blood groups or ALL.";
  }

  const hasControlChars = [...city].some((character) => {
    const codePoint = character.codePointAt(0);
    return codePoint < 32 || codePoint === 127;
  });
  if (city.length > 100 || hasControlChars) {
    errors.city =
      "Enter a city name with no more than 100 printable characters.";
  }

  const parseCoordinate = (name, minimum, maximum) => {
    if (query[name] === undefined) return null;
    if (typeof query[name] !== "string" || query[name].trim() === "") {
      errors[name] = "Enter a valid coordinate.";
      return null;
    }
    const value = Number(query[name]);
    if (!Number.isFinite(value) || value < minimum || value > maximum) {
      errors[name] =
        "Enter a coordinate between " + minimum + " and " + maximum + ".";
      return null;
    }
    return value;
  };

  const latitude = parseCoordinate("lat", -90, 90);
  const longitude = parseCoordinate("lng", -180, 180);
  if ((latitude === null) !== (longitude === null)) {
    errors.location = "Provide both latitude and longitude.";
  }

  return {
    errors,
    values: { bloodGroup, city, latitude, longitude },
  };
}

export async function searchBloodBanks(
  pool,
  { bloodGroup, city, latitude = null, longitude = null },
) {
  const conditions = [];
  const parameters = [];
  if (bloodGroup !== "ALL") {
    conditions.push("bg.group_code = ?");
    parameters.push(bloodGroup);
  }
  if (city) {
    conditions.push("bb.city = ?");
    parameters.push(city);
  }

  const whereClause =
    conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";
  const sql =
    SEARCH_SQL +
    " " +
    whereClause +
    "\nORDER BY i.units_available DESC, bb.name ASC, bg.group_code ASC";
  const [rows] = await pool.execute(sql, parameters);
  const results = rows.map((row) => ({
    bloodBankId: String(row.bloodBankId),
    name: row.name,
    address: row.address,
    city: row.city,
    phone: row.phone,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    bloodGroup: row.bloodGroup,
    unitsAvailable: Number(row.unitsAvailable),
  }));

  if (latitude === null || longitude === null) return results;

  return results
    .map((result) => ({
      ...result,
      distanceKm:
        result.latitude === null || result.longitude === null
          ? null
          : calculateDistanceKm(
              latitude,
              longitude,
              result.latitude,
              result.longitude,
            ),
    }))
    .sort((left, right) => {
      if (left.distanceKm === null && right.distanceKm === null) return 0;
      if (left.distanceKm === null) return 1;
      if (right.distanceKm === null) return -1;
      return left.distanceKm - right.distanceKm;
    });
}
