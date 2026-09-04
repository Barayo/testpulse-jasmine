import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { checkExitCode } from '../../src/check';

describe('checkExitCode', () => {
  let cwd: string;
  let originalCwd: string;

  beforeEach(() => {
    originalCwd = process.cwd();
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'testpulse-jasmine-check-'));
    process.chdir(cwd);
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(cwd, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  function writeMarker(content: unknown) {
    const dir = path.join(cwd, '.testpulse');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'result.json'), JSON.stringify(content));
  }

  it('exits non-zero when failed:true', () => {
    writeMarker({ failed: true });
    expect(checkExitCode()).toBe(1);
  });

  it('exits 0 when failed:false', () => {
    writeMarker({ failed: false });
    expect(checkExitCode()).toBe(0);
  });

  it('exits non-zero with a named cause when the marker is missing', () => {
    const errorSpy = jest.spyOn(console, 'error');
    expect(checkExitCode()).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('reporters array entry'));
  });

  it('reports the marker\'s own reason when the reporter ran but recorded a specific cause', () => {
    const errorSpy = jest.spyOn(console, 'error');
    writeMarker({ failed: true, reason: 'TESTPULSE_URL, TESTPULSE_TOKEN, and TESTPULSE_PROJECT are required' });
    expect(checkExitCode()).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('TESTPULSE_URL, TESTPULSE_TOKEN, and TESTPULSE_PROJECT are required'));
  });

  it('falls back to the generic message when failed:true has no reason', () => {
    const errorSpy = jest.spyOn(console, 'error');
    writeMarker({ failed: true });
    expect(checkExitCode()).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('submission failed or was unmatched'));
  });
});
