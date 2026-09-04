// Fixture for the case-tagging end-to-end test (test/e2e/case.e2e.test.ts).
const { TestPulseReporter } = require('../../../dist');

module.exports = {
  spec_dir: 'spec',
  spec_files: ['*.spec.js'],
  reporters: [new TestPulseReporter({})],
};
