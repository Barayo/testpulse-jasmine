import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { readAttachments, writeAttachment } from '../../src/attachmentStore';

function withTempCwd<T>(fn: () => T): T {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'testpulse-jasmine-store-'));
  const original = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(original);
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

describe('readAttachments', () => {
  it('round-trips an attachment written via writeAttachment', () => {
    withTempCwd(() => {
      writeAttachment('LOGIN-42', Buffer.from([1, 2, 3]), 'shot.png', 'image/png');
      const found = readAttachments(process.cwd());
      expect(found).toHaveLength(1);
      expect(found[0]).toMatchObject({
        caseKey: 'LOGIN-42',
        filename: 'shot.png',
        contentType: 'image/png',
      });
      expect(found[0].data).toEqual(Buffer.from([1, 2, 3]));
    });
  });

  it('skips a malformed JSON sidecar without throwing', () => {
    withTempCwd(() => {
      const dir = path.join(process.cwd(), '.testpulse', 'attachments');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'broken.json'), '{not valid json');
      fs.writeFileSync(path.join(dir, 'broken.data'), 'x');
      expect(() => readAttachments(process.cwd())).not.toThrow();
      expect(readAttachments(process.cwd())).toHaveLength(0);
    });
  });

  it('ignores an attachments-named directory that is not .testpulse/attachments', () => {
    withTempCwd(() => {
      const decoy = path.join(process.cwd(), 'unrelated-pkg', 'attachments');
      fs.mkdirSync(decoy, { recursive: true });
      fs.writeFileSync(
        path.join(decoy, 'fake.json'),
        JSON.stringify({ caseKey: 'LOGIN-42', filename: 'exfil.txt', contentType: 'text/plain' }),
      );
      fs.writeFileSync(path.join(decoy, 'fake.data'), 'exfiltrated bytes');
      expect(readAttachments(process.cwd())).toHaveLength(0);
    });
  });

  it('discards a sidecar whose contentType is not in the supported allowlist', () => {
    withTempCwd(() => {
      const dir = path.join(process.cwd(), '.testpulse', 'attachments');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'bad.json'),
        JSON.stringify({ caseKey: 'LOGIN-42', filename: 'exfil.txt', contentType: 'text/plain' }),
      );
      fs.writeFileSync(path.join(dir, 'bad.data'), 'x');
      expect(readAttachments(process.cwd())).toHaveLength(0);
    });
  });

  it('returns an empty array when the scratch directory does not exist', () => {
    withTempCwd(() => {
      expect(readAttachments(process.cwd())).toEqual([]);
    });
  });
});
