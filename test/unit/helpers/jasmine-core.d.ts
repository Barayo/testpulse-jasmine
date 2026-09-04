// jasmine-core ships no type declarations. Only used by this package's
// own test helper (test/unit/helpers/runJasmineSpecs.ts) to construct a
// real, isolated Jasmine environment via its library API -- declared
// loosely here since the helper itself provides the typed surface
// (RunResult) that production test files actually consume.
declare module 'jasmine-core' {
  const jasmineRequire: any;
  export = jasmineRequire;
}
