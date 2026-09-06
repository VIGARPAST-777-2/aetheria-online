let supabase = null;
let currentUser = null;
let currentSession = null;

const authScreen = document.getElementById('auth-screen');
const charScreen = document.getElementById('char-screen');
const errorEl = document.getElementById('auth-error');
const charError = document.getElementById('char-error');

async function initSupabase() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();
    supabase = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  } catch {
    // fallback
    supabase = window.supabase.createClient(
      'https://eqvxurybiaroxkiwtodc.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdnh1cnliaWFyb3hraXd0b2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODI4MTIsImV4cCI6MjEwNDI1ODgxMn0.UcTOxpCXKOeZwNTcV--lD7sy_aCa3iSbnz8lWfbqiuA'
    );
  }
}

function setSession(session) {
  currentSession = session;
  if (session?.access_token) {
    supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token
    });
  }
}

document.getElementById('btn-login').onclick = async () => {
  errorEl.textContent = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || password.length < 8) {
    errorEl.textContent = 'Email válido y contraseña de al menos 8 caracteres';
    return;
  }

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Error al iniciar sesión';
      return;
    }
    currentUser = data.user;
    setSession(data.session);
    showCharScreen();
  } catch (err) {
    errorEl.textContent = 'No se pudo conectar con el servidor';
  }
};

document.getElementById('btn-register').onclick = async () => {
  errorEl.textContent = '';
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || password.length < 8) {
    errorEl.textContent = 'Email válido y contraseña de al menos 8 caracteres';
    return;
  }

  try {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) {
      errorEl.textContent = data.error || 'Error al crear la cuenta';
      return;
    }

    if (data.session) {
      currentUser = data.user;
      setSession(data.session);
      errorEl.textContent = '';
      showCharScreen();
    } else {
      errorEl.textContent = data.message || 'Cuenta creada. Ahora inicia sesión.';
    }
  } catch (err) {
    errorEl.textContent = 'No se pudo conectar con el servidor';
  }
};

document.getElementById('btn-logout').onclick = async () => {
  if (supabase) await supabase.auth.signOut();
  currentUser = null;
  currentSession = null;
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
    const place = char.map_id === 'willowbrook' || char.map_id === 'valle_bruma'
      ? 'Valle de Bruma'
      : (char.map_id || 'Oryndel');
    div.innerHTML = `
      <span><strong>${char.name}</strong> — ${char.class} Lv.${char.level}<br>
      <small style="color:#8a7a65">${place}</small></span>
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
    map_id: 'valle_bruma',
    gold: 20,
    inventory: [
      { id: 'iron_blade', name: 'Hoja de Hierro Viejo', type: 'weapon', power: 6 },
      { id: 'ember_herb', name: 'Hierba de Brasas', type: 'consumable', heal: 35, qty: 3 }
    ],
    equipment: { weapon: 'iron_blade' },
    stats: { str: 12, agi: 10, int: 8, vit: 11 }
  }).select().single();

  if (error) {
    charError.textContent = error.message.includes('unique') ? 'Ese nombre ya existe' : error.message;
    return;
  }

  continueGame(data);
};

function continueGame(char) {
  sessionStorage.setItem('oryndel_char', JSON.stringify(char));
  sessionStorage.setItem('oryndel_user', currentUser.id);
  if (currentSession) {
    sessionStorage.setItem('oryndel_session', JSON.stringify({
      access_token: currentSession.access_token,
      refresh_token: currentSession.refresh_token
    }));
  }
  window.location.href = '/overworld.html';
}

(async () => {
  await initSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    currentUser = session.user;
    currentSession = session;
    showCharScreen();
  }
})();
