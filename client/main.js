import Phaser from 'phaser'
import { MenuScene } from './online_game/MenuScene'
import { GameScene } from './online_game/GameScene'
import { ResultScene } from './online_game/ResultScene'
import { GravityScene } from './gravity/GravityScene.js'
const config = {
  type: Phaser.AUTO,
  width: 512,
  height: 444,
  backgroundColor: '#00ff1a',
  parent: 'game1',
  scene: [MenuScene, GameScene, ResultScene],
}

new Phaser.Game(config)

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

new Phaser.Game(config2)
    
