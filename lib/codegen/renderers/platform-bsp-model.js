const { generateBspPart } = require('./bsp-part');

module.exports = {
  id: 'platform-bsp.model',
  layer: 'platform_bsp',
  version: '1',
  skill: 'platform_bsp',
  render: (request) => generateBspPart(request, 'model')
};
