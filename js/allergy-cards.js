/**
 * Allergy Cards — Multi-language emergency cards (JA/EN/IT/ZH/KO)
 * No button here (integrated in renderSOSPanel in index.html)
 * Just provides openAllergyCard() function for other components
 */

const ALLERGY_CARDS_DATA = {
  ja: {
    title: 'セリアック病',
    intro: '私はセリアック病です。グルテン（小麦・大麦・ライ麦）を絶対に食べられません。',
    subtitle: 'このカード見せてください',
    questions: [
      '小麦は入っていますか？',
      '大麦は入っていますか？',
      'ライ麦は入っていますか？',
      '醤油は小麦で作られていますか？',
      'うどんや蕎麦は入っていますか？'
    ],
    forbidden: ['小麦', '大麦', 'ライ麦', '醤油（小麦含む）', 'うどん', 'パン', 'パスタ'],
    safe: ['米', 'そば（100%蕎麦粉）', '味噌', 'タンパク質'],
    flag: '🇯🇵'
  },
  en: {
    title: 'Celiac Disease',
    intro: 'I have celiac disease. I cannot eat gluten (wheat, barley, rye).',
    subtitle: 'Please show this card to the waiter',
    questions: [
      'Does this contain wheat?',
      'Does this contain barley?',
      'Does this contain rye?',
      'Is the soy sauce made with wheat?',
      'Are there noodles (udon/pasta) in this?'
    ],
    forbidden: ['wheat', 'barley', 'rye', 'soy sauce (wheat-based)', 'udon', 'bread', 'pasta'],
    safe: ['rice', 'buckwheat (100% pure)', 'miso', 'protein'],
    flag: '🇬🇧'
  },
  it: {
    title: 'Celiachia',
    intro: 'Ho la celiachia. Non posso mangiare glutine (grano, orzo, segale).',
    subtitle: 'Mostra questo cartoncino al cameriere',
    questions: [
      'Contiene grano?',
      'Contiene orzo?',
      'Contiene segale?',
      'La salsa di soia contiene grano?',
      'Ci sono paste o pane?'
    ],
    forbidden: ['grano', 'orzo', 'segale', 'salsa di soia (con grano)', 'pasta', 'pane', 'biscotti'],
    safe: ['riso', 'grano saraceno (100%)', 'miso', 'proteine'],
    flag: '🇮🇹'
  },
  zh: {
    title: '乳糜泻',
    intro: '我有乳糜泻。我不能吃含麸质的食物（小麦、大麦、黑麦）。',
    subtitle: '请把这张卡片给服务员看',
    questions: [
      '这里面有小麦吗？',
      '这里面有大麦吗？',
      '这里面有黑麦吗？',
      '酱油里有小麦吗？',
      '有面条或面包吗？'
    ],
    forbidden: ['小麦', '大麦', '黑麦', '含麸质酱油', '面条', '面包', '饼干'],
    safe: ['米', '纯荞麦', '味噌', '蛋白质'],
    flag: '🇨🇳'
  },
  ko: {
    title: '셀리악병',
    intro: '저는 셀리악병이 있습니다. 글루텐(밀, 보리, 호밀)을 먹을 수 없습니다.',
    subtitle: '이 카드를 웨이터에게 보여주세요',
    questions: [
      '밀이 들어있나요?',
      '보리가 들어있나요?',
      '호밀이 들어있나요?',
      '간장에 밀이 들어있나요?',
      '국수나 빵이 들어있나요?'
    ],
    forbidden: ['밀', '보리', '호밀', '글루텐 간장', '국수', '빵', '쿠키'],
    safe: ['쌀', '메밀(100%)', '된장', '단백질'],
    flag: '🇰🇷'
  }
};

/**
 * Open fullscreen allergy card with language selection
 */
