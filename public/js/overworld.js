const char = getCharacter();
if (!char) throw new Error('No character');

updateUI(char);

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight - 48,
  parent: 'game-container',
  backgroundColor: '#2d4a22',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player, cursors, wasd, interactKey;
let npcs = [];
let doors = [];
let canInteract = true;

function preload() {
  const g = this.make.graphics({ x: 0, y: 0, add: false });

  // Grass
  g.fillStyle(0x3a6b2f);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x4a8b3a);
  g.fillRect(3, 5, 6, 6);
  g.fillRect(18, 16, 5, 5);
  g.generateTexture('grass', 32, 32);

  // Path
  g.clear();
  g.fillStyle(0x8b7355);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0xa08b6b);
  g.fillRect(2, 2, 28, 28);
  g.generateTexture('path', 32, 32);

  // House base
  g.clear();
  g.fillStyle(0x6b4423);
  g.fillRect(0, 16, 64, 48);
  g.fillStyle(0x8b5a2b);
  g.fillRect(4, 20, 56, 40);
  g.fillStyle(0x4a3020);
  g.fillTriangle(0, 16, 32, 0, 64, 16);
  g.fillStyle(0x2a1a10);
  g.fillRect(24, 40, 16, 20); // door
  g.fillStyle(0xc4a35a);
  g.fillRect(10, 28, 10, 10); // window
  g.fillRect(44, 28, 10, 10);
  g.generateTexture('house', 64, 64);

  // Tree
  g.clear();
  g.fillStyle(0x4a3728);
  g.fillRect(14, 28, 10, 20);
  g.fillStyle(0x228b22);
  g.fillCircle(19, 20, 18);
  g.fillStyle(0x2e9b2e);
  g.fillCircle(12, 14, 10);
  g.fillCircle(26, 14, 10);
  g.generateTexture('tree', 38, 48);

  // Player
  g.clear();
  g.fillStyle(0x4a7ab5);
  g.fillRect(4, 8, 16, 20);
  g.fillStyle(0xe8c8a0);
  g.fillRect(6, 2, 12, 10);
  g.fillStyle(0x2a2a2a);
  g.fillRect(8, 5, 3, 3);
  g.fillRect(13, 5, 3, 3);
  g.generateTexture('player', 24, 32);

  // NPC Sage
  g.clear();
  g.fillStyle(0x6b5a8b);
  g.fillRect(4, 10, 16, 22);
  g.fillStyle(0xe8d0b0);
  g.fillRect(6, 2, 12, 12);
  g.fillStyle(0xddd);
  g.fillRect(4, 0, 16, 6); // hat
  g.generateTexture('sage', 24, 34);

  // NPC Villager
  g.clear();
  g.fillStyle(0x8b5a2b);
  g.fillRect(4, 10, 16, 22);
  g.fillStyle(0xe8c8a0);
  g.fillRect(6, 2, 12, 12);
  g.generateTexture('villager', 24, 34);

  // Shadow enemy (patrol)
  g.clear();
  g.fillStyle(0x2a1a2a);
  g.fillRect(2, 4, 20, 24);
  g.fillStyle(0x8b0000);
  g.fillRect(6, 8, 4, 4);
  g.fillRect(14, 8, 4, 4);
  g.generateTexture('shadow', 24, 32);

  // Ring item glow
  g.clear();
  g.fillStyle(0xc4a35a);
  g.fillCircle(8, 8, 7);
  g.fillStyle(0xffe4a0);
  g.fillCircle(8, 8, 3);
  g.generateTexture('ring', 16, 16);

  g.destroy();
}

