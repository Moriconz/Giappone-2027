/**
 * GF Safety Schema & Helpers
 * Core value: detail per POI gluten-free celiaco
 */

// Safety levels: 🟢🟡🟠🔴
const GF_SAFETY_LEVELS = {
  DEDICATED: {
    emoji: '🟢',
    label: 'Dedicato (solo GF)',
    risk: 'minimo',
    description: 'Ristorante dedicato gluten-free, zero contaminazione'
  },
  KITCHEN: {
    emoji: '🟡',
    label: 'Cucina dedicata',
    risk: 'basso',
    description: 'Menu GF + aree cucina separate'
  },
  CONTAMINATION: {
    emoji: '🟠',
    label: 'Contaminazione possibile',
    risk: 'medio',
    description: 'Menu GF ma attenzione cross-contamination'
  },
  ASK: {
    emoji: '🔴',
    label: 'Chiedere al ristorante',
    risk: 'alto',
    description: 'Menu non chiaro, verification necessaria'
  }
};

// Frasi giapponesi essenziali + pronuncia + TTS
const GF_PHRASES_JP = {
  greeting: {
    jp: 'グルテンフリーのメニューはありますか？',
    romaji: 'Guruten-furī no menyū wa arimasu ka?',
    en: 'Do you have a gluten-free menu?',
    audio: null // lazy-load Web Speech
  },
  soy_sauce: {
    jp: '醤油は小麦不使用ですか？',
    romaji: 'Shōyu wa komugi fushiyō desu ka?',
    en: 'Is soy sauce wheat-free?',
    audio: null
  },
  dashi: {
    jp: '出汁は小麦を含みますか？',
    romaji: 'Dashi wa komugi wo fukumimasu ka?',
    en: 'Does broth contain wheat?',
    audio: null
  },
  cross_contamination: {
    jp: '調理時に麦は接触しますか？',
    romaji: 'Chōri-ji ni mugi wa sesshoku shimasu ka?',
    en: 'Will wheat touch food during cooking?',
    audio: null
  },
  emergency: {
    jp: '私はセリアック病です。小麦を食べることができません。医者を呼んでください。',
    romaji: 'Watashi wa seriakku byō desu. Komugi wo taberu koto ga dekimasen. Isha wo yonde kudasai.',
    en: 'I have celiac disease. I cannot eat wheat. Please call a doctor.',
    audio: null
  }
};

// Allergie comorbide comuni
const ALLERGENS = [
  { id: 'gluten', label: '🌾 Glutine', icon: '🌾' },
  { id: 'soy', label: '🫘 Soia', icon: '🫘' },
  { id: 'dairy', label: '🥛 Latticini', icon: '🥛' },
  { id: 'eggs', label: '🥚 Uova', icon: '🥚' },
  { id: 'shellfish', label: '🦐 Crostacei', icon: '🦐' },
  { id: 'tree_nuts', label: '🌰 Frutta secca', icon: '🌰' },
  { id: 'peanuts', label: '🥜 Arachidi', icon: '🥜' },
  { id: 'sesame', label: '🌱 Sesamo', icon: '🌱' }
];

// Verifica sources
const VERIFICATION_SOURCES = [
  { id: 'user', label: '👤 Utente', color: '#FF6B35' },
  { id: 'team', label: '👥 Team', color: '#FF8C42' },
  { id: 'restaurant', label: '🏪 Ristorante', color: '#FFA500' },
  { id: 'coeliac_org', label: '🏛️ Coeliac Japan Org', color: '#FFB81C' },
  { id: 'google_verified', label: '✓ Google Verified', color: '#4285F4' }
];

/**
 * POI GF Enhanced Schema
 * Extend existing POI con dati sicurezza celiaco
 */
