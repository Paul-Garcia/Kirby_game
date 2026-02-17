import Phaser from 'phaser'
import { MenuScene } from './online_game/MenuScene'
import { GameScene } from './online_game/GameScene'
import { ResultScene } from './online_game/ResultScene'
import { GravityScene } from './gravity/GravityScene.js'

async function ensureFontsLoaded() {
  // Older browsers / non-CSS-font environments: just continue.
  if (typeof document === 'undefined' || !document.fonts?.load) return

  // Trigger font loading; don't block forever (avoid a blank screen).
  const timeoutMs = 2000
  const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs))

  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('12px "Press Start 2P"'),
        document.fonts.ready,
      ]),
      timeout,
    ])
  } catch {
    // If font loading fails, Phaser will fall back to the next font in the stack.
  }
}

const config = {
  type: Phaser.AUTO,
  width: 512,
  height: 444,
  backgroundColor: '#00ff1a',
  parent: 'game1',
  dom: {
    createContainer: true,
  },
  scene: [MenuScene, GameScene, ResultScene],
}

const config2 = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2020b0',
  parent: 'game2',
  scale: {
    mode: Phaser.Scale.RESIZE, // le canvas s’adapte à la fenêtre
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  scene: [GravityScene]
}

async function boot() {
  await ensureFontsLoaded()
  new Phaser.Game(config)
  new Phaser.Game(config2)
}

boot()
    
