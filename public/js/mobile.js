/**
 * Mobile / PC detection + virtual controls
 * Prepares the game for future Play Store (Capacitor / TWA)
 */

const isTouchDevice = () => {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia('(pointer: coarse)').matches
  );
};

const isMobile = isTouchDevice();

// State of virtual buttons (shared with Phaser scenes)
window.mobileInput = {
  up: false,
  down: false,
  left: false,
  right: false,
  action: false,   // E / interact / attack
  jump: false,     // Space
  attack: false,   // Z
  menu: false
};

function createMobileControls(mode = 'overworld') {
  // mode: 'overworld' | 'platform'
  if (!isMobile) return;

  let container = document.getElementById('mobile-controls');
  if (!container) {
    container = document.createElement('div');
    container.id = 'mobile-controls';
    document.body.appendChild(container);
  }
  container.classList.add('visible');
  container.innerHTML = '';

  // D-Pad
  const dpad = document.createElement('div');
  dpad.className = 'dpad';
  dpad.innerHTML = `
    <div class="dpad-btn dpad-up" data-dir="up">▲</div>
    <div class="dpad-btn dpad-down" data-dir="down">▼</div>
    <div class="dpad-btn dpad-left" data-dir="left">◀</div>
    <div class="dpad-btn dpad-right" data-dir="right">▶</div>
  `;
  container.appendChild(dpad);

  // Action buttons
  const actions = document.createElement('div');
  actions.className = 'action-btns';

  if (mode === 'overworld') {
    actions.innerHTML = `
      <button class="action-btn" data-btn="action">E<br>Hablar</button>
      <button class="action-btn secondary" data-btn="menu">Menú</button>
    `;
  } else {
    // platformer
    actions.innerHTML = `
      <button class="action-btn" data-btn="jump">Saltar</button>
      <button class="action-btn" data-btn="attack">Atacar</button>
      <button class="action-btn secondary" data-btn="menu">Salir</button>
    `;
  }
  container.appendChild(actions);

  // Bind D-Pad
  dpad.querySelectorAll('.dpad-btn').forEach(btn => {
    const dir = btn.dataset.dir;

    const start = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.mobileInput[dir] = true;
      btn.classList.add('active');
    };
    const end = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.mobileInput[dir] = false;
      btn.classList.remove('active');
    };

    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', end, { passive: false });
    // mouse fallback for testing
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  });

  // Bind action buttons
  actions.querySelectorAll('.action-btn').forEach(btn => {
    const key = btn.dataset.btn;

    const start = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.mobileInput[key] = true;
      btn.classList.add('active');
    };
    const end = (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.mobileInput[key] = false;
      btn.classList.remove('active');
    };

    btn.addEventListener('touchstart', start, { passive: false });
    btn.addEventListener('touchend', end, { passive: false });
    btn.addEventListener('touchcancel', end, { passive: false });
    btn.addEventListener('mousedown', start);
    btn.addEventListener('mouseup', end);
    btn.addEventListener('mouseleave', end);
  });

  // Hide PC hint on mobile
  const hint = document.getElementById('controls-hint');
  if (hint) hint.style.display = 'none';
}

function destroyMobileControls() {
  const container = document.getElementById('mobile-controls');
  if (container) {
    container.classList.remove('visible');
    container.innerHTML = '';
  }
  // reset state
  Object.keys(window.mobileInput).forEach(k => window.mobileInput[k] = false);
}

// Helper used inside Phaser update()
function getInput() {
  // Returns unified input state (keyboard OR mobile)
  return window.mobileInput || {};
}

// Prevent page scroll / zoom on mobile while playing
if (isMobile) {
  document.addEventListener('touchmove', (e) => {
    if (e.target.closest('#mobile-controls') || e.target.closest('#game-container')) {
      e.preventDefault();
    }
  }, { passive: false });

  // Prevent double-tap zoom
  let lastTouch = 0;
  document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouch <= 300) e.preventDefault();
    lastTouch = now;
  }, { passive: false });
}
