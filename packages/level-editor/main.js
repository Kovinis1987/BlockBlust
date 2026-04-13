'use strict';

module.exports = {
  load() {},

  unload() {},

  messages: {
    'level-editor:open'() {
      Editor.Panel.open('level-editor');
    },
  },
};
