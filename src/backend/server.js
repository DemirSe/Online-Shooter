const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const httpServer = createServer(app);

// Configure Socket.IO with all necessary options
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"],
    credentials: true,
    allowedHeaders: ["*"]
  },
  transports: ['websocket', 'polling'],
  allowEIO3: true,
  pingTimeout: 60000,
  pingInterval: 25000,
  path: '/socket.io'
});

const activeUsernames = new Set();
const gameLobbies = new Map(); // Stores active game lobbies

// Generate a random 6-digit lobby code
function generateLobbyCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Enable CORS for all routes
app.use((req, res, next) => {
  const allowedOrigins = ['http://test.demirse.com:8080', 'https://test.demirse.com:8080', 'https://yourdomain.com'];
  const origin = req.headers.origin;
  
  if (allowedOrigins.includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
  }
  
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', '*');
  res.header('Access-Control-Allow-Credentials', 'true');
  
  // Handle OPTIONS method
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Serve static files from the dist directory
app.use(express.static(path.join(__dirname, '../../dist')));

// Add a catch-all route to serve index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../../dist/index.html'));
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('setUsername', (username) => {
    console.log('Username attempt:', username);
    if (activeUsernames.has(username)) {
      console.log('Username taken:', username);
      socket.emit('usernameError', 'Username is already taken!');
    } else {
      console.log('Username set:', username);
      socket.username = username;
      activeUsernames.add(username);
      socket.emit('usernameSet', username);
      console.log(`User ${socket.id} set username to ${username}`);
      broadcastOnlinePlayers();
    }
  });

  // Create a new game lobby
  socket.on('createLobby', () => {
    if (!socket.username) {
      socket.emit('lobbyError', 'Please set a username first');
      return;
    }

    const lobbyCode = generateLobbyCode();
    gameLobbies.set(lobbyCode, {
      host: socket.username,
      players: [{ username: socket.username, ready: false }],
      status: 'waiting', // waiting, playing
      code: lobbyCode // Add code to the lobby object
    });

    socket.join(lobbyCode);
    socket.lobbyCode = lobbyCode;
    
    socket.emit('lobbyCreated', { 
      code: lobbyCode, 
      lobby: gameLobbies.get(lobbyCode)
    });
  });

  // Get list of available lobbies
  socket.on('getLobbies', () => {
    const lobbies = Array.from(gameLobbies.entries()).map(([code, lobby]) => ({
      code,
      host: lobby.host,
      playerCount: lobby.players.length,
      status: lobby.status
    }));
    socket.emit('lobbiesList', lobbies);
  });

  // Join an existing lobby
  socket.on('joinLobby', (lobbyCode) => {
    if (!socket.username) {
      socket.emit('lobbyError', 'Please set a username first');
      return;
    }

    const lobby = gameLobbies.get(lobbyCode);
    if (!lobby) {
      socket.emit('lobbyError', 'Lobby not found');
      return;
    }

    if (lobby.players.length >= 2) {
      socket.emit('lobbyError', 'Lobby is full');
      return;
    }

    lobby.players.push({ username: socket.username, ready: false });
    socket.join(lobbyCode);
    socket.lobbyCode = lobbyCode;

    // Notify all players in the lobby about the new player
    io.to(lobbyCode).emit('lobbyUpdate', lobby);
    broadcastLobbies();
  });

  // Player ready status update
  socket.on('playerReady', (isReady) => {
    if (!socket.lobbyCode) return;

    const lobby = gameLobbies.get(socket.lobbyCode);
    if (!lobby) return;

    const player = lobby.players.find(p => p.username === socket.username);
    if (player) {
      player.ready = isReady;

      // Check if all players are ready
      const allReady = lobby.players.every(p => p.ready);
      if (allReady && lobby.players.length === 2) {
        lobby.status = 'playing';
        io.to(socket.lobbyCode).emit('gameStart', lobby);
      } else {
        io.to(socket.lobbyCode).emit('lobbyUpdate', lobby);
      }
    }
  });

  // Handle player joining the game
  socket.on('playerJoinedGame', (playerData) => {
    if (!socket.lobbyCode) return;

    const lobby = gameLobbies.get(socket.lobbyCode);
    if (!lobby) return;

    // Update player position in the lobby
    const player = lobby.players.find(p => p.username === playerData.username);
    if (player) {
      player.x = playerData.x;
      player.y = playerData.y;
      player.inGame = true;

      // Notify other players about the new player position
      socket.to(socket.lobbyCode).emit('playerPosition', playerData);

      // Check if all players are in game
      const allInGame = lobby.players.every(p => p.inGame);
      if (allInGame) {
        io.to(socket.lobbyCode).emit('allPlayersJoined', lobby);
      }
    }
  });

  // Handle player movement
  socket.on('playerMoved', (playerData) => {
    if (!socket.lobbyCode) return;

    const lobby = gameLobbies.get(socket.lobbyCode);
    if (!lobby) return;

    // Update player position in the lobby
    const player = lobby.players.find(p => p.username === playerData.username);
    if (player) {
      // Only update if this is a newer movement update
      if (!player.lastMoveTimestamp || playerData.timestamp > player.lastMoveTimestamp) {
        player.x = playerData.x;
        player.y = playerData.y;
        player.velocityX = playerData.velocityX;
        player.velocityY = playerData.velocityY;
        player.lastMoveTimestamp = playerData.timestamp;

        // Broadcast player movement to other players in the same lobby
        socket.to(socket.lobbyCode).emit('playerMoved', playerData);
      }
    }
  });

  socket.on('disconnect', () => {
    if (socket.username) {
      activeUsernames.delete(socket.username);
      console.log(`Username ${socket.username} removed for disconnected socket ${socket.id}`);
      
      // Remove player from lobby if they're in one
      if (socket.lobbyCode) {
        const lobby = gameLobbies.get(socket.lobbyCode);
        if (lobby) {
          lobby.players = lobby.players.filter(p => p.username !== socket.username);
          
          // If lobby is empty, delete it
          if (lobby.players.length === 0) {
            gameLobbies.delete(socket.lobbyCode);
          } else {
            // If host left, assign new host
            if (lobby.host === socket.username) {
              lobby.host = lobby.players[0].username;
            }
            io.to(socket.lobbyCode).emit('lobbyUpdate', lobby);
          }
          broadcastLobbies();
        }
      }
      
      broadcastOnlinePlayers();
    }
    console.log('User disconnected:', socket.id);
  });
});

function broadcastOnlinePlayers() {
  io.emit('updateOnlinePlayers', Array.from(activeUsernames));
}

function broadcastLobbies() {
  const lobbies = Array.from(gameLobbies.entries()).map(([code, lobby]) => ({
    code,
    host: lobby.host,
    playerCount: lobby.players.length,
    status: lobby.status
  }));
  io.emit('lobbiesList', lobbies);
}

// Start the server
const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
}); 