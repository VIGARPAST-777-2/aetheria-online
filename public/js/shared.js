const SUPABASE_URL = 'https://eqvxurybiaroxkiwtodc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdnh1cnliaWFyb3hraXd0b2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODI4MTIsImV4cCI6MjEwNDI1ODgxMn0.UcTOxpCXKOeZwNTcV--lD7sy_aCa3iSbnz8lWfbqiuA';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Restaurar sesión si existe
(async () => {
  const raw = sessionStorage.getItem('oryndel_session');
  if (raw) {
    try {
      const s = JSON.parse(raw);
      await supabaseClient.auth.setSession(s);
    } catch (_) {}
  }
})();

function getCharacter() {
  const raw = sessionStorage.getItem('oryndel_char') || sessionStorage.getItem('eldoria_char');
  if (!raw) {
    window.location.href = '/';
    return null;
  }
  return JSON.parse(raw);
}

function saveCharacterLocal(char) {
  sessionStorage.setItem('oryndel_char', JSON.stringify(char));
}

async function saveCharacterDB(char) {
  saveCharacterLocal(char);
  const payload = {
    position_x: char.position_x,
    position_y: char.position_y,
    map_id: char.map_id,
    health: char.health,
    mana: char.mana,
    gold: char.gold,
    level: char.level,
    xp: char.xp,
    inventory: typeof char.inventory === 'string' ? JSON.parse(char.inventory) : (char.inventory || []),
    equipment: typeof char.equipment === 'string' ? JSON.parse(char.equipment) : (char.equipment || {}),
    updated_at: new Date().toISOString()
  };
  await supabaseClient.from('characters').update(payload).eq('id', char.id);
}

function updateUI(char) {
  const nameEl = document.getElementById('ui-name');
  const levelEl = document.getElementById('ui-level');
  const hpEl = document.getElementById('ui-hp');
  const goldEl = document.getElementById('ui-gold');
  if (nameEl) nameEl.textContent = char.name;
  if (levelEl) levelEl.textContent = `Lv.${char.level}`;
  if (hpEl) hpEl.textContent = `HP ${char.health}/${char.max_health}`;
  if (goldEl) goldEl.textContent = `🪙 ${char.gold}`;
}

let dialogueQueue = [];
let dialogueCallback = null;

function showDialogue(lines, onComplete) {
  dialogueQueue = Array.isArray(lines) ? [...lines] : [lines];
  dialogueCallback = onComplete || null;
  const box = document.getElementById('dialogue-box');
  const text = document.getElementById('dialogue-text');
  if (!box || !text) return;
  box.classList.add('visible');
  text.textContent = dialogueQueue.shift();
}

function advanceDialogue() {
  const box = document.getElementById('dialogue-box');
  const text = document.getElementById('dialogue-text');
  if (!box || !box.classList.contains('visible')) return false;

  if (dialogueQueue.length > 0) {
    text.textContent = dialogueQueue.shift();
    return true;
  }
  box.classList.remove('visible');
  if (dialogueCallback) {
    const cb = dialogueCallback;
    dialogueCallback = null;
    cb();
  }
  return true;
}

document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' || e.code === 'Enter') {
    if (advanceDialogue()) e.preventDefault();
  }
});

document.getElementById('dialogue-box')?.addEventListener('click', () => advanceDialogue());
