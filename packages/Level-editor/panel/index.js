'use strict';

const fs = require('fs');
const path = require('path');

const PACKAGE_NAME = 'level-editor';
const PROJECT_PATH = Editor.Project.path;
const CONFIG_DIR = path.join(PROJECT_PATH, 'assets', 'resources', 'configs');
const LEVELS_FILE_PATH = path.join(CONFIG_DIR, 'levels.json');
const TEXTURE_PATH = path.join(PROJECT_PATH, 'assets', 'texture', 'Game', 'Tile');

const TILE_NAMES = {
  0: 'random',
  1: 'none',
  2: 'block_blue',
  3: 'block_purpure',
  4: 'block_red',
  5: 'block_yellow',
  6: 'block_rockets_horisontal',
  7: 'block_rakets',
  8: 'block_bomb',
  9: 'block_bomb_max',
};
const TILE_TYPE_COUNT = Object.keys(TILE_NAMES).length;

const DEFAULT_LEVEL = {
  rows: 9,
  cols: 9,
  moves: 15,
  targetScore: 1500,
  bonusBombBoosters: 0,
  bonusTeleportBoosters: 0,
  startRowRocketTiles: 0,
  startColumnRocketTiles: 0,
  startBombTiles: 0,
  startMegaTiles: 0,
  tiles: [],
};

