const SUPABASE_URL = 'https://eqvxurybiaroxkiwtodc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdnh1cnliaWFyb3hraXd0b2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODI4MTIsImV4cCI6MjEwNDI1ODgxMn0.UcTOxpCXKOeZwNTcV--lD7sy_aCa3iSbnz8lWfbqiuA';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentCharacter = null;
let socket = null;
let game = null;

// Screens
const authScreen = document.getElementById('auth-screen');
const charScreen = document.getElementById('char-screen');
const gameScreen = document.getElementById('game-screen');

// Auth
document.getElementById('btn-login').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    document.getElementById('auth-error').textContent = error.message;
    return;
  }
  currentUser = data.user;
  showCharScreen();
};

document.getElementById('btn-register').onclick = async () => {
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  if (!email || password.length < 6) {
    document.getElementById('auth-error').textContent = 'Email válido y password mínimo 6 caracteres';
    return;
  }
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { username: email.split('@')[0] } }
  });
  if (error) {
    document.getElementById('auth-error').textContent = error.message;
    return;
  }
  currentUser = data.user;
  document.getElementById('auth-error').textContent = 'Cuenta creada! Ahora puedes entrar.';
};

document.getElementById('btn-guest').onclick = async () => {
  // Create anonymous session if possible, or just use local for demo
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) {
    // Fallback: create temp user feel
    document.getElementById('auth-error').textContent = 'Anon no habilitado. Regístrate rápido.';
    return;
  }
  currentUser = data.user;
  showCharScreen();
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
    .order('created_at', { ascending: true });

  const list = document.getElementById('char-list');
  list.innerHTML = '';
  if (error || !data || data.length === 0) {
    list.innerHTML = '<p style="color:#888">No tienes personajes aún.</p>';
    return;
  }
  data.forEach(char => {
    const div = document.createElement('div');
    div.className = 'char-card';
    div.innerHTML = `<span><strong>${char.name}</strong> — ${char.class} Lv.${char.level}</span><span>🪙 ${char.gold}</span>`;
    div.onclick = () => selectCharacter(char);
    list.appendChild(div);
  });
}

document.getElementById('btn-create-char').onclick = async () => {
  const name = document.getElementById('char-name').value.trim();
  const cls = document.getElementById('char-class').value;
  if (!name || name.length < 3) {
    document.getElementById('char-error').textContent = 'Nombre mínimo 3 caracteres';
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
    mana: 50,
    max_mana: 50,
    position_x: 160 + Math.random() * 80,
    position_y: 160 + Math.random() * 80,
    map_id: 'starting_island',
    gold: 50,
    inventory: [],
    equipment: {}
  }).select().single();

  if (error) {
    document.getElementById('char-error').textContent = error.message;
    return;
  }
  await loadCharacters();
  document.getElementById('char-name').value = '';
  document.getElementById('char-error').textContent = 'Personaje creado!';
};

function selectCharacter(char) {
  currentCharacter = char;
  charScreen.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  startGame();
}

