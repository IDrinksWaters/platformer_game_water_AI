/**
 * Platformer Scene
 * The main gameplay scene. Orchestrates the tilemap, player, coins,
 * monsters, water cup, particles, HUD, audio, and all game logic.
 * Delegates to modular helper classes to keep create() and update() concise.
 */
class Platformer extends Phaser.Scene {
    constructor() {
        super('Platformer');
    }

    // ─── LIFECYCLE: CREATE ───────────────────────────────────────────

    create() {
        // Fade in from black over 400ms
        this.cameras.main.fadeIn(400, 0, 0, 0);

        // Build the tilemap and collision layers
        this._setupTilemap();

        // Spawn coins from the Objects layer
        this._spawnCoins();

        // Create the player at the designed spawn point (x=50, y=200)
        this.player = new Player(this, 50, 200);

        // Spawn monsters at their hardcoded X positions
        this._spawnMonsters();

        // Create the water cup (invisible/disabled until all coins collected)
        this.waterCup = new WaterCup(this, 50, 50, this.groundLayer);

        // Set up physics collisions and overlaps
        this._setupPhysics();

        // Configure the camera (zoom, bounds, follow, deadzone)
        this._setupCamera();

        // Initialize the particle system (generates the shared texture + emitters)
        this.particles = new ParticleManager(this);

        // Initialize the HUD (coin counter + health pips)
        this.hud = new HUDManager(this);
        this.hud.updateCoinDisplay(0, this.totalCoins, 0);

        // Set up cursor keys for player input
        this.cursors = this.input.keyboard.createCursorKeys();

        // Play in-game background music on loop
        this.ingameBGM = this.sound.add('ingame_bgm', { loop: true, volume: 0.6 });
        this.ingameBGM.play();

        // Footstep sound — played/stopped dynamically in update()
        this.footsteps = this.sound.add('footsteps', { loop: true, volume: 0.5 });

        // Game state tracking
        this.coinsCollected = 0;
        this.jumpUpgrades = 0;
        this.isGameOver = false;
        this.isWin = false;

        // Track whether player was airborne last frame (for landing detection)
        this.playerWasAirborne = false;

        // R key: immediate level restart (no confirmation)
        this.input.keyboard.on('keydown-R', () => {
            this._restartLevel();
        });

        // D key: toggle physics debug drawing on/off
        this.input.keyboard.on('keydown-D', () => {
            this.physics.world.debugActive = !this.physics.world.debugActive;
        });
    }

    // ─── TILEMAP SETUP ──────────────────────────────────────────────

    /** Loads the tilemap, creates layers, and configures collision */
    _setupTilemap() {
        // Load the tilemap from the preloaded JSON
        this.map = this.make.tilemap({ key: 'platformer' });

        // Map the tileset name "1bit_platformer" (from the Tiled JSON)
        // to our loaded image key "tilemap_tiles"
        this.tileset = this.map.addTilesetImage('1bit_platformer', 'tilemap_tiles');

        // Create the background layer — the primary visible AND collision layer
        this.groundLayer = this.map.createLayer('background', this.tileset, 0, 0);

        // Enable collision on all tiles with custom property "collides: true"
        this.groundLayer.setCollisionByProperty({ collides: true });

        // Create the Objects layer (used only for coin spawn metadata — not rendered)
        this.objectsLayer = this.map.createLayer('Objects', this.tileset, 0, 0);
        this.objectsLayer.setVisible(false);

        // Extend physics world bounds to 3× the map height so the player
        // can fall below the visible tile area before the death check triggers
        this.physics.world.setBounds(
            0, 0,
            this.map.widthInPixels,
            this.map.heightInPixels * 3
        );
    }

    // ─── COIN SPAWNING ──────────────────────────────────────────────

