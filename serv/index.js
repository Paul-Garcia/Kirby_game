const { Server } = require("socket.io")

const DEBUG = process.env.DEBUG_KIRBY === '1'
const dlog = (...args) => { if (DEBUG) console.log(...args) }

const io = new Server(3000, {
  cors: { origin: '*' },
  // Reduce CPU / latency overhead (especially with websocket)
  perMessageDeflate: false,
})

let players = []
let waitingPlayers = []  // Liste des joueurs en attente pour un matchmaking
const pendingPairs = []
const RESEND_INTERVAL = 1000 // renvoie tous les 3s

let gameRooms = {}  // Pour stocker les rooms avec les informations de clic des joueurs
const GAME_TIMEOUT_MS = 8000

function emitPlayersCount() {
  io.emit('players_count', { count: players.length })
}

io.on('connection', (socket) => {
  dlog(`${socket.id} connecté`)
  socket.data.name = null

  // Best-effort: disable Nagle (lower latency for small packets)
  try {
    const t = socket.conn?.transport?.socket
    if (t?.setNoDelay) t.setNoDelay(true)
    else if (t?._socket?.setNoDelay) t._socket.setNoDelay(true)
  } catch {}
  
  // Ajoute le joueur à la liste des joueurs connectés
  players.push(socket)

  socket.emit('status', 'connected')
  socket.emit('players_count', { count: players.length })
  emitPlayersCount()

  socket.on('get_players_count', () => {
    socket.emit('players_count', { count: players.length })
  })

  socket.on('join_queue', ({ name } = {}) => {
    const normalized = normalizeName(name)
    if (!normalized.ok) {
      socket.emit('queue_error', { message: normalized.error })
      return
    }

    socket.data.name = normalized.name

    // Si déjà dans une room, on ignore (le client doit d'abord quitter)
    const roomId = getPlayerRoom(socket)
    if (roomId) return

    // Déjà dans la queue ?
    if (waitingPlayers.includes(socket)) return

    waitingPlayers.push(socket)
    socket.emit('status', 'waiting')
  })

  socket.on('leave_queue', () => {
    waitingPlayers = waitingPlayers.filter(s => s !== socket)
    socket.emit('status', 'idle')
  })

  // Gère le clic du joueur
  socket.on('ready', () => {
    // Vérifie si le joueur est dans une room
    const roomId = getPlayerRoom(socket);
    if (roomId) {
      const room = gameRooms[roomId];
      
      if (room.player1.socket.id === socket.id) {
        room.player1.ready = !room.player1.ready
      }
      if (room.player2.socket.id === socket.id) {
        room.player2.ready = !room.player2.ready
      }
      io.to(roomId).emit('status_ready', {
      player1: {
        ready: room.player1.ready,
        socket: room.player1.socket.id,
        name: room.player1.name
      },
      player2: {
        ready: room.player2.ready,
        socket: room.player2.socket.id,
        name: room.player2.name
      }})

      // console.log("iddddd:", socket.id, room.player1.socket.id)
      // console.log(`Room - ID: ${roomId} : Time - ${room.emit_time} : Res Send - ${room.res_send}`)
      // console.log(` - Joueur 1 : ${room.player1.socket.id} | ready: ${room.player1.ready} | finished: ${room.player1.finished} | Time - ${room.player1.reactionTime}ms | Connected - ${room.player1.connected}`)
      // console.log(` - Joueur 2 : ${room.player2.socket.id} | ready: ${room.player2.ready} | finished: ${room.player2.finished} | Time - ${room.player2.reactionTime}ms | Connected - ${room.player2.connected}`)
  



   
      if (room.player1.ready && room.player2.ready) {
        // Si les deux joueurs sont prêts, envoie un message à la room pour commencer le jeu
        room.player1.ready = false;
        room.player2.ready = false;
        setTimeout(() => {
          io.to(roomId).emit('game_start', 'Les deux joueurs sont prêts, le jeu commence !');
      
          // Puis entre 2s et 8s après, envoie le "go"
          const delayBeforeGo = Math.floor(Math.random() * (8000 - 2000 + 1)) + 2000;
      
          setTimeout(() => {
            room.emit_time = Date.now();
            room.goTimeNs = process.hrtime.bigint();
            if (room.resultTimeout) clearTimeout(room.resultTimeout)
            room.resultTimeout = setTimeout(() => {
              if (room.res_send) return
              room.res_send = true
              io.to(roomId).emit('result', {
                message: 'result',
                time: room.emit_time,
                winnerSocket: getWinner(room),
                player1: {
                  time: room.player1.reactionTime,
                  socket: room.player1.socket.id,
                  name: room.player1.name
                },
                player2: {
                  time: room.player2.reactionTime,
                  socket: room.player2.socket.id,
                  name: room.player2.name
                }
              })
            }, GAME_TIMEOUT_MS)
            io.to(roomId).emit('go', 'go');
          }, delayBeforeGo);
          
        }, 700); // 0.5 seconde
      }
    }
  })

  socket.on('disconnect', () => {
    players = players.filter(p => p !== socket)
    waitingPlayers = waitingPlayers.filter(p => p !== socket)
    emitPlayersCount()
    
    // Nettoie la room quand un joueur se déconnecte
    for (let roomId in gameRooms) {
      if (gameRooms[roomId].player1.socket === socket || gameRooms[roomId].player2.socket === socket) {
        io.to(roomId).emit('status', 'Ton adversaire s’est déconnecté')
        delete gameRooms[roomId]
        dlog(`Room ${roomId} supprimée à cause de la déconnexion de ${socket.id}`)
      }
    }
  })

  socket.on('back_on_queue', () => {
    const roomId = getPlayerRoom(socket);
    const room = gameRooms[roomId];
  
    if (room && (room.player1.socket === socket || room.player2.socket === socket)) {

      // Quitter la room
      socket.leave(roomId);
      if(room.player1.socket == socket)
        room.player1.connected = false
      if(room.player2.socket == socket)
        room.player2.connected = false;
      dlog(`Socket ${socket.id} quitte la room ${roomId}`);
    }
  });

  socket.on('finish', () => {
    const roomId = getPlayerRoom(socket);
    const room = gameRooms[roomId];
    if (!room || !room.goTimeNs || room.res_send) return
    const nowNs = process.hrtime.bigint()
    const dtNs = nowNs - room.goTimeNs
    const reactionMs = Number(dtNs) / 1e6
    if (room.player1.socket === socket && room.player1.finished == false) {
      room.player1.reactionTimeNs = dtNs
      room.player1.reactionTime = reactionMs
      room.player1.finished = true;
    } else if (room.player2.socket === socket && room.player2.finished == false) {
      room.player2.reactionTimeNs = dtNs
      room.player2.reactionTime = reactionMs
      room.player2.finished = true;
    }
    if (Number.isFinite(room.player1.reactionTime) || Number.isFinite(room.player2.reactionTime)) {
      room.res_send = true;
      if (room.resultTimeout) clearTimeout(room.resultTimeout)
      io.to(roomId).emit('result', {
        message: 'result',
        time: room.emit_time,
        winnerSocket: getWinner(room),
        player1: {
          time: room.player1.reactionTime,
          socket: room.player1.socket.id,
          name: room.player1.name
        },
        player2: {
          time: room.player2.reactionTime,
          socket: room.player2.socket.id,
          name: room.player2.name
        }
      })
    }
  })
})