function openAllergyCard(lang = null) {
  const modal = document.createElement('div');
  modal.id = 'allergy-modal';
  modal.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: #000;
    z-index: 99999;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 20px;
    overflow-y: auto;
  `;

  const langSelector = document.createElement('div');
  langSelector.style.cssText = `
    display: flex;
    gap: 12px;
    justify-content: center;
    flex-wrap: wrap;
    margin-bottom: 30px;
    width: 100%;
  `;

  const languages = ['ja', 'en', 'it', 'zh', 'ko'];
  languages.forEach(l => {
    const btn = document.createElement('button');
    btn.textContent = ALLERGY_CARDS_DATA[l].flag;
    btn.style.cssText = `
      font-size: 28px;
      padding: 12px 20px;
      border: 2px solid #fff;
      background: ${l === lang ? 'rgba(255,255,255,0.2)' : 'transparent'};
      color: #fff;
      border-radius: 50%;
      width: 60px;
      height: 60px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    `;
    btn.onmouseover = () => btn.style.background = 'rgba(255,255,255,0.1)';
    btn.onmouseout = () => btn.style.background = l === lang ? 'rgba(255,255,255,0.2)' : 'transparent';
    btn.onclick = () => renderCard(l);
    langSelector.appendChild(btn);
  });

  modal.appendChild(langSelector);

  const cardContainer = document.createElement('div');
  cardContainer.id = 'card-content';
  cardContainer.style.cssText = `width: 100%; max-width: 800px; text-align: center; color: #fff;`;
  modal.appendChild(cardContainer);

  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 18px;
    font-size: 24px;
    background: rgba(255,255,255,0.2);
    color: #fff;
    border: 1px solid #fff;
    border-radius: 50%;
    cursor: pointer;
    z-index: 99999;
  `;
  closeBtn.onclick = () => {
    modal.remove();
    window.speechSynthesis?.cancel();
  };
  modal.appendChild(closeBtn);

  document.body.appendChild(modal);

  function renderCard(selectedLang) {
    const data = ALLERGY_CARDS_DATA[selectedLang];
    const container = document.getElementById('card-content');
    if (!container) return;

    container.innerHTML = `
      <div style="margin-bottom: 40px;">
        <h1 style="font-size: 48px; margin: 0 0 20px 0; font-weight: bold;">${data.title}</h1>
        <p style="font-size: 32px; line-height: 1.6; margin: 0 0 30px 0;">${data.intro}</p>
      </div>
      <div style="background: rgba(255,255,255,0.05); padding: 30px; border-radius: 12px; margin-bottom: 30px;">
        <h2 style="font-size: 28px; margin: 0 0 20px 0; color: #4ade80;">✓ Safe Foods</h2>
        <p style="font-size: 22px; line-height: 1.8; margin: 0; color: #a0e7a0;">${data.safe.join(' • ')}</p>
      </div>
      <div style="background: rgba(239,68,68,0.1); padding: 30px; border-radius: 12px; margin-bottom: 30px; border: 2px solid #f87171;">
        <h2 style="font-size: 28px; margin: 0 0 20px 0; color: #f87171;">✕ Forbidden Foods</h2>
        <p style="font-size: 22px; line-height: 1.8; margin: 0; color: #fca5a5;">${data.forbidden.join(' • ')}</p>
      </div>
      <button id="tts-btn" style="padding: 16px 32px; font-size: 20px; background: #2563eb; color: #fff; border: none; border-radius: 8px; cursor: pointer; width: 100%; margin-top: 20px;">
        🔊 Audio (${ALLERGY_CARDS_DATA[selectedLang].flag})
      </button>
    `;

    const ttsBtn = document.getElementById('tts-btn');
    if (ttsBtn) {
      ttsBtn.onclick = () => {
        const synthesis = window.speechSynthesis;
        if (synthesis) {
          synthesis.cancel();
          const langMap = { ja: 'ja-JP', en: 'en-US', it: 'it-IT', zh: 'zh-CN', ko: 'ko-KR' };
          const u = new SpeechSynthesisUtterance(`${data.title}. ${data.intro}. Safe: ${data.safe.join(', ')}. Forbidden: ${data.forbidden.join(', ')}.`);
          u.lang = langMap[selectedLang];
          u.rate = 0.9;
          synthesis.speak(u);
        }
      };
    }
  }

  renderCard(lang || 'ja');
}

// Expose to global
window.openAllergyCard = openAllergyCard;
window.ALLERGY_CARDS_DATA = ALLERGY_CARDS_DATA;