function create() {
  const mapW = 50;
  const mapH = 38;

  // Tilemap
  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      const isPath = (x >= 22 && x <= 28) || (y >= 16 && y <= 20 && x >= 10 && x <= 40);
      this.add.image(x * 32 + 16, y * 32 + 16, isPath ? 'path' : 'grass').setDepth(0);
    }
  }

  // Trees around
  const trees = [[3,3],[6,8],[8,2],[42,5],[45,12],[4,30],[48,28],[10,34],[40,34],[2,18],[47,20]];
  trees.forEach(([tx, ty]) => {
    this.add.image(tx * 32 + 16, ty * 32 + 16, 'tree').setDepth(2);
  });

  // Houses
  const house1 = this.add.image(18 * 32, 12 * 32, 'house').setDepth(3);
  const house2 = this.add.image(32 * 32, 11 * 32, 'house').setDepth(3);
  const house3 = this.add.image(25 * 32, 26 * 32, 'house').setDepth(3);

  // Doors (invisible zones)
  doors.push({
    zone: this.add.zone(18 * 32, 12 * 32 + 28, 20, 16).setOrigin(0.5),
    target: 'house-elder',
    label: 'Casa del Anciano'
  });
  doors.push({
    zone: this.add.zone(32 * 32, 11 * 32 + 28, 20, 16).setOrigin(0.5),
    target: 'house-villager',
    label: 'Casa del Pueblo'
  });
  doors.push({
    zone: this.add.zone(25 * 32, 26 * 32 + 28, 20, 16).setOrigin(0.5),
    target: 'level-forest',
    label: 'Camino al Bosque Susurrante'
  });

  // Player
  player = this.physics.add.sprite(char.position_x || 400, char.position_y || 400, 'player');
  player.setCollideWorldBounds(true);
  player.setDepth(10);
  player.setSize(16, 12);
  player.setOffset(4, 18);

  this.cameras.main.startFollow(player, true, 0.12, 0.12);
  this.cameras.main.setZoom(1.8);
  this.cameras.main.setBounds(0, 0, mapW * 32, mapH * 32);
  this.physics.world.setBounds(0, 0, mapW * 32, mapH * 32);

  // NPCs
  const sage = this.physics.add.sprite(20 * 32, 15 * 32, 'sage');
  sage.setDepth(9);
  sage.setImmovable(true);
  sage.body.setSize(16, 12);
  npcs.push({
    sprite: sage,
    name: 'Anciano Eldrin',
    dialogue: [
      'Ah, joven aventurero... Siento una oscuridad creciente en el este.',
      'Hace poco encontré este anillo en el río. Brilla con una luz extraña...',
      'Lévalo al Bosque Susurrante. Allí encontrarás respuestas... o peligros.',
      'Ten cuidado. Las sombras ya se mueven entre los árboles.'
    ],
    onTalk: () => {
      // Give ring if not have it
      let inv = typeof char.inventory === 'string' ? JSON.parse(char.inventory) : (char.inventory || []);
      if (!inv.find(i => i.id === 'forgotten_ring')) {
        inv.push({ id: 'forgotten_ring', name: 'Anillo Olvidado', type: 'key', desc: 'Un anillo antiguo que emite un leve brillo' });
        char.inventory = inv;
        saveCharacterDB(char);
        showDialogue(['¡Has recibido el Anillo Olvidado!'], null);
      }
    }
  });

  const villager = this.physics.add.sprite(30 * 32, 18 * 32, 'villager');
  villager.setDepth(9);
  villager.setImmovable(true);
  npcs.push({
    sprite: villager,
    name: 'Mira la Granjera',
    dialogue: [
      'Los lobos del bosque se están acercando más de lo normal...',
      'Si vas al Bosque Susurrante, lleva hierbas curativas.',
      'Y si ves una sombra con ojos rojos... ¡corre!' 
    ]
  });

  // Shadow patrol enemy
  const shadow = this.physics.add.sprite(38 * 32, 22 * 32, 'shadow');
  shadow.setDepth(9);
  shadow.setVelocityX(40);
  shadow.patrolMin = 35 * 32;
  shadow.patrolMax = 44 * 32;
  npcs.push({
    sprite: shadow,
    name: 'Sombra Acechante',
    isEnemy: true,
    dialogue: ['¡Grrraaah!', 'La oscuridad te reclama...'],
    onTalk: () => {
      // Start combat / chase
      showDialogue(['¡La sombra te ataca!'], () => {
        // For now: simple damage + flee
        char.health = Math.max(1, char.health - 15);
        updateUI(char);
        saveCharacterDB(char);
        showDialogue(['Pierdes 15 de vida. La sombra se desvanece entre los árboles...']);
        shadow.setVisible(false);
        shadow.body.enable = false;
      });
    }
  });

  // Collisions with NPCs
  npcs.forEach(n => {
    this.physics.add.collider(player, n.sprite);
  });

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
  interactKey = this.input.keyboard.addKey('E');

  // First time intro
  if (!sessionStorage.getItem('intro_shown_' + char.id)) {
    sessionStorage.setItem('intro_shown_' + char.id, '1');
    this.time.delayedCall(600, () => {
      showDialogue([
        'Bienvenido a Willowbrook, una tranquila aldea en las tierras de Eldoria.',
        'Durante generaciones, la paz ha reinado aquí... pero algo está cambiando.',
        'Habla con el Anciano Eldrin. Él parece inquieto.',
        'Usa WASD o las flechas para moverte. Pulsa E para hablar o entrar en casas.'
      ]);
    });
  }
}