    /** Scans the Objects layer for tile index 63 and creates coin sprites */
    _spawnCoins() {
        // In the Objects layer, tiles with gid 63 mark coin spawn positions
        // (gid 63 = local tile id 62, which is the "coin" type in the tileset)
        const coinTiles = this.objectsLayer.filterTiles(tile => tile.index === 63);
        this.totalCoins = coinTiles.length;

        // Static physics group: coins are immovable decorations
        this.coins = this.physics.add.staticGroup();

        coinTiles.forEach(tile => {
            // Place each coin at the CENTER of its tile
            const cx = tile.pixelX + tile.width / 2;
            const cy = tile.pixelY + tile.height / 2;
            // Frame 62 = coin visual from the transparent sprite sheet
            this.coins.create(cx, cy, 'tilemap_sheet', 62);
        });
    }

    // ─── MONSTER SPAWNING ────────────────────────────────────────────

    /** Creates 4 monsters at hardcoded X positions from DESIGN.md */
    _spawnMonsters() {
        const monsterXPositions = [300, 600, 900, 1200];
        this.monsters = [];

        monsterXPositions.forEach((x, index) => {
            // Alternating initial direction: index 0,2 walk left; 1,3 walk right
            const direction = (index % 2 === 0) ? -1 : 1;

            // Find the Y position by scanning from row 0 downward
            // for the first collidable tile at this X
            const y = this._findGroundY(x);

            const monster = new Monster(this, x, y, direction, this.groundLayer);
            this.monsters.push(monster);
        });
    }

    /**
     * Scans from the top of the tilemap downward to find the first
     * collidable tile at a given world X position.
     * @param {number} worldX - World X coordinate
     * @returns {number} World Y coordinate to place the monster (center of sprite above tile)
     */
    _findGroundY(worldX) {
        const tileColumn = Math.floor(worldX / this.map.tileWidth);

        for (let row = 0; row < this.map.height; row++) {
            const tile = this.groundLayer.getTileAt(tileColumn, row);
            if (tile && tile.properties && tile.properties.collides) {
                // Place the monster centered above this tile
                // tile.pixelY = top of tile, sprite is 16px tall, so center is 8px above
                return tile.pixelY - 8;
            }
        }

        // Fallback if no ground found at this X
        return 200;
    }

    // ─── PHYSICS SETUP ──────────────────────────────────────────────

    /** Configures collisions and overlap triggers */
    _setupPhysics() {
        // Player collides with the ground layer (terrain)
        this.physics.add.collider(this.player.sprite, this.groundLayer);

        // Monsters collide with the ground layer
        this.monsters.forEach(monster => {
            this.physics.add.collider(monster.sprite, this.groundLayer);
        });

        // Player overlaps coins → collect them
        this.physics.add.overlap(
            this.player.sprite, this.coins,
            this._onCoinCollected, null, this
        );

        // Player overlaps each monster → take damage
        this.monsters.forEach(monster => {
            this.physics.add.overlap(
                this.player.sprite, monster.sprite,
                this._onMonsterContact, null, this
            );
        });

        // Player overlaps water cup → win condition
        this.physics.add.overlap(
            this.player.sprite, this.waterCup.sprite,
            this._onWaterCupCollected, null, this
        );
    }

    // ─── CAMERA SETUP ────────────────────────────────────────────────

    /** Configures the camera: zoom, bounds, follow, and deadzone */
    _setupCamera() {
        const camera = this.cameras.main;
        camera.setZoom(SCALE);
        camera.setBounds(0, 0, this.map.widthInPixels, this.map.heightInPixels);
        // Follow player with lerp 0.25 horizontal/vertical and 50×50 deadzone
        camera.startFollow(this.player.sprite, true, 0.25, 0.25);
        camera.setDeadzone(50, 50);
    }

    // ─── LIFECYCLE: UPDATE ──────────────────────────────────────────

