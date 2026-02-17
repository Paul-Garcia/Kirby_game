import { socket, refreshHud } from './socket.js'

export class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene')
  }

  preload() {
    this.player1 = false
    this.player2 = false
    this.load.image('background', './online_game/background.png')
    this.load.image('empty_banner', './online_game/empty_banner.png')
    this.load.spritesheet('kirby_banner', './online_game/kirby_banner.png', {frameWidth: 512,frameHeight: 92})
    this.load.spritesheet('waddle_banner', './online_game/waddle_banner.png', {frameWidth: 512,frameHeight: 92})
    this.load.spritesheet('foreground', './online_game/foreground_grass.png', {
      frameWidth: 512, // Largeur d'une frame
      frameHeight: 112, // 448px / 4 frames = 112px
      endFrame: 3
    });
    this.currentPhase = 'main_menu'
  }
  
  create() {
    socket.removeAllListeners('opponent_found')
    socket.removeAllListeners('game_start')
    socket.removeAllListeners('status')
    socket.removeAllListeners('status_ready')
    socket.removeAllListeners('queue_error')

    this.bg = this.add.image(0, 0, 'background').setOrigin(0, 0).setDepth(0)

    // Animation herbe (comme dans GameScene / ResultScene)
    if (!this.anims.exists('scroll')) {
      this.anims.create({
        key: 'scroll',
        frames: this.anims.generateFrameNumbers('foreground', { start: 0, end: 3 }),
        frameRate: 10,
        repeat: -1
      })
    }
    this.spriteforeground = this.add.sprite(0, 450, 'foreground', 0).setOrigin(0, 1).setDepth(0.5)
    this.spriteforeground.play('scroll')

    // Barres noires (à cacher dans le menu, à afficher seulement quand un adversaire est trouvé)
    this.topBars = this.add.image(0, 0, 'empty_banner').setOrigin(0, 0).setDepth(1)
    this.bottomBars = this.add.image(0, 444, 'empty_banner').setOrigin(0, 1).setDepth(1)
    this.kirbyBanner = this.add.sprite(-250, 0, 'kirby_banner').setOrigin(0, 0).setDepth(2)
    this.WaddleBanner = this.add.sprite(250, 444, 'waddle_banner').setOrigin(0, 1).setDepth(2)

    this.playerName = window.localStorage.getItem('kirby_player_name') || ''
    const UI_FONT = '"Press Start 2P", monospace'
    const UI_TEXT_RES = 2

    this.titleText = this.add.text(256, 55, 'Kirby Online', {
      fontFamily: UI_FONT,
      fontSize: '32px',
      color: '#fff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setResolution(UI_TEXT_RES)

    this.nameText = this.add.text(256, 95, this.getNameLabel(), {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: '#fff'
    }).setOrigin(0.5).setResolution(UI_TEXT_RES)
    // Le pseudo est déjà affiché dans le HUD (haut gauche) : on masque le texte central
    this.nameText.setVisible(false)

    this.statusText = this.add.text(256, 222, '', {
      fontFamily: UI_FONT,
      fontSize: '16px',
      color: '#fff',
      align: 'center'
    }).setOrigin(0.5).setResolution(UI_TEXT_RES)

    // Pseudos au-dessus des bannières (affichés uniquement quand un adversaire est trouvé)
    this.kirbyNameText = this.add.text(512 - 10, 10, '', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.25)',
      padding: { left: 6, right: 6, top: 4, bottom: 4 }
    }).setOrigin(1, 0).setDepth(3).setVisible(false).setResolution(UI_TEXT_RES)

    this.waddleNameText = this.add.text(10, 444 - 10, '', {
      fontFamily: UI_FONT,
      fontSize: '14px',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.25)',
      padding: { left: 6, right: 6, top: 4, bottom: 4 }
    }).setOrigin(0, 1).setDepth(3).setVisible(false).setResolution(UI_TEXT_RES)

    this.playBtn = this.makeButton(256, 250, 'Jouer', () => this.onPlay())
    this.nameBtn = this.makeButton(256, 300, 'Changer pseudo', () => this.openNameInput())
    this.cancelBtn = this.makeButton(256, 290, 'Annuler', () => this.onCancel())
    this.cancelBtn.setVisible(false)

    this.input.on('pointerdown', () => {
      if (this.currentPhase === 'found') {
        socket.emit('ready')
      }
    })

    socket.on('queue_error', ({ message } = {}) => {
      this.statusText.setText(message || 'Erreur pseudo')
      this.setPhase('main_menu')
    })

    socket.on('opponent_found', ({ opponentName, youAre } = {}) => {
      this.statusText.setText(`Clique pour te mettre prêt\nAdversaire : ${opponentName || '???'}`)
      this.setPhase('found')

      // Place les pseudos dès qu'on connaît l'adversaire
      const me = this.playerName || 'Moi'
      const opp = opponentName || '???'
      if (youAre === 'player1') {
        this.kirbyNameText.setText(me)
        this.waddleNameText.setText(opp)
      } else if (youAre === 'player2') {
        this.kirbyNameText.setText(opp)
        this.waddleNameText.setText(me)
      } else {
        // fallback : on ne sait pas qui est qui
        this.kirbyNameText.setText(me)
        this.waddleNameText.setText(opp)
      }

      // Stocke pour l'affichage en GameScene
      window.localStorage.setItem('kirby_kirby_name', this.kirbyNameText.text || '')
      window.localStorage.setItem('kirby_waddle_name', this.waddleNameText.text || '')
    })

    socket.on('status', (msg) => {
      if (msg === 'waiting') {
        this.statusText.setText('Recherche d’un adversaire...')
        this.setPhase('matchmaking')
      } else if (msg === 'idle' || msg === 'connected') {
        this.statusText.setText('')
        this.setPhase('main_menu')
      } else {
        // message libre (ex: adversaire déconnecté)
        this.statusText.setText(String(msg || ''))
        this.setPhase('main_menu')
      }
    })

    socket.on('status_ready', (data) => {
      this.players_data = data
      this.player1 = !!data?.player1?.ready
      this.player2 = !!data?.player2?.ready

      // Mise à jour "source of truth" avec les noms remontés par le serveur
      if (data?.player1?.name) this.kirbyNameText.setText(data.player1.name)
      if (data?.player2?.name) this.waddleNameText.setText(data.player2.name)

      if (this.currentPhase === 'found') {
        window.localStorage.setItem('kirby_kirby_name', this.kirbyNameText.text || '')
        window.localStorage.setItem('kirby_waddle_name', this.waddleNameText.text || '')
      }
    })

    socket.on('game_start', (msg) => {
      this.scene.start('GameScene', { msg })
    })

    // Affiche le menu au démarrage
    this.setPhase('main_menu')
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

  getNameLabel() {
    return this.playerName ? `Pseudo : ${this.playerName}` : 'Pseudo : (non défini)'
  }

  setPhase(phase) {
    this.currentPhase = phase
    const isMenu = phase === 'main_menu'
    this.playBtn.setVisible(isMenu)
    this.nameBtn.setVisible(isMenu)
    this.cancelBtn.setVisible(phase === 'matchmaking')

    const showMatchBanners = phase === 'found'
    this.topBars?.setVisible(showMatchBanners)
    this.bottomBars?.setVisible(showMatchBanners)
    this.kirbyBanner?.setVisible(showMatchBanners)
    this.WaddleBanner?.setVisible(showMatchBanners)
    this.kirbyNameText?.setVisible(showMatchBanners)
    this.waddleNameText?.setVisible(showMatchBanners)
  }

  onPlay() {
    if (!this.playerName) {
      this.openNameInput(() => this.joinQueue())
      return
    }
    this.joinQueue()
  }

  joinQueue() {
    this.statusText.setText('Recherche d’un adversaire...')
    this.setPhase('matchmaking')
    socket.emit('join_queue', { name: this.playerName })
  }

  onCancel() {
    socket.emit('leave_queue')
    this.statusText.setText('')
    this.setPhase('main_menu')
  }

  openNameInput(onDone) {
    this.setPhase('main_menu')
    this.statusText.setText('')

    if (this.nameDom) {
      this.nameDom.destroy()
      this.nameDom = null
    }

    const html = `
      <div style="display:flex; flex-direction:column; gap:8px; align-items:center;">
        <input id="kirbyName" type="text" maxlength="16" placeholder="Ton pseudo"
          value="${escapeHtml(this.playerName)}"
          style="width:240px; padding:10px; font-size:12px; border-radius:8px; border:1px solid #ccc; font-family: var(--kirby-font);" />
        <button id="kirbyOk" style="width:240px; padding:10px; font-size:12px; border-radius:8px; border:0; background:#ffffff; cursor:pointer; font-family: var(--kirby-font);">
          Valider
        </button>
      </div>
    `

    this.nameDom = this.add.dom(256, 222).createFromHTML(html)
    const input = this.nameDom.getChildByID('kirbyName')
    const ok = this.nameDom.getChildByID('kirbyOk')

    const submit = () => {
      const value = (input?.value || '').trim()
      this.playerName = value
      window.localStorage.setItem('kirby_player_name', value)
      refreshHud?.()
      this.nameText.setText(this.getNameLabel())
      this.nameDom?.destroy()
      this.nameDom = null
      if (typeof onDone === 'function') onDone()
    }

    ok?.addEventListener('click', submit)
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submit()
    })
    input?.focus?.()
  }

  makeButton(x, y, label, onClick) {
    const t = this.add.text(x, y, label, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: '18px',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.35)',
      padding: { left: 12, right: 12, top: 8, bottom: 8 }
    }).setOrigin(0.5)
    t.setResolution(2)

    t.setInteractive({ useHandCursor: true })
    t.on('pointerdown', () => onClick?.())
    t.on('pointerover', () => t.setStyle({ backgroundColor: 'rgba(0,0,0,0.55)' }))
    t.on('pointerout', () => t.setStyle({ backgroundColor: 'rgba(0,0,0,0.35)' }))
    return t
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}
