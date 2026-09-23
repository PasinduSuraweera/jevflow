# Release roadmap

JevFlow helps developers inspect the boundary between model predictions and software actions. Jev is the first provider.

## Implemented

- Real Jev calls only, with a memory-only API key field. No simulated results.
- Seven validated recipes, including three community-inspired examples with credits.
- Backend readiness, visible key controls, and exact question inspection.
- Fixed-provider server proxy with input/response validation, limits, timeout and safe errors.
- Key clearing, cancellation and stale-result invalidation.
- Provider probabilities, distinct score/confidence presentation and latency.
- Local threshold changes and action previews, with no external side effects.
- Self-hosting instructions and automated mocked integration tests.

## Before a public hosted launch

- Validate all four scenarios with a real Jev key.
- Perform desktop/mobile browser QA on the target host.
- Configure production HTTPS, infrastructure logging policy and deployment-level rate limits.
- Review public/private repository visibility and hosting access separately.

## Next product milestone

- JSON/CSV case upload with optional expected labels.
- Explicit user-triggered batch execution and bounded concurrency.
- Accuracy for labeled cases, failure counts, review rate and coverage.
- Result export and reproducible workflow configuration.
- Share measured demonstrations on LinkedIn, crediting TypeSafe as the provider.

Batch evaluation and configuration execution are not shipped yet.