class GFSafetyPOI {
  constructor(basePOI) {
    this.id = basePOI.id;
    this.name = basePOI.name;
    this.location = basePOI.location;

    // GF-specific fields
    this.safetyLevel = 'ASK'; // default conservative
    this.verificationSource = 'user';
    this.verificationDate = new Date().toISOString();
    this.verificationExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(); // 1 year

    // Menu details
    this.hasGFMenu = false;
    this.menuUrl = null;
    this.menuPhotoUrl = null;

    // Allergens handled
    this.allergensFree = ['gluten']; // at minimum

    // Safety notes
    this.notes = '';
    this.warnings = []; // ['cross-contamination', 'sauce-check', ...]

    // Contact info
    this.phone = '';
    this.email = '';
    this.website = '';

    // Operating hours
    this.hours = {}; // { monday: '11:00-22:00', ... }
    this.closedDays = []; // Mondays common in JP
  }

  /**
   * UI Badge: [emoji] safety level + days since verification
   */
  getBadge() {
    const level = GF_SAFETY_LEVELS[this.safetyLevel];
    const daysSince = Math.floor(
      (Date.now() - new Date(this.verificationDate).getTime()) / (1000 * 60 * 60 * 24)
    );
    const warning = daysSince > 365 ? ' ⚠️ verificare' : '';
    return `${level.emoji} ${level.label} (${daysSince}d)${warning}`;
  }

  /**
   * Risk score 0-100 (higher = more risky)
   */
  getRiskScore() {
    const levelScore = {
      DEDICATED: 0,
      KITCHEN: 20,
      CONTAMINATION: 50,
      ASK: 100
    };
    const ageScore = Math.min(50, Math.floor(
      (Date.now() - new Date(this.verificationDate).getTime()) / (365 * 24 * 60 * 60 * 1000) * 50
    ));
    return Math.round((levelScore[this.safetyLevel] + ageScore) / 2);
  }

  /**
   * Export tessera medica giapponese per mostrare al cameriere
   */
  getEmergencyCard() {
    return {
      title: 'セリアック病 (Celiac)',
      subtitle: 'Medical Emergency Card',
      lines: [
        '患者: ' + (window.userProfile?.name || 'Guest'),
        '診断: セリアック病（小麦/大麦/ライ麦アレルギー）',
        '🚫 グルテン不可',
        '🚫 醤油（小麦使用）不可',
        '🚫 出汁（小麦含む）不可',
        '',
        '医者を呼んでください → 119',
        'Call doctor immediately → 119'
      ]
    };
  }
}

/**
 * TTS per frasi giapponesi (offline Web Speech API)
 */
class GFPhraseTTS {
  static speak(phraseKey, rate = 0.9) {
    const phrase = GF_PHRASES_JP[phraseKey];
    if (!phrase) return;

    const utterance = new SpeechSynthesisUtterance(phrase.jp);
    utterance.lang = 'ja-JP';
    utterance.rate = rate;

    // Fallback voice se disponibile
    const voices = speechSynthesis.getVoices();
    const jpVoice = voices.find(v => v.lang.includes('ja'));
    if (jpVoice) utterance.voice = jpVoice;

    speechSynthesis.speak(utterance);
  }

  static getSpeakableContent(phraseKey) {
    const phrase = GF_PHRASES_JP[phraseKey];
    return phrase ? { jp: phrase.jp, romaji: phrase.romaji, en: phrase.en } : null;
  }
}

/**
 * Helper: Filter POI by safety level + risk score
 */
function filterGFPOIsBySafety(poiList, minRiskScore = 0, maxRiskScore = 100) {
  return poiList
    .map(poi => new GFSafetyPOI(poi))
    .filter(poi => {
      const score = poi.getRiskScore();
      return score >= minRiskScore && score <= maxRiskScore;
    })
    .sort((a, b) => a.getRiskScore() - b.getRiskScore());
}

/**
 * Export per uso moduli
 */
export {
  GF_SAFETY_LEVELS,
  GF_PHRASES_JP,
  ALLERGENS,
  VERIFICATION_SOURCES,
  GFSafetyPOI,
  GFPhraseTTS,
  filterGFPOIsBySafety
};
