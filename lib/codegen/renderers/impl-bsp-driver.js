const { generateBspPart } = require('./bsp-part');

module.exports = {
  id: 'impl-bsp.driver',
  layer: 'impl_bsp_driver',
  version: '1',
  skill: 'impl_bsp',
  render: (request) => generateBspPart(request, 'driver')
};
