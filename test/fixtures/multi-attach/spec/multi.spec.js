const { Case, Attach } = require('../../../../dist');

describe('MultiAttachFixture', function () {
  it('attaches twice', function () {
    Case('LOGIN-45');
    Attach('LOGIN-45', Buffer.from([1]), 'a.png', 'image/png');
    Attach('LOGIN-45', Buffer.from([2]), 'b.png', 'image/png');
    expect(true).toBe(true);
  });
});
