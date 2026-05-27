/**
 * Title Scene
 * Shows the animated "Water" title with a Start button.
 * Plays title screen background music on loop.
 */
class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;

        // Play title screen BGM on loop at 0.7 volume
        this.titleBGM = this.sound.add('titlescreen_bgm', { loop: true, volume: 0.7 });
        this.titleBGM.play();

        // "Water" title text with gentle floating animation
        this.titleText = this.add.text(cx, cy - 100, 'Water', {
            fontFamily: 'pixelzone',
            fontSize: '64px',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Bob the title up and down with a sine wave tween
        this.tweens.add({
            targets: this.titleText,
            y: cy - 120,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // "Start" button
        const startBtn = this.add.text(cx, cy + 40, 'Start', {
            fontFamily: 'pixelzone',
            fontSize: '24px',
            color: '#ffffff',
            backgroundColor: '#000000',
            padding: { x: 16, y: 8 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        // Hover effects: invert colors on mouseover
        startBtn.on('pointerover', () => {
            startBtn.setStyle({ backgroundColor: '#ffffff', color: '#000000' });
        });
        startBtn.on('pointerout', () => {
            startBtn.setStyle({ backgroundColor: '#000000', color: '#ffffff' });
        });

        // On click: stop BGM, fade out, transition to gameplay
        startBtn.on('pointerdown', () => {
            this.titleBGM.stop();
            this.cameras.main.fadeOut(400, 0, 0, 0);
            // Wait for fade to complete, then switch scene
            this.time.delayedCall(400, () => {
                this.scene.start('Platformer');
            });
        });
    }
}
