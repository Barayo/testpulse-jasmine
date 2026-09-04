import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { runJasmineSpecs } from './helpers/runJasmineSpecs';
import { Case } from '../../src/testpulse';
import { Attach } from '../../src/testpulseAttach';

function withTempCwd<T>(fn: () => Promise<T>): Promise<T> {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testpulse-jasmine-'));
  const original = process.cwd();
  process.chdir(dir);
  return fn().finally(() => {
    process.chdir(original);
    fs.rmSync(dir, { recursive: true, force: true });
  });
}

function attachmentFiles(cwd: string, ext: string): string[] {
  const dir = path.join(cwd, '.testpulse', 'attachments');
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(ext));
}

describe('Attach', () => {
  it('succeeds for the currently-executing spec\'s own declared case key', async () => {
    await withTempCwd(async () => {
      const cwd = process.cwd();
      let threw = false;
      await runJasmineSpecs(() => {
        it('a spec', () => {
          Case('LOGIN-42');
          try {
            Attach('LOGIN-42', Buffer.from([1, 2, 3]), 'failure.png', 'image/png');
          } catch {
            threw = true;
          }
        });
      });
      expect(threw).toBe(false);
      expect(attachmentFiles(cwd, '.data')).toHaveLength(1);
    });
  });

  it('rejects an attachment under an undeclared case key', async () => {
    let message = '';
    await withTempCwd(async () => {
      await runJasmineSpecs(() => {
        it('a spec', () => {
          Case('LOGIN-43');
          try {
            Attach('OTHER-1', Buffer.from([1]), 'failure.png', 'image/png');
          } catch (e) {
            message = (e as Error).message;
          }
        });
      });
    });
    expect(message).toContain('was not declared via Case()');
  });

  it('rejects an unsupported content type, even for a declared case key', async () => {
    let message = '';
    await withTempCwd(async () => {
      await runJasmineSpecs(() => {
        it('a spec', () => {
          Case('LOGIN-44');
          try {
            Attach('LOGIN-44', Buffer.from([1]), 'x.pdf', 'application/pdf');
          } catch (e) {
            message = (e as Error).message;
          }
        });
      });
    });
    expect(message).toContain('unsupported content type');
  });

  it('validates content type before the case-key check', async () => {
    let message = '';
    await withTempCwd(async () => {
      await runJasmineSpecs(() => {
        it('a spec', () => {
          // No Case() call at all -- if the case-key check ran first,
          // this would fail with the allowlist error instead.
          try {
            Attach('NEVER-DECLARED', Buffer.from([1]), 'x.pdf', 'application/pdf');
          } catch (e) {
            message = (e as Error).message;
          }
        });
      });
    });
    expect(message).toContain('unsupported content type');
  });

  it('throws with no active spec, letting Jasmine\'s own error surface', async () => {
    let message = '';
    await withTempCwd(async () => {
      await runJasmineSpecs(() => {
        describe('outer', () => {
          try {
            Attach('LOGIN-45', Buffer.from([1]), 'a.png', 'image/png');
          } catch (e) {
            message = (e as Error).message;
          }
          it('inner spec', () => {
            expect(true).toBe(true);
          });
        });
      });
    });
    expect(message).toContain('no current spec');
  });

  it('two attachments under the same case key both survive', async () => {
    await withTempCwd(async () => {
      const cwd = process.cwd();
      await runJasmineSpecs(() => {
        it('a spec', () => {
          Case('LOGIN-46');
          Attach('LOGIN-46', Buffer.from([1]), 'a.png', 'image/png');
          Attach('LOGIN-46', Buffer.from([2]), 'b.png', 'image/png');
        });
      });
      expect(attachmentFiles(cwd, '.data')).toHaveLength(2);
    });
  });
});
