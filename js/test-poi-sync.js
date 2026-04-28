/**
 * POI SYNC TESTING — Console utilities
 *
 * Run these commands in browser console to test the system
 */

window.POISyncTest = {
  // Test 1: Check sync engine status
  async status() {
    const stats = await window.POISync.getSyncStats();
    console.log('%c[POI-SYNC TEST] Status', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
    console.table(stats);
    return stats;
  },

  // Test 2: Sync nearby POIs (requires GPS)
  async syncNearby(radiusKm = 5) {
    if (!window.gpsPos) {
      console.error('[POI-SYNC TEST] GPS not active');
      return;
    }
    const lat = window.gpsPos.coords.latitude;
    const lng = window.gpsPos.coords.longitude;
    console.log(`%c[POI-SYNC TEST] Syncing nearby POIs (${radiusKm}km from GPS)`, 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
    const result = await window.POISync.syncNearbyPOIs(lat, lng, radiusKm);
    console.log(result);
    return result;
  },

  // Test 3: Sync specific POI
  async syncPOI(poiId) {
    console.log(`%c[POI-SYNC TEST] Syncing POI: ${poiId}`, 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
    const poi = window.getCachedAllPOIs().find(p => p.id === poiId);
    if (!poi) {
      console.error('[POI-SYNC TEST] POI not found');
      return;
    }
    const verified = await window.POISync.syncSinglePOI(poi);
    console.log('%c✅ Verified POI:', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
    console.log(verified);
    return verified;
  },

  // Test 4: Get verified POI data
  async getVerified(poiId) {
    const verified = await window.POIVerifiedDB.getVerifiedPOI(poiId);
    if (!verified) {
      console.log(`%c❌ POI not verified: ${poiId}`, 'background: #D9534F; color: white; padding: 4px 8px; border-radius: 3px');
      return null;
    }
    console.log('%c✅ Verified POI Data:', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
    console.log(verified);
    return verified;
  },

  // Test 5: Get all verified POIs
  async getAllVerified() {
    const verified = await window.POIVerifiedDB.getAllVerifiedPOIs();
    console.log(`%c✅ Total verified POIs: ${verified.length}`, 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
    return verified;
  },

  // Test 6: Check verification status
  async checkStatus(poiId) {
    const status = await window.POIVerifiedDB.getVerificationStatus(poiId);
    console.log(`%c[POI-SYNC TEST] POI ${poiId} status: ${status}`, 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
    return status;
  },

  // Test 7: Get POIs needing verification nearby
  async checkNeedingVerification(radiusKm = 5) {
    if (!window.gpsPos) {
      console.error('[POI-SYNC TEST] GPS not active');
      return;
    }
    const lat = window.gpsPos.coords.latitude;
    const lng = window.gpsPos.coords.longitude;
    const allPOIs = window.getCachedAllPOIs();
    const needing = await window.POIVerifiedDB.getPOIsNeedingVerificationNearby(allPOIs, lat, lng, radiusKm);
    console.log(`%c[POI-SYNC TEST] POIs needing verification (${radiusKm}km): ${needing.length}`, 'background: #E8A838; color: white; padding: 4px 8px; border-radius: 3px');
    console.table(needing.slice(0, 10));
    return needing;
  },

  // Test 8: Test specific POI with full flow
  async testFullFlow(poiId) {
    console.log(`%c[POI-SYNC TEST] Full flow test for POI: ${poiId}`, 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');

    const poi = window.getCachedAllPOIs().find(p => p.id === poiId);
    if (!poi) {
      console.error('[POI-SYNC TEST] POI not found');
      return;
    }

    console.log('1️⃣ Local POI data:');
    console.log(poi);

    console.log('2️⃣ Checking verification status...');
    const isVerified = await window.POIVerifiedDB.isPOIVerified(poiId);
    console.log(isVerified ? '✅ Already verified' : '⏳ Not verified yet');

    if (!isVerified) {
      console.log('3️⃣ Syncing with Google Places...');
      const result = await window.POISync.syncSinglePOI(poi);
      if (!result) {
        console.error('❌ Sync failed');
        return;
      }
    }

    console.log('4️⃣ Verified Google Places data:');
    const verified = await window.POIVerifiedDB.getVerifiedPOI(poiId);
    console.table({
      'Google Name': verified.name,
      'Google Address': verified.address,
      'Rating': verified.rating,
      'Reviews': verified.ratingCount,
      'Phone': verified.phone,
      'Website': verified.website,
      'Place ID': verified.googlePlaceId
    });

    console.log('5️⃣ Opening hours:');
    console.table(verified.openingHours);

    console.log('6️⃣ Photos available:');
    console.log(`Found ${verified.photoReferences?.length || 0} photos`);

    return { poi, verified };
  },

  // Test 9: Clear all verified data
  async clearAll() {
    if (confirm('⚠️ Clear all verified POI data?')) {
      await window.POIVerifiedDB.clearDatabase();
      console.log('%c✅ Database cleared', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
    }
  },

  // Test 10: Manual sync test
  async manualTest(name, lat, lng, category = 'food') {
    console.log(`%c[POI-SYNC TEST] Manual test: ${name}`, 'background: #FF6B6B; color: white; padding: 4px 8px; border-radius: 3px');
    const testPOI = {
      id: `test-${Date.now()}`,
      name,
      lat,
      lng,
      cat: category,
      city: 'Tokyo'
    };

    const response = await fetch('/api/verifyPOIs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pois: [testPOI],
        radiusM: 500
      })
    });

    const result = await response.json();
    console.log('%c📊 API Response:', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
    console.log(result);

    if (result.verified?.length > 0) {
      console.log('%c✅ Verified data:', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px');
      console.log(result.verified[0]);
    }

    return result;
  }
};

window.POISyncTest.mapQuality = async function() {
  const allPOIs = window.getCachedAllPOIs?.() || [];
  const allVerified = await window.POIVerifiedDB?.getAllVerifiedPOIs?.() || [];
  const verifiedIds = new Set(allVerified.map(p => p.localId));

  let fakesCount = 0;
  const fakesList = [];

  for (const poi of allPOIs) {
    const status = await window.POIVerifiedDB?.getVerificationStatus?.(poi.id);
    if (status === 'not_found') {
      fakesCount++;
      if (fakesList.length < 10) {
        fakesList.push({ id: poi.id, name: poi.name, cat: poi.cat });
      }
    }
  }

  console.log('%c[POI-SYNC TEST] Map Quality Report', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
  console.table({
    'Total POIs': allPOIs.length,
    'Real POIs (verified)': verifiedIds.size,
    'Fake POIs (not found)': fakesCount,
    'Unverified (pending)': allPOIs.length - verifiedIds.size - fakesCount,
    'Map quality': ((verifiedIds.size / allPOIs.length) * 100).toFixed(2) + '%'
  });

  if (fakesList.length > 0) {
    console.log('%c[POI-SYNC TEST] Sample fake POIs:', 'background: #D9534F; color: white; padding: 4px 8px; border-radius: 3px');
    console.table(fakesList);
  }
};

console.log('%c[POI-SYNC TEST] Available commands:', 'background: #4A7C59; color: white; padding: 4px 8px; border-radius: 3px; font-weight: bold');
console.log('window.POISyncTest.status()                          — Check sync status');
console.log('window.POISyncTest.syncNearby(5)                     — Sync nearby POIs (5km)');
console.log('window.POISyncTest.syncPOI("poi-id")                 — Sync specific POI');
console.log('window.POISyncTest.getVerified("poi-id")             — Get verified POI data');
console.log('window.POISyncTest.getAllVerified()                  — Get all verified POIs');
console.log('window.POISyncTest.checkStatus("poi-id")             — Check POI verification status');
console.log('window.POISyncTest.checkNeedingVerification(5)       — Check POIs needing verification');
console.log('window.POISyncTest.testFullFlow("poi-id")            — Full flow test');
console.log('window.POISyncTest.clearAll()                        — Clear verified database');
console.log('window.POISyncTest.manualTest("name", lat, lng)      — Test with manual POI');
console.log('window.POISyncTest.mapQuality()                      — Check map quality (real vs fake POIs)');
