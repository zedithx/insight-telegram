const { db } = require("../utils/firebaseAdmin");

class EventCache {
  constructor() {
    this.cache = null; // ✅ Stores event data
    this.lastFetched = 0; // ✅ Stores last fetch timestamp
    this.cacheExpiry = 60 * 1000; // ✅ Cache expiry time (1 minute)
  }

  async getEvents(date = "24 Feb") {
    // ✅ If cache is fresh, return cached data
    if (this.cache && Date.now() - this.lastFetched < this.cacheExpiry) {
      return this.cache;
    }

    try {
      const eventsDoc = db.collection("events").doc(date);
      const docSnapshot = await eventsDoc.get();

      if (!docSnapshot.exists) {
        console.warn("⚠️ Events data not found.");
        return null;
      }

      const eventsDict = docSnapshot.data();

      // ✅ Convert events to indexed format
        // ✅ Cache the results
      this.cache = Object.keys(eventsDict).map((eventName, index) => ({
          name: eventName,
          id: index, // ✅ Ensures consistent indexing
      }));
      this.lastFetched = Date.now();

      return this.cache;
    } catch (error) {
      console.error("❌ Error fetching events:", error.message);
      return null;
    }
  }
}

// ✅ Export a single instance (singleton)
module.exports = new EventCache();