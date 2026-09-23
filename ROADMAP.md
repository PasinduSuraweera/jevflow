# Proposed first live release

JevFlow should help developers test whether an AI decision is reliable enough to trigger an action. Jev is the initial provider, with provider integration separated from workflow policy.

These items are planned, not shipped.

## 1. Live bring-your-own-key playground

- Explicit local-demo and live modes.
- Browser-memory-only key input, clearable and reset on reload.
- Fixed-provider server endpoint with schema validation, payload limits, timeouts, and rate limiting.
- No key or request-body logging, persistence, or analytics capture.
- Disclosure that the hosted server receives the key and forwards context to TypeSafe.
- Handle invalid keys, quota errors, provider errors, and cancellation.
- Self-hosting instructions and environment configuration.

## 2. Decision evaluation

- JSON/CSV case import with optional expected answers.
- Explicit user-triggered batch execution with concurrency and case limits.
- Per-case outcomes, latency, errors, and provider probabilities where supplied.
- Accuracy only for labeled cases; failed cases and coverage reported separately.
- Threshold controls for action versus human review; no automatic business side effects.

## 3. Export and release

- Export results and readable TypeScript/configuration examples.
- Document trust boundaries, key handling, and operational limits.
- Add server validation and integration tests using mocked provider responses.
- Verify live behavior with a supplied API key before claiming live validation.
- Publish measured examples for a LinkedIn launch without unsupported benchmarks.
