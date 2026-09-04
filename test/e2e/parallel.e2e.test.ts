import * as path from 'path';
import * as fs from 'fs';
import { runNestedJasmine } from './helpers/runJasmine';
import { startStubImportServer } from './helpers/stubImportServer';

describe('--parallel mode (real jasmine run)', () => {
  it('setSpecProperty survives into the reporter across worker processes', async () => {
    const server = await startStubImportServer(() => ({
      status: 201,
      body: { key: 'LOGIN-R5' },
    }));
    const fixtureDir = path.join(__dirname, '../fixtures/parallel');
    const testpulseDir = path.join(fixtureDir, '.testpulse');
    fs.rmSync(testpulseDir, { recursive: true, force: true });

    const result = await runNestedJasmine(
      fixtureDir,
      path.join(fixtureDir, 'config.js'),
      {
        TESTPULSE_URL: server.url,
        TESTPULSE_TOKEN: 't0k3n',
        TESTPULSE_PROJECT: 'LOGIN',
      },
      ['--parallel=2'],
    );
    await server.close();

    expect(result.exitCode).toBe(0);
    expect(server.requests).toHaveLength(1);
    const report = (server.requests[0].body as { report: string }).report;
    expect(report).toContain('<property name="testpulse_case_key" value="LOGIN-1"/>');
    expect(report).toContain('<property name="testpulse_case_key" value="LOGIN-2"/>');

    fs.rmSync(testpulseDir, { recursive: true, force: true });
  });
});
