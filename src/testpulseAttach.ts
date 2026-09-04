import { isSupportedContentType, SUPPORTED_CONTENT_TYPES, writeAttachment } from './attachmentStore';

/**
 * Records a screenshot/artifact attachment for caseKey, which must equal
 * the currently-executing spec's own Case()-declared case key. Verified
 * via Jasmine's own jasmine.getEnv().getSpecProperty() readback of what
 * Case() set -- a genuine, built-in capability, unlike every other
 * plugin in this family, which had to build its own allowlist-tracking
 * mechanism from scratch. A call with no active spec lets Jasmine's own
 * getSpecProperty error ("... was used when there was no current spec")
 * surface as-is. Content type is validated before the case-key check.
 */
export function Attach(
  caseKey: string,
  data: Buffer,
  filename: string,
  contentType: string,
): void {
  if (!isSupportedContentType(contentType)) {
    throw new Error(
      `testpulse-jasmine: unsupported content type '${contentType}' (allowed: ${SUPPORTED_CONTENT_TYPES.join(', ')})`,
    );
  }

  const declaredCaseKey = jasmine.getEnv().getSpecProperty('testpulse_case_key');
  if (declaredCaseKey !== caseKey) {
    throw new Error(
      `testpulse-jasmine: case key '${caseKey}' was not declared via Case() by the currently-executing spec`,
    );
  }

  writeAttachment(caseKey, data, filename, contentType);
}