function startGame() {
  document.getElementById('player-name').textContent = currentCharacter.name;
  document.getElementById('player-level').textContent = `Lv.${currentCharacter.level}`;
  document.getElementById('player-gold').textContent = `🪙 ${currentCharacter.gold}`;

  // Socket
  socket = io();
  socket.emit('join', {
    characterId: currentCharacter.id,
    name: currentCharacter.name,
    class: currentCharacter.class,
    level: currentCharacter.level,
    x: currentCharacter.position_x,
    y: currentCharacter.position_y,
    mapId: currentCharacter.map_id
  });

  // Chat
  const chatInput = document.getElementById('chat-input');
  chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && chatInput.value.trim()) {
      socket.emit('chat', { message: chatInput.value.trim(), channel: 'global' });
      chatInput.value = '';
    }
  });

  socket.on('chatMessage', (msg) => {
    const box = document.getElementById('chat-messages');
    const div = document.createElement('div');
    div.className = 'msg';
    div.innerHTML = `<span class="name">${msg.character_name}:</span> ${escapeHtml(msg.message)}`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  });

  // Phaser game
  const config = {
    type: Phaser.AUTO,
    width: window.innerWidth,
    height: window.innerHeight,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    pixelArt: true,
    physics: {
      default: 'arcade',
      arcade: { gravity: { y: 0 }, debug: false }
    },
    scene: {
      preload: preload,
      create: create,
      update: update
    }
  };

  game = new Phaser.Game(config);

  let playerSprite;
  let otherPlayers = {};
  let cursors;
  let wasd;
  let lastMoveTime = 0;

  function preload() {
    // Generate simple pixel textures
    const g = this.make.graphics({ x: 0, y: 0, add: false });

    // Grass tile
    g.fillStyle(0x2d5a27);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x3a7a32);
    g.fillRect(4, 4, 8, 8);
    g.fillRect(18, 14, 6, 6);
    g.generateTexture('grass', 32, 32);

    // Stone path
    g.clear();
    g.fillStyle(0x5a5a5a);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x7a7a7a);
    g.fillRect(2, 2, 28, 28);
    g.generateTexture('path', 32, 32);

    // Player (colored square with face)
    g.clear();
    g.fillStyle(0x4a90d9);
    g.fillRect(0, 0, 24, 24);
    g.fillStyle(0xffffff);
    g.fillRect(5, 6, 4, 4);
    g.fillRect(15, 6, 4, 4);
    g.fillStyle(0x222222);
    g.fillRect(8, 14, 8, 3);
    g.generateTexture('player', 24, 24);

    // Other player (different color)
    g.clear();
    g.fillStyle(0xd94a4a);
    g.fillRect(0, 0, 24, 24);
    g.fillStyle(0xffffff);
    g.fillRect(5, 6, 4, 4);
    g.fillRect(15, 6, 4, 4);
    g.fillStyle(0x222222);
    g.fillRect(8, 14, 8, 3);
    g.generateTexture('other', 24, 24);

    // Tree
    g.clear();
    g.fillStyle(0x4a3728);
    g.fillRect(12, 20, 8, 12);
    g.fillStyle(0x228b22);
    g.fillCircle(16, 14, 14);
    g.generateTexture('tree', 32, 32);

    g.destroy();
  }

  function create() {
    // Tilemap simple
    const mapW = 40;
    const mapH = 30;
    for (let y = 0; y < mapH; y++) {
      for (let x = 0; x < mapW; x++) {
        const key = (x > 15 && x < 25 && y > 10 && y < 20) ? 'path' : 'grass';
        this.add.image(x * 32 + 16, y * 32 + 16, key).setDepth(0);
      }
    }

    // Some trees
    const treePositions = [[5,5],[8,12],[30,8],[35,20],[3,25],[20,3],[12,28]];
    treePositions.forEach(([tx, ty]) => {
      this.add.image(tx * 32 + 16, ty * 32 + 16, 'tree').setDepth(2);
    });

    // Player
    playerSprite = this.physics.add.sprite(
      currentCharacter.position_x,
      currentCharacter.position_y,
      'player'
    );
    playerSprite.setCollideWorldBounds(true);
    playerSprite.setDepth(10);

    this.cameras.main.startFollow(playerSprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.5);
    this.cameras.main.setBounds(0, 0, mapW * 32, mapH * 32);
    this.physics.world.setBounds(0, 0, mapW * 32, mapH * 32);

    cursors = this.input.keyboard.createCursorKeys();
    wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });

    // Socket events for other players
    socket.on('currentPlayers', (list) => {
      list.forEach(p => addOtherPlayer(this, p));
    });
    socket.on('playerJoined', (p) => addOtherPlayer(this, p));
    socket.on('playerMoved', (data) => {
      if (otherPlayers[data.characterId]) {
        otherPlayers[data.characterId].x = data.x;
        otherPlayers[data.characterId].y = data.y;
      }
    });
    socket.on('playerLeft', (data) => {
      if (otherPlayers[data.characterId]) {
        otherPlayers[data.characterId].destroy();
        delete otherPlayers[data.characterId];
      }
    });
  }

  function addOtherPlayer(scene, p) {
    if (otherPlayers[p.characterId]) return;
    const sprite = scene.add.sprite(p.x, p.y, 'other');
    sprite.setDepth(9);
    // Name tag
    const label = scene.add.text(p.x, p.y - 18, p.name, {
      fontSize: '10px',
      fontFamily: 'Courier New',
      color: '#ffffff',
      backgroundColor: '#000000aa',
      padding: { x: 2, y: 1 }
    }).setOrigin(0.5).setDepth(11);
    sprite.label = label;
    otherPlayers[p.characterId] = sprite;
  }

  function update(time) {
    if (!playerSprite) return;

    const speed = 120;
    let vx = 0, vy = 0;
    if (cursors.left.isDown || wasd.left.isDown) vx = -speed;
    else if (cursors.right.isDown || wasd.right.isDown) vx = speed;
    if (cursors.up.isDown || wasd.up.isDown) vy = -speed;
    else if (cursors.down.isDown || wasd.down.isDown) vy = speed;

    playerSprite.setVelocity(vx, vy);

    // Update other labels
    Object.values(otherPlayers).forEach(s => {
      if (s.label) {
        s.label.x = s.x;
        s.label.y = s.y - 18;
      }
    });

    // Send move (throttled)
    if (time - lastMoveTime > 50 && (vx !== 0 || vy !== 0)) {
      lastMoveTime = time;
      socket.emit('move', { x: playerSprite.x, y: playerSprite.y });
    }
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Resize
  window.addEventListener('resize', () => {
    if (game) {
      game.scale.resize(window.innerWidth, window.innerHeight);
    }
  });
}

// Check existing session
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session) {
    currentUser = session.user;
    showCharScreen();
  }
});
