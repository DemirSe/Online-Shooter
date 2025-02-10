import Phaser from 'phaser';
import { io } from 'socket.io-client';

// Game scene
class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
    }

    preload() {
        // Create a simple player sprite
        const graphics = this.add.graphics();
        graphics.fillStyle(0x00ff00, 1); // Green color
        graphics.fillRect(0, 0, 32, 32); // 32x32 square
        graphics.generateTexture('player', 32, 32);
        graphics.destroy();
    }

    create() {
        // Initialize Socket.IO with the server's address
        const socketUrl = process.env.BACKEND_URL || 'http://test.demirse.com:3000'; // Ortam değişkenini kullan, yoksa varsayılan
        console.log('Connecting to socket server at:', socketUrl);
        
        this.socket = io(socketUrl, {
            transports: ['polling', 'websocket'], // Try polling first
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 60000,
            forceNew: true,
            upgrade: true,
            path: '/socket.io',
            auth: {
                serverUrl: socketUrl
            }
        });
        
        this.socket.on('connect', () => {
            console.log('Connected to server');
        });

        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            // Try to reconnect with polling if websocket fails
            if (this.socket.io.opts.transports[0] === 'websocket') {
                console.log('Retrying with polling transport...');
                this.socket.io.opts.transports = ['polling'];
            }
        });

        // Add connection status monitoring
        this.socket.io.on("error", (error) => {
            console.log('Transport error:', error);
        });

        this.socket.io.on("reconnect_attempt", (attempt) => {
            console.log('Reconnection attempt:', attempt);
        });

        this.socket.io.on("reconnect_failed", () => {
            console.log('Failed to reconnect');
            alert('Could not connect to the game server. Please check if the server is running and refresh the page.');
        });

        // Track connection state and lobby
        this.currentLobbyCode = null;
        
        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            const disconnectOverlay = document.createElement('div');
            disconnectOverlay.id = 'disconnect-overlay';
            disconnectOverlay.style.position = 'fixed';
            disconnectOverlay.style.top = '0';
            disconnectOverlay.style.left = '0';
            disconnectOverlay.style.width = '100%';
            disconnectOverlay.style.height = '100%';
            disconnectOverlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            disconnectOverlay.style.color = 'white';
            disconnectOverlay.style.display = 'flex';
            disconnectOverlay.style.justifyContent = 'center';
            disconnectOverlay.style.alignItems = 'center';
            disconnectOverlay.style.zIndex = '2000';
            disconnectOverlay.innerHTML = '<h2>Connection lost. Trying to reconnect...</h2>';
            document.body.appendChild(disconnectOverlay);
        });

        this.socket.on('reconnect', () => {
            console.log('Reconnected to server');
            const disconnectOverlay = document.getElementById('disconnect-overlay');
            if (disconnectOverlay) {
                disconnectOverlay.remove();
            }
            if (this.currentLobbyCode) {
                this.socket.emit('rejoinLobby', this.currentLobbyCode);
            }
        });

        // Listen for username confirmation events
        this.socket.on('usernameSet', (username) => {
            console.log('Username set confirmed:', username);
            this.socket.username = username;
            document.getElementById('username-overlay').style.display = 'none';
            document.getElementById('user-display').innerText = 'Username: ' + username;
            this.initializeLobbyButtons(); // Initialize lobby buttons after username is set
        });

        this.socket.on('usernameError', (message) => {
            console.error('Username error:', message);
            alert(message);
        });

        // Listen for online players update
        this.socket.on('updateOnlinePlayers', (players) => {
            const onlineDiv = document.getElementById('online-players');
            if (onlineDiv) {
                let html = '<strong>Online Players:</strong><br><ul style="list-style: none; padding: 0; margin: 0;">';
                players.forEach(player => {
                    html += `<li>${player}</li>`;
                });
                html += '</ul>';
                onlineDiv.innerHTML = html;
            }
        });

        // Handle username selection
        const usernameSubmit = document.getElementById('username-submit');
        if (usernameSubmit) {
            usernameSubmit.addEventListener('click', () => {
                const usernameInput = document.getElementById('username-input');
                const username = usernameInput.value.trim();
                if (username) {
                    this.socket.emit('setUsername', username);
                } else {
                    alert('Please enter a valid username.');
                }
            });
        }

        // Lobby System Event Listeners
        this.socket.on('lobbyCreated', ({ code, lobby }) => {
            this.showLobbyInterface(code, lobby);
        });

        this.socket.on('lobbiesList', (lobbies) => {
            // Don't show lobbies list if player is already in a lobby
            if (document.getElementById('lobby-interface')) {
                return;
            }
            this.showLobbiesList(lobbies);
        });

        this.socket.on('joinedLobby', ({ code, lobby }) => {
            const lobbiesList = document.getElementById('lobbies-list');
            if (lobbiesList) {
                lobbiesList.remove();
            }
            this.showLobbyInterface(code, lobby);
        });

        this.socket.on('lobbyUpdate', (lobby) => {
            this.updateLobbyInterface(lobby);
        });

        this.socket.on('lobbyError', (message) => {
            alert(message);
        });

        this.socket.on('gameStart', (lobby) => {
            this.startGame(lobby);
        });

        // Initially hide lobby buttons until username is set
        const lobbyButtons = document.getElementById('lobby-buttons');
        if (lobbyButtons) {
            lobbyButtons.style.display = 'none';
        }

        // Initialize game state
        this.gameStarted = false;
        this.players = new Map();
        this.cursors = this.input.keyboard.createCursorKeys();
        this.wasd = {
            up: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            down: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            left: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            right: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
        };
    }

    initializeLobbyButtons() {
        const lobbyButtons = document.getElementById('lobby-buttons');
        if (lobbyButtons) {
            lobbyButtons.style.display = 'block';
        }

        const createGameBtn = document.getElementById('create-game');
        const joinGameBtn = document.getElementById('join-game');

        if (createGameBtn) {
            createGameBtn.addEventListener('click', () => {
                // Hide lobby buttons when creating a game
                lobbyButtons.style.display = 'none';
                this.socket.emit('createLobby');
            });
        }

        if (joinGameBtn) {
            joinGameBtn.addEventListener('click', () => {
                this.socket.emit('getLobbies');
            });
        }
    }

    showLobbyInterface(code, lobby) {
        // Update current lobby code
        this.currentLobbyCode = code;

        // Create overlay
        let overlay = document.getElementById('lobby-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'lobby-overlay';
            overlay.style.position = 'fixed';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
            overlay.style.zIndex = '999';
            document.body.appendChild(overlay);
        }

        // Remove lobbies list if it exists
        const existingLobbiesList = document.getElementById('lobbies-list');
        if (existingLobbiesList) {
            existingLobbiesList.remove();
        }

        // Find current player's ready status
        const currentPlayer = lobby.players.find(p => p.username === this.socket.username);
        const isReady = currentPlayer ? currentPlayer.ready : false;

        // Create or update lobby interface
        let lobbyDiv = document.getElementById('lobby-interface');
        if (!lobbyDiv) {
            lobbyDiv = document.createElement('div');
            lobbyDiv.id = 'lobby-interface';
            lobbyDiv.style.position = 'absolute';
            lobbyDiv.style.top = '50%';
            lobbyDiv.style.left = '50%';
            lobbyDiv.style.transform = 'translate(-50%, -50%)';
            lobbyDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            lobbyDiv.style.padding = '20px';
            lobbyDiv.style.borderRadius = '8px';
            lobbyDiv.style.color = 'white';
            lobbyDiv.style.zIndex = '1000';
            document.body.appendChild(lobbyDiv);
        }

        lobbyDiv.innerHTML = `
            <h2>Your Game Lobby</h2>
            <p style="margin: 10px 0;">Lobby Code: <strong>${code}</strong></p>
            <div id="lobby-players">
                <h3>Players:</h3>
                ${this.renderLobbyPlayers(lobby)}
            </div>
            <button id="ready-button" style="margin-top: 10px; padding: 8px 16px; display: ${!isReady ? 'inline-block' : 'none'};">
                Ready
            </button>
            <button id="cancel-button" style="margin-top: 10px; margin-left: 10px; padding: 8px 16px; display: ${isReady ? 'inline-block' : 'none'}; background-color: #FF5252; color: white;">
                Cancel
            </button>
        `;

        // Add ready button listener
        const readyButton = document.getElementById('ready-button');
        const cancelButton = document.getElementById('cancel-button');
        
        if (readyButton) {
            readyButton.addEventListener('click', () => {
                this.socket.emit('playerReady', true);
            });
        }

        if (cancelButton) {
            cancelButton.addEventListener('click', () => {
                this.socket.emit('playerReady', false);
            });
        }
    }

    showLobbiesList(lobbies) {
        let lobbiesDiv = document.getElementById('lobbies-list');
        if (!lobbiesDiv) {
            lobbiesDiv = document.createElement('div');
            lobbiesDiv.id = 'lobbies-list';
            lobbiesDiv.style.position = 'absolute';
            lobbiesDiv.style.top = '50%';
            lobbiesDiv.style.left = '50%';
            lobbiesDiv.style.transform = 'translate(-50%, -50%)';
            lobbiesDiv.style.backgroundColor = 'rgba(0, 0, 0, 0.95)';
            lobbiesDiv.style.padding = '20px';
            lobbiesDiv.style.borderRadius = '8px';
            lobbiesDiv.style.color = 'white';
            lobbiesDiv.style.zIndex = '1000';
            document.body.appendChild(lobbiesDiv);
        }

        // Create a local join function to prevent multiple joins
        let hasJoinedLobby = false;
        const joinLobbyHandler = (code) => {
            if (hasJoinedLobby) return;
            hasJoinedLobby = true;
            this.socket.emit('joinLobby', code);
            lobbiesDiv.remove();
        };

        if (lobbies.length === 0) {
            lobbiesDiv.innerHTML = `
                <h2>Available Lobbies</h2>
                <p>No lobbies available</p>
                <button id="close-lobbies" style="margin-top: 10px; padding: 8px 16px;">Close</button>
            `;
        } else {
            lobbiesDiv.innerHTML = `
                <h2>Available Lobbies</h2>
                <ul style="list-style: none; padding: 0; margin: 0;">
                    ${lobbies.map(lobby => `
                        <li style="margin: 10px 0;">
                            <button class="join-lobby-btn" data-code="${lobby.code}" style="padding: 8px 16px;">
                                Join Lobby ${lobby.code} (${lobby.playerCount}/2)
                            </button>
                        </li>
                    `).join('')}
                </ul>
                <button id="close-lobbies" style="margin-top: 10px; padding: 8px 16px;">Close</button>
            `;

            // Add click listeners to join buttons
            const joinButtons = lobbiesDiv.getElementsByClassName('join-lobby-btn');
            Array.from(joinButtons).forEach(button => {
                button.addEventListener('click', () => {
                    joinLobbyHandler(button.dataset.code);
                });
            });
        }

        // Add close button listener
        const closeButton = document.getElementById('close-lobbies');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                lobbiesDiv.remove();
            });
        }
    }

    renderLobbyPlayers(lobby) {
        return `
            <ul style="list-style: none; padding: 0; margin: 0;">
                ${lobby.players.map(player => `
                    <li style="margin: 5px 0;">
                        ${player.username} 
                        <span style="color: ${player.ready ? '#4CAF50' : '#FF5252'}">
                            ${player.ready ? '(Ready)' : '(Not Ready)'}
                        </span>
                        ${lobby.host === player.username ? ' (Host)' : ''}
                    </li>
                `).join('')}
            </ul>
        `;
    }

    updateLobbyInterface(lobby) {
        // Validate lobby data
        if (!lobby || !lobby.code) {
            console.error('Invalid lobby data received');
            return;
        }

        if (!document.getElementById('lobby-interface')) {
            this.showLobbyInterface(lobby.code, lobby);
            return;
        }

        // Find current player's ready status
        const currentPlayer = lobby.players.find(p => p.username === this.socket.username);
        const isReady = currentPlayer ? currentPlayer.ready : false;
        console.log('updateLobbyInterface:', { socketUsername: this.socket.username, currentPlayer, isReady });

        // Update lobby interface
        let lobbyDiv = document.getElementById('lobby-interface');
        if (lobbyDiv) {
            lobbyDiv.innerHTML = `
                <h2>Your Game Lobby</h2>
                <p style="margin: 10px 0;">Lobby Code: <strong>${lobby.code}</strong></p>
                <div id="lobby-players">
                    <h3>Players:</h3>
                    ${this.renderLobbyPlayers(lobby)}
                </div>
                <button id="ready-button" style="margin-top: 10px; padding: 8px 16px; display: ${!isReady ? 'inline-block' : 'none'};">
                    Ready
                </button>
                <button id="cancel-button" style="margin-top: 10px; margin-left: 10px; padding: 8px 16px; display: ${isReady ? 'inline-block' : 'none'}; background-color: #FF5252; color: white;">
                    Cancel
                </button>
            `;

            // Add button listeners with cleanup
            const readyButton = document.getElementById('ready-button');
            const cancelButton = document.getElementById('cancel-button');

            if (readyButton) {
                const newReadyButton = readyButton.cloneNode(true);
                readyButton.parentNode.replaceChild(newReadyButton, readyButton);
                newReadyButton.addEventListener('click', () => {
                    this.socket.emit('playerReady', true);
                });
            }

            if (cancelButton) {
                const newCancelButton = cancelButton.cloneNode(true);
                cancelButton.parentNode.replaceChild(newCancelButton, cancelButton);
                newCancelButton.addEventListener('click', () => {
                    this.socket.emit('playerReady', false);
                });
            }
        }
    }

    startGame(lobby) {
        const lobbyInterface = document.getElementById('lobby-interface');
        const overlay = document.getElementById('lobby-overlay');
        const lobbyButtons = document.getElementById('lobby-buttons');
        const usernameOverlay = document.getElementById('username-overlay');
        const userDisplay = document.getElementById('user-display');
        const onlinePlayers = document.getElementById('online-players');

        // Clean up all UI elements
        const cleanupUI = () => {
            [lobbyInterface, overlay, lobbyButtons, usernameOverlay, userDisplay, onlinePlayers].forEach(element => {
                if (element) {
                    element.remove();
                }
            });

            // Also clean up any other potential UI elements
            const allGameUI = document.querySelectorAll('[id$="-overlay"], [id$="-interface"], [id$="-buttons"], [id$="-display"], [id$="-players"]');
            allGameUI.forEach(element => element.remove());
        };

        if (lobbyInterface) {
            lobbyInterface.innerHTML = '<h2>Game Starting...</h2>';
            setTimeout(() => {
                cleanupUI();
                
                try {
                    // Clear any existing game state
                    this.players.forEach(player => player.destroy());
                    this.players.clear();
                    
                    // Initialize the game
                    this.gameStarted = true;
                    
                    // Set world bounds
                    this.physics.world.setBounds(0, 0, 800, 600);
                    
                    // Create local player
                    const startX = lobby.host === this.socket.username ? 200 : 600;
                    this.localPlayer = this.physics.add.sprite(startX, 300, 'player');
                    this.localPlayer.setScale(0.5);
                    
                    // Configure physics for the player
                    this.localPlayer.setCollideWorldBounds(true);
                    this.localPlayer.setBounce(0);
                    this.localPlayer.body.setDrag(500);
                    
                    // Store player reference
                    this.players.set(this.socket.username, this.localPlayer);
                    
                    // Set up other players
                    lobby.players.forEach(player => {
                        if (player.username !== this.socket.username) {
                            const otherStartX = lobby.host === player.username ? 200 : 600;
                            const otherPlayer = this.add.sprite(otherStartX, 300, 'player');
                            otherPlayer.setScale(0.5);
                            otherPlayer.lastUpdate = 0;
                            otherPlayer.targetX = otherStartX;
                            otherPlayer.targetY = 300;
                            this.players.set(player.username, otherPlayer);
                        }
                    });

                    // Set up movement update emission
                    this.lastMovementUpdate = 0;
                    
                    // Listen for other players' movements
                    this.socket.on('playerMoved', (playerData) => {
                        const otherPlayer = this.players.get(playerData.username);
                        if (otherPlayer) {
                            otherPlayer.targetX = playerData.x;
                            otherPlayer.targetY = playerData.y;
                            otherPlayer.lastUpdate = playerData.timestamp;
                            otherPlayer.moving = playerData.isMoving;

                            if (!playerData.isMoving) {
                                otherPlayer.x = playerData.x;
                                otherPlayer.y = playerData.y;
                            }
                        }
                    });
                    
                    // Emit initial position
                    this.socket.emit('playerJoinedGame', {
                        x: this.localPlayer.x,
                        y: this.localPlayer.y,
                        username: this.socket.username
                    });
                    
                    console.log('Game started with lobby:', lobby);
                } catch (error) {
                    console.error('Error starting game:', error);
                    const errorDiv = document.createElement('div');
                    errorDiv.style.position = 'fixed';
                    errorDiv.style.top = '50%';
                    errorDiv.style.left = '50%';
                    errorDiv.style.transform = 'translate(-50%, -50%)';
                    errorDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.9)';
                    errorDiv.style.padding = '20px';
                    errorDiv.style.borderRadius = '8px';
                    errorDiv.style.color = 'white';
                    errorDiv.style.zIndex = '2000';
                    errorDiv.innerHTML = `<h3>Error Starting Game</h3><p>${error.message}</p><button onclick="location.reload()">Reload Game</button>`;
                    document.body.appendChild(errorDiv);
                }
            }, 2000);
        }
    }

    update() {
        if (!this.gameStarted || !this.localPlayer) return;

        // Reset velocity
        let velocityX = 0;
        let velocityY = 0;
        const speed = 300;

        // Handle keyboard input
        if (this.cursors.left.isDown || this.wasd.left.isDown) {
            velocityX = -speed;
        }
        if (this.cursors.right.isDown || this.wasd.right.isDown) {
            velocityX = speed;
        }
        if (this.cursors.up.isDown || this.wasd.up.isDown) {
            velocityY = -speed;
        }
        if (this.cursors.down.isDown || this.wasd.down.isDown) {
            velocityY = speed;
        }

        // Track if movement state changed
        const wasMoving = this.localPlayer.body.velocity.x !== 0 || this.localPlayer.body.velocity.y !== 0;
        const isMoving = velocityX !== 0 || velocityY !== 0;

        // Apply velocity to player
        if (isMoving) {
            // Normalize diagonal movement
            if (velocityX !== 0 && velocityY !== 0) {
                const normalizedVelocity = new Phaser.Math.Vector2(velocityX, velocityY).normalize().scale(speed);
                velocityX = normalizedVelocity.x;
                velocityY = normalizedVelocity.y;
            }

            this.localPlayer.setVelocity(velocityX, velocityY);
        } else {
            // When stopping, reset physics body
            this.localPlayer.body.reset(this.localPlayer.x, this.localPlayer.y);
            this.localPlayer.body.stop();
        }

        // Update other players' positions
        this.players.forEach((player, username) => {
            if (username !== this.socket.username && player.targetX !== undefined) {
                if (!player.moving) {
                    player.x = player.targetX;
                    player.y = player.targetY;
                } else {
                    // Smooth interpolation to target position
                    const dx = player.targetX - player.x;
                    const dy = player.targetY - player.y;
                    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
                        player.x += dx * 0.3;
                        player.y += dy * 0.3;
                    } else {
                        player.x = player.targetX;
                        player.y = player.targetY;
                    }
                }
            }
        });

        // Emit movement update if moving or just stopped
        const now = Date.now();
        if ((isMoving || wasMoving) && now - this.lastMovementUpdate > 16) {
            this.socket.emit('playerMoved', {
                x: this.localPlayer.x,
                y: this.localPlayer.y,
                velocityX: this.localPlayer.body.velocity.x,
                velocityY: this.localPlayer.body.velocity.y,
                username: this.socket.username,
                timestamp: now,
                isMoving: isMoving
            });
            this.lastMovementUpdate = now;
        }
    }
}

// Game configuration
const config = {
    type: Phaser.AUTO,
    parent: 'game',
    width: 800,
    height: 600,
    transparent: true,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false // Disable debug mode to hide physics bodies and velocity arrows
        }
    },
    scene: MainScene
};

// Initialize the game
const game = new Phaser.Game(config); 