import { socket } from './socket.js'

export class ResultScene extends Phaser.Scene {
    constructor() {
      super('ResultScene')
    }
  
    init(data) {
      this.result = data
    }

    preload() {
      console.log("reload page")
      this.load.image('background', './online_game/background.png')
      this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
      this.load.spritesheet('foreground', './online_game/foreground_grass.png', {
          frameWidth: 512, // Largeur d'une frame
          frameHeight: 112, // 448px / 4 frames = 112px
          endFrame: 3
      });
      this.load.image('tie', './online_game/tie.png')
      this.load.atlas('waddle', './online_game/waddle.png', './online_game/waddle.json');
      this.load.atlas('kirb', './online_game/kirb.png', './online_game/kirb.json');
      this.load.atlas('go', './online_game/go.png', './online_game/go.json');

      this.anims.create({
          key: 'waddle_dash',
          frames: [
              { key: 'waddle', frame: 'waddle1' },
              { key: 'waddle', frame: 'waddle2' },
              { key: 'waddle', frame: 'waddle3' },
              { key: 'waddle', frame: 'waddle4' }
          ],
          frameRate: 10,
          repeat: -1
      });

      this.anims.create({
          key: 'kirb_dash',
          frames: [
              { key: 'kirb', frame: 'kirb1' },
              { key: 'kirb', frame: 'kirb1' },
              { key: 'kirb', frame: 'kirb1' },
              { key: 'kirb', frame: 'kirb1' }
          ],
          frameRate: 10,
          repeat: -1
      });

      this.anims.create({
          key: 'go_change',
          frames: [
              { key: 'go', frame: 'go1' },
              { key: 'go', frame: 'go2' },
              { key: 'go', frame: 'go3' },
          ],
          frameRate: 10,
          repeat: -1
      });
      

      this.anims.create({
          key: 'scroll',
          frames: this.anims.generateFrameNumbers('foreground', { start: 0, end: 3 }), // Utiliser les frames 0 à 9
          frameRate: 10, // La vitesse de l'animation
          repeat: -1 // Répéter l'animation à l'infini
      });
  }
  
  
    create() {

      const { player1, player2, winnerSocket } = this.result
      console.log(winnerSocket, player1, player2)
      this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
      this.spriteforeground = this.add.sprite(0, 440, 'foreground', 0).setOrigin(0, 1).setDepth(1);
      this.waddle = this.add.sprite(320, 320, 'waddle', 'waddle1').setOrigin(0, 1).setDepth(2);
      this.kirb = this.add.sprite(120, 320, 'kirb', 'kirb1').setOrigin(0, 1).setDepth(2);

      if (winnerSocket != null) {
        this.tweens.add({
          targets: this.waddle,
          x: 120,
          duration: 500,
          ease: 'Power2'
        });
        this.tweens.add({
          targets: this.kirb,
          x: 320,
          duration: 500,
          ease: 'Power2'
        });
      } else {
        this.tweens.add({
          targets: this.waddle,
          x: 256,
          duration: 100,
          ease: 'Power2',
          onComplete: () => { this.waddle.setVisible(false);}
        });
        this.tweens.add({
          targets: this.kirb,
          x: 200,
          duration: 100,
          ease: 'Power2',
          onComplete: () => { this.kirb.setVisible(false); this.add.image(256, 320, 'tie').setOrigin(0.5, 1).setDepth(2);}
        });
      }

      if(winnerSocket != null && winnerSocket == player1.socket) {
        this.kirb.setFrame('kirb2');
        this.waddle.setFrame('waddle4');
      } else if (winnerSocket != null && winnerSocket == player2.socket) {
        this.kirb.setFrame('kirb4');
        this.waddle.setFrame('waddle2');
      }
      this.spriteforeground.play('scroll');      
  
      const isWin = winnerSocket === socket.id ? "✅ You win" :
                    winnerSocket === null ? "🟰 Tie" : "❌ You lose"
  
      console.log(winnerSocket)
      console.log(socket.id)

      const p1Label = player1?.name ? `${player1.name}` : 'Player1'
      const p2Label = player2?.name ? `${player2.name}` : 'Player2'
      const msg = `Time: ${this.result.time}\n${p1Label}: ${player1.time}ms\n${p2Label}: ${player2.time}ms\n${isWin}`
  
      const text = this.add.text(256, 75, msg, {
        fontFamily: '"Press Start 2P", monospace',
        fontSize: '18px',
        color: '#fff',
        align: 'center'
      }).setOrigin(0.5).setResolution(2)
  
      this.input.once('pointerdown', () => {
        socket.emit('back_on_queue')
        this.scene.start('MenuScene')
      })
    }
  }
  