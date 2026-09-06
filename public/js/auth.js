const SUPABASE_URL = 'https://eqvxurybiaroxkiwtodc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdnh1cnliaWFyb3hraXd0b2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODI4MTIsImV4cCI6MjEwNDI1ODgxMn0.UcTOxpCXKOeZwNTcV--lD7sy_aCa3iSbnz8lWfbqiuA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;

const authScreen = document.getElementById('auth-screen');
const charScreen = document.getElementById('char-screen');
const errorEl = document.getElementById('auth-error');
const charError = document.getElementById('char-error');

async function rateLimitCheck() {
  try {
    const res = await fetch('/api/auth-check', { method: 'POST' });
    if (res.status === 429) {
      const data = await res.json();
      errorEl.textContent = data.error || 'Demasiados intentos';
      return false;
    }
  } catch (_) {}
  return true;
}

document.getElementById('btn-login').onclick = async () => {
  errorEl.textContent = '';
  if (!(await rateLimitCheck())) return;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || password.length < 8) {
    errorEl.textContent = 'Email válido y contraseña de al menos 8 caracteres';
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    errorEl.textContent = error.message === 'Invalid login credentials'
      ? 'Email o contraseña incorrectos'
      : error.message;
    return;
  }
  currentUser = data.user;
  showCharScreen();
};

document.getElementById('btn-register').onclick = async () => {
  errorEl.textContent = '';
  if (!(await rateLimitCheck())) return;

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || password.length < 8) {
    errorEl.textContent = 'Email válido y contraseña de al menos 8 caracteres';
    return;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: email.split('@')[0] } }
  });

  if (error) {
    errorEl.textContent = error.message;
    return;
  }

  if (data.user && !data.session) {
    errorEl.textContent = 'Cuenta creada. Revisa tu email para confirmar (si está activado) o inicia sesión.';
    return;
  }

  currentUser = data.user;
  errorEl.textContent = 'Cuenta creada correctamente.';
  showCharScreen();
};

document.getElementById('btn-logout').onclick = async () => {
  await supabase.auth.signOut();
  currentUser = null;
  charScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
};

async function showCharScreen() {
  authScreen.classList.add('hidden');
  charScreen.classList.remove('hidden');
  await loadCharacters();
}

async function loadCharacters() {
  const { data, error } = await supabase
    .from('characters')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('updated_at', { ascending: false });

  const list = document.getElementById('char-list');
  list.innerHTML = '';

  if (error || !data || data.length === 0) {
    list.innerHTML = '<p style="color:#7a6a55">Aún no tienes partidas. ¡Crea tu héroe!</p>';
    return;
  }

  data.forEach(char => {
    const div = document.createElement('div');
    div.className = 'char-card';
    const progress = char.map_id === 'starting_island' ? 'Capítulo 1 - Willowbrook' : char.map_id;
    div.innerHTML = `
      <span><strong>${char.name}</strong> — ${char.class} Lv.${char.level}<br>
      <small style="color:#8a7a65">${progress}</small></span>
      <span style="color:#c4a35a">🪙 ${char.gold}</span>`;
    div.onclick = () => continueGame(char);
    list.appendChild(div);
  });
}

document.getElementById('btn-create-char').onclick = async () => {
  charError.textContent = '';
  const name = document.getElementById('char-name').value.trim();
  const cls = document.getElementById('char-class').value;

  if (!name || name.length < 3) {
    charError.textContent = 'El nombre debe tener al menos 3 caracteres';
    return;
  }

  const { data, error } = await supabase.from('characters').insert({
    user_id: currentUser.id,
    name,
    class: cls,
    level: 1,
    xp: 0,
    health: 100,
    max_health: 100,
    mana: 40,
    max_mana: 40,
    position_x: 320,
    position_y: 280,
    map_id: 'willowbrook',
    gold: 20,
    inventory: JSON.stringify([
      { id: 'wooden_sword', name: 'Espada de Madera', type: 'weapon', power: 5 },
      { id: 'herb', name: 'Hierba Curativa', type: 'consumable', heal: 30, qty: 3 }
    ]),
    equipment: JSON.stringify({ weapon: 'wooden_sword' }),
    stats: { str: 12, agi: 10, int: 8, vit: 11 }
  }).select().single();

  if (error) {
    charError.textContent = error.message.includes('unique') ? 'Ese nombre ya existe' : error.message;
    return;
  }

  continueGame(data);
};

function continueGame(char) {
  // Save selected character to sessionStorage and go to overworld
  sessionStorage.setItem('eldoria_char', JSON.stringify(char));
  sessionStorage.setItem('eldoria_user', currentUser.id);
  window.location.href = '/overworld.html';
}

// Auto login if session exists
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    showCharScreen();
  }
});