    update() {
        if (this.isGameOver || this.isWin) return;

        // Delegate player input/movement/animation to the Player class
        this.player.update(this.cursors);

        // Update each monster's patrol AI
        this.monsters.forEach(monster => monster.update());

        // Position run-particle emitters at the player's feet
        this.particles.updateRunEmitters(this.player.sprite);

        // --- Landing Detection ---
        // Fire on the first frame the player transitions from airborne to grounded
        const isGrounded = this.player.sprite.body.blocked.down;
        if (this.playerWasAirborne && isGrounded) {
            this.sound.play('landed', { volume: 0.6 });
            this.particles.burstLand(this.player.sprite);
        }
        this.playerWasAirborne = !isGrounded;

        // --- Footsteps Audio ---
        // Play looping footsteps while moving on ground; stop when idle/airborne/dead
        const isMoving = Math.abs(this.player.sprite.body.velocity.x) > 10;
        if (isMoving && isGrounded && !this.footsteps.isPlaying
            && this.player.isAlive && !this.player.controlsLocked) {
            this.footsteps.play();
        } else if ((!isMoving || !isGrounded || !this.player.isAlive)
                   && this.footsteps.isPlaying) {
            this.footsteps.stop();
        }

        // --- Fall Death ---
        // If the player falls below the tilemap, instant kill regardless of health
        if (this.player.sprite.y > this.map.heightInPixels) {
            this.player.fallDeath(() => this._onPlayerDeath());
        }

        // --- Update HUD ---
        // Reposition health pips above the player each frame
        this.hud.updateHealthPips(
            this.player.sprite,
            this.player.health,
            this.player.MAX_HEALTH
        );
    }

    // ─── COIN COLLECTION ─────────────────────────────────────────────

    /** Called when the player overlaps a coin sprite */
    _onCoinCollected(playerSprite, coinSprite) {
        // Destroy the coin, play sound, emit particles
        coinSprite.destroy();
        this.sound.play('coincollect', { volume: 0.8 });
        this.particles.burstCollect(coinSprite.x, coinSprite.y, 12);

        this.coinsCollected++;

        // Check for jump upgrade (every 10 coins)
        this._checkJumpUpgrade();

        // Update the HUD coin display
        this.hud.updateCoinDisplay(this.coinsCollected, this.totalCoins, this.jumpUpgrades);

        // Check if all coins collected → activate water cup
        if (this.coinsCollected >= this.totalCoins) {
            this.waterCup.activate(this.player, (cupX, cupY) => {
                // Particle burst at the cup's spawn location
                this.particles.burstCollect(cupX, cupY, 20);
            });
        }
    }

    /** Checks if the player has earned a new jump upgrade (every 10 coins) */
    _checkJumpUpgrade() {
        const newUpgrades = Math.floor(this.coinsCollected / 10);
        if (newUpgrades > this.jumpUpgrades) {
            // Apply the upgrade to the player
            const { oldVel, newVel } = this.player.upgradeJump();
            this.jumpUpgrades = newUpgrades;

            // Display upgrade message centered on screen for 2 seconds
            const worldView = this.cameras.main.worldView;
            const msg = this.add.text(
                worldView.centerX,
                worldView.centerY,
                `Jump upgraded! (${oldVel} → ${newVel})`,
                {
                    fontFamily: 'pixelzone',
                    fontSize: '8px',
                    color: '#ffffff',
                    backgroundColor: '#000000',
                    padding: { x: 4, y: 4 }
                }
            ).setOrigin(0.5).setScrollFactor(0).setDepth(200).setScale(2);

            this.time.delayedCall(2000, () => msg.destroy());
        }
    }

    // ─── MONSTER CONTACT ─────────────────────────────────────────────

    /** Called when the player overlaps a monster sprite */
    _onMonsterContact(playerSprite, monsterSprite) {
        // Delegate damage handling to the Player class
        this.player.damage(monsterSprite.x, () => this._onPlayerDeath());
    }

    // ─── WATER CUP COLLECTION ───────────────────────────────────────

    /** Called when the player overlaps the water cup after all coins collected */
    _onWaterCupCollected(playerSprite, cupSprite) {
        this.waterCup.collect(() => this._onWin());
    }

    // ─── DEATH HANDLING ─────────────────────────────────────────────

    /** Triggered when the player's health reaches 0 or they fall off the map */
    _onPlayerDeath() {
        if (this.isGameOver) return;
        this.isGameOver = true;

        // Stop footsteps and BGM
        this.footsteps.stop();
        this.ingameBGM.stop();
        this.particles.stopAll();

        // Hide the HUD
        this.hud.hide();

        // Show death overlay after a brief pause
        this.time.delayedCall(500, () => this._showDeathScreen());
    }

    /** Displays the "You Died" overlay with a Restart button */
    _showDeathScreen() {
        const worldView = this.cameras.main.worldView;

        // Semi-transparent black overlay (65% opacity) covering the full camera viewport
        const overlay = this.add.rectangle(
            worldView.centerX, worldView.centerY,
            worldView.width, worldView.height,
            0x000000, 0.65
        ).setScrollFactor(0).setDepth(300);

        // "You Died" text in red, scaled 5×
        this.add.text(worldView.centerX, worldView.centerY - 20, 'You Died', {
            fontFamily: 'pixelzone',
            fontSize: '16px',
            color: '#ff3333'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setScale(5);

        // "Restart" button: white background, black text
        const restartBtn = this.add.text(
            worldView.centerX, worldView.centerY + 40, 'Restart', {
            fontFamily: 'pixelzone',
            fontSize: '12px',
            color: '#000000',
            backgroundColor: '#ffffff',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });

        // Hover: invert colors (dark bg, white text)
        restartBtn.on('pointerover', () => {
            restartBtn.setStyle({ backgroundColor: '#333333', color: '#ffffff' });
        });
        restartBtn.on('pointerout', () => {
            restartBtn.setStyle({ backgroundColor: '#ffffff', color: '#000000' });
        });

        // On click: stop all audio, fade out 300ms (black), restart the gameplay scene
        restartBtn.on('pointerdown', () => {
            this.sound.stopAll();
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.time.delayedCall(300, () => {
                this.scene.restart();
            });
        });
    }

    // ─── WIN HANDLING ───────────────────────────────────────────────

    /** Triggered when the player collects the water cup after all coins */
    _onWin() {
        if (this.isWin) return;
        this.isWin = true;

        // Player becomes invisible and physics body disabled
        this.player.sprite.setVisible(false);
        this.player.sprite.body.setEnable(false);

        // Stop all VFX and in-game audio
        this.particles.stopAll();
        this.footsteps.stop();
        this.ingameBGM.stop();

        // Hide the HUD
        this.hud.hide();

        // Play win music on loop at 0.8 volume
        this.winSong = this.sound.add('win_song', { loop: true, volume: 0.8 });
        this.winSong.play();

        // Show win overlay after a brief moment
        this.time.delayedCall(200, () => this._showWinScreen());
    }

    /** Displays the "You drank the water" overlay with a Play Again button */
    _showWinScreen() {
        const worldView = this.cameras.main.worldView;

        // Semi-transparent dark blue overlay (#001133, 75% opacity)
        const overlay = this.add.rectangle(
            worldView.centerX, worldView.centerY,
            worldView.width, worldView.height,
            0x001133, 0.75
        ).setScrollFactor(0).setDepth(300);

        // "You drank the water" text in light blue
        this.add.text(
            worldView.centerX, worldView.centerY - 20,
            'You drank the water', {
            fontFamily: 'pixelzone',
            fontSize: '12px',
            color: '#66ccff'
        }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setScale(3);

        // "Play Again" button: light blue bg, black text
        const playAgainBtn = this.add.text(
            worldView.centerX, worldView.centerY + 40,
            'Play Again', {
            fontFamily: 'pixelzone',
            fontSize: '12px',
            color: '#000000',
            backgroundColor: '#66ccff',
            padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setScrollFactor(0).setDepth(301).setInteractive({ useHandCursor: true });

        // Hover: dark blue bg, white text
        playAgainBtn.on('pointerover', () => {
            playAgainBtn.setStyle({ backgroundColor: '#004466', color: '#ffffff' });
        });
        playAgainBtn.on('pointerout', () => {
            playAgainBtn.setStyle({ backgroundColor: '#66ccff', color: '#000000' });
        });

        // On click: stop all audio, fade out 300ms, return to title scene
        playAgainBtn.on('pointerdown', () => {
            this.sound.stopAll();
            this.cameras.main.fadeOut(300, 0, 0, 0);
            this.time.delayedCall(300, () => {
                this.scene.start('TitleScene');
            });
        });
    }

    // ─── LEVEL RESTART ──────────────────────────────────────────────

    /** Immediately restarts the current level (R key) */
    _restartLevel() {
        this.sound.stopAll();
        this.scene.restart();
    }
}
