import { buildJUnitXml, SpecResultLike } from '../../src/xmlBuilder';

function spec(overrides: Partial<SpecResultLike>): SpecResultLike {
  return {
    fullName: 'suite spec',
    description: 'spec',
    status: 'passed',
    properties: null,
    failedExpectations: [],
    ...overrides,
  };
}

describe('buildJUnitXml', () => {
  it('injects properties for a tagged spec', () => {
    const xml = buildJUnitXml('suite', [
      spec({ description: 'a', properties: { testpulse_case_key: 'LOGIN-42' } }),
    ]);
    expect(xml).toContain('<property name="testpulse_case_key" value="LOGIN-42"/>');
    expect(xml).toContain('<testcase classname="suite" name="a"');
  });

  it('an untagged spec has no properties block', () => {
    const xml = buildJUnitXml('suite', [spec({ description: 'a', properties: null })]);
    expect(xml).not.toContain('<properties>');
  });

  it('a failed spec includes a failure element with the message', () => {
    const xml = buildJUnitXml('suite', [
      spec({
        description: 'a',
        status: 'failed',
        failedExpectations: [{ message: 'expected true to be false' }],
      }),
    ]);
    expect(xml).toContain('<failure message="expected true to be false">');
  });

  it('a pending spec includes a skipped element', () => {
    const xml = buildJUnitXml('suite', [spec({ description: 'a', status: 'pending' })]);
    expect(xml).toContain('<skipped/>');
  });

  it('escapes XML special characters in property values', () => {
    const xml = buildJUnitXml('suite', [
      spec({ description: 'a', properties: { testpulse_tags: 'a&b<c>' } }),
    ]);
    expect(xml).toContain('value="a&amp;b&lt;c&gt;"');
  });
});
