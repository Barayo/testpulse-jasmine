const { Case } = require('../../../../dist');

describe('ParallelOne', function () {
  it('spec one', function () {
    Case('LOGIN-1');
    expect(true).toBe(true);
  });
});
