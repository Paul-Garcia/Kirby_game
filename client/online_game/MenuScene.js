import { socket } from './socket.js'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene')
  }

  preload() {
    this.player1 = false;
    this.player2 = false;
    this.load.image('background', './online_game/background.png')
    this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
    this.load.image('empty_banner', './online_game/empty_banner.png')
    this.load.spritesheet('kirby_banner', './online_game/kirby_banner.png', {frameWidth: 512,frameHeight: 92})
    this.load.spritesheet('waddle_banner', './online_game/waddle_banner.png', {frameWidth: 512,frameHeight: 92})
    this.load.spritesheet('foreground', './online_game/foreground_grass.png', {
      frameWidth: 512, // Largeur d'une frame
      frameHeight: 112, // Hauteur d'une frame
      endFrame: 4 // Optionnel : nombre de frames
    });
    this.currentPhase = 'waiting'
  }
  
  create() {
    

    socket.removeAllListeners('opponent_found')
    socket.removeAllListeners('game_start')
    this.bg = this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
    this.add.image(0, 0, 'empty_banner').setOrigin(0, 0).setDepth(1);
    this.add.image(0, 444, 'empty_banner').setOrigin(0, 1).setDepth(1);
    this.kirbyBanner = this.add.sprite(-250, 0, 'kirby_banner').setOrigin(0, 0).setDepth(2);
    this.WaddleBanner = this.add.sprite(250, 444, 'waddle_banner').setOrigin(0, 1).setDepth(2);

    

    // this.anims.create({
    //   key: 'scroll',
    //   frames: this.anims.generateFrameNumbers('foreground', { start: 0, end: 4 }), // frames 0 à 4
    //   frameRate: 8, // La vitesse de l'animation
    //   repeat: -1 // Répéter l'animation indéfiniment
    // }); 

    // // Ajouter le sprite du premier plan et jouer l'animation
    // const sprite = this.add.sprite(400, 300, 'foreground').setOrigin(0.5, -1);
    // sprite.play('scroll');

   

    const text = this.add.text(256, 222, 'Researching player...', {
      fontSize: '32px',
      color: '#fff'
    }).setOrigin(0.5)

    socket.on('opponent_found', ({ message, opponentId }) => {
      // console.log("???????? opponent_found")
      text.setText(`Click to set ready\nOpponent : ${opponentId.slice(0, 4)}`)
      this.currentPhase = 'found'
    })

    socket.on('status', (msg) => {
      text.setText("waiting for oponent")
      currentPhase = 'waiting'
    })

    

    socket.on('status_ready', (data) => {
      console.log("status_ready")
      console.log(this.players_data)
      this.players_data = data;

      this.player1 = data.player1.ready;
      this.player2 = data.player2.ready;
    })
    
    this.input.on('pointerdown', () => {
      socket.emit('ready')
    })
 
    socket.on('game_start', (msg) => {
      this.scene.start('GameScene', { msg })
    })
  }

  update() {
    if (this.currentPhase === 'found') {
      socket.emit('ready_confirmed')
   
      // Gérer la bannière de Kirby
      if (this.player1) {
        if (this.kirbyBanner.x !== 0) {
          this.tweens.add({
            targets: this.kirbyBanner,
            x: 0,
            duration: 500,
            ease: 'Power2'
          });
        }
      } else {
        if (this.kirbyBanner.x !== -250) {
          this.tweens.add({
            targets: this.kirbyBanner,
            x: -250,
            duration: 500,
            ease: 'Power2'
          });
        }
      }
  
      // Gérer la bannière de Waddle
      if (this.player2) {
        if (this.WaddleBanner.x !== 0) {
          this.tweens.add({
            targets: this.WaddleBanner,
            x: 0,
            duration: 500,
            ease: 'Power2'
          });
        }
      } else {
        if (this.WaddleBanner.x !== 250) {
          this.tweens.add({
            targets: this.WaddleBanner,
            x: 250,
            duration: 500,
            ease: 'Power2'
          });
        }
      }
    }
  }
}
