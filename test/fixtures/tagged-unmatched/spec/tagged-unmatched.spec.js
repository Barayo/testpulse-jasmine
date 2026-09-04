const { Case } = require('../../../../dist');

describe('TaggedUnmatchedFixture', function () {
  it('login succeeds', function () {
    Case('LOGIN-42');
    expect(true).toBe(true);
  });
});
