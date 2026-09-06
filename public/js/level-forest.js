const char = getCharacter();
if (!char) throw new Error('No character');

updateUI(char);

const config = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight - 48,
  parent: 'game-container',
  backgroundColor: '#1a2a1a',
  pixelArt: true,
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 900 }, debug: false }
  },
  scene: { preload, create, update }
};

const game = new Phaser.Game(config);

let player, cursors, wasd, jumpKey, attackKey;
let platforms, enemies, powerups;
let canControl = true;
let facing = 1;
let invincible = false;

function preload() {
  const g = this.make.graphics({ x: 0, y: 0, add: false });

  // Ground
  g.fillStyle(0x3a5a2a);
  g.fillRect(0, 0, 32, 32);
  g.fillStyle(0x2a4a1a);
  g.fillRect(0, 0, 32, 8);
  g.generateTexture('ground', 32, 32);

  // Platform
  g.clear();
  g.fillStyle(0x5a4030);
  g.fillRect(0, 0, 48, 16);
  g.fillStyle(0x7a5a40);
  g.fillRect(2, 2, 44, 12);
  g.generateTexture('plat', 48, 16);

  // Player (side view)
  g.clear();
  g.fillStyle(0x4a7ab5);
  g.fillRect(4, 6, 16, 22);
  g.fillStyle(0xe8c8a0);
  g.fillRect(6, 0, 12, 10);
  g.fillStyle(0x2a2a2a);
  g.fillRect(9, 3, 3, 3);
  g.fillRect(14, 3, 3, 3);
  g.generateTexture('hero', 24, 32);

  // Wolf enemy
  g.clear();
  g.fillStyle(0x4a4a4a);
  g.fillRect(0, 8, 28, 16);
  g.fillStyle(0x3a3a3a);
  g.fillRect(20, 4, 12, 12); // head
  g.fillStyle(0x8b0000);
  g.fillRect(26, 8, 3, 3);
  g.generateTexture('wolf', 32, 28);

  // Shadow bat
  g.clear();
  g.fillStyle(0x2a1a2a);
  g.fillTriangle(0, 12, 16, 0, 16, 24);
  g.fillTriangle(16, 0, 32, 12, 16, 24);
  g.fillStyle(0x8b0000);
  g.fillCircle(16, 12, 3);
  g.generateTexture('bat', 32, 24);

  // Mushroom powerup
  g.clear();
  g.fillStyle(0xc45c5c);
  g.fillCircle(10, 8, 9);
  g.fillStyle(0xe8d0a0);
  g.fillRect(6, 12, 8, 10);
  g.generateTexture('mushroom', 20, 24);

  // Herb
  g.clear();
  g.fillStyle(0x3a8b3a);
  g.fillRect(6, 4, 4, 16);
  g.fillStyle(0x5aba5a);
  g.fillCircle(8, 4, 6);
  g.generateTexture('herb', 16, 22);

  // Exit portal
  g.clear();
  g.fillStyle(0x4a3a8b);
  g.fillRect(0, 0, 32, 48);
  g.fillStyle(0x7a6abb);
  g.fillRect(4, 4, 24, 40);
  g.generateTexture('portal', 32, 48);

  g.destroy();
}

function create() {
  const w = 2400; // long level

  // Ground
  platforms = this.physics.add.staticGroup();
  for (let x = 0; x < w; x += 32) {
    platforms.create(x + 16, config.height - 16, 'ground');
  }

  // Floating platforms
  const plats = [
    [200, 380], [320, 320], [480, 280], [640, 340],
    [800, 260], [960, 300], [1120, 240], [1300, 320],
    [1480, 280], [1650, 360], [1800, 300], [2000, 250]
  ];
  plats.forEach(([x, y]) => platforms.create(x, y, 'plat'));

  // Player
  player = this.physics.add.sprite(80, config.height - 80, 'hero');
  player.setCollideWorldBounds(true);
  player.setBounce(0.05);
  player.setDepth(10);
  player.body.setSize(14, 26);
  player.body.setOffset(5, 4);

  this.physics.add.collider(player, platforms);

  this.cameras.main.startFollow(player, true, 0.1, 0.1);
  this.cameras.main.setBounds(0, 0, w, config.height);
  this.physics.world.setBounds(0, 0, w, config.height);

  // Enemies
  enemies = this.physics.add.group();

  // Wolves (patrol ground)
  const wolfPositions = [350, 700, 1100, 1550, 1900];
  wolfPositions.forEach(x => {
    const wolf = enemies.create(x, config.height - 60, 'wolf');
    wolf.setCollideWorldBounds(true);
    wolf.setBounce(0.1);
    wolf.setVelocityX(60);
    wolf.patrolMin = x - 80;
    wolf.patrolMax = x + 120;
    wolf.hp = 30;
    wolf.damage = 12;
    wolf.type = 'wolf';
  });

  // Bats (fly)
  const batPositions = [[500, 200], [900, 180], [1400, 160], [1750, 200]];
  batPositions.forEach(([x, y]) => {
    const bat = enemies.create(x, y, 'bat');
    bat.body.setAllowGravity(false);
    bat.setVelocityX(40);
    bat.hp = 15;
    bat.damage = 8;
    bat.type = 'bat';
    bat.startY = y;
  });

  this.physics.add.collider(enemies, platforms);

  // Power-ups
  powerups = this.physics.add.group();
  const mush = powerups.create(600, 200, 'mushroom');
  mush.body.setAllowGravity(false);
  mush.type = 'mushroom';

  const herb1 = powerups.create(1000, config.height - 80, 'herb');
  herb1.type = 'herb';
  const herb2 = powerups.create(1600, 220, 'herb');
  herb2.body.setAllowGravity(false);
  herb2.type = 'herb';

  this.physics.add.overlap(player, powerups, collectPowerup, null, this);
  this.physics.add.overlap(player, enemies, hitEnemy, null, this);

  // Exit portal
  const portal = this.physics.add.staticImage(w - 60, config.height - 80, 'portal');
  this.physics.add.overlap(player, portal, () => {
    if (!canControl) return;
    canControl = false;
    showDialogue([
      '¡Has atravesado el Bosque Susurrante!',
      'Al final del camino encuentras una piedra antigua con runas...',
      '"Cuando el anillo brille en la oscuridad, el camino al Monte Negro se revelará."',
      'Vuelves a Willowbrook con nuevas pistas.'
    ], () => {
      char.map_id = 'willowbrook';
      char.xp = (char.xp || 0) + 50;
      char.gold = (char.gold || 0) + 30;
      if (char.xp >= 100) {
        char.level = (char.level || 1) + 1;
        char.xp = 0;
        char.max_health += 20;
        char.health = char.max_health;
        showDialogue([`¡Has subido al nivel ${char.level}!`]);
      }
      saveCharacterDB(char);
      window.location.href = '/overworld.html';
    });
  });

  cursors = this.input.keyboard.createCursorKeys();
  wasd = this.input.keyboard.addKeys({ up: 'W', down: 'S', left: 'A', right: 'D' });
  jumpKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  attackKey = this.input.keyboard.addKey('Z');

  this.input.keyboard.on('keydown-ESC', () => {
    showDialogue(['¿Salir del bosque y volver a Willowbrook?'], () => {
      window.location.href = '/overworld.html';
    });
  });

  showDialogue([
    'Has entrado en el Bosque Susurrante.',
    'Los árboles parecen observarte... y algo se mueve entre las sombras.',
    'Derrota a los enemigos, recoge objetos y llega al final del camino.',
    'Controles: moverte con flechas/WASD, Espacio para saltar, Z para atacar.'
  ]);
}