// Fallback: broadcast régulièrement (utile si un client arrive en cours de route)
setInterval(() => {
  emitPlayersCount()
}, 2000)

function getPlayerRoom(socket) {
  for (let roomId in gameRooms) {
    if ((gameRooms[roomId].player1.socket.id == socket.id && gameRooms[roomId].player1.connected == true) || (gameRooms[roomId].player2.socket.id == socket.id && gameRooms[roomId].player2.connected == true)) {
      return roomId;
    }
  }
  return null;
}

function getWinner(room) {
  const t1 = typeof room.player1.reactionTimeNs === 'bigint' ? room.player1.reactionTimeNs : null
  const t2 = typeof room.player2.reactionTimeNs === 'bigint' ? room.player2.reactionTimeNs : null

  if (t1 !== null && t2 !== null) return t1 < t2 ? room.player1.socket.id : room.player2.socket.id
  if (t1 === null && t2 === null) return null
  if (t1 === null) return room.player2.socket.id
  return room.player1.socket.id
}

function normalizeName(name) {
  if (typeof name !== 'string') return { ok: false, error: 'Pseudo invalide' }
  const trimmed = name.trim()
  if (trimmed.length < 2) return { ok: false, error: 'Pseudo trop court (min 2)' }
  if (trimmed.length > 16) return { ok: false, error: 'Pseudo trop long (max 16)' }
  // Autorise lettres, chiffres, espace, _ -
  if (!/^[\p{L}\p{N} _-]+$/u.test(trimmed)) return { ok: false, error: 'Caractères non autorisés' }
  return { ok: true, name: trimmed }
}

