import { readResultMarker } from './resultMarker';

/**
 * The only mechanism that can actually fail the build for a submission
 * error or an unmatched-case outcome, since Jasmine's own CLI determines
 * its exit code purely from spec pass/fail status (confirmed via
 * source) and a reporter has no way to influence it.
 */
export function checkExitCode(): number {
  const outcome = readResultMarker();
  if (!outcome.present) {
    // eslint-disable-next-line no-console
    console.error(
      'testpulse-jasmine: no .testpulse/result.json found -- likely cause: the ' +
        "reporters array entry is missing from your Jasmine config file, or the config " +
        'file was not actually loaded',
    );
    return 1;
  }
  if (outcome.marker.failed) {
    // eslint-disable-next-line no-console
    console.error(
      outcome.marker.reason
        ? `testpulse-jasmine: ${outcome.marker.reason}`
        : 'testpulse-jasmine: submission failed or was unmatched with failOnUnmatched set',
    );
    return 1;
  }
  return 0;
}
