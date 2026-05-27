/**
 * HUDManager Class
 * Manages the Heads-Up Display: coin/upgrade counter (fixed to camera)
 * and world-space health pips that follow the player.
 */
class HUDManager {
    /**
     * @param {Phaser.Scene} scene - The scene this HUD belongs to
     */
    constructor(scene) {
        this.scene = scene;

        // Create the coin/upgrade text (fixed to camera, doesn't scroll)
        this._createCoinText();

        // Create the health pip graphics (positioned in world space each frame)
        this.healthGraphics = scene.add.graphics();

        // Create the "HP" label text (world space, follows player)
        this.hpLabel = scene.add.text(0, 0, 'HP', {
            fontFamily: 'pixelzone',
            fontSize: '8px',
            color: '#ffffff'
        }).setOrigin(0.5);
    }

    /** Creates the coin/upgrade HUD text in the top-left corner of the camera */
    _createCoinText() {
        // Background rectangle with 4px padding
        this.hudBg = this.scene.add.rectangle(0, 0, 1, 1, 0x000000)
            .setOrigin(0, 0)
            .setScrollFactor(0)
            .setDepth(100);

        // Main HUD text
        this.coinText = this.scene.add.text(16, 16, '', {
            fontFamily: 'pixelzone',
            fontSize: '8px',
            color: '#ffffff'
        }).setScrollFactor(0).setDepth(101).setScale(2);
    }

    /**
     * Updates the coin/upgrade HUD text.
     * @param {number} collected - Coins collected so far
     * @param {number} total - Total coins in the level
     * @param {number} upgrades - Number of jump upgrades earned
     */
    updateCoinDisplay(collected, total, upgrades) {
        const nextIn = 10 - (collected % 10);
        const text = `Coins: ${collected}/${total}  |  Upgrades: ${upgrades}  |  Next in: ${nextIn}`;
        this.coinText.setText(text);

        // Resize background to fit the text
        const textWidth = this.coinText.width * 2;
        const textHeight = this.coinText.height * 2;
        this.hudBg.setSize(textWidth + 8, textHeight + 8);
        this.hudBg.setPosition(12, 12);
    }

    /**
     * Updates the world-space health pips and HP label to follow the player.
     * @param {Phaser.Physics.Arcade.Sprite} playerSprite
     * @param {number} health - Current health (0–3)
     * @param {number} maxHealth - Maximum health (3)
     */
    updateHealthPips(playerSprite, health, maxHealth) {
        this.healthGraphics.clear();

        // Pips are positioned above the player's head
        const pipSize = 4;       // Base pip size in pixels
        const pipScale = 2;      // Scale factor
        const gap = 1;           // 1px gap between pips (base)
        const totalPipWidth = maxHealth * pipSize * pipScale + (maxHealth - 1) * gap * pipScale;
        const startX = playerSprite.x - totalPipWidth / 2;
        const pipY = playerSprite.y - playerSprite.height / 2 - 12;

        for (let i = 0; i < maxHealth; i++) {
            const px = startX + i * (pipSize * pipScale + gap * pipScale);
            const py = pipY;
            const size = pipSize * pipScale;

            // Black background with 1px white stroke (outline)
            this.healthGraphics.lineStyle(1, 0xffffff, 1);
            this.healthGraphics.fillStyle(0x000000, 1);
            this.healthGraphics.fillRect(px, py, size, size);
            this.healthGraphics.strokeRect(px, py, size, size);

            // If this pip represents current health, fill it white
            if (i < health) {
                this.healthGraphics.fillStyle(0xffffff, 1);
                this.healthGraphics.fillRect(px, py, size, size);
            }
        }

        // Position "HP" label centered above the pips
        this.hpLabel.setPosition(playerSprite.x, pipY - 6);
    }

    /** Hides all HUD elements (used during win/death overlays) */
    hide() {
        this.coinText.setVisible(false);
        this.hudBg.setVisible(false);
        this.healthGraphics.setVisible(false);
        this.hpLabel.setVisible(false);
    }
}
