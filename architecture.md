# Project Architecture

## Overview

This project is designed as a basic game to offer a fun and interactive experience. It leverages modern technologies for a clear separation between the frontend and backend, focusing on real-time communication and simple gameplay mechanics.

## Key Components

- **Frontend**
  - Built using the Phaser HTML5 Engine
  - Handles anonymous user sessions via localStorage
  - Communication protocol:
    - WebSocket (Socket.io) only
      - Player movement
      - Chat messages
      - Game state updates
      - Username validation
  - Lobby features:
    - Create lobby (with visibility: public/private)
    - Auto-generated 6-character lobby codes
    - Lobby browser with filtering
    - Invite system via lobby codes
    - Ready state tracking
    - Max 2 players per lobby (expandable later)

- **Backend**
  - Node.js with Socket.io
  - Minimal state management
  - Protocol responsibilities:
    - WebSocket: Handle all game communication
    - Ephemeral user sessions (no DB persistence)
  - Lobby management:
    - In-memory lobby store (lobbies reset on server restart)
    - Lobby lifecycle handlers:
      ```javascript
      // Simplified lobby structure
      const lobbies = new Map(); // Key: lobby code
      /*
      Lobby {
        code: string,
        players: [socketId1, socketId2],
        settings: {
          maxPlayers: 2,
          isPublic: boolean,
          gameMode: '1v1'
        }
      }
      */
      ```
    - Matchmaking logic:
      - Public lobbies: Auto-list in lobby browser
      - Private lobbies: Join via code only

## Directory Structure and File Paths

All paths listed below are relative to the project root.

```
/
├── architecture.md               # Project architecture documentation
├── docker-compose.yml            # Container orchestration file
├── frontend/
│   ├── Dockerfile                # Frontend container configuration
│   ├── package.json              # Frontend npm configuration
│   ├── public/                   # Static assets (HTML, CSS, images, etc.)
│   └── src/                      # Phaser-based game client source code
│
└── backend/
    ├── Dockerfile                # Backend container configuration
    ├── package.json              # Backend npm configuration
    └── src/                     # Node.js server source code (Socket.io, etc.)
```

## Deployment
- Containerized using Docker for easy deployment
- Single-command startup: `docker-compose up --build`
- Ephemeral storage design (no persistent volumes required)
- Environment variables for port configuration 