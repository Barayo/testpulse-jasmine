const { TestPulseReporter } = require('../../../dist');

module.exports = {
  spec_dir: 'spec',
  spec_files: ['*.spec.js'],
  reporters: [new TestPulseReporter({})],
};
