# Aetheria Online

**Pixel Art Top-Down MMO RPG** que puede triunfar.

## Idea del Juego

**Aetheria Online** es un MMO RPG de vista de pájaro (top-down) en pixel art ambientado en un mundo de islas flotantes mágicas llamadas **Aetheria**. Los jugadores son *Aether Walkers* que exploran islas, craftan artefactos antiguos, forman gremios, comercian en un mercado player-driven y combaten en arenas PvP o contra monstruos.

### Por qué puede triunfar:
- **Economía 100% player-driven**: mercado en tiempo real, crafting profundo con recetas descubribles.
- **Progresión no lineal**: sistema de skills + clases (Warrior, Mage, Ranger, Rogue) en vez de solo levels.
- **Social fuerte**: gremios, chat global/map/guild, housing personalizable (futuro).
- **Eventos dinámicos**: bosses mundiales, invasiones, temporadas.
- **Pixel art nostálgico** con animaciones fluidas e inspiración de Tibia + Stardew + classic MMOs.
- **Accesible**: browser-based, no necesita descarga pesada.

## Stack Técnico

- **Frontend**: Phaser 3 (pixel art engine) + vanilla JS
- **Backend**: Node.js + Express + Socket.io (mismo proceso)
- **Database**: Supabase (Postgres + Auth + Realtime) → **los datos NUNCA se borran** aunque se reinicie el servicio
- **Deploy**: Un solo Web Service en Render (frontend + backend juntos)

## Cómo funciona la persistencia

Todos los personajes, inventarios, oro, posiciones, chat y mercado se guardan en **Supabase**. El Web Service de Render es stateless: si se reinicia, los jugadores se reconectan y recuperan su progreso desde la DB.

## Deploy en Render (un solo Web Service)

1. Crea un **Web Service** en [Render](https://render.com)
2. Conecta este repo de GitHub
3. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     ```
     SUPABASE_URL=https://eqvxurybiaroxkiwtodc.supabase.co
     SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdnh1cnliaWFyb3hraXd0b2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODI4MTIsImV4cCI6MjEwNDI1ODgxMn0.UcTOxpCXKOeZwNTcV--lD7sy_aCa3iSbnz8lWfbqiuA
     PORT=10000
     ```
4. Deploy. Listo.

## Desarrollo local

```bash
npm install
cp .env.example .env   # rellena las keys
npm start
```

Abre http://localhost:3000

## Estructura

```
/
├── package.json
├── server.js          # Express + Socket.io + serve static
├── public/
│   ├── index.html
│   ├── css/style.css
│   ├── js/
│   │   ├── main.js       # Auth + UI
│   │   └── game.js       # Phaser scene
│   └── assets/         # Pixel art placeholders
├── .env.example
└── README.md
```

## Features del MVP

- [x] Auth con Supabase (email/password + guest)
- [x] Creación de personajes (4 clases)
- [x] Mapa top-down pixel art con tiles
- [x] Movimiento multiplayer en tiempo real (Socket.io)
- [x] Persistencia de posición, stats, oro e inventario
- [x] Chat global
- [x] Sistema de oro básico
- [ ] Crafting / Market (próximo)
- [ ] Combate PvE / PvP
- [ ] Gremios

Hecho con ❤️ para que Aetheria Online despegue.
