const pipeline = [
  { $match: { eventType: "blood_search" } },
  {
    $group: {
      _id: { bloodGroup: "$bloodGroup", city: "$city" },
      searchCount: { $sum: 1 },
      matchingBanksReturned: { $sum: "$resultCount" },
    },
  },
  { $sort: { "_id.bloodGroup": 1, "_id.city": 1 } },
];

db.activity_logs.aggregate(pipeline).forEach(printjson);
