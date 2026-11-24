'use strict';

module.exports = {
  id: 'mcu-workbench-workflow',
  version: '1.0.0',
  skills: require('./skill-map.json').skills.map(skill => skill.id)
};
