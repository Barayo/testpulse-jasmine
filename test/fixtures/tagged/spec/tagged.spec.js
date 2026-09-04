const { Case } = require('../../../../dist');

describe('TaggedFixture', function () {
  it('login succeeds', function () {
    Case('LOGIN-42');
    expect(true).toBe(true);
  });

  it('untagged test', function () {
    expect(true).toBe(true);
  });
});
