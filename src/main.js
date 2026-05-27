// Game configuration constants shared across scenes
const SCALE = 3.0;

// Phaser game configuration
const config = {
    type: Phaser.CANVAS,
    pixelArt: true,
    width: 1440,
    height: 900,
    parent: 'phaser-game',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 1500 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [Load, TitleScene, Platformer]
};

const game = new Phaser.Game(config);
