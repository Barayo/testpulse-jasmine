# Contributing

## Setup

```bash
npm install
npm run build
```

## Testing

Tests are layered:

- **Unit tests** (`test/unit/`, `npm test`) — `Case`/`Attach`, the XML
  builder, `config`, `check`, and the reporter each tested in isolation.
  `Case`/`Attach` tests run against a real, isolated Jasmine environment
  constructed via `jasmine-core`'s own library API
  (`test/unit/helpers/runJasmineSpecs.ts`) rather than a fake — Jest
  itself has no `jasmine` global to rely on (removed in Jest 27+), so
  this is the real thing, not a mock, without spawning a subprocess per
  test. Reporter tests mock `../../src/httpClient` via `jest.mock()`.
- **End-to-end tests** (`test/e2e/`, `npm run test:e2e`) — spawn a real
  nested `jasmine` process against a fixture project under
  `test/fixtures/`, proving the pieces actually integrate (`Case`/`Attach`
  → the reporter → the submitted request → the result marker →
  `check`'s exit code). These run against the built `dist/` output, so
  `npm run test:e2e` rebuilds first. A real stub HTTP server
  (`test/e2e/helpers/stubImportServer.ts`) stands in for the TestPulse
  import API. `test/e2e/parallel.e2e.test.ts` runs a real
  `jasmine --parallel=2` invocation — this is what actually caught the
  original registration mechanism (a `helpers` file calling
  `jasmine.getEnv().addReporter()`) being fundamentally incompatible with
  parallel mode, before it ever shipped.

Run everything: `npm run test:all`.

TDD is the standing practice: write the failing test first, then the
minimal implementation to make it pass.

## Release process

Releases are automated via [`semantic-release`](https://semantic-release.gitbook.io/)
on merge to `main`, following [Angular/Conventional Commits](https://www.conventionalcommits.org/)
(`feat:`, `fix:`, etc.) — see `.releaserc.json`. Publishing to npm uses
[trusted publishing (OIDC)](https://docs.npmjs.com/trusted-publishers/), so
there's no `NPM_TOKEN` secret to manage.

If a release's publish step fails after its version-bump commit/tag has
already been pushed (a real risk with `semantic-release`'s prepare-before-publish
ordering), trigger `.github/workflows/release.yml` manually
(`workflow_dispatch`) to publish the already-tagged version directly,
rather than re-running the push-triggered flow.
