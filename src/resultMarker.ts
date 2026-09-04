import * as fs from 'fs';
import * as path from 'path';

export interface ResultMarker {
  failed: boolean;
  reason?: string;
}

function markerPath(): string {
  return path.join(process.cwd(), '.testpulse', 'result.json');
}

/**
 * Records whether the run's outcome should fail the build. Jasmine's own
 * CLI determines its process exit code purely from spec pass/fail
 * status (confirmed via reading jasmine-npm's source) and provides no
 * mechanism for a reporter to influence it -- this marker, paired with
 * the separate `check` CLI that reads it, is how a submission error or
 * an unmatched-case-with-failOnUnmatched outcome actually fails the
 * build, the same hybrid architecture already proven for the .NET
 * plugin's identical constraint.
 */
export function writeResultMarker(marker: ResultMarker): void {
  const dir = path.dirname(markerPath());
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(markerPath(), JSON.stringify(marker));
}

export type ReadResultMarkerOutcome =
  | { present: true; marker: ResultMarker }
  | { present: false };

export function readResultMarker(): ReadResultMarkerOutcome {
  if (!fs.existsSync(markerPath())) {
    return { present: false };
  }
  const marker: ResultMarker = JSON.parse(fs.readFileSync(markerPath(), 'utf8'));
  return { present: true, marker };
}
