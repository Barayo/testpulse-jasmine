import { ReporterOptions, resolveConfig } from './config';
import { getCases, ImportAttachment, postImport } from './httpClient';
import { clearAttachments, readAttachments } from './attachmentStore';
import { buildJUnitXml, SpecResultLike } from './xmlBuilder';
import { writeResultMarker } from './resultMarker';
import * as path from 'path';

/**
 * A Jasmine reporter that builds JUnit XML directly from spec
 * properties (set via jasmine.getEnv().setSpecProperty()) and
 * auto-submits it, without depending on jasmine-reporters or any other
 * third-party JUnit XML writer. Must be registered via the declarative
 * `reporters` array in a JavaScript Jasmine config file (not a `helpers`
 * file calling jasmine.getEnv().addReporter()) -- confirmed via a real
 * repro that the helpers-file approach throws a fatal error under
 * `jasmine --parallel=N`. Declares reporterCapabilities: { parallel:
 * true } so it also works correctly under --parallel mode -- confirmed
 * via a second real repro that setSpecProperty's value genuinely
 * survives into specDone results under real --parallel=2 execution once
 * this capability is declared.
 */
export class TestPulseReporter {
  public reporterCapabilities = { parallel: true };

  private specs: SpecResultLike[] = [];
  private options: ReporterOptions;

  constructor(options: ReporterOptions = {}) {
    this.options = options;
  }

  specDone(result: any): void {
    this.specs.push({
      fullName: result.fullName,
      description: result.description,
      status: result.status,
      properties: result.properties ?? null,
      failedExpectations: result.failedExpectations ?? [],
    });
  }

  async jasmineDone(): Promise<void> {
    const config = resolveConfig(this.options);
    const suiteName = path.basename(process.cwd());
    const report = buildJUnitXml(suiteName, this.specs);

    const declaredCaseKeys = new Set(
      this.specs
        .map((s) => s.properties?.['testpulse_case_key'])
        .filter((k): k is string => typeof k === 'string'),
    );

    if (!config.url || !config.token || !config.project) {
      // eslint-disable-next-line no-console
      console.error(
        'testpulse-jasmine: TESTPULSE_URL, TESTPULSE_TOKEN, and TESTPULSE_PROJECT are required (set directly, or via reporter options). Skipping submission.',
      );
      return;
    }

    if (config.dryRun) {
      await this.runDryRun(config.url, config.project, config.token, declaredCaseKeys);
      return;
    }

    await this.runSubmit(config.url, config.project, config.token, report, declaredCaseKeys, config.failOnUnmatched);
  }

  private async runDryRun(
    url: string,
    project: string,
    token: string,
    declaredCaseKeys: Set<string>,
  ): Promise<void> {
    // eslint-disable-next-line no-console
    console.log('testpulse-jasmine: dry run -- no import will be submitted');
    try {
      const result = await getCases(url, project, token);
      if (result.status < 200 || result.status >= 300) {
        throw new Error(`fetch failed: status ${result.status}`);
      }
      const existing = new Set(
        (result.body as Array<{ key: string }>).map((c) => c.key),
      );
      for (const key of declaredCaseKeys) {
        // eslint-disable-next-line no-console
        console.log(existing.has(key) ? `  would match: ${key}` : `  would NOT match (no such case): ${key}`);
      }
      writeResultMarker({ failed: false });
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`testpulse-jasmine: dry-run fetch failed: ${(e as Error).message}`);
      writeResultMarker({ failed: true });
    }
  }

  private async runSubmit(
    url: string,
    project: string,
    token: string,
    report: string,
    declaredCaseKeys: Set<string>,
    failOnUnmatched: boolean,
  ): Promise<void> {
    // Only attachments whose case key THIS run actually declared are
    // included -- a stale .testpulse/attachments left over from an
    // unrelated earlier run must not silently ride along into this
    // submission, the same real bug found post-implementation in the
    // gtest plugin, applied here proactively from the start.
    const attachments: ImportAttachment[] = readAttachments(process.cwd())
      .filter((a) => declaredCaseKeys.has(a.caseKey))
      .map((a) => ({
        caseKey: a.caseKey,
        filename: a.filename,
        contentType: a.contentType,
        data: a.data.toString('base64'),
      }));

    try {
      const result = await postImport(url, project, token, report, attachments);
      if (result.status === 201) {
        const body = result.body as { key?: string };
        // eslint-disable-next-line no-console
        console.log(`testpulse-jasmine: all tests matched, created run ${body.key}`);
        writeResultMarker({ failed: false });
        clearAttachments(process.cwd());
      } else if (result.status === 207) {
        const body = result.body as { matched?: number; unmatched?: Array<{ caseKey: string }> };
        const unmatched = body.unmatched ?? [];
        // eslint-disable-next-line no-console
        console.log(`testpulse-jasmine: ${body.matched} matched, ${unmatched.length} unmatched`);
        for (const u of unmatched) {
          // eslint-disable-next-line no-console
          console.log(`  unmatched: ${u.caseKey}`);
        }
        if (unmatched.length > 0) {
          // eslint-disable-next-line no-console
          console.log('testpulse-jasmine: enable failOnUnmatched to make this a hard failure');
          writeResultMarker({ failed: failOnUnmatched });
        } else {
          writeResultMarker({ failed: false });
        }
        clearAttachments(process.cwd());
      } else {
        // eslint-disable-next-line no-console
        console.error(`testpulse-jasmine: submission failed: status ${result.status}: ${JSON.stringify(result.body)}`);
        writeResultMarker({ failed: true });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(`testpulse-jasmine: submission failed: ${(e as Error).message}`);
      writeResultMarker({ failed: true });
    }
  }
}
