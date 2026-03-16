'use strict';

const fs = require('fs');
const path = require('path');

const PROJECT_PATH = Editor.Project.path;
const CONFIG_DIR = path.join(PROJECT_PATH, 'assets', 'resources' ,'configs');
const FILE_PATH = path.join(CONFIG_DIR, 'levels.json');
// Путь к папке с текстурами для отображения в редакторе
const TEXTURE_PATH = path.join(PROJECT_PATH, 'assets', 'texture', 'Game', 'Tile');

Editor.Panel.extend({
  style: `
    :host { margin: 10px; display: flex; flex-direction: column; overflow-y: auto; }
    .grid { display: grid; gap: 2px; margin-top: 10px; background: #333; padding: 5px; width: fit-content; border: 1px solid #555; }
    .cell { 
        width: 40px; height: 40px; background: #666; color: white;
        text-align: center; line-height: 40px; cursor: pointer; user-select: none; 
        font-size: 10px; font-weight: bold; text-shadow: 1px 1px 1px black;
        background-size: cover; border: 1px solid #444;
    }
    .cell:hover { border: 1px solid white; box-sizing: border-box; }
    
    ui-prop { margin-bottom: 4px; }
    .toolbar { background: #444; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #222; }
  `,

  template: `
    <div class="toolbar">
        <ui-prop name="Level ID"><ui-num-input id="levelIdx" value="0" step="1" min="0" max="9"></ui-num-input></ui-prop>
        <ui-prop name="Rows"> <ui-num-input id="rows" value="5" step="1" min="1"></ui-num-input> </ui-prop>
        <ui-prop name="Cols"> <ui-num-input id="cols" value="5" step="1" min="1"></ui-num-input> </ui-prop>
        <div style="margin-top: 10px;">
            <ui-button id="generate" class="green">Создать/Сбросить</ui-button>
            <ui-button id="save" class="blue">Сохранить Файл</ui-button>
        </div>
    </div>
    <div id="grid-container" class="grid"></div>
  `,

  $: {
    levelIdx: '#levelIdx',
    rows: '#rows',
    cols: '#cols',
    btnGenerate: '#generate',
    btnSave: '#save',
    container: '#grid-container'
  },

  // Функция для получения пути к картинке по ID типа
  getTileUrl(type) {
    // Если type 0 - пустая клетка, иначе ищем block_1, block_2 и т.д.
    // Если у вас названия block_blue, сделайте маппинг в объекте
    const names = {
      0: "random",
      1: "none",
      2: "block_blue",
      3: "block_purpure",
      4: "block_red",
      5: "block_yellow",
      6: "block_rockets_horisontal",
      7: "block_rakets",
      8: "block_bomb",
      9: "block_bomb_max",
    };

    const fileName = names[type] || `block_${type}`; // фоллбек на block_ID
    const fullPath = path.join(TEXTURE_PATH, `${fileName}.png`);

    if (fs.existsSync(fullPath)) {
      // Превращаем системный путь в URL, который поймет браузер внутри Cocos
      return `url('file://${fullPath.replace(/\\/g, '/')}')`;
    }
    return '';
  },

  ready () {
    this.levelsData = this.loadFromFile();
    this.$levelIdx.addEventListener('confirm', () => this.renderLevel(this.$levelIdx.value));
    this.$btnGenerate.addEventListener('confirm', () => {
      this.initGrid(this.$rows.value, this.$cols.value, new Array(this.$rows.value * this.$cols.value).fill(0));
    });
    this.$btnSave.addEventListener('confirm', () => this.saveToFile());
    this.renderLevel(0);
  },

  initGrid(rows, cols, tiles) {
    this.$container.style.gridTemplateColumns = `repeat(${cols}, 40px)`;
    this.$container.innerHTML = '';

    tiles.forEach((type, index) => {
      let cell = document.createElement('div');
      cell.className = 'cell';
      this.setCellVisual(cell, type);

      cell.addEventListener('click', () => {
        let val = (parseInt(cell.getAttribute('data-type')) + 1) % 10;
        this.setCellVisual(cell, val);
        this.updateCurrentData();
      });
      this.$container.appendChild(cell);
    });
  },

  setCellVisual(cell, type) {
    cell.setAttribute('data-type', type);
    cell.innerText = type < 9 ? "" : type; // Скрываем 0 для чистоты
    cell.style.backgroundImage = type > 9 ? "none" : this.getTileUrl(type);
  },

  updateCurrentData() {
    const cells = this.$container.querySelectorAll('.cell');
    if (cells.length === 0) return;
    this.levelsData[this.$levelIdx.value] = {
      rows: parseInt(this.$rows.value),
      cols: parseInt(this.$cols.value),
      tiles: Array.from(cells).map(c => parseInt(c.getAttribute('data-type')))
    };
  },

  renderLevel(idx) {
    const data = this.levelsData[idx];
    if (data) {
      this.$rows.value = data.rows;
      this.$cols.value = data.cols;
      this.initGrid(data.rows, data.cols, data.tiles);
    } else {
      this.$container.innerHTML = '<div style="padding:10px">Уровень не найден</div>';
    }
  },

  saveToFile() {
    this.updateCurrentData();
    if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
    fs.writeFileSync(FILE_PATH, JSON.stringify(this.levelsData, null, 2), 'utf8');
    Editor.assetdb.refresh('db://assets/configs/levels.json');
    Editor.success("Saved!");
  },

  loadFromFile() {
    if (fs.existsSync(FILE_PATH)) {
      try { return JSON.parse(fs.readFileSync(FILE_PATH, 'utf8')); } catch (e) { return {}; }
    }
    return {};
  }
});
