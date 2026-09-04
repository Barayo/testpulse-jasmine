import { execFile } from 'child_process';
import * as path from 'path';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * jasmine's package.json `exports` field only exposes '.' and
 * './parallel', not './bin/jasmine.js' -- so require.resolve('jasmine/bin/jasmine.js')
 * fails outright with ERR_PACKAGE_PATH_NOT_EXPORTED, confirmed empirically.
 * Resolving the package's main entry point first and deriving the bin
 * path from its directory sidesteps the exports restriction.
 */
function resolveJasmineBin(): string {
  const mainEntry = require.resolve('jasmine'); // .../node_modules/jasmine/lib/jasmine.js
  const packageRoot = path.dirname(path.dirname(mainEntry));
  return path.join(packageRoot, 'bin', 'jasmine.js');
}

export interface JasmineRunResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

/** Spawns a real nested `jasmine` process against a fixture project's own config. */
export async function runNestedJasmine(
  cwd: string,
  configPath: string,
  extraEnv: Record<string, string> = {},
  extraArgs: string[] = [],
): Promise<JasmineRunResult> {
  const jasmineBin = resolveJasmineBin();
  try {
    const { stdout, stderr } = await execFileAsync(
      process.execPath,
      [jasmineBin, `--config=${configPath}`, ...extraArgs],
      { cwd, env: { ...process.env, ...extraEnv } },
    );
    return { exitCode: 0, stdout, stderr };
  } catch (err) {
    const e = err as { code?: number; stdout?: string; stderr?: string };
    return { exitCode: e.code ?? 1, stdout: e.stdout ?? '', stderr: e.stderr ?? '' };
  }
}
