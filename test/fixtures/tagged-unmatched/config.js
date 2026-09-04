// Fixture for the unmatched/failOnUnmatched end-to-end test
// (test/e2e/submission.e2e.test.ts). Deliberately separate from
// fixtures/tagged, which case.e2e.test.ts also uses -- sharing one
// directory between test files that run in separate parallel Jest
// workers caused a real race (each file's own .testpulse cleanup could
// delete the other's result marker mid-run).
const { TestPulseReporter } = require('../../../dist');

module.exports = {
  spec_dir: 'spec',
  spec_files: ['*.spec.js'],
  reporters: [new TestPulseReporter({})],
};
