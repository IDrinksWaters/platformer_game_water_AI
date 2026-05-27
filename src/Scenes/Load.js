/**
 * Load Scene
 * Preloads all game assets (images, spritesheets, tilemap, audio)
 * and ensures the pixelzone font is available before proceeding.
 */
class Load extends Phaser.Scene {
    constructor() {
        super('LoadScene');
    }

    preload() {
        // Display loading text while assets download
        const cx = this.cameras.main.centerX;
        const cy = this.cameras.main.centerY;
        this.add.text(cx, cy - 30, 'Loading...', {
            fontFamily: 'monospace', fontSize: '24px', color: '#ffffff'
        }).setOrigin(0.5);

        // Progress bar visuals
        const barBg = this.add.graphics();
        const bar = this.add.graphics();
        barBg.fillStyle(0x333333, 1);
        barBg.fillRect(cx - 160, cy + 10, 320, 30);

        this.load.on('progress', (value) => {
            bar.clear();
            bar.fillStyle(0xffffff, 1);
            bar.fillRect(cx - 156, cy + 14, 312 * value, 22);
        });

        // --- Load Game Assets ---

        // Tilemap JSON (level layout and collision data)
        this.load.tilemapTiledJSON('platformer', 'assets/1bit_platformer.tmj');

        // Tileset image used for the background layer (opaque, no transparency)
        this.load.image('tilemap_tiles', 'assets/monochrome_tilemap_packed.png');

        // Transparent sprite sheet for all dynamic objects (player, coins, monsters, cup)
        // 20 columns x 20 rows of 16x16 frames = 400 total frames
        this.load.spritesheet('tilemap_sheet', 'assets/monochrome_tilemap_transparent_packed.png', {
            frameWidth: 16,
            frameHeight: 16
        });

        // Audio assets
        this.load.audio('titlescreen_bgm', 'assets/titlescreen_bgm.mp3');
        this.load.audio('ingame_bgm', 'assets/ingame_bgm.mp3');
        this.load.audio('footsteps', 'assets/footsteps.mp3');
        this.load.audio('landed', 'assets/landed.mp3');
        this.load.audio('coincollect', 'assets/coincollect.mp3');
        this.load.audio('water_unlock', 'assets/water_unlock.mp3');
        this.load.audio('win_song', 'assets/win_song.mp3');
    }

    create() {
        // Use the FontFace API to ensure pixelzone.ttf is fully loaded
        // before transitioning to the title screen, so text renders correctly
        const loadFont = async () => {
            try {
                const font = new FontFace('pixelzone', 'url(./assets/pixelzone.ttf)');
                const loaded = await font.load();
                document.fonts.add(loaded);
            } catch (e) {
                // Font may already be loaded via CSS @font-face; continue either way
                console.warn('FontFace load warning:', e);
            }
            // Wait for all document fonts to be ready, then start title scene
            await document.fonts.ready;
            this.scene.start('TitleScene');
        };
        loadFont();
    }
}
