const { generateBspPart } = require('./bsp-part');

module.exports = {
  id: 'impl-bsp.handle',
  layer: 'impl_bsp_handle',
  version: '1',
  skill: 'impl_bsp',
  render: (request) => generateBspPart(request, 'handle')
};
