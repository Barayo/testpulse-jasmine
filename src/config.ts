export interface ReporterOptions {
  url?: string;
  token?: string;
  project?: string;
  failOnUnmatched?: boolean;
  dryRun?: boolean;
}

export interface ResolvedConfig {
  url?: string;
  token?: string;
  project?: string;
  failOnUnmatched: boolean;
  dryRun: boolean;
}

function resolveString(envVar: string, optionValue: string | undefined): string | undefined {
  const envValue = process.env[envVar];
  if (envValue !== undefined && envValue !== '') return envValue;
  return optionValue;
}

function resolveBoolean(envVar: string, optionValue: boolean | undefined): boolean {
  const envValue = process.env[envVar];
  if (envValue !== undefined && envValue !== '') return envValue === 'true' || envValue === '1';
  return optionValue ?? false;
}

/** Env var always wins over the reporter's own constructor options -- see design.md. */
export function resolveConfig(options: ReporterOptions = {}): ResolvedConfig {
  return {
    url: resolveString('TESTPULSE_URL', options.url),
    token: resolveString('TESTPULSE_TOKEN', options.token),
    project: resolveString('TESTPULSE_PROJECT', options.project),
    failOnUnmatched: resolveBoolean('TESTPULSE_FAIL_ON_UNMATCHED', options.failOnUnmatched),
    dryRun: resolveBoolean('TESTPULSE_DRY_RUN', options.dryRun),
  };
}

/** Never includes the resolved token -- for use wherever a config needs to appear in logs. */
export function redacted(config: ResolvedConfig): string {
  return JSON.stringify({ ...config, token: config.token ? '(redacted)' : undefined });
}
