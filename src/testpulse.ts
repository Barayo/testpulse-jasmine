export interface CaseOptions {
  platform?: string;
  version?: string;
  tags?: string[];
}

/**
 * Tags the currently-running Jasmine spec with a TestPulse case key, via
 * Jasmine's own native jasmine.getEnv().setSpecProperty() (a real,
 * documented API since Jasmine 3.6.0) -- no scratch-directory
 * side-channel needed, unlike testpulse-jest's design. Called outside an
 * active spec, Jasmine's own setSpecProperty throws
 * "'setSpecProperty' was used when there was no current spec" -- that
 * error is left to surface as-is, not caught or duplicated.
 */
export function Case(caseKey: string, opts?: CaseOptions): void {
  const env = jasmine.getEnv();
  env.setSpecProperty('testpulse_case_key', caseKey);
  if (opts?.platform !== undefined) {
    env.setSpecProperty('testpulse_platform', opts.platform);
  }
  if (opts?.version !== undefined) {
    env.setSpecProperty('testpulse_version', opts.version);
  }
  if (opts?.tags !== undefined) {
    env.setSpecProperty('testpulse_tags', opts.tags.join(','));
  }
}
