import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TestPulseReporter } from '../../src/reporter';
import { readResultMarker } from '../../src/resultMarker';
import { writeAttachment } from '../../src/attachmentStore';
import * as httpClient from '../../src/httpClient';

jest.mock('../../src/httpClient');
const mockedHttpClient = httpClient as jest.Mocked<typeof httpClient>;

function specResult(overrides: Record<string, unknown> = {}) {
  return {
    fullName: 'suite spec',
    description: 'spec',
    status: 'passed',
    properties: { testpulse_case_key: 'LOGIN-42' },
    failedExpectations: [],
    ...overrides,
  };
}

describe('TestPulseReporter', () => {
  let cwd: string;
  let originalCwd: string;
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    originalCwd = process.cwd();
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'testpulse-jasmine-reporter-'));
    process.chdir(cwd);
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(cwd, { recursive: true, force: true });
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  function makeReporter(overrides: Record<string, unknown> = {}) {
    return new TestPulseReporter({
      url: 'https://testpulse.example',
      project: 'LOGIN',
      token: 't0k3n',
      ...overrides,
    } as never);
  }

  it('a 201 response writes failed:false and logs the summary', async () => {
    mockedHttpClient.postImport.mockResolvedValue({ status: 201, body: { key: 'LOGIN-R1' } });
    const reporter = makeReporter();
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    const marker = readResultMarker();
    expect(marker).toEqual({ present: true, marker: { failed: false } });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('LOGIN-R1'));
  });

  it('a 207 response with default config writes failed:false and logs unmatched keys', async () => {
    mockedHttpClient.postImport.mockResolvedValue({
      status: 207,
      body: { matched: 0, unmatched: [{ caseKey: 'LOGIN-42' }] },
    });
    const reporter = makeReporter();
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(readResultMarker()).toEqual({ present: true, marker: { failed: false } });
  });

  it('a 207 response with failOnUnmatched enabled writes failed:true', async () => {
    mockedHttpClient.postImport.mockResolvedValue({
      status: 207,
      body: { matched: 0, unmatched: [{ caseKey: 'LOGIN-42' }] },
    });
    const reporter = makeReporter({ failOnUnmatched: true });
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(readResultMarker()).toEqual({ present: true, marker: { failed: true } });
  });

  it('a network error writes failed:true regardless of failOnUnmatched', async () => {
    mockedHttpClient.postImport.mockRejectedValue(new Error('connection refused'));
    const reporter = makeReporter();
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(readResultMarker()).toEqual({ present: true, marker: { failed: true } });
  });

  it('a 5xx response writes failed:true', async () => {
    mockedHttpClient.postImport.mockResolvedValue({ status: 500, body: { error: 'boom' } });
    const reporter = makeReporter();
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(readResultMarker()).toEqual({ present: true, marker: { failed: true } });
  });

  it('dry run previews matches without submitting', async () => {
    mockedHttpClient.getCases.mockResolvedValue({ status: 200, body: [{ key: 'LOGIN-42' }] });
    const reporter = makeReporter({ dryRun: true });
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(mockedHttpClient.postImport).not.toHaveBeenCalled();
    expect(readResultMarker()).toEqual({ present: true, marker: { failed: false } });
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('would match: LOGIN-42'));
  });

  it('a dry-run fetch failure writes failed:true', async () => {
    mockedHttpClient.getCases.mockRejectedValue(new Error('connection refused'));
    const reporter = makeReporter({ dryRun: true });
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(readResultMarker()).toEqual({ present: true, marker: { failed: true } });
  });

  it('prunes .testpulse/attachments after a successful (201) submission', async () => {
    mockedHttpClient.postImport.mockResolvedValue({ status: 201, body: { key: 'LOGIN-R1' } });
    writeAttachment('LOGIN-42', Buffer.from([1]), 'shot.png', 'image/png');
    const reporter = makeReporter();
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(fs.existsSync(path.join(cwd, '.testpulse', 'attachments'))).toBe(false);
  });

  it('prunes .testpulse/attachments after a successful (207) submission', async () => {
    mockedHttpClient.postImport.mockResolvedValue({
      status: 207,
      body: { matched: 0, unmatched: [{ caseKey: 'LOGIN-42' }] },
    });
    writeAttachment('LOGIN-42', Buffer.from([1]), 'shot.png', 'image/png');
    const reporter = makeReporter();
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(fs.existsSync(path.join(cwd, '.testpulse', 'attachments'))).toBe(false);
  });

  it('leaves .testpulse/attachments in place after a failed submission, for a retry', async () => {
    mockedHttpClient.postImport.mockResolvedValue({ status: 500, body: { error: 'boom' } });
    writeAttachment('LOGIN-42', Buffer.from([1]), 'shot.png', 'image/png');
    const reporter = makeReporter();
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    expect(fs.existsSync(path.join(cwd, '.testpulse', 'attachments'))).toBe(true);
  });

  it('never logs the token', async () => {
    mockedHttpClient.postImport.mockResolvedValue({ status: 500, body: { error: 'boom' } });
    const reporter = makeReporter();
    reporter.specDone(specResult());
    await reporter.jasmineDone();
    const allCalls = [...logSpy.mock.calls, ...errorSpy.mock.calls].flat().join(' ');
    expect(allCalls).not.toContain('t0k3n');
  });
});
