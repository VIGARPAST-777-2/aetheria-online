require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://eqvxurybiaroxkiwtodc.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxdnh1cnliaWFyb3hraXd0b2RjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2ODI4MTIsImV4cCI6MjEwNDI1ODgxMn0.UcTOxpCXKOeZwNTcV--lD7sy_aCa3iSbnz8lWfbqiuA';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', game: 'Aetheria Online', persistent: true });
});

// Get online players on a map
app.get('/api/players/:mapId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('characters')
      .select('id, name, class, level, position_x, position_y, is_online')
      .eq('map_id', req.params.mapId)
      .eq('is_online', true);
    if (error) throw error;
    res.json(data || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// In-memory for realtime positions (persisted to DB periodically)
const players = new Map(); // socketId -> player data

io.on('connection', (socket) => {
  console.log('Player connected:', socket.id);

  socket.on('join', async (data) => {
    // data: { characterId, name, class, level, x, y, mapId, token }
    const player = {
      socketId: socket.id,
      characterId: data.characterId,
      name: data.name,
      class: data.class,
      level: data.level || 1,
      x: data.x || 100,
      y: data.y || 100,
      mapId: data.mapId || 'starting_island'
    };
    players.set(socket.id, player);
    socket.join(player.mapId);

    // Mark online in DB
    await supabase
      .from('characters')
      .update({ is_online: true, last_seen: new Date().toISOString() })
      .eq('id', data.characterId);

    // Notify others
    socket.to(player.mapId).emit('playerJoined', player);

    // Send existing players
    const existing = [];
    for (const [sid, p] of players) {
      if (sid !== socket.id && p.mapId === player.mapId) {
        existing.push(p);
      }
    }
    socket.emit('currentPlayers', existing);
  });

  socket.on('move', async (data) => {
    const player = players.get(socket.id);
    if (!player) return;
    player.x = data.x;
    player.y = data.y;
    players.set(socket.id, player);

    // Broadcast to map
    socket.to(player.mapId).emit('playerMoved', {
      characterId: player.characterId,
      x: data.x,
      y: data.y
    });

    // Persist every ~3s approx (throttle in client ideally)
    if (Math.random() < 0.15) {
      await supabase
        .from('characters')
        .update({
          position_x: data.x,
          position_y: data.y,
          last_seen: new Date().toISOString()
        })
        .eq('id', player.characterId);
    }
  });

  socket.on('chat', async (data) => {
    const player = players.get(socket.id);
    if (!player) return;

    const msg = {
      character_id: player.characterId,
      character_name: player.name,
      channel: data.channel || 'global',
      map_id: player.mapId,
      message: data.message.slice(0, 200)
    };

    // Save to DB
    await supabase.from('chat_messages').insert(msg);

    // Broadcast
    if (data.channel === 'map') {
      io.to(player.mapId).emit('chatMessage', { ...msg, created_at: new Date().toISOString() });
    } else {
      io.emit('chatMessage', { ...msg, created_at: new Date().toISOString() });
    }
  });

  socket.on('disconnect', async () => {
    const player = players.get(socket.id);
    if (player) {
      // Persist final position + offline
      await supabase
        .from('characters')
        .update({
          position_x: player.x,
          position_y: player.y,
          is_online: false,
          last_seen: new Date().toISOString()
        })
        .eq('id', player.characterId);

      socket.to(player.mapId).emit('playerLeft', { characterId: player.characterId });
      players.delete(socket.id);
    }
    console.log('Player disconnected:', socket.id);
  });
});

// Fallback to index.html for SPA-like
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Aetheria Online running on port ${PORT}`);
  console.log('Data persists in Supabase - safe to restart!');
});
