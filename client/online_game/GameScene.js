import { socket } from './socket.js'

export class GameScene extends Phaser.Scene {
    constructor() {
      super('GameScene')
    }
    preload() {
        this.load.image('background', './online_game/background.png')
        this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
        this.load.spritesheet('foreground', './online_game/foreground_grass.png', {
            frameWidth: 512,
            frameHeight: 112,
            endFrame: 3
        });

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
        socket.removeAllListeners('result')
        socket.removeAllListeners('go')
        const UI_FONT = '"Press Start 2P", monospace'
        const UI_TEXT_RES = 2

        
        this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0);
        this.spriteforeground = this.add.sprite(0, 440, 'foreground', 0).setOrigin(0, 1).setDepth(1);
        this.waddle = this.add.sprite(320, 320, 'waddle', 'waddle1').setOrigin(0, 1).setDepth(2);
        this.kirb = this.add.sprite(120, 320, 'kirb', 'kirb1').setOrigin(0, 1).setDepth(2);
        // this.kirb = this.add.sprite(256, 222, 'go', 'go1').setOrigin(0.5, 0.5).setDepth(3);
        
        // this.waddle.play('waddle_dash');
        // this.kirb.play('kirb_dash');
        this.spriteforeground.play('scroll');

        this.time.delayedCall(1000, () => {
            this.goSprite = this.add.sprite(256, 222, 'go', 'go1').setOrigin(0.5, 0.5).setDepth(3);
    
            // Phase 2 : Remplacer par 'go2' après 1s
            this.time.delayedCall(1000, () => {
                this.goSprite.setFrame('go2');
                this.time.delayedCall(1000, () => {
                    this.goSprite.setVisible(false); 
                });
            });
        });



        const text = this.add.text(256, 50, "Click the quickest\nwhen you see !!!" || '', {
            fontFamily: UI_FONT,
            fontSize: '20px',
            color: '#fff',
            align: 'center'
        }).setOrigin(0.5).setResolution(UI_TEXT_RES)

        // Pseudos au-dessus des personnages
        const kirbyName = window.localStorage.getItem('kirby_kirby_name') || 'Kirby'
        const waddleName = window.localStorage.getItem('kirby_waddle_name') || 'Waddle'
        this.kirbyNameText = this.add.text(0, 0, kirbyName, {
            fontFamily: UI_FONT,
            fontSize: '14px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.25)',
            padding: { left: 6, right: 6, top: 4, bottom: 4 }
        }).setOrigin(0.5, 1).setDepth(5).setResolution(UI_TEXT_RES)

        this.waddleNameText = this.add.text(0, 0, waddleName, {
            fontFamily: UI_FONT,
            fontSize: '14px',
            color: '#fff',
            backgroundColor: 'rgba(0,0,0,0.25)',
            padding: { left: 6, right: 6, top: 4, bottom: 4 }
        }).setOrigin(0.5, 1).setDepth(5).setResolution(UI_TEXT_RES)

        this.updateNamePositions()

        socket.on('go', (msg) => {
            this.goSprite.setFrame('go3');
            this.goSprite.setVisible(true);
        })

        this.input.on('pointerdown', () => {
            socket.emit('finish')
        })

        socket.on('status', (msg) => {
            this.scene.start('MenuScene')
        })
  
        socket.on('result', (data) => {
            this.scene.start('ResultScene', data)
        })
    }

    update() {
        this.updateNamePositions()
    }

    updateNamePositions() {
        if (this.kirb && this.kirbyNameText) {
            const topY = this.kirb.y - (this.kirb.displayHeight || this.kirb.height || 0)
            this.kirbyNameText.setPosition(this.kirb.x + (this.kirb.displayWidth || this.kirb.width || 0) / 2, topY - 6)
        }
        if (this.waddle && this.waddleNameText) {
            const topY = this.waddle.y - (this.waddle.displayHeight || this.waddle.height || 0)
            this.waddleNameText.setPosition(this.waddle.x + (this.waddle.displayWidth || this.waddle.width || 0) / 2, topY - 6)
        }
    }
}