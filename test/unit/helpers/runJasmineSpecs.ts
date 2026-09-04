import jasmineRequire = require('jasmine-core');

/**
 * Builds a fresh, isolated Jasmine environment (via jasmine-core's own
 * library API, not a subprocess) and installs it as the global `jasmine`
 * real Jasmine CLI usage relies on -- so production code under test can
 * call `jasmine.getEnv()` exactly as it would under a real `jasmine` run,
 * while this helper defines and runs real specs against it. A fresh core
 * is constructed per call (jasmineRequire.core is a factory), so tests
 * don't share Jasmine state with each other.
 */
export interface RunResult {
  specs: Array<{
    description: string;
    fullName: string;
    status: string;
    properties: Record<string, unknown> | null;
    failedExpectations: Array<{ message: string }>;
  }>;
}

export async function runJasmineSpecs(
  define: () => void,
): Promise<RunResult> {
  const jasmineCore = (jasmineRequire as any).core(jasmineRequire);
  const env = jasmineCore.getEnv({ suppressLoadErrors: true });
  const iface = (jasmineRequire as any).interface(jasmineCore, env);

  const previousGlobals: Record<string, unknown> = {};
  for (const key of Object.keys(iface)) {
    previousGlobals[key] = (global as any)[key];
    (global as any)[key] = iface[key];
  }

  const specs: RunResult['specs'] = [];
  env.addReporter({
    specDone(result: any) {
      specs.push({
        description: result.description,
        fullName: result.fullName,
        status: result.status,
        properties: result.properties ?? null,
        failedExpectations: result.failedExpectations ?? [],
      });
    },
  });

  try {
    define();
    await env.execute();
  } finally {
    for (const key of Object.keys(previousGlobals)) {
      (global as any)[key] = previousGlobals[key];
    }
  }

  return { specs };
}
