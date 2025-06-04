import Phaser from 'phaser'
import { io } from 'socket.io-client'

const socket = io('http://localhost:3000')

let text, countdownText, resultText
let currentPhase = 'waiting'

const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  backgroundColor: '#1d1d1d',
  scene: {
    create() {
      text = this.add.text(400, 300, '', {
        fontSize: '32px',
        color: '#fff'
      }).setOrigin(0.5)
    
      socket.on('status', (msg) => {
        text.setText(msg)
        currentPhase = 'waiting'
      })

      socket.on('opponent_found', ({ message, opponentId }) => {
        text.setText(`${message}\nAdversaire : ${opponentId.slice(0, 4)}`)
        currentPhase = 'opponent_found'
      })

      this.input.on('pointerdown', () => {
        if(currentPhase == "opponent_found") {
          socket.emit('ready')
        } else if(currentPhase == "game_start") {
          currentPhase = "signal_send"
          socket.emit('finish')
        } else if(currentPhase == "game_ended") {
          currentPhase = "waiting"
          socket.emit('back_on_queue')
          text.setText(`waiting to find an new opponent`)
        }
      })

      socket.on('game_start', (msg) => {
        text.setText(msg)
        currentPhase = "game_start"
      })

      socket.on('go', (msg) => {
        text.setText(msg)
      })

      socket.on('result', ({ message, player1, player2, time, winnerSocket}) => {
        let res = (winnerSocket == socket.id) ? "you win" : "you loose"
        res = (winnerSocket == null) ? "tie" : res
        text.setText(`${message}\nTime : ${time}\nPlayer1 : ${player1.time}ms ${player1.socket}\nPlayer2 : ${player2.time}ms ${player2.socket}\n Winner - ${winnerSocket}\n${res}`)
        currentPhase = "game_ended"
      })
      
      setInterval(() => {
        console.log(currentPhase)
      }, 100)
    }
  }
}

new Phaser.Game(config)
