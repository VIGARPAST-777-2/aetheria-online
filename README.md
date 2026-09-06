# Oryndel: Crown of Embers

RPG de historia en pixel art. Explora el reino de Oryndel.

## Auth local (sin Supabase)

Registro e inicio de sesión funcionan **sin ninguna clave de Supabase**.
Cuentas y partidas se guardan en el servidor (`data/store.json`).

En Render no hace falta ninguna variable de Supabase. Solo:

```
PORT=10000
```

## Deploy

Docker en Render. Environment = Docker.

## Nota sobre persistencia en Render free

En el plan free de Render el disco se reinicia al redeployar.
Las cuentas se mantienen mientras el servicio esté en marcha.
Si quieres persistencia real más adelante, se puede volver a conectar Supabase o un disco persistente.
