/**
 * DropSync Mock Dataset
 * Aligned directly with database/schema.sql and database/seed.sql
 * Used for offline testing, UI verification, and graceful fallback when backend is not running.
 */

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

export const MOCK_BLOOD_BANKS = [
  {
    blood_bank_id: 1,
    name: 'Demo Central Blood Bank',
    address: '10 Sample Road, Shivajinagar',
    city: 'Pune',
    phone: '+91-20-5550-0101',
    latitude: 18.520400,
    longitude: 73.856700,
    operating_hours: '24/7 Emergency Service',
    inventory: {
      'A+': 8,
      'A-': 0,
      'B+': 5,
      'B-': 0,
      'AB+': 0,
      'AB-': 0,
      'O+': 12,
      'O-': 2
    }
  },
  {
    blood_bank_id: 2,
    name: 'Demo Riverside Blood Bank',
    address: '22 Example Avenue, Koregaon Park',
    city: 'Pune',
    phone: '+91-20-5550-0102',
    latitude: 18.536200,
    longitude: 73.893900,
    operating_hours: '8:00 AM - 10:00 PM',
    inventory: {
      'A+': 3,
      'A-': 0,
      'B+': 0,
      'B-': 0,
      'AB+': 4,
      'AB-': 0,
      'O+': 6,
      'O-': 0
    }
  },
  {
    blood_bank_id: 3,
    name: 'Demo North Blood Bank',
    address: '5 Fictional Street, Dadar West',
    city: 'Mumbai',
    phone: '+91-22-5550-0103',
    latitude: 19.076000,
    longitude: 72.877700,
    operating_hours: '24/7 Emergency Service',
    inventory: {
      'A+': 0,
      'A-': 0,
      'B+': 7,
      'B-': 0,
      'AB+': 0,
      'AB-': 0,
      'O+': 9,
      'O-': 3
    }
  },
  {
    blood_bank_id: 4,
    name: 'Ruby Hall Clinic Blood Center',
    address: '40 Sassoon Road, Sangamvadi',
    city: 'Pune',
    phone: '+91-20-6645-5100',
    latitude: 18.531200,
    longitude: 73.876500,
    operating_hours: '24/7 Emergency Service',
    inventory: {
      'A+': 15,
      'A-': 3,
      'B+': 10,
      'B-': 2,
      'AB+': 5,
      'AB-': 1,
      'O+': 20,
      'O-': 4
    }
  },
  {
    blood_bank_id: 5,
    name: 'KEM Hospital Blood Bank',
    address: '489 Rasta Peth, Sardar Moodliar Road',
    city: 'Pune',
    phone: '+91-20-6603-7300',
    latitude: 18.523600,
    longitude: 73.870200,
    operating_hours: '24/7 Emergency Service',
    inventory: {
      'A+': 6,
      'A-': 1,
      'B+': 8,
      'B-': 3,
      'AB+': 2,
      'AB-': 0,
      'O+': 14,
      'O-': 2
    }
  },
  {
    blood_bank_id: 6,
    name: 'Lilavati Hospital Blood Bank',
    address: 'A-791 Bandra Reclamation, Bandra West',
    city: 'Mumbai',
    phone: '+91-22-2675-1000',
    latitude: 19.051400,
    longitude: 72.829000,
    operating_hours: '24/7 Emergency Service',
    inventory: {
      'A+': 11,
      'A-': 2,
      'B+': 9,
      'B-': 1,
      'AB+': 6,
      'AB-': 2,
      'O+': 18,
      'O-': 5
    }
  }
];

/**
 * Calculate distance between two GPS coordinates using the Haversine formula
 * Returns distance in kilometers (km)
 */
export function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

export const MOCK_HOSPITAL_REQUESTS = [
  {
    requestId: "1",
    hospitalId: "1",
    hospitalName: "Demo City Hospital",
    hospitalCity: "Pune",
    hospitalPhone: "+91-20-5550-0201",
    hospitalLatitude: 18.515,
    hospitalLongitude: 73.845,
    bloodGroup: "O+",
    unitsRequested: 4,
    urgency: "critical",
    status: "pending",
    fulfilledByBloodBank: null,
    requestedAt: "2026-10-20T08:15:00Z",
    fulfilledAt: null,
    notes: "Fictional classroom example",
  },
  {
    requestId: "2",
    hospitalId: "1",
    hospitalName: "Demo City Hospital",
    hospitalCity: "Pune",
    hospitalPhone: "+91-20-5550-0201",
    hospitalLatitude: 18.515,
    hospitalLongitude: 73.845,
    bloodGroup: "A+",
    unitsRequested: 2,
    urgency: "normal",
    status: "pending",
    fulfilledByBloodBank: null,
    requestedAt: "2026-10-20T10:30:00Z",
    fulfilledAt: null,
    notes: null,
  },
  {
    requestId: "3",
    hospitalId: "2",
    hospitalName: "Demo General Hospital",
    hospitalCity: "Mumbai",
    hospitalPhone: "+91-22-5550-0202",
    hospitalLatitude: 19.082,
    hospitalLongitude: 72.87,
    bloodGroup: "B+",
    unitsRequested: 3,
    urgency: "high",
    status: "matched",
    fulfilledByBloodBank: null,
    requestedAt: "2026-10-19T14:00:00Z",
    fulfilledAt: null,
    notes: null,
  },
  {
    requestId: "4",
    hospitalId: "2",
    hospitalName: "Demo General Hospital",
    hospitalCity: "Mumbai",
    hospitalPhone: "+91-22-5550-0202",
    hospitalLatitude: 19.082,
    hospitalLongitude: 72.87,
    bloodGroup: "O-",
    unitsRequested: 1,
    urgency: "low",
    status: "fulfilled",
    fulfilledByBloodBank: "Demo North Blood Bank",
    requestedAt: "2026-10-18T09:00:00Z",
    fulfilledAt: "2026-10-18T11:20:00Z",
    notes: null,
  },
];
