// A minimal ambient declaration of Jasmine's real global `jasmine` object
// -- deliberately NOT the full @types/jasmine package, whose own global
// declarations (expect/describe/it/beforeEach/...) collide with
// @types/jest's identically-named globals, since this package's own test
// suite runs under Jest. Only the surface this package actually calls is
// declared here.
declare const jasmine: {
  getEnv(): {
    setSpecProperty(key: string, value: unknown): void;
    getSpecProperty(key: string): unknown;
  };
};
