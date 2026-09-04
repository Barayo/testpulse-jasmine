const { Case } = require('../../../../dist');

describe('FailingFixture', function () {
  it('a real regression', function () {
    Case('LOGIN-42');
    expect(true).toBe(false);
  });
});
