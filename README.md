# testpulse-jasmine

A Jasmine reporter + `check` CLI for reporting test results into
[TestPulse](https://github.com/Barayo/TestPulse) — tags a spec with a
TestPulse case key, and auto-submits a JUnit XML report the reporter
builds directly from the run (matching each tagged spec to an existing
case).

> Requires `jasmine`/`jasmine-core` 5.0 or later. `--parallel` mode is
> fully supported.

Jasmine has a real, first-party API for exactly this —
[`jasmine.getEnv().setSpecProperty(key, value)`](https://jasmine.github.io/api/edge/Env.html)
(since v3.6.0) — so this package doesn't generate or rewrite any XML
using a third-party writer; it builds JUnit XML directly from each
spec's own properties. (`jasmine-reporters`' `JUnitXmlReporter`, the
ecosystem's de facto JUnit XML tool, has no property-injection support
at all — confirmed by reading its source — so this package doesn't
depend on it.)

## Install

```sh
npm install --save-dev testpulse-jasmine
```

## Set up the reporter

Reporters with methods (not just data) can only be registered from a
**JavaScript** Jasmine config file, not JSON:

```js
// spec/support/jasmine.js
const { TestPulseReporter } = require('testpulse-jasmine');

module.exports = {
  spec_dir: 'spec',
  spec_files: ['**/*[sS]pec.js'],
  reporters: [new TestPulseReporter({ url: 'http://localhost:8080', project: 'LOGIN' })],
};
```

If your project currently uses a `spec/support/jasmine.json` or
`jasmine.mjs` config (the default `jasmine init` now generates
`jasmine.mjs`), delete it and point your `jasmine` invocation at the
`.js` file above instead (or add both — Jasmine picks whichever config
format you pass via `--config=`).

## Tag your specs

```js
const { Case } = require('testpulse-jasmine');

describe('login', () => {
  it('succeeds', () => {
    Case('LOGIN-42', { platform: 'linux', tags: ['smoke'] });
    // ...
  });
});
```

Run your suite and check the result — since Jasmine's own CLI determines
its exit code purely from spec pass/fail and has no way for a reporter
to influence it, `testpulse-jasmine check` is the only thing that can
fail the build for a submission error or an unmatched case:

```sh
jasmine; jasmine_status=$?
testpulse-jasmine check; check_status=$?
[ "$jasmine_status" -eq 0 ] && [ "$check_status" -eq 0 ]
```

**Don't chain these with `&&`** (`jasmine && testpulse-jasmine check`) —
when a spec fails, `jasmine` exits non-zero and `&&` short-circuits,
so `check` never runs and its own diagnostic (e.g. "submission failed:
status 401") never prints, even though the overall exit code happens to
still be non-zero from the spec failure alone. In CI, running each as
its own step (rather than one shell line) sidesteps this automatically,
since most CI systems already fail the job on any non-zero step.

## Attach screenshots/files

```js
const { Case, Attach } = require('testpulse-jasmine');

it('fails with a bad password', () => {
  Case('LOGIN-43');
  const screenshot = takeScreenshot();
  Attach('LOGIN-43', screenshot, 'failure.png', 'image/png');
});
```

`Attach` only accepts a case key the *currently-executing* spec has
itself declared via `Case` — verified via Jasmine's own
`getSpecProperty()` readback, a genuine built-in capability. A call
outside an active spec throws Jasmine's own error. Only `image/png`,
`image/jpeg`, and `image/webp` are accepted. Multiple `Attach` calls
under the same case key within one spec are all preserved. Attachments
are written to a `.testpulse/` scratch directory — **add it to your
`.gitignore`**, since it can hold screenshot bytes.

## Configuration

**The environment variable always wins over the reporter option**, for
every setting below — not just `token`. There is no third,
config-file-backed tier.

| Setting | Reporter option | Env var |
|---|---|---|
| API base URL | `url` | `TESTPULSE_URL` |
| API token | `token` | `TESTPULSE_TOKEN` |
| Project key | `project` | `TESTPULSE_PROJECT` |
| Fail on unmatched | `failOnUnmatched` | `TESTPULSE_FAIL_ON_UNMATCHED` |
| Dry run | `dryRun` | `TESTPULSE_DRY_RUN` |

**Use `TESTPULSE_TOKEN` in CI**, not the `token` reporter option — a
value committed in your Jasmine config file is a real secret leak; an
environment variable set from a CI secret is not. Because the env var
wins for every setting, not just `token`, an unrelated `TESTPULSE_URL`/
`TESTPULSE_PROJECT` left set in your shell can also silently override
a value you set in the config file — if a run targets the wrong
project, check your environment before your config.

## Build outcome policy

| Response | Behavior |
|---|---|
| `201` all matched | `check` exits `0`; summary logged |
| `207` some unmatched | `check` exits `0` by default (unmatched keys logged, points at `failOnUnmatched`); exits non-zero if `failOnUnmatched` is set |
| network/auth/4xx/5xx error | `check` always exits non-zero, unconditionally |

## Dry run

```js
new TestPulseReporter({ dryRun: true })
```

Fetches existing case keys via a read-only `GET /api/v1/projects/{project}/cases`
and previews which tagged specs would match, without submitting
anything. `check` exits `0` regardless of the preview's content, unless
the preview fetch itself fails.

## License

MIT
