const { generateBspPart } = require('./bsp-part');

module.exports = {
  id: 'impl-bsp.port',
  layer: 'impl_bsp_port',
  version: '1',
  skill: 'impl_bsp',
  render: (request) => generateBspPart(request, 'port')
};