function update() {
  if (!player || !canInteract) return;

  // Dialogue blocks movement
  const box = document.getElementById('dialogue-box');
  if (box && box.classList.contains('visible')) {
    player.setVelocity(0);
    return;
  }

  const speed = 110;
  let vx = 0, vy = 0;
  if (cursors.left.isDown || wasd.left.isDown) vx = -speed;
  else if (cursors.right.isDown || wasd.right.isDown) vx = speed;
  if (cursors.up.isDown || wasd.up.isDown) vy = -speed;
  else if (cursors.down.isDown || wasd.down.isDown) vy = speed;

  player.setVelocity(vx, vy);

  // Save position occasionally
  if (vx !== 0 || vy !== 0) {
    char.position_x = Math.round(player.x);
    char.position_y = Math.round(player.y);
  }

  // Interact
  if (Phaser.Input.Keyboard.JustDown(interactKey)) {
    // Check NPCs
    for (const n of npcs) {
      if (!n.sprite.visible) continue;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, n.sprite.x, n.sprite.y);
      if (dist < 40) {
        showDialogue(n.dialogue, n.onTalk || null);
        return;
      }
    }
    // Check doors
    for (const d of doors) {
      const bounds = d.zone.getBounds();
      if (Phaser.Geom.Rectangle.Contains(bounds, player.x, player.y)) {
        enterArea(d.target, d.label);
        return;
      }
    }
  }

  // Enemy patrol
  npcs.forEach(n => {
    if (n.isEnemy && n.sprite.visible && n.sprite.body) {
      const s = n.sprite;
      if (s.x <= s.patrolMin) s.setVelocityX(45);
      if (s.x >= s.patrolMax) s.setVelocityX(-45);

      // Chase if close
      const dist = Phaser.Math.Distance.Between(player.x, player.y, s.x, s.y);
      if (dist < 90) {
        this.physics.moveToObject(s, player, 70);
      }
    }
  });
}

function enterArea(target, label) {
  canInteract = false;
  char.position_x = Math.round(player.x);
  char.position_y = Math.round(player.y);
  saveCharacterDB(char);

  if (target === 'level-forest') {
    showDialogue([`Entras en el ${label}...`], () => {
      window.location.href = '/level-forest.html';
    });
  } else if (target === 'house-elder') {
    showDialogue([
      'Entras en la casa del Anciano Eldrin.',
      'Hay libros antiguos, un fuego crepitante y un mapa de Eldoria en la mesa.',
      '(Por ahora solo puedes hablar con él fuera. Más adelante podrás explorar el interior en vista de plataformas.)'
    ], () => { canInteract = true; });
  } else {
    showDialogue([`Entras en ${label}.`, 'El interior aún se está preparando...'], () => { canInteract = true; });
  }
}

// Auto-save every 20s
setInterval(() => {
  if (char && player) {
    char.position_x = Math.round(player.x);
    char.position_y = Math.round(player.y);
    saveCharacterDB(char);
  }
}, 20000);

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight - 48);
});