// Fonction pour afficher les infos des connexions toutes les 2 secondes
if (DEBUG) {
  setInterval(() => {
    console.log(`\n=== État du serveur (DEBUG) ===`)
    console.log(`Nombre de joueurs connectés : ${players.length}`)
    console.log(`Nombre de rooms : ${Object.keys(gameRooms).length}`)
    Object.entries(gameRooms).forEach(([roomId, room], index) => {
      console.log(`Room ${index + 1} - ID: ${roomId} : Time - ${room.emit_time} : Res Send - ${room.res_send}`)
      console.log(` - Joueur 1 : ${room.player1.socket.id} | ready: ${room.player1.ready} | finished: ${room.player1.finished} | Time - ${room.player1.reactionTime}ms | Connected - ${room.player1.connected}`)
      console.log(` - Joueur 2 : ${room.player2.socket.id} | ready: ${room.player2.ready} | finished: ${room.player2.finished} | Time - ${room.player2.reactionTime}ms | Connected - ${room.player2.connected}`)
    })
    console.log(`==============================\n`)
  }, 5000)
}


setInterval(async () => {
  // Cleanup is not latency-sensitive; keep it light.
  for (const roomId in gameRooms) {
    const sockets = await io.in(roomId).fetchSockets()
    if (sockets.length === 0) delete gameRooms[roomId]
  }
}, 10000);

function checkBothReady(pair) {
  if (pair.player1.ready && pair.player2.ready) {
    const player1 = pair.player1.socket
    const player2 = pair.player2.socket
    const roomId = `${player1.id}-${player2.id}`

    // Nettoyage
    const index = pendingPairs.indexOf(pair)
    if (index !== -1) pendingPairs.splice(index, 1)

    // Entrée dans la room
    player1.join(roomId)
    player2.join(roomId)

    dlog(`✅ Match confirmé : ${player1.id} et ${player2.id} dans ${roomId}`)

    gameRooms[roomId] = {
      res_send: false,
      emit_time: undefined,
      goTimeNs: undefined,
      resultTimeout: null,
      player1: { socket: player1, name: player1.data.name || player1.id.slice(0, 4), ready: false, finished: false, reactionTime: null, reactionTimeNs: null, connected: true },
      player2: { socket: player2, name: player2.data.name || player2.id.slice(0, 4), ready: false, finished: false, reactionTime: null, reactionTimeNs: null, connected: true }
    }

    player1.emit('both_ready', { roomId })
    player2.emit('both_ready', { roomId })
  }
}


setInterval(() => {
  if (waitingPlayers.length >= 2) {
    const player1 = waitingPlayers.shift()
    const player2 = waitingPlayers.shift()

    const pair = {
      player1: { socket: player1, ready: false, interval: null },
      player2: { socket: player2, ready: false, interval: null }
    }

    pendingPairs.push(pair)

    // Fonction d’envoi initial + redondant
    const sendOpponentFound = (player, opponent, label) => {
      player.socket.emit('opponent_found', {
        message: 'Prépare-toi... 0/2 ready',
        opponentId: opponent.id,
        opponentName: opponent.data.name || opponent.id.slice(0, 4),
        youAre: label
      })

      // Renvoie toutes les X secondes tant qu’il n’est pas prêt
      player.interval = setInterval(() => {
        if (!player.ready) {
          // console.log(`🔁 Renvoi à ${label}`)
          player.socket.emit('opponent_found', {
            message: 'Prépare-toi... 0/2 ready',
            opponentId: opponent.id,
            opponentName: opponent.data.name || opponent.id.slice(0, 4),
            youAre: label
          })
        } else {
          clearInterval(player.interval)
        }
      }, RESEND_INTERVAL)
    }

    sendOpponentFound(pair.player1, player2, 'player1')
    sendOpponentFound(pair.player2, player1, 'player2')

    // Attente des confirmations
    player1.once('ready_confirmed', () => {
      pair.player1.ready = true
      clearInterval(pair.player1.interval)
      checkBothReady(pair)
    })

    player2.once('ready_confirmed', () => {
      pair.player2.ready = true
      clearInterval(pair.player2.interval)
      checkBothReady(pair)
    })
  }
}, 1000)