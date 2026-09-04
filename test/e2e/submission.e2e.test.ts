import * as path from 'path';
import * as fs from 'fs';
import { runNestedJasmine } from './helpers/runJasmine';
import { startStubImportServer } from './helpers/stubImportServer';
import { checkExitCode } from '../../src/check';

function withCwd<T>(dir: string, fn: () => T): T {
  const original = process.cwd();
  process.chdir(dir);
  try {
    return fn();
  } finally {
    process.chdir(original);
  }
}

describe('submission (real jasmine run)', () => {
  it('a genuinely failing spec still triggers annotate and submit', async () => {
    const server = await startStubImportServer(() => ({
      status: 201,
      body: { key: 'LOGIN-R3' },
    }));
    const fixtureDir = path.join(__dirname, '../fixtures/failing');
    const testpulseDir = path.join(fixtureDir, '.testpulse');
    fs.rmSync(testpulseDir, { recursive: true, force: true });

    const result = await runNestedJasmine(fixtureDir, path.join(fixtureDir, 'config.js'), {
      TESTPULSE_URL: server.url,
      TESTPULSE_TOKEN: 't0k3n',
      TESTPULSE_PROJECT: 'LOGIN',
    });
    await server.close();

    // jasmine itself reports the spec failure...
    expect(result.exitCode).not.toBe(0);
    // ...but the reporter's jasmineDone handler still ran and submitted.
    expect(server.requests).toHaveLength(1);
    const report = (server.requests[0].body as { report: string }).report;
    expect(report).toContain('<property name="testpulse_case_key" value="LOGIN-42"/>');

    fs.rmSync(testpulseDir, { recursive: true, force: true });
  });

  it('the full chain (jasmine && testpulse-jasmine check) fails the build for an unmatched, failOnUnmatched case', async () => {
    const server = await startStubImportServer(() => ({
      status: 207,
      body: {
        run: { id: 'r1', key: 'LOGIN-R4' },
        message: '1 unmatched',
        matched: 0,
        unmatched: [{ caseKey: 'LOGIN-42', verdict: 'passed' }],
      },
    }));
    const fixtureDir = path.join(__dirname, '../fixtures/tagged');
    const testpulseDir = path.join(fixtureDir, '.testpulse');
    fs.rmSync(testpulseDir, { recursive: true, force: true });

    const jasmineResult = await runNestedJasmine(fixtureDir, path.join(fixtureDir, 'config.js'), {
      TESTPULSE_URL: server.url,
      TESTPULSE_TOKEN: 't0k3n',
      TESTPULSE_PROJECT: 'LOGIN',
      TESTPULSE_FAIL_ON_UNMATCHED: 'true',
    });
    await server.close();

    // The underlying specs all passed -- jasmine's own exit code is 0.
    expect(jasmineResult.exitCode).toBe(0);
    // check is what actually fails the build here.
    const checkResult = withCwd(fixtureDir, () => checkExitCode());
    expect(checkResult).not.toBe(0);

    fs.rmSync(testpulseDir, { recursive: true, force: true });
  });
});