Editor.Panel.extend({
  style: `
    :host {
      margin: 10px;
      display: flex;
      flex-direction: column;
      overflow-y: auto;
      color: #d7d7d7;
    }

    .toolbar {
      background: #3a3a3a;
      padding: 10px;
      margin-bottom: 10px;
      border-radius: 4px;
      border: 1px solid #242424;
    }

    .config-group {
      border-top: 1px solid #555;
      margin-top: 10px;
      padding-top: 10px;
    }

    .actions {
      display: flex;
      gap: 8px;
      margin-top: 10px;
    }

    .status {
      margin-top: 8px;
      min-height: 18px;
      font-size: 11px;
      color: #8dc891;
    }

    .status.error {
      color: #e57373;
    }

    .grid {
      display: grid;
      gap: 2px;
      margin-top: 10px;
      background: #333;
      padding: 5px;
      width: fit-content;
      border: 1px solid #555;
    }

    .cell {
      width: 40px;
      height: 40px;
      background: #666;
      color: white;
      text-align: center;
      line-height: 40px;
      cursor: pointer;
      user-select: none;
      font-size: 10px;
      font-weight: bold;
      text-shadow: 1px 1px 1px black;
      background-size: cover;
      background-position: center;
      border: 1px solid #444;
      box-sizing: border-box;
    }

    .cell:hover {
      border-color: white;
    }

    .empty-state {
      padding: 10px;
      color: #c9c9c9;
      background: #2e2e2e;
      border: 1px dashed #666;
    }

    ui-prop {
      margin-bottom: 4px;
    }
  `,

  template: `
    <div class="toolbar">
      <ui-prop name="Level ID">
        <ui-num-input id="levelIdx" value="0" step="1" min="0"></ui-num-input>
      </ui-prop>
      <ui-prop name="Rows">
        <ui-num-input id="rows" value="9" step="1" min="1"></ui-num-input>
      </ui-prop>
      <ui-prop name="Cols">
        <ui-num-input id="cols" value="9" step="1" min="1"></ui-num-input>
      </ui-prop>

      <div class="config-group">
        <ui-prop name="Moves">
          <ui-num-input id="moves" value="15" step="1" min="1"></ui-num-input>
        </ui-prop>
        <ui-prop name="Target Score">
          <ui-num-input id="targetScore" value="1500" step="50" min="100"></ui-num-input>
        </ui-prop>
        <ui-prop name="Bonus Bombs">
          <ui-num-input id="bonusBombBoosters" value="0" step="1" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop name="Bonus Teleports">
          <ui-num-input id="bonusTeleportBoosters" value="0" step="1" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop name="Start Row Rockets">
          <ui-num-input id="startRowRocketTiles" value="0" step="1" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop name="Start Column Rockets">
          <ui-num-input id="startColumnRocketTiles" value="0" step="1" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop name="Start Bomb Tiles">
          <ui-num-input id="startBombTiles" value="0" step="1" min="0"></ui-num-input>
        </ui-prop>
        <ui-prop name="Start Mega Tiles">
          <ui-num-input id="startMegaTiles" value="0" step="1" min="0"></ui-num-input>
        </ui-prop>
      </div>

      <div class="actions">
        <ui-button id="generate" class="green">Generate</ui-button>
        <ui-button id="save" class="blue">Save</ui-button>
      </div>

      <div id="status" class="status"></div>
    </div>
    <div id="grid-container" class="grid"></div>
  `,

  $: {
    levelIdx: '#levelIdx',
    rows: '#rows',
    cols: '#cols',
    moves: '#moves',
    targetScore: '#targetScore',
    bonusBombBoosters: '#bonusBombBoosters',
    bonusTeleportBoosters: '#bonusTeleportBoosters',
    startRowRocketTiles: '#startRowRocketTiles',
    startColumnRocketTiles: '#startColumnRocketTiles',
    startBombTiles: '#startBombTiles',
    startMegaTiles: '#startMegaTiles',
    btnGenerate: '#generate',
    btnSave: '#save',
    status: '#status',
    container: '#grid-container',
  },

  ready() {
    this.levelsData = this.loadFromFile();

    this.$levelIdx.addEventListener('confirm', () => this.renderLevel(this.getLevelIndex()));
    this.$rows.addEventListener('confirm', () => this.generateEmptyGrid());
    this.$cols.addEventListener('confirm', () => this.generateEmptyGrid());
    this.$moves.addEventListener('confirm', () => this.updateCurrentData());
    this.$targetScore.addEventListener('confirm', () => this.updateCurrentData());
    this.$bonusBombBoosters.addEventListener('confirm', () => this.updateCurrentData());
    this.$bonusTeleportBoosters.addEventListener('confirm', () => this.updateCurrentData());
    this.$startRowRocketTiles.addEventListener('confirm', () => this.updateCurrentData());
    this.$startColumnRocketTiles.addEventListener('confirm', () => this.updateCurrentData());
    this.$startBombTiles.addEventListener('confirm', () => this.updateCurrentData());
    this.$startMegaTiles.addEventListener('confirm', () => this.updateCurrentData());
    this.$btnGenerate.addEventListener('confirm', () => this.generateEmptyGrid());
    this.$btnSave.addEventListener('confirm', () => this.saveToFile());

    this.renderLevel(this.getLevelIndex());
  },

  getLevelIndex() {
    return this.sanitizeInteger(this.$levelIdx.value, 0, 0);
  },

  sanitizeInteger(value, fallback, min) {
    const parsed = parseInt(value, 10);
    if (Number.isNaN(parsed)) {
      return fallback;
    }

    return Math.max(min, parsed);
  },

  createDefaultLevel(rows, cols) {
    return {
      rows,
      cols,
      moves: this.sanitizeInteger(this.$moves.value, DEFAULT_LEVEL.moves, 1),
      targetScore: this.sanitizeInteger(this.$targetScore.value, DEFAULT_LEVEL.targetScore, 100),
      bonusBombBoosters: this.sanitizeInteger(this.$bonusBombBoosters.value, DEFAULT_LEVEL.bonusBombBoosters, 0),
      bonusTeleportBoosters: this.sanitizeInteger(this.$bonusTeleportBoosters.value, DEFAULT_LEVEL.bonusTeleportBoosters, 0),
      startRowRocketTiles: this.sanitizeInteger(this.$startRowRocketTiles.value, DEFAULT_LEVEL.startRowRocketTiles, 0),
      startColumnRocketTiles: this.sanitizeInteger(this.$startColumnRocketTiles.value, DEFAULT_LEVEL.startColumnRocketTiles, 0),
      startBombTiles: this.sanitizeInteger(this.$startBombTiles.value, DEFAULT_LEVEL.startBombTiles, 0),
      startMegaTiles: this.sanitizeInteger(this.$startMegaTiles.value, DEFAULT_LEVEL.startMegaTiles, 0),
      tiles: new Array(rows * cols).fill(0),
    };
  },

  normalizeLevelData(data) {
    const rows = this.sanitizeInteger(data && data.rows, DEFAULT_LEVEL.rows, 1);
    const cols = this.sanitizeInteger(data && data.cols, DEFAULT_LEVEL.cols, 1);
    const moves = this.sanitizeInteger(data && data.moves, DEFAULT_LEVEL.moves, 1);
    const targetScore = this.sanitizeInteger(data && data.targetScore, DEFAULT_LEVEL.targetScore, 100);
    const bonusBombBoosters = this.sanitizeInteger(data && data.bonusBombBoosters, DEFAULT_LEVEL.bonusBombBoosters, 0);
    const bonusTeleportBoosters = this.sanitizeInteger(data && data.bonusTeleportBoosters, DEFAULT_LEVEL.bonusTeleportBoosters, 0);
    const startRowRocketTiles = this.sanitizeInteger(data && data.startRowRocketTiles, DEFAULT_LEVEL.startRowRocketTiles, 0);
    const startColumnRocketTiles = this.sanitizeInteger(data && data.startColumnRocketTiles, DEFAULT_LEVEL.startColumnRocketTiles, 0);
    const startBombTiles = this.sanitizeInteger(data && data.startBombTiles, DEFAULT_LEVEL.startBombTiles, 0);
    const startMegaTiles = this.sanitizeInteger(data && data.startMegaTiles, DEFAULT_LEVEL.startMegaTiles, 0);
    const expectedCellCount = rows * cols;
    const tiles = Array.isArray(data && data.tiles) ? data.tiles.slice(0, expectedCellCount) : [];

    while (tiles.length < expectedCellCount) {
      tiles.push(0);
    }

    return {
      rows,
      cols,
      moves,
      targetScore,
      bonusBombBoosters,
      bonusTeleportBoosters,
      startRowRocketTiles,
      startColumnRocketTiles,
      startBombTiles,
      startMegaTiles,
      tiles,
    };
  },

  generateEmptyGrid() {
    const rows = this.sanitizeInteger(this.$rows.value, DEFAULT_LEVEL.rows, 1);
    const cols = this.sanitizeInteger(this.$cols.value, DEFAULT_LEVEL.cols, 1);
    const levelIndex = this.getLevelIndex();
    const level = this.createDefaultLevel(rows, cols);

    this.$rows.value = rows;
    this.$cols.value = cols;
    this.levelsData[levelIndex] = level;
    this.initGrid(level.rows, level.cols, level.tiles);
    this.setStatus(`Level ${levelIndex} grid regenerated.`);
  },

  initGrid(rows, cols, tiles) {
    this.$container.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
    this.$container.innerHTML = '';

    tiles.forEach((type) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      this.setCellVisual(cell, type);

      cell.addEventListener('click', () => {
        const nextValue = (this.sanitizeInteger(cell.getAttribute('data-type'), 0, 0) + 1) % TILE_TYPE_COUNT;
        this.setCellVisual(cell, nextValue);
        this.updateCurrentData();
      });

      cell.addEventListener('contextmenu', (event) => {
        event.preventDefault();
        const currentValue = this.sanitizeInteger(cell.getAttribute('data-type'), 0, 0);
        const nextValue = (currentValue - 1 + TILE_TYPE_COUNT) % TILE_TYPE_COUNT;
        this.setCellVisual(cell, nextValue);
        this.updateCurrentData();
      });

      this.$container.appendChild(cell);
    });
  },

  setCellVisual(cell, type) {
    cell.setAttribute('data-type', String(type));
    cell.style.backgroundImage = this.getTileUrl(type);
    cell.innerText = cell.style.backgroundImage ? '' : String(type);
  },

  getTileUrl(type) {
    const fileName = TILE_NAMES[type] || `block_${type}`;
    const fullPath = path.join(TEXTURE_PATH, `${fileName}.png`);
    return fs.existsSync(fullPath) ? `url('file://${fullPath.replace(/\\/g, '/')}')` : '';
  },

  updateCurrentData() {
    const cells = this.$container.querySelectorAll('.cell');
    if (cells.length === 0) {
      return;
    }

    const levelIndex = this.getLevelIndex();
    this.levelsData[levelIndex] = {
      rows: this.sanitizeInteger(this.$rows.value, DEFAULT_LEVEL.rows, 1),
      cols: this.sanitizeInteger(this.$cols.value, DEFAULT_LEVEL.cols, 1),
      moves: this.sanitizeInteger(this.$moves.value, DEFAULT_LEVEL.moves, 1),
      targetScore: this.sanitizeInteger(this.$targetScore.value, DEFAULT_LEVEL.targetScore, 100),
      bonusBombBoosters: this.sanitizeInteger(this.$bonusBombBoosters.value, DEFAULT_LEVEL.bonusBombBoosters, 0),
      bonusTeleportBoosters: this.sanitizeInteger(this.$bonusTeleportBoosters.value, DEFAULT_LEVEL.bonusTeleportBoosters, 0),
      startRowRocketTiles: this.sanitizeInteger(this.$startRowRocketTiles.value, DEFAULT_LEVEL.startRowRocketTiles, 0),
      startColumnRocketTiles: this.sanitizeInteger(this.$startColumnRocketTiles.value, DEFAULT_LEVEL.startColumnRocketTiles, 0),
      startBombTiles: this.sanitizeInteger(this.$startBombTiles.value, DEFAULT_LEVEL.startBombTiles, 0),
      startMegaTiles: this.sanitizeInteger(this.$startMegaTiles.value, DEFAULT_LEVEL.startMegaTiles, 0),
      tiles: Array.from(cells).map((cell) => this.sanitizeInteger(cell.getAttribute('data-type'), 0, 0)),
    };
  },

  renderLevel(levelIndex) {
    const data = this.levelsData[levelIndex];
    if (!data) {
      this.$container.style.gridTemplateColumns = '';
      this.$container.innerHTML = '<div class="empty-state">Level not found. Click Generate to create it.</div>';
      this.setStatus(`Level ${levelIndex} is not initialized.`, false);
      return;
    }

    const normalizedData = this.normalizeLevelData(data);
    this.levelsData[levelIndex] = normalizedData;
    this.$rows.value = normalizedData.rows;
    this.$cols.value = normalizedData.cols;
    this.$moves.value = normalizedData.moves;
    this.$targetScore.value = normalizedData.targetScore;
    this.$bonusBombBoosters.value = normalizedData.bonusBombBoosters;
    this.$bonusTeleportBoosters.value = normalizedData.bonusTeleportBoosters;
    this.$startRowRocketTiles.value = normalizedData.startRowRocketTiles;
    this.$startColumnRocketTiles.value = normalizedData.startColumnRocketTiles;
    this.$startBombTiles.value = normalizedData.startBombTiles;
    this.$startMegaTiles.value = normalizedData.startMegaTiles;

    this.initGrid(normalizedData.rows, normalizedData.cols, normalizedData.tiles);
    this.setStatus(`Loaded level ${levelIndex}.`);
  },

  saveToFile() {
    try {
      this.updateCurrentData();

      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, {recursive: true});
      }

      fs.writeFileSync(LEVELS_FILE_PATH, JSON.stringify(this.levelsData, null, 2), 'utf8');
      Editor.assetdb.refresh('db://assets/resources/configs/levels.json');
      Editor.success('Level configuration saved.');
      this.setStatus(`Saved ${path.relative(PROJECT_PATH, LEVELS_FILE_PATH)}.`);
    } catch (error) {
      Editor.error(`[${PACKAGE_NAME}] Failed to save levels.json`, error);
      this.setStatus('Failed to save level configuration.', true);
    }
  },

  loadFromFile() {
    if (!fs.existsSync(LEVELS_FILE_PATH)) {
      return {};
    }

    try {
      const parsed = JSON.parse(fs.readFileSync(LEVELS_FILE_PATH, 'utf8'));
      const normalized = {};

      Object.keys(parsed).forEach((levelIndex) => {
        normalized[levelIndex] = this.normalizeLevelData(parsed[levelIndex]);
      });

      return normalized;
    } catch (error) {
      Editor.error(`[${PACKAGE_NAME}] Failed to parse levels.json`, error);
      this.setStatus('levels.json is invalid JSON.', true);
      return {};
    }
  },

  setStatus(message, isError) {
    this.$status.textContent = message || '';
    this.$status.classList.toggle('error', !!isError);
  },
});
