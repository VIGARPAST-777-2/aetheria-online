# Eldoria: Shadows of the Forgotten Ring

**Pixel Art Story RPG** de fantasía medieval inspirado en *El Señor de los Anillos* + *Super Mario RPG / Paper Mario*.

## Concepto

- **Modo historia** (single player), no MMO.
- **Vista de pájaro** en el mapa del mundo (Willowbrook y alrededores).
- **Vista de plataformas 2D** (estilo Mario Bros) cuando entras en bosques, casas, castillos o mazmorras.
- Combate, poderes, power-ups, compañeros, enemigos que patrullan y persiguen.
- Historia larga (objetivo: longitud similar a Mario RPG).

## Capítulo 1 (ya jugable)

1. Llegas a la aldea **Willowbrook**.
2. Hablas con el **Anciano Eldrin** → recibes el **Anillo Olvidado**.
3. Entras en el **Bosque Susurrante** (nivel de plataformas).
4. Derrotas lobos y murciélagos sombra, recoges champiñones y hierbas.
5. Llegas al final y descubres la primera pista sobre el Monte Negro.

## Auth y seguridad

- **Obligatorio registrarse e iniciar sesión** (no hay modo invitado).
- Contraseña mínima 8 caracteres.
- Rate-limit básico de intentos de login en el servidor.
- Partidas guardadas en Supabase (persistentes).
- Recomendación: activa **Email Confirmation** en el dashboard de Supabase → Authentication → Providers.

## Deploy (Docker en Render)

1. New Web Service → este repo
2. Environment: **Docker**
3. Variables:
   ```
   SUPABASE_URL=https://eqvxurybiaroxkiwtodc.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdnh1cnliaWFyb3hraXd0b2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODI4MTIsImV4cCI6MjEwNDI1ODgxMn0.UcTOxpCXKOeZwNTcV--lD7sy_aCa3iSbnz8lWfbqiuA
   PORT=10000
   ```

## Controles

**Overworld (vista pájaro):**
- WASD / Flechas → mover
- E → hablar / entrar

**Niveles de plataformas:**
- WASD / Flechas → mover
- Espacio → saltar
- Z → atacar
- Esc → salir del nivel

## Estructura de archivos

```
public/
  index.html          ← Login / Registro / Selección de partida
  overworld.html      ← Mapa de Willowbrook (top-down)
  level-forest.html   ← Bosque Susurrante (plataformas)
  css/style.css
  js/
    auth.js
    shared.js
    overworld.js
    level-forest.js
```

## Próximos capítulos (roadmap)

- Casa del Anciano y otras casas en vista plataformas
- Primer compañero (un elfo arquero o un enano)
- Combate por turnos con action commands (estilo Mario RPG)
- Más power-ups y armas
- Camino hacia el Monte Negro
- Boss del primer arco

Hecho para crecer hasta una aventura larga y épica.
