# JevFlow

**Semantic if-statements for your software.**

A decision workbench by [Pasindu Suraweera](https://github.com/PasinduSuraweera). Explore how model predictions become software decisions, and where uncertain outcomes need human review.

## What works

- Seven real-API recipes: Support Routing, Agent Guardrails, RAG Decisions, GitHub Triage, Model Router, Browser Next Step, and NPC Next Move.
- Live Jev requests using your own API key through a same-origin Node server.
- JSON editing, validation, cancellation, and live request status.
- Choice, score, and yes/no results with provider probabilities and measured round-trip latency.
- Adjustable decision threshold and action previews. No external actions are executed.
- Copyable response JSON and TypeScript/YAML examples.

Live integration follows the official API contract and is tested with mocked provider responses. It has **not yet been verified against Jev with a real API key**. Batch evaluation and CSV import are not implemented.

## Run locally

Requires Node.js 22 or later. No runtime dependencies or installation step.

```sh
git clone https://github.com/PasinduSuraweera/jevflow.git
cd jevflow
npm start
```

Open http://localhost:3000. Paste your key and click **Run with Jev**. Each live request sends your context to TypeSafe and may incur provider charges. No request runs automatically. There is no local demo, simulated output, or fallback decision.

```sh
npm run check
npm test
```

Use `npm start` for the complete app. A plain static server has no API backend, so Run stays disabled. The connection status detects this and provides a retry button.

## Key handling and trust

The key is kept in the page's password input, never in localStorage, cookies, or sessionStorage. It clears on refresh/page exit or **Clear**. Extensions, compromised hosts, and browser password managers are outside the application's control.

For live runs, the browser sends the key in `X-Jev-Key` to **this application's server**, which forwards it as a bearer credential to `https://api.typesafe.ai/v1/systemone`. Context goes to TypeSafe. Only enter a key on a host you trust, or self-host.

The application has no database, request-body logging, API-key logging, analytics, or external frontend scripts/fonts. Errors returned to clients are sanitized. Reverse proxies, hosting infrastructure and the provider have separate logging and data policies. Disable sensitive header/body capture there too. Cancellation attempts to abort the request; it cannot guarantee cancellation of provider processing or charges.

## Community lab

Three runnable recipes are original JevFlow adaptations inspired by community projects. Each card links to the original creator. See [community credits](docs/COMMUNITY.md). They evaluate one decision; they do not run the original applications, browse external sites, or invoke another model.

The workbench also shows the exact question and answer criteria sent to Jev, including edited browser actions.

## Decision policy

- Choice: preview a route, label, model capability, browser action, or character action only when provider confidence meets the threshold. Browser `wait` always means human review.
- Yes/no: use the probability of the selected answer. Only a sufficiently confident **yes** can preview allow; explicit `requires_approval: true` always goes to review.
- Score: display Jev's expected score on a 0–2 relevance rubric **separately** from provider confidence. Low confidence goes to review. Otherwise normalized relevance is compared to the threshold to include context or retrieve more.

Threshold changes recalculate the preview locally without additional API calls. Results are advisory, not proof of safety. Agent guardrail examples are not an authorization system.

## Self-hosting

Run one Node process behind an HTTPS reverse proxy:

```sh
PUBLIC_ORIGIN=https://your-domain.example HOST=127.0.0.1 PORT=3000 npm start
```

`PUBLIC_ORIGIN` must be the exact browser origin, without a trailing slash or path. In loopback HTTP development, localhost, 127.0.0.1 and [::1] on the configured port are accepted. Plain HTTP is allowed only for loopback development. Set `HOST=0.0.0.0` only when your container or hosting network requires it. The app ignores forwarded-IP headers rather than trusting spoofable values.

Controls include a 32 KB JSON input limit, 64 KB provider response limit, a 15-second provider deadline, schema and response validation, origin checks, no CORS permission, no automatic API retries, four concurrent live requests, and 20 requests/minute per socket IP. Limits are in-memory and reset on restart. Behind a reverse proxy all visitors may share its socket-IP limit. Multi-instance/public production hosting should add deployment-level rate limiting, request-size limits, TLS and appropriate abuse controls. This starter has no account authentication.

Origin checking protects browser requests; it does not authenticate non-browser clients. A user must supply their own valid provider key. The server never accepts a user-selected upstream URL or uses a shared server API key.

## Layout

| Path | Purpose |
| --- | --- |
| `dist/` | Frontend and shared validated recipe definitions |
| `server/index.mjs` | Static server, bounded BYOK proxy and request controls |
| `server/decisions.mjs` | Provider request mapping and response validation |
| `test/` | Mocked HTTP integration and policy tests |
| `examples/route.ts` | Separate official SDK example |

The server uses Node's built-in fetch against the official HTTP API. Reference: [TypeSafe SDK types](https://github.com/typesafe-ai/typesafe-sdk-js/blob/main/src/types.ts).

The separate SDK example needs `npm install @typesafe-ai/sdk`, `TYPESAFE_API_KEY` in your server environment and a TypeScript runner such as `npx tsx examples/route.ts`. The YAML on the site remains an illustrative schema, not an executable runner.

## Contributing and license

See CONTRIBUTING.md and ROADMAP.md. MIT licensed. Independent project, not affiliated with or endorsed by TypeSafe AI. Jev's service terms and upstream SDK license apply separately.
