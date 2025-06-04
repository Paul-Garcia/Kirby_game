const { Server } = require("socket.io")
const io = new Server(3000, { cors: { origin: '*' } })

let players = []
let waitingPlayers = []  // Liste des joueurs en attente pour un matchmaking
const pendingPairs = []
const RESEND_INTERVAL = 1000 // renvoie tous les 3s

let gameRooms = {}  // Pour stocker les rooms avec les informations de clic des joueurs

io.on('connection', (socket) => {
  console.log(`${socket.id} connecté`)
  
  // Ajoute le joueur à la liste des joueurs connectés
  players.push(socket)
  
  // Ajoute le joueur à la liste d'attente pour le matchmaking
  waitingPlayers.push(socket)

  socket.emit('status', 'waiting to find an opponent')
  // Matchmaking : une fois qu'il y a deux joueurs dans la file d'attente
  

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
        socket: room.player1.socket.id
      },
      player2: {
        ready: room.player2.ready,
        socket: room.player2.socket.id
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
            io.to(roomId).emit('go', 'go');
          }, delayBeforeGo);
          
        }, 700); // 0.5 seconde
      }
    }
  })

  socket.on('disconnect', () => {
    players = players.filter(p => p !== socket)
    waitingPlayers = waitingPlayers.filter(p => p !== socket)
    
    // Nettoie la room quand un joueur se déconnecte
    for (let roomId in gameRooms) {
      if (gameRooms[roomId].player1.socket === socket || gameRooms[roomId].player2.socket === socket) {
        io.to(roomId).emit('status', 'Ton adversaire s’est déconnecté, searching for a new opponent')
        const opponentSocket = gameRooms[roomId].player1.socket === socket ? gameRooms[roomId].player2.socket : gameRooms[roomId].player1.socket;
        waitingPlayers.push(opponentSocket)
        delete gameRooms[roomId]
        console.log(`Room ${roomId} supprimée à cause de la déconnexion de ${socket.id}`)
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
      console.log(`Socket ${socket.id} quitte la room ${roomId}`);

      // Remettre le joueur dans la file d'attente
      waitingPlayers.push(socket);
    }
  });

  socket.on('finish', () => {
    const roomId = getPlayerRoom(socket);
    const room = gameRooms[roomId];
    if (room.player1.socket === socket && room.player1.finished == false) {
      room.player1.reactionTime = Date.now() - room.emit_time;
      room.player1.finished = true;
    } else if (room.player2.socket === socket && room.player2.finished == false) {
      room.player2.reactionTime = Date.now() - room.emit_time;
      room.player2.finished = true;
    }
    if((room.player2.reactionTime && !isNaN(room.player2.reactionTime)) || (room.player1.reactionTime && !isNaN(room.player1.reactionTime))) {
      room.res_send = true;
      io.to(roomId).emit('result', {
        message: 'result',
        time: room.emit_time,
        winnerSocket: getWinner(room),
        player1: {
          time: room.player1.reactionTime,
          socket: room.player1.socket.id
        },
        player2: {
          time: room.player2.reactionTime,
          socket: room.player2.socket.id
        }
      })
    }
  })
})

function getPlayerRoom(socket) {
  for (let roomId in gameRooms) {
    if ((gameRooms[roomId].player1.socket.id == socket.id && gameRooms[roomId].player1.connected == true) || (gameRooms[roomId].player2.socket.id == socket.id && gameRooms[roomId].player2.connected == true)) {
      return roomId;
    }
  }
  return null;
}

function getWinner(room) {
  let winnerSocket;
  if(room.player1.reactionTime == null) room.player1.reactionTime = NaN
  if(room.player2.reactionTime == null) room.player2.reactionTime = NaN

  if (!isNaN(room.player1.reactionTime) && !isNaN(room.player2.reactionTime)) {
    winnerSocket = room.player1.reactionTime < room.player2.reactionTime ? room.player1.socket.id : room.player2.socket.id;
  } else if (isNaN(room.player1.reactionTime) && isNaN(room.player2.reactionTime)) {
    winnerSocket = null;
  } else if (!isNaN(room.player2.reactionTime)) {
    winnerSocket = room.player2.socket.id;
  } else if (!isNaN(room.player1.reactionTime)) {
    winnerSocket = room.player1.socket.id;
  } else {
    winnerSocket = null;
  }
  return winnerSocket
}

// Fonction pour afficher les infos des connexions toutes les 2 secondes
setInterval(async () => {
  // console.log(`\n=== État du serveur toutes les 2 secondes ===`)
  // console.log(`Nombre de joueurs connectés : ${players.length}`)
  // players.forEach((p, index) => {
  //   console.log(`Joueur ${index + 1} : Socket ID - ${p.id}`)
  // })

  // console.log(`\nNombre de rooms : ${Object.keys(gameRooms).length}`)
  Object.entries(gameRooms).forEach(([roomId, room], index) => {
    if((isNaN(room.player1.reactionTime) && isNaN(room.player2.reactionTime)) && room.emit_time != undefined && room.res_send == false) {
      room.res_send = true;
      io.to(roomId).emit('result', {
        message: 'result',
        time: room.emit_time,
        winnerSocket: getWinner(room),
        player1: {
          time: room.player1.reactionTime,
          socket: room.player1.socket.id
        },
        player2: {
          time: room.player2.reactionTime,
          socket: room.player2.socket.id
        }
      })
    }
    // console.log(`Room ${index + 1} - ID: ${roomId} : Time - ${room.emit_time} : Res Send - ${room.res_send}`)
    // console.log(` - Joueur 1 : ${room.player1.socket.id} | ready: ${room.player1.ready} | finished: ${room.player1.finished} | Time - ${room.player1.reactionTime}ms | Connected - ${room.player1.connected}`)
    // console.log(` - Joueur 2 : ${room.player2.socket.id} | ready: ${room.player2.ready} | finished: ${room.player2.finished} | Time - ${room.player2.reactionTime}ms | Connected - ${room.player2.connected}`)
  })
  // console.log(`============================================\n`)
}, 500)


setInterval(async () => {
  for (const roomId in gameRooms) {
    const sockets = await io.in(roomId).fetchSockets();
    if (sockets.length === 0) {
      delete gameRooms[roomId];
    }
  }
}, 1000);

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

    console.log(`✅ Match confirmé : ${player1.id} et ${player2.id} dans ${roomId}`)

    gameRooms[roomId] = {
      res_send: false,
      player1: { socket: player1, ready: false, finished: false, reactionTime: null, connected: true },
      player2: { socket: player2, ready: false, finished: false, reactionTime: null, connected: true }
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
    const sendOpponentFound = (player, opponentId, label) => {
      player.socket.emit('opponent_found', {
        message: 'Prépare-toi... 0/2 ready',
        opponentId
      })

      // Renvoie toutes les X secondes tant qu’il n’est pas prêt
      player.interval = setInterval(() => {
        if (!player.ready) {
          // console.log(`🔁 Renvoi à ${label}`)
          player.socket.emit('opponent_found', {
            message: 'Prépare-toi... 0/2 ready',
            opponentId
          })
        } else {
          clearInterval(player.interval)
        }
      }, RESEND_INTERVAL)
    }

    sendOpponentFound(pair.player1, player2.id, 'player1')
    sendOpponentFound(pair.player2, player1.id, 'player2')

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