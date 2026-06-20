/* ============================================
   SOLANA TREASURE HUNT — MapGenerator
   Procedural 2D tile engine with Pixel Fantasy styling
   ============================================ */

class MapGenerator {
  constructor(cols, rows, tileSize) {
    this.cols = cols;
    this.rows = rows;
    this.tileSize = tileSize;
    this.tiles = []; // 2D array: cols x rows
    this.walkableMap = []; // 2D boolean array
    this.zones = {}; // Map coordinates to zone descriptions
  }

  // Pixel Fantasy Color Palette
  static COLORS = {
    // Grass variants
    GRASS_LIGHT: '#6bc94d',
    GRASS_MID: '#5ba846',
    GRASS_DARK: '#4a8c38',
    GRASS_SHADOW: '#3d7a2e',
    
    // Tall grass
    TALL_GRASS: '#4a7c23',
    TALL_GRASS_DARK: '#3d661d',
    
    // Water
    WATER_LIGHT: '#87ceeb',
    WATER_MID: '#4fc3f7',
    WATER_DARK: '#29b6f6',
    WATER_DEEP: '#0288d1',
    
    // Dirt/Path
    DIRT_LIGHT: '#d4b896',
    DIRT_MID: '#c4a882',
    DIRT_DARK: '#b09870',
    
    // Trees
    TRUNK: '#8d6e63',
    TRUNK_DARK: '#6d4c41',
    LEAVES_LIGHT: '#7cb342',
    LEAVES_MID: '#558b2f',
    LEAVES_DARK: '#33691e',
    LEAVES_SHADOW: '#1b5e20',
    
    // Flowers
    FLOWER_RED: '#e53935',
    FLOWER_YELLOW: '#fdd835',
    FLOWER_WHITE: '#ffffff',
    
    // Rocks/Mountains
    ROCK_LIGHT: '#b0bec5',
    ROCK_MID: '#78909c',
    ROCK_DARK: '#546e7a',
    
    // Wood/Buildings
    WOOD_LIGHT: '#d7ccc8',
    WOOD_MID: '#bcaaa4',
    WOOD_DARK: '#8d6e63',
    WOOD_VERY_DARK: '#5d4037',
    
    // Roof
    ROOF_RED: '#d32f2f',
    ROOF_DARK: '#b71c1c',
    ROOF_LIGHT: '#ef5350',
    
    // Windows
    WINDOW_LIGHT: '#fff9c4',
    WINDOW_GLOW: '#fff176',
    
    // Bridge
    BRIDGE_WOOD: '#a1887f',
    BRIDGE_DARK: '#8d6e63',
    ROPE: '#d7ccc8'
  };

  // Generates randomized tile layout based on noise approximations
  generate() {
    this.tiles = [];
    this.walkableMap = [];

    // Initialize blank grid with grass
    for (let c = 0; c < this.cols; c++) {
      this.tiles[c] = [];
      this.walkableMap[c] = [];
      for (let r = 0; r < this.rows; r++) {
        this.tiles[c][r] = 0; // Grass
        this.walkableMap[c][r] = true;
      }
    }

    // 1. Procedural boundary walls: Rocky mountains surrounding the map edges
    for (let c = 0; c < this.cols; c++) {
      for (let r = 0; r < this.rows; r++) {
        if (c === 0 || c === this.cols - 1 || r === 0 || r === this.rows - 1) {
          this.tiles[c][r] = 5; // Rock border
          this.walkableMap[c][r] = false;
        }
      }
    }

    // 2. Spawn a central village path and houses
    const centerCol = Math.floor(this.cols / 2);
    const centerRow = Math.floor(this.rows / 2);
    
    // Main paths - wider for cozy village feel
    for (let r = 2; r < this.rows - 2; r++) {
      this.tiles[centerCol][r] = 4; // Path down center
      this.tiles[centerCol - 1][r] = 4; // 2 tiles wide
    }
    for (let c = 2; c < this.cols - 2; c++) {
      this.tiles[c][centerRow] = 4; // Path across center
      this.tiles[c][centerRow - 1] = 4;
    }

    // Build cozy houses in the village (Pixel Fantasy style)
    const houseCoords = [
      { c: centerCol - 6, r: centerRow - 6 },
      { c: centerCol + 4, r: centerRow - 6 },
      { c: centerCol - 6, r: centerRow + 4 },
      { c: centerCol + 4, r: centerRow + 4 }
    ];

    for (const h of houseCoords) {
      // 4x3 footprint for cozy houses
      for (let dc = 0; dc < 4; dc++) {
        for (let dr = 0; dr < 3; dr++) {
          const col = h.c + dc;
          const row = h.r + dr;
          if (dc === 1 && dr === 2) {
            this.tiles[col][row] = 4; // Doorway
            this.walkableMap[col][row] = true;
          } else {
            this.tiles[col][row] = 9; // House
            this.walkableMap[col][row] = false;
          }
        }
      }
    }

    // 3. Create a running river (water) - more natural winding path
    const riverRow = centerRow - 10;
    for (let c = 1; c < this.cols - 1; c++) {
      // Main river channel
      this.tiles[c][riverRow] = 3;
      this.walkableMap[c][riverRow] = false;
      this.tiles[c][riverRow + 1] = 3;
      this.walkableMap[c][riverRow + 1] = false;
      
      // Add some width variation
      if (c % 7 === 0) {
        this.tiles[c][riverRow + 2] = 3;
        this.walkableMap[c][riverRow + 2] = false;
      }
    }

    // Add wooden bridges over the river at paths intersection
    const bridgeCols = [centerCol - 1, centerCol];
    for (const bc of bridgeCols) {
      this.tiles[bc][riverRow] = 8;
      this.walkableMap[bc][riverRow] = true;
      this.tiles[bc][riverRow + 1] = 8;
      this.walkableMap[bc][riverRow + 1] = true;
    }

    // 4. Populate clusters of trees (Forest zones) - Pixel Fantasy style
    const forestSeeds = [
      { c: 5, r: 5, size: 6 },
      { c: 7, r: this.rows - 7, size: 5 },
      { c: this.cols - 7, r: 5, size: 6 },
      { c: this.cols - 7, r: this.rows - 7, size: 5 },
      { c: 12, r: 15, size: 4 },
      { c: this.cols - 15, r: this.rows - 18, size: 4 }
    ];

    for (const seed of forestSeeds) {
      for (let dc = -seed.size; dc <= seed.size; dc++) {
        for (let dr = -seed.size; dr <= seed.size; dr++) {
          const col = seed.c + dc;
          const row = seed.r + dr;
          if (col > 0 && col < this.cols - 1 && row > 0 && row < this.rows - 1) {
            // Avoid overwriting river, paths, bridges, houses
            const currentTile = this.tiles[col][row];
            if (currentTile !== 3 && currentTile !== 4 && currentTile !== 8 && currentTile !== 9) {
              const distance = Math.sqrt(dc * dc + dr * dr);
              if (distance < 2.5 + Math.random() * 2.5) {
                this.tiles[col][row] = 2; // Tree
                this.walkableMap[col][row] = false;
              } else if (distance < 4.5 && Math.random() > 0.3) {
                this.tiles[col][row] = 7; // Bush (slowing obstacle)
              }
            }
          }
        }
      }
    }

    // 5. Add flowers, tall grass, and decorative details randomly
    for (let c = 1; c < this.cols - 1; c++) {
      for (let r = 1; r < this.rows - 1; r++) {
        // Skip paths, buildings, trees, water
        if (this.tiles[c][r] === 0) {
          const rand = Math.random();
          if (rand < 0.10) {
            this.tiles[c][r] = 1; // Tall grass
          } else if (rand < 0.14) {
            this.tiles[c][r] = 6; // Flower
          } else if (rand < 0.17) {
            this.tiles[c][r] = 7; // Bush
          }
        }
      }
    }

    // 6. Add some decorative rocks scattered around
    for (let i = 0; i < 15; i++) {
      const col = 3 + Math.floor(Math.random() * (this.cols - 6));
      const row = 3 + Math.floor(Math.random() * (this.rows - 6));
      if (this.tiles[col][row] === 0 && this.tiles[col][row] !== 4) {
        this.tiles[col][row] = 10; // Decorative rock
      }
    }
  }

  getTile(col, row) {
    if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
      return 5; // Return impassable rock outer border
    }
    return this.tiles[col][row];
  }

  isWalkable(pixelX, pixelY) {
    // Check bounding box collisions around player pixel center
    const checkRadius = 14;
    const checkPoints = [
      { x: pixelX - checkRadius, y: pixelY - 5 },
      { x: pixelX + checkRadius, y: pixelY - 5 },
      { x: pixelX - checkRadius, y: pixelY + 16 },
      { x: pixelX + checkRadius, y: pixelY + 16 },
      { x: pixelX, y: pixelY }
    ];

    for (const pt of checkPoints) {
      const col = Math.floor(pt.x / this.tileSize);
      const row = Math.floor(pt.y / this.tileSize);

      if (col < 0 || col >= this.cols || row < 0 || row >= this.rows) {
        return false;
      }
      if (!this.walkableMap[col][row]) {
        return false;
      }
    }
    return true;
  }

  getSpawnPoints(count) {
    const points = [];
    let attempts = 0;
    
    while (points.length < count && attempts < 2000) {
      attempts++;
      const col = 2 + Math.floor(Math.random() * (this.cols - 4));
      const row = 2 + Math.floor(Math.random() * (this.rows - 4));

      // Make sure the tile is completely walkable and not on path, bridge, or house doors
      if (this.walkableMap[col][row] && this.tiles[col][row] !== 4 && this.tiles[col][row] !== 8) {
        const x = col * this.tileSize + this.tileSize / 2;
        const y = row * this.tileSize + this.tileSize / 2;
        
        // Avoid duplicate spawn placements
        if (!points.some(p => p.x === x && p.y === y)) {
          points.push({ x, y });
        }
      }
    }
    return points;
  }

  render(ctx, camera) {
    const C = MapGenerator.COLORS;
    
    const startCol = Math.max(0, Math.floor(camera.x / this.tileSize));
    const endCol = Math.min(this.cols - 1, Math.floor((camera.x + camera.width) / this.tileSize) + 1);
    const startRow = Math.max(0, Math.floor(camera.y / this.tileSize));
    const endRow = Math.min(this.rows - 1, Math.floor((camera.y + camera.height) / this.tileSize) + 1);

    ctx.save();
    
    const waveOffset = Math.floor(Date.now() / 400) % 2;
    const time = Date.now() / 1000;

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const tileType = this.tiles[c][r];
        const x = c * this.tileSize - camera.x;
        const y = r * this.tileSize - camera.y;
        const ts = this.tileSize;

        switch(tileType) {
          case 0: this._drawGrass(ctx, x, y, ts, c, r, time); break;
          case 1: this._drawTallGrass(ctx, x, y, ts, c, r, time); break;
          case 2: this._drawTree(ctx, x, y, ts, c, r); break;
          case 3: this._drawWater(ctx, x, y, ts, c, r, waveOffset, time); break;
          case 4: this._drawPath(ctx, x, y, ts, c, r); break;
          case 5: this._drawRock(ctx, x, y, ts, c, r); break;
          case 6: this._drawFlowers(ctx, x, y, ts, c, r); break;
          case 7: this._drawBush(ctx, x, y, ts, c, r); break;
          case 8: this._drawBridge(ctx, x, y, ts, c, r, waveOffset); break;
          case 9: this._drawHouse(ctx, x, y, ts, c, r); break;
          case 10: this._drawDecorativeRock(ctx, x, y, ts); break;
        }

        // --- Tile edge shadows ---
        this._drawTileEdgeShadows(ctx, x, y, ts, c, r, tileType);
      }
    }
    ctx.restore();
  }

  _drawTileEdgeShadows(ctx, x, y, ts, c, r, tileType) {
    const shadowWidth = 4;
    ctx.fillStyle = 'rgba(0,0,0,0.12)';

    // Shadow on south edge if tile below is a different type
    if (r + 1 < this.rows) {
      const below = this.tiles[c][r + 1];
      if (below !== tileType) {
        ctx.fillRect(x, y + ts - shadowWidth, ts, shadowWidth);
      }
    }

    // Shadow on east edge if tile to the right is a different type
    if (c + 1 < this.cols) {
      const right = this.tiles[c + 1][r];
      if (right !== tileType) {
        ctx.fillRect(x + ts - shadowWidth, y, shadowWidth, ts);
      }
    }
  }

  _drawGrass(ctx, x, y, ts, c, r, time) {
    const C = MapGenerator.COLORS;
    
    ctx.fillStyle = C.GRASS_MID;
    ctx.fillRect(x, y, ts, ts);
    
    ctx.fillStyle = C.GRASS_LIGHT;
    if ((c + r) % 3 === 0) {
      ctx.fillRect(x + 4, y + 8, 8, 4);
      ctx.fillRect(x + 28, y + 20, 6, 4);
    } else if ((c + r) % 5 === 1) {
      ctx.fillRect(x + 16, y + 4, 4, 8);
      ctx.fillRect(x + 8, y + 32, 6, 4);
    }
    
    ctx.fillStyle = C.GRASS_DARK;
    if ((c * 3 + r * 2) % 7 === 0) {
      ctx.fillRect(x + 20, y + 16, 12, 8);
    }
    
    // Animated grass blades with wind sway
    if ((c + r * 2) % 5 === 0 && time !== undefined) {
      const sway = Math.sin(time * 1.8 + c * 0.7 + r * 0.4) * 2;
      ctx.fillStyle = C.GRASS_DARK;
      ctx.fillRect(x + 12 + sway, y + 12, 2, 6);
      ctx.fillRect(x + 16 + sway, y + 14, 2, 4);
      ctx.fillRect(x + 30 + sway, y + 10, 2, 5);
    }
  }

  _drawTallGrass(ctx, x, y, ts, c, r, time) {
    const C = MapGenerator.COLORS;
    
    ctx.fillStyle = C.GRASS_MID;
    ctx.fillRect(x, y, ts, ts);
    
    // Wind sway offset for tall grass blades
    const sway = time !== undefined ? Math.sin(time * 2.2 + c * 0.7 + r * 0.5) * 3 : 0;
    
    ctx.fillStyle = C.TALL_GRASS;
    const blades = [
      { x: 8, y: 8, w: 4, h: 24 },
      { x: 18, y: 12, w: 4, h: 28 },
      { x: 28, y: 6, w: 4, h: 22 },
      { x: 36, y: 16, w: 4, h: 20 }
    ];
    
    blades.forEach((blade, idx) => {
      const bladeSway = sway * (0.5 + idx * 0.2);
      ctx.fillRect(x + blade.x + bladeSway, y + blade.y, blade.w, blade.h);
      ctx.fillStyle = C.TALL_GRASS_DARK;
      ctx.fillRect(x + blade.x + bladeSway, y + blade.y + blade.h - 6, blade.w, 6);
      ctx.fillStyle = C.TALL_GRASS;
    });
    
    const bladePattern = (c * 7 + r * 3) % 5;
    ctx.fillStyle = C.TALL_GRASS_DARK;
    if (bladePattern === 0) {
      ctx.fillRect(x + 24 + sway * 0.8, y + 20, 3, 16);
    } else if (bladePattern === 2) {
      ctx.fillRect(x + 6 + sway * 0.8, y + 24, 3, 14);
    }
  }

  _drawTree(ctx, x, y, ts, c, r) {
    const C = MapGenerator.COLORS;
    
    // Base grass underneath
    ctx.fillStyle = C.GRASS_MID;
    ctx.fillRect(x, y, ts, ts);
    
    // Tree shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + ts - 4, 18, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Trunk - more detailed pixel art style
    ctx.fillStyle = C.TRUNK_DARK;
    ctx.fillRect(x + 18, y + 28, 12, 20);
    ctx.fillStyle = C.TRUNK;
    ctx.fillRect(x + 20, y + 28, 8, 18);
    
    // Trunk texture
    ctx.fillStyle = C.WOOD_VERY_DARK;
    ctx.fillRect(x + 22, y + 32, 2, 6);
    ctx.fillRect(x + 24, y + 38, 2, 4);
    
    // Leaves - layered canopy for depth
    const leafLayers = [
      { color: C.LEAVES_SHADOW, y: y + 8, radius: 20 },
      { color: C.LEAVES_DARK, y: y + 6, radius: 18 },
      { color: C.LEAVES_MID, y: y + 4, radius: 16 },
      { color: C.LEAVES_LIGHT, y: y + 2, radius: 12 }
    ];
    
    leafLayers.forEach(layer => {
      ctx.fillStyle = layer.color;
      ctx.beginPath();
      ctx.arc(x + ts/2, layer.y + 8, layer.radius, 0, Math.PI * 2);
      ctx.fill();
    });
    
    // Highlight spots on leaves
    ctx.fillStyle = C.LEAVES_LIGHT;
    ctx.fillRect(x + 16, y + 8, 6, 4);
    ctx.fillRect(x + 28, y + 12, 4, 4);
    
    // Leaf texture details
    ctx.fillStyle = C.LEAVES_DARK;
    ctx.fillRect(x + 14, y + 18, 4, 2);
    ctx.fillRect(x + 32, y + 16, 3, 3);
  }

  _drawWater(ctx, x, y, ts, c, r, waveOffset, time) {
    const C = MapGenerator.COLORS;
    
    // Water base with animated shimmer
    const shimmer = Math.sin(time * 2 + c * 0.5 + r * 0.3) * 0.5 + 0.5;
    
    if (shimmer > 0.6) {
      ctx.fillStyle = C.WATER_LIGHT;
    } else if (shimmer > 0.3) {
      ctx.fillStyle = C.WATER_MID;
    } else {
      ctx.fillStyle = C.WATER_DARK;
    }
    ctx.fillRect(x, y, ts, ts);
    
    // Animated wave highlights
    ctx.fillStyle = C.WATER_LIGHT;
    const waveY = (waveOffset * 8 + (c * 3) % 16) % ts;
    ctx.fillRect(x + 4, y + waveY, 12, 3);
    ctx.fillRect(x + 24, y + (waveY + 12) % ts, 16, 3);
    
    // Second wave layer
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    const waveY2 = ((1 - waveOffset) * 12 + (r * 5) % 20) % ts;
    ctx.fillRect(x + 16, y + waveY2, 10, 2);
    
    // Deep water edges
    ctx.fillStyle = C.WATER_DEEP;
    ctx.fillRect(x, y + ts - 4, ts, 4);
  }

  _drawPath(ctx, x, y, ts, c, r) {
    const C = MapGenerator.COLORS;
    
    // Dirt base
    ctx.fillStyle = C.DIRT_MID;
    ctx.fillRect(x, y, ts, ts);
    
    // Path texture variation
    ctx.fillStyle = C.DIRT_LIGHT;
    const pattern = (c * 3 + r * 2) % 7;
    if (pattern === 0) {
      ctx.fillRect(x + 6, y + 8, 8, 6);
      ctx.fillRect(x + 28, y + 24, 10, 4);
    } else if (pattern === 2) {
      ctx.fillRect(x + 16, y + 4, 6, 8);
      ctx.fillRect(x + 8, y + 32, 8, 6);
    } else if (pattern === 4) {
      ctx.fillRect(x + 32, y + 12, 8, 8);
    }
    
    // Darker dirt patches
    ctx.fillStyle = C.DIRT_DARK;
    if (pattern === 1) {
      ctx.fillRect(x + 20, y + 20, 12, 8);
    } else if (pattern === 5) {
      ctx.fillRect(x + 10, y + 28, 10, 6);
    }
    
    // Small pebbles
    ctx.fillStyle = C.ROCK_MID;
    if ((c + r) % 5 === 0) {
      ctx.fillRect(x + 14, y + 16, 3, 3);
    }
    if ((c * 2 + r) % 7 === 0) {
      ctx.fillRect(x + 34, y + 28, 2, 2);
    }
  }

  _drawRock(ctx, x, y, ts, c, r) {
    const C = MapGenerator.COLORS;
    
    // Rock face
    ctx.fillStyle = C.ROCK_MID;
    ctx.fillRect(x, y, ts, ts);
    
    // Rock texture - highlight top-left
    ctx.fillStyle = C.ROCK_LIGHT;
    ctx.fillRect(x, y, ts - 4, ts - 4);
    
    // Rock shadow
    ctx.fillStyle = C.ROCK_DARK;
    ctx.fillRect(x + ts - 8, y, 8, ts);
    ctx.fillRect(x, y + ts - 8, ts, 8);
    
    // Rock cracks and details
    ctx.fillStyle = C.ROCK_DARK;
    ctx.fillRect(x + 12, y + 12, 8, 2);
    ctx.fillRect(x + 16, y + 14, 2, 8);
    ctx.fillRect(x + 28, y + 24, 10, 2);
    
    // Highlight edge
    ctx.fillStyle = C.ROCK_LIGHT;
    ctx.fillRect(x + 4, y + 4, 6, 2);
    ctx.fillRect(x + 6, y + 6, 2, 4);
  }

  _drawFlowers(ctx, x, y, ts, c, r) {
    const C = MapGenerator.COLORS;
    
    // Base grass
    ctx.fillStyle = C.GRASS_MID;
    ctx.fillRect(x, y, ts, ts);
    
    // Flower colors based on position
    const flowerType = (c * 5 + r * 3) % 3;
    let flowerColor, centerColor;
    
    switch(flowerType) {
      case 0:
        flowerColor = C.FLOWER_RED;
        centerColor = C.FLOWER_YELLOW;
        break;
      case 1:
        flowerColor = C.FLOWER_YELLOW;
        centerColor = C.FLOWER_WHITE;
        break;
      default:
        flowerColor = C.FLOWER_WHITE;
        centerColor = C.FLOWER_YELLOW;
    }
    
    // Flower 1
    ctx.fillStyle = flowerColor;
    ctx.fillRect(x + 14, y + 14, 6, 6);
    ctx.fillStyle = centerColor;
    ctx.fillRect(x + 16, y + 16, 2, 2);
    
    // Flower 2
    ctx.fillStyle = flowerColor;
    ctx.fillRect(x + 30, y + 28, 5, 5);
    ctx.fillStyle = centerColor;
    ctx.fillRect(x + 31, y + 29, 3, 3);
    
    // Stems
    ctx.fillStyle = C.LEAVES_DARK;
    ctx.fillRect(x + 16, y + 20, 2, 6);
    ctx.fillRect(x + 32, y + 33, 2, 5);
  }

  _drawBush(ctx, x, y, ts, c, r) {
    const C = MapGenerator.COLORS;
    
    // Base grass
    ctx.fillStyle = C.GRASS_MID;
    ctx.fillRect(x, y, ts, ts);
    
    // Bush shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x + ts/2, y + ts - 2, 16, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    
    // Bush layers
    ctx.fillStyle = C.LEAVES_DARK;
    ctx.fillRect(x + 6, y + 10, 36, 32);
    
    ctx.fillStyle = C.LEAVES_MID;
    ctx.fillRect(x + 10, y + 8, 28, 28);
    
    ctx.fillStyle = C.LEAVES_LIGHT;
    ctx.fillRect(x + 14, y + 12, 20, 20);
    
    // Bush highlight spots
    ctx.fillStyle = C.LEAVES_LIGHT;
    ctx.fillRect(x + 16, y + 14, 6, 4);
    ctx.fillRect(x + 26, y + 18, 4, 4);
  }

  _drawBridge(ctx, x, y, ts, c, r, waveOffset) {
    const C = MapGenerator.COLORS;
    
    // Wood planks
    ctx.fillStyle = C.BRIDGE_WOOD;
    ctx.fillRect(x, y, ts, ts);
    
    // Plank seams
    ctx.fillStyle = C.BRIDGE_DARK;
    ctx.fillRect(x, y + 8, ts, 3);
    ctx.fillRect(x, y + 22, ts, 3);
    ctx.fillRect(x, y + 36, ts, 3);
    
    // Rope borders
    ctx.fillStyle = C.ROPE;
    ctx.fillRect(x + 2, y, 4, ts);
    ctx.fillRect(x + ts - 6, y, 4, ts);
    
    // Wooden posts
    ctx.fillStyle = C.WOOD_DARK;
    if ((c + r) % 2 === 0) {
      ctx.fillRect(x + 2, y + 4, 4, 8);
      ctx.fillRect(x + ts - 6, y + 4, 4, 8);
    } else {
      ctx.fillRect(x + 2, y + ts - 12, 4, 8);
      ctx.fillRect(x + ts - 6, y + ts - 12, 4, 8);
    }
    
    // Slight water visibility at edges
    ctx.fillStyle = C.WATER_MID;
    ctx.globalAlpha = 0.15;
    ctx.fillRect(x, y, ts, 4);
    ctx.fillRect(x, y + ts - 4, ts, 4);
    ctx.globalAlpha = 1.0;
  }

  _drawHouse(ctx, x, y, ts, c, r) {
    const C = MapGenerator.COLORS;
    
    // Determine position in house (for multi-tile house)
    const houseRow = r % 3;
    
    if (houseRow === 0) {
      // Roof row
      ctx.fillStyle = C.ROOF_RED;
      ctx.fillRect(x, y, ts, ts);
      
      // Roof tiles pattern
      ctx.fillStyle = C.ROOF_DARK;
      ctx.fillRect(x, y + ts - 8, ts, 8);
      
      // Roof highlight
      ctx.fillStyle = C.ROOF_LIGHT;
      ctx.fillRect(x + 4, y + 4, 8, 4);
      ctx.fillRect(x + 20, y + 8, 8, 4);
      
    } else if (houseRow === 1) {
      // Wall row with windows
      ctx.fillStyle = C.WOOD_MID;
      ctx.fillRect(x, y, ts, ts);
      
      // Wood paneling
      ctx.fillStyle = C.WOOD_DARK;
      ctx.fillRect(x, y + ts - 6, ts, 6);
      ctx.fillRect(x + ts - 4, y, 4, ts);
      
      // Window (for middle tiles)
      const colInHouse = c % 4;
      if (colInHouse === 1 || colInHouse === 2) {
        // Window frame
        ctx.fillStyle = C.WOOD_VERY_DARK;
        ctx.fillRect(x + 8, y + 8, 24, 20);
        // Window glass
        ctx.fillStyle = C.WINDOW_LIGHT;
        ctx.fillRect(x + 10, y + 10, 20, 16);
        // Window cross
        ctx.fillStyle = C.WOOD_VERY_DARK;
        ctx.fillRect(x + 19, y + 10, 2, 16);
        ctx.fillRect(x + 10, y + 16, 20, 2);
        // Window glow
        ctx.fillStyle = C.WINDOW_GLOW;
        ctx.fillRect(x + 12, y + 12, 6, 6);
      }
      
    } else {
      // Ground/foundation row
      ctx.fillStyle = C.WOOD_DARK;
      ctx.fillRect(x, y, ts, ts - 8);
      
      // Door (for center tiles)
      const colInHouse = c % 4;
      if (colInHouse === 1) {
        // Door
        ctx.fillStyle = C.WOOD_VERY_DARK;
        ctx.fillRect(x + 12, y, 16, ts - 8);
        // Door handle
        ctx.fillStyle = C.GOLD;
        ctx.fillRect(x + 24, y + 16, 3, 4);
      }
      
      // Foundation
      ctx.fillStyle = C.ROCK_MID;
      ctx.fillRect(x, y + ts - 8, ts, 8);
    }
  }

  _drawDecorativeRock(ctx, x, y, ts) {
    const C = MapGenerator.COLORS;
    
    // Base grass
    ctx.fillStyle = C.GRASS_MID;
    ctx.fillRect(x, y, ts, ts);
    
    // Small decorative rock
    ctx.fillStyle = C.ROCK_MID;
    ctx.fillRect(x + 16, y + 28, 16, 12);
    ctx.fillStyle = C.ROCK_LIGHT;
    ctx.fillRect(x + 18, y + 26, 10, 8);
    ctx.fillStyle = C.ROCK_DARK;
    ctx.fillRect(x + 28, y + 30, 4, 8);
  }

  renderMinimap(ctx, x, y, width, height, playerX, playerY, boxes) {
    const C = MapGenerator.COLORS;
    ctx.save();
    
    // Draw background panel
    ctx.fillStyle = '#1a1c2c';
    ctx.fillRect(x, y, width, height);

    // Map scaling factors
    const scaleX = width / (this.cols * this.tileSize);
    const scaleY = height / (this.rows * this.tileSize);

    // Draw simplified terrain
    for (let c = 0; c < this.cols; c += 2) {
      for (let r = 0; r < this.rows; r += 2) {
        const tile = this.tiles[c][r];
        const screenX = x + c * this.tileSize * scaleX;
        const screenY = y + r * this.tileSize * scaleY;
        const w = (this.tileSize * 2) * scaleX;
        const h = (this.tileSize * 2) * scaleY;

        if (tile === 3) {
          ctx.fillStyle = C.WATER_DARK;
        } else if (tile === 2 || tile === 5) {
          ctx.fillStyle = C.LEAVES_DARK;
        } else if (tile === 9) {
          ctx.fillStyle = C.ROOF_RED;
        } else if (tile === 4 || tile === 8) {
          ctx.fillStyle = C.DIRT_DARK;
        } else if (tile === 1 || tile === 7) {
          ctx.fillStyle = C.TALL_GRASS;
        } else {
          ctx.fillStyle = C.GRASS_DARK;
        }
        
        ctx.fillRect(screenX, screenY, w, h);
      }
    }

    // Draw detected/revealed chests
    for (const b of boxes) {
      if (b.state !== 'hidden' && b.state !== 'opened') {
        const bx = x + b.x * scaleX;
        const by = y + b.y * scaleY;
        
        if (b.state === 'detected') {
          ctx.fillStyle = 'rgba(255, 215, 0, 0.5)';
          ctx.fillRect(bx - 2, by - 2, 4, 4);
        } else {
          ctx.fillStyle = BOX_TYPES[b.type].color || '#f0c040';
          ctx.fillRect(bx - 3, by - 3, 6, 6);
        }
      }
    }

    // Draw player dot
    const px = x + playerX * scaleX;
    const py = y + playerY * scaleY;
    ctx.fillStyle = C.EMERALD || '#4ade80';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // Player glow
    ctx.fillStyle = 'rgba(74, 222, 128, 0.3)';
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.fill();

    // Outline border
    ctx.strokeStyle = '#3f4566';
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, width, height);

    ctx.restore();
  }
}

// Register on global window context
window.MapGenerator = MapGenerator;
