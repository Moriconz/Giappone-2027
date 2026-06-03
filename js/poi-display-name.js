// ============================================================================
// poi-display-name.js — getPoiDisplayName (transliterates Japanese names)
// Extracted from app-core.js. Deps (all window.*): CATS
// ============================================================================
(function () {
  'use strict';

  function getPoiDisplayName(p){
    const isPlaceholder = n => !n || typeof n !== 'string' || /^\s*(poi|unknown|unnamed|n\/a|no name)\s*$/i.test(n);
    const hasLatin = n => typeof n === 'string' && /[A-Za-z0-9]/.test(n);
    const isJapanese = n => typeof n === 'string' && /[\u3040-\u30ff\u4e00-\u9faf]/.test(n);
    const normalize = n => typeof n === 'string' ? n.trim() : '';

    const romajiMap = {
      // hiragana + katakana digraphs
      'きゃ':'kya','きゅ':'kyu','きょ':'kyo','ぎゃ':'gya','ぎゅ':'gyu','ぎょ':'gyo',
      'しゃ':'sha','しゅ':'shu','しょ':'sho','じゃ':'ja','じゅ':'ju','じょ':'jo',
      'ちゃ':'cha','ちゅ':'chu','ちょ':'cho','にゃ':'nya','にゅ':'nyu','にょ':'nyo',
      'ひゃ':'hya','ひゅ':'hyu','ひょ':'hyo','びゃ':'bya','びゅ':'byu','びょ':'byo',
      'ぴゃ':'pya','ぴゅ':'pyu','ぴょ':'pyo','みゃ':'mya','みゅ':'myu','みょ':'myo',
      'りゃ':'rya','りゅ':'ryu','りょ':'ryo','キャ':'kya','キュ':'kyu','キョ':'kyo',
      'ギャ':'gya','ギュ':'gyu','ギョ':'gyo','シャ':'sha','シュ':'shu','ショ':'sho',
      'ジャ':'ja','ジュ':'ju','ジョ':'jo','チャ':'cha','チュ':'chu','チョ':'cho',
      'ニャ':'nya','ニュ':'nyu','ニョ':'nyo','ヒャ':'hya','ヒュ':'hyu','ヒョ':'hyo',
      'ビャ':'bya','ビュ':'byu','ビョ':'byo','ピャ':'pya','ピュ':'pyu','ピョ':'pyo',
      'ミャ':'mya','ミュ':'myu','ミョ':'myo','リャ':'rya','リュ':'ryu','リョ':'ryo',
      // basic hiragana + katakana
      'あ':'a','い':'i','う':'u','え':'e','お':'o','ア':'a','イ':'i','ウ':'u','エ':'e','オ':'o',
      'か':'ka','き':'ki','く':'ku','け':'ke','こ':'ko','カ':'ka','キ':'ki','ク':'ku','ケ':'ke','コ':'ko',
      'さ':'sa','し':'shi','す':'su','せ':'se','そ':'so','サ':'sa','シ':'shi','ス':'su','セ':'se','ソ':'so',
      'た':'ta','ち':'chi','つ':'tsu','て':'te','と':'to','タ':'ta','チ':'chi','ツ':'tsu','テ':'te','ト':'to',
      'な':'na','に':'ni','ぬ':'nu','ね':'ne','の':'no','ナ':'na','ニ':'ni','ヌ':'nu','ネ':'ne','ノ':'no',
      'は':'ha','ひ':'hi','ふ':'fu','へ':'he','ほ':'ho','ハ':'ha','ヒ':'hi','フ':'fu','ヘ':'he','ホ':'ho',
      'ま':'ma','み':'mi','む':'mu','め':'me','も':'mo','マ':'ma','ミ':'mi','ム':'mu','メ':'me','モ':'mo',
      'や':'ya','ゆ':'yu','よ':'yo','ヤ':'ya','ユ':'yu','ヨ':'yo','ら':'ra','り':'ri','る':'ru','れ':'re','ろ':'ro',
      'ラ':'ra','リ':'ri','ル':'ru','レ':'re','ロ':'ro','わ':'wa','を':'o','ん':'n','ワ':'wa','ヲ':'o','ン':'n',
      'が':'ga','ぎ':'gi','ぐ':'gu','げ':'ge','ご':'go','ガ':'ga','ギ':'gi','グ':'gu','ゲ':'ge','ゴ':'go',
      'ざ':'za','じ':'ji','ず':'zu','ぜ':'ze','ぞ':'zo','ザ':'za','ジ':'ji','ズ':'zu','ゼ':'ze','ゾ':'zo',
      'だ':'da','ぢ':'ji','づ':'zu','で':'de','ど':'do','ダ':'da','ヂ':'ji','ヅ':'zu','デ':'de','ド':'do',
      'ば':'ba','び':'bi','ぶ':'bu','べ':'be','ぼ':'bo','バ':'ba','ビ':'bi','ブ':'bu','ベ':'be','ボ':'bo',
      'ぱ':'pa','ぴ':'pi','ぷ':'pu','ぺ':'pe','ぽ':'po','パ':'pa','ピ':'pi','プ':'pu','ペ':'pe','ポ':'po',
      'ぁ':'a','ぃ':'i','ぅ':'u','ぇ':'e','ぉ':'o','ァ':'a','ィ':'i','ゥ':'u','ェ':'e','ォ':'o',
      'ゃ':'ya','ゅ':'yu','ょ':'yo','ャ':'ya','ュ':'yu','ョ':'yo','っ':'','ッ':'','ー':'-'
    };

    const transliterateJapanese = str => {
      if (!str || typeof str !== 'string') return '';
      let s = str.trim();
      if (!isJapanese(s)) return s;
      let result = '';
      for (let i = 0; i < s.length; ) {
        const two = s.slice(i, i + 2);
        if (romajiMap[two]) {
          result += romajiMap[two];
          i += 2;
          continue;
        }
        const one = s[i];
        if (romajiMap[one]) {
          result += romajiMap[one];
          i += 1;
          continue;
        }
        if (/[A-Za-z0-9]/.test(one)) {
          result += one;
        }
        i += 1;
      }
      return result.replace(/[-\s]+/g, ' ').trim();
    };

    const translateCandidate = v => {
      if (!v || typeof v !== 'string') return null;
      const value = normalize(v);
      if (isPlaceholder(value)) return null;
      if (hasLatin(value)) return value;
      if (isJapanese(value)) {
        const romanized = transliterateJapanese(value);
        if (romanized) return romanized;
      }
      return value || null;
    };

    const candidates = [p.name_en, p.name, p.jp];
    for (const v of candidates) {
      const label = translateCandidate(v);
      if (label) return label;
    }
    if (p.cat) return window.CATS[p.cat]?.label || p.cat;
    if (p.city) return `Luogo a ${p.city}`;
    return 'Punto di interesse';
  }
  // Rendi globale per poi-handlers.js
  window.getPoiDisplayName = getPoiDisplayName;
})();
