import { runJasmineSpecs } from './helpers/runJasmineSpecs';
import { Case } from '../../src/testpulse';

describe('Case', () => {
  it('records the case key as a spec property', async () => {
    const { specs } = await runJasmineSpecs(() => {
      it('a spec', () => {
        Case('LOGIN-42');
      });
    });
    expect(specs[0].properties).toEqual({ testpulse_case_key: 'LOGIN-42' });
  });

  it('records platform only when supplied', async () => {
    const { specs } = await runJasmineSpecs(() => {
      it('a spec', () => {
        Case('LOGIN-42', { platform: 'linux' });
      });
    });
    expect(specs[0].properties).toEqual({
      testpulse_case_key: 'LOGIN-42',
      testpulse_platform: 'linux',
    });
  });

  it('records version only when supplied', async () => {
    const { specs } = await runJasmineSpecs(() => {
      it('a spec', () => {
        Case('LOGIN-42', { version: '2.0' });
      });
    });
    expect(specs[0].properties).toEqual({
      testpulse_case_key: 'LOGIN-42',
      testpulse_version: '2.0',
    });
  });

  it('records tags only when supplied, joined with commas', async () => {
    const { specs } = await runJasmineSpecs(() => {
      it('a spec', () => {
        Case('LOGIN-42', { tags: ['smoke', 'auth'] });
      });
    });
    expect(specs[0].properties).toEqual({
      testpulse_case_key: 'LOGIN-42',
      testpulse_tags: 'smoke,auth',
    });
  });

  it('an untagged spec carries no properties', async () => {
    const { specs } = await runJasmineSpecs(() => {
      it('a spec', () => {
        expect(true).toBe(true);
      });
    });
    expect(specs[0].properties).toBeNull();
  });

  it('lets Jasmine\'s own error surface when called with no active spec', async () => {
    const { specs } = await runJasmineSpecs(() => {
      // Calling Case() from inside describe() (not it()) runs at
      // definition time, when there's no active spec -- the real
      // "outside an active spec" scenario, not a simulated one.
      describe('outer', () => {
        try {
          Case('LOGIN-42');
        } catch (e) {
          (global as any).__caughtError = (e as Error).message;
        }
        it('inner spec', () => {
          expect(true).toBe(true);
        });
      });
    });
    expect((global as any).__caughtError).toContain('no current spec');
    delete (global as any).__caughtError;
  });
});