function update() {
  if (!player || !canControl) {
    if (player) player.setVelocityX(0);
    return;
  }

  const box = document.getElementById('dialogue-box');
  if (box && box.classList.contains('visible')) {
    player.setVelocityX(0);
    return;
  }

  const speed = 160;
  if (cursors.left.isDown || wasd.left.isDown) {
    player.setVelocityX(-speed);
    facing = -1;
    player.setFlipX(true);
  } else if (cursors.right.isDown || wasd.right.isDown) {
    player.setVelocityX(speed);
    facing = 1;
    player.setFlipX(false);
  } else {
    player.setVelocityX(0);
  }

  if ((cursors.up.isDown || wasd.up.isDown || jumpKey.isDown) && player.body.blocked.down) {
    player.setVelocityY(-420);
  }

  // Simple attack (Z)
  if (Phaser.Input.Keyboard.JustDown(attackKey)) {
    // Hit nearby enemies
    enemies.getChildren().forEach(e => {
      if (!e.active) return;
      const dist = Phaser.Math.Distance.Between(player.x, player.y, e.x, e.y);
      if (dist < 45) {
        e.hp -= 15;
        e.setTint(0xff0000);
        this.time.delayedCall(100, () => e.clearTint());
        e.setVelocityX(facing * 120);
        if (e.hp <= 0) {
          e.destroy();
          char.xp = (char.xp || 0) + 10;
          char.gold = (char.gold || 0) + 5;
          updateUI(char);
        }
      }
    });
  }

  // Enemy AI
  enemies.getChildren().forEach(e => {
    if (!e.active) return;
    if (e.type === 'wolf') {
      if (e.x <= e.patrolMin) e.setVelocityX(60);
      if (e.x >= e.patrolMax) e.setVelocityX(-60);
      // Chase if close
      if (Math.abs(e.x - player.x) < 120 && Math.abs(e.y - player.y) < 40) {
        e.setVelocityX(player.x > e.x ? 90 : -90);
      }
    }
    if (e.type === 'bat') {
      e.y = e.startY + Math.sin(this.time.now / 400) * 30;
      if (e.x < 50 || e.x > 2350) e.setVelocityX(-e.body.velocity.x);
    }
  });
}

function collectPowerup(player, item) {
  if (item.type === 'mushroom') {
    char.max_health += 25;
    char.health = char.max_health;
    showDialogue(['¡Champiñón de Poder! Vida máxima +25']);
  } else if (item.type === 'herb') {
    char.health = Math.min(char.max_health, char.health + 40);
    showDialogue(['Hierba Curativa. +40 HP']);
  }
  updateUI(char);
  saveCharacterDB(char);
  item.destroy();
}

function hitEnemy(player, enemy) {
  if (invincible || !enemy.active) return;
  invincible = true;
  char.health = Math.max(0, char.health - (enemy.damage || 10));
  updateUI(char);
  saveCharacterDB(char);

  player.setTint(0xff0000);
  player.setVelocityY(-200);
  player.setVelocityX(facing * -150);

  this.time.delayedCall(800, () => {
    player.clearTint();
    invincible = false;
  });

  if (char.health <= 0) {
    canControl = false;
    showDialogue(['Has caído... Pero la historia no termina aquí.', 'Vuelves a Willowbrook herido.'], () => {
      char.health = Math.floor(char.max_health * 0.3);
      saveCharacterDB(char);
      window.location.href = '/overworld.html';
    });
  }
}

window.addEventListener('resize', () => {
  game.scale.resize(window.innerWidth, window.innerHeight - 48);
});
