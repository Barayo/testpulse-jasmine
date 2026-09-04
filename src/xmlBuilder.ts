export interface SpecResultLike {
  fullName: string;
  description: string;
  status: string;
  properties: Record<string, unknown> | null;
  failedExpectations: Array<{ message: string; stack?: string }>;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Builds a JUnit XML report directly from Jasmine spec results --
 * specifically their `properties` field, populated by
 * jasmine.getEnv().setSpecProperty(). No dependency on jasmine-reporters
 * (confirmed via reading its source to have zero property-injection
 * support) or any other third-party JUnit XML writer.
 */
export function buildJUnitXml(suiteName: string, specs: SpecResultLike[]): string {
  const failures = specs.filter((s) => s.status === 'failed').length;
  const skipped = specs.filter((s) => s.status === 'pending' || s.status === 'excluded').length;

  const testcases = specs
    .map((spec) => {
      let body = '';
      const properties = spec.properties;
      if (properties && Object.keys(properties).length > 0) {
        const props = Object.entries(properties)
          .map(([key, value]) => `<property name="${escapeXml(key)}" value="${escapeXml(String(value))}"/>`)
          .join('');
        body += `<properties>${props}</properties>`;
      }
      if (spec.status === 'failed') {
        const failure = spec.failedExpectations[0];
        const message = failure ? escapeXml(failure.message) : 'spec failed';
        const stack = failure?.stack ? escapeXml(failure.stack) : '';
        body += `<failure message="${message}">${stack}</failure>`;
      } else if (spec.status === 'pending' || spec.status === 'excluded') {
        body += '<skipped/>';
      }
      return `<testcase classname="${escapeXml(suiteName)}" name="${escapeXml(spec.description)}" time="0">${body}</testcase>`;
    })
    .join('');

  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    `<testsuites><testsuite name="${escapeXml(suiteName)}" tests="${specs.length}" failures="${failures}" errors="0" skipped="${skipped}">` +
    testcases +
    '</testsuite></testsuites>'
  );
}
