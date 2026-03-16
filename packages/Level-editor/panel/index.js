'use strict';

const fs = require('fs');
const path = require('path');

// Путь к файлу: проект/assets/configs/levels.json
const PROJECT_PATH = Editor.Project.path;
const CONFIG_DIR = path.join(PROJECT_PATH, 'assets', 'resources' ,'configs');
const FILE_PATH = path.join(CONFIG_DIR, 'levels.json');

Editor.Panel.extend({
  style: `
    :host { margin: 10px; display: flex; flex-direction: column; overflow-y: auto; }
    .grid { display: grid; gap: 2px; margin-top: 10px; background: #333; padding: 5px; width: fit-content; border: 1px solid #555; }
    .cell { 
        width: 30px; height: 30px; background: #666; color: white;
        text-align: center; line-height: 30px; cursor: pointer; user-select: none; font-size: 12px;
    }
    /* Цветовая индикация для типов */
    .cell[data-type="0"] { background: #444; }
    .cell[data-type="1"] { background: #000000; } 
    .cell[data-type="2"] { background: #2196F3; } 
    .cell[data-type="3"] { background: #E91E63; }
    .cell[data-type="4"] { background: #EF5350; }
    .cell[data-type="5"] { background: #FFEB3B; }
    .cell[data-type="6"] { background: #8BC34A; }
    .cell[data-type="7"] { background: #43A047; }
    .cell[data-type="8"] { background: #9E9E9E; }
    .cell[data-type="9"] { background: #263238; }
    .cell[data-type="10"] { background: #78909C; }
    .cell:hover { border: 1px solid white; box-sizing: border-box; }
    
    ui-prop { margin-bottom: 4px; }
    .toolbar { background: #444; padding: 10px; margin-bottom: 10px; border-radius: 4px; border: 1px solid #222; }
    .controls { margin-bottom: 10px; }
  `,

  template: `
    <div class="toolbar">
        <ui-prop name="Level ID">
            <ui-num-input id="levelIdx" value="0" step="1" min="0"></ui-num-input>
        </ui-prop>
    </div>

    <div class="controls">
        <ui-prop name="Rows"> <ui-num-input id="rows" value="5" step="1" min="1"></ui-num-input> </ui-prop>
        <ui-prop name="Cols"> <ui-num-input id="cols" value="5" step="1" min="1"></ui-num-input> </ui-prop>
        <div style="margin-left: 105px; margin-top: 10px;">
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

  ready () {
    this.levelsData = this.loadFromFile();

    // При смене ID уровня — загружаем его данные
    this.$levelIdx.addEventListener('confirm', () => {
      this.renderLevel(this.$levelIdx.value);
    });

    // Создание новой сетки
    this.$btnGenerate.addEventListener('confirm', () => {
      const r = Math.floor(this.$rows.value);
      const c = Math.floor(this.$cols.value);
      this.initGrid(r, c, new Array(r * c).fill(0));
    });

    // Сохранение в JSON
    this.$btnSave.addEventListener('confirm', () => {
      this.saveToFile();
    });

    // Отрисовываем текущий уровень при старте
    this.renderLevel(0);
  },

  // Инициализация визуальной сетки
  initGrid(rows, cols, tiles) {
    this.$container.style.gridTemplateColumns = `repeat(${cols}, 30px)`;
    this.$container.innerHTML = '';

    tiles.forEach((type, index) => {
      let cell = document.createElement('div');
      cell.className = 'cell';
      cell.innerText = type;
      cell.setAttribute('data-type', type);

      cell.addEventListener('click', () => {
        let val = (parseInt(cell.innerText) + 1) % 11;
        cell.innerText = val;
        cell.setAttribute('data-type', val);
        this.updateCurrentData(); // Обновляем объект в памяти
      });
      this.$container.appendChild(cell);
    });
    this.updateCurrentData();
  },

  // Обновить данные текущего уровня в общем объекте
  updateCurrentData() {
    const cells = this.$container.querySelectorAll('.cell');
    if (cells.length === 0) return;

    this.levelsData[this.$levelIdx.value] = {
      rows: parseInt(this.$rows.value),
      cols: parseInt(this.$cols.value),
      tiles: Array.from(cells).map(c => parseInt(c.innerText))
    };
  },

  renderLevel(idx) {
    const data = this.levelsData[idx];
    if (data) {
      this.$rows.value = data.rows;
      this.$cols.value = data.cols;
      this.initGrid(data.rows, data.cols, data.tiles);
    } else {
      this.$container.innerHTML = '<div style="padding:10px">Уровень не создан. Нажмите "Создать".</div>';
    }
  },

  saveToFile() {
    try {
      if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true });
      }

      this.updateCurrentData(); // На всякий случай обновляем текущий
      const content = JSON.stringify(this.levelsData, null, 2);
      fs.writeFileSync(FILE_PATH, content, 'utf8');

      // Заставляем Cocos обновить ассеты, чтобы увидеть файл в редакторе
      Editor.assetdb.refresh('db://assets/configs/levels.json');

      Editor.success("Сохранено в " + FILE_PATH);
    } catch (err) {
      Editor.error("Ошибка сохранения:", err);
    }
  },

  loadFromFile() {
    if (fs.existsSync(FILE_PATH)) {
      try {
        const data = fs.readFileSync(FILE_PATH, 'utf8');
        return JSON.parse(data);
      } catch (e) {
        return {};
      }
    }
    return {};
  }
});
