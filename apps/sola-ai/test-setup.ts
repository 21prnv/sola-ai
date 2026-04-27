// Bun test preload. Defines the `proto` global that tronweb's Closure-compiler
// protobuf bundles reference at module load time — without this, importing any
// transitive consumer of `@dynamic-labs/tron` throws `ReferenceError: proto is
// not defined` and aborts the test run.
;(globalThis as { proto?: Record<string, unknown> }).proto ??= {}
