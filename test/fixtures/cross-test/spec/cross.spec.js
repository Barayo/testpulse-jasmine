const { Case, Attach } = require('../../../../dist');

describe('CrossTestFixture', function () {
  it('declares a case key', function () {
    Case('LOGIN-42');
    expect(true).toBe(true);
  });

  it('attempts to attach under another spec\'s case key', function () {
    let threw = false;
    try {
      Attach('LOGIN-42', Buffer.from([1]), 'failure.png', 'image/png');
    } catch (e) {
      threw = true;
    }
    expect(threw).toBe(true);
  });
});
