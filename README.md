# JevFlow

**Willowglen: a little world with a mind of its own.**

An original open-source village simulation by [Pasindu Suraweera](https://github.com/PasinduSuraweera). Watch three villagers decide how to spend their day using TypeSafe AI's Jev System One. Change their circumstances and inspect the decisions that follow.

## What works

- An interactive low-poly 3D village with cottages, a café, workshop, garden and pond.
- Mira, Rowan and Pip have distinct personalities, hunger, energy, happiness, coins and recent memories.
- Real Jev choices drive eating, resting, working, gardening, exploring and socializing. Ordinary code controls movement and resource changes.
- Select a villager to inspect the exact submitted context, returned probabilities and confidence.
- Influence the world with rain, café closure and food supplies.
- Pause, one-decision mode, simulation speed and a request budget. At most one request at a time, at least five seconds apart.
- Day/night lighting, visible rain, drifting clouds and smoke, butterflies, pond ripples and activity animations.
- Follow camera, activity progress and village milestones. Work earns community funds for a larger garden and warm night lanterns.
- The original seven-recipe decision workbench remains at `/lab`.

There are no local model simulations or fallback decisions. Without a key, the village is visible but villagers do not choose activities. Confidence is informational and never pauses the village. Request errors pause the world.

Integration is tested with mocked provider responses. **Real-key Jev validation and visual 3D QA on a WebGL-enabled browser are still required.** The development browser used for this change had WebGL disabled.

## Run locally

Requires Node.js 22 or later, npm and a browser with WebGL enabled. Three.js is served locally.

```sh
git clone https://github.com/PasinduSuraweera/jevflow.git
cd jevflow
npm ci
npm start
```

Open http://localhost:3000. Paste your key and click **Start village**. This authorizes repeated live requests until you pause or exhaust the session budget (30 attempts by default). Each request sends context to TypeSafe and may incur charges. **One decision** sends one request while paused; Start lets the selected activity play out. Speed changes simulation time, not the API cooldown.

The budget counts request attempts, including failures and cancellations, not tokens or currency. Refreshing resets the world and budget. Hiding the tab pauses it. See [world mechanics](docs/WORLD.md).

```sh
npm run check
npm test
```

Use `npm start` for the complete app. A plain static server has no API backend, so the village stays disabled. The connection status detects this and provides a retry button.

## Key handling and trust

The key is kept in the page's password input, never in localStorage, cookies, or sessionStorage. It clears on refresh/page exit or **Clear**. Extensions, compromised hosts, and browser password managers are outside the application's control.

For live runs, the browser sends the key in `X-Jev-Key` to **this application's server**, which forwards it as a bearer credential to `https://api.typesafe.ai/v1/systemone`. Context goes to TypeSafe. Only enter a key on a host you trust, or self-host.

The application has no database, request-body logging, API-key logging, analytics, or external frontend scripts/fonts. Errors returned to clients are sanitized. Reverse proxies, hosting infrastructure and the provider have separate logging and data policies. Disable sensitive header/body capture there too. Cancellation attempts to abort the request; it cannot guarantee cancellation of provider processing or charges.

## Workbench at `/lab`

The workbench retains JSON editing, choice/score/yes-no results, thresholds and TypeScript/YAML examples. Its actions are previews; village actions actually update the local game world.

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
| `dist/world.html`, `world.js`, `world.css` | Village UI and request lifecycle |
| `dist/village-view.js` | Original procedural Three.js scene |
| `dist/village-engine.js` | Deterministic simulation and legal activities |
| `dist/index.html` | Workbench served at `/lab` |
| `server/village.mjs` | Validated village context and Jev question |
| `server/index.mjs` | Static server, bounded BYOK proxy and request controls |
| `server/decisions.mjs` | Provider request mapping and response validation |
| `test/` | Mocked HTTP integration and policy tests |
| `examples/route.ts` | Separate official SDK example |

The server uses Node's built-in fetch against the official HTTP API. Reference: [TypeSafe SDK types](https://github.com/typesafe-ai/typesafe-sdk-js/blob/main/src/types.ts).

The separate SDK example needs `npm install @typesafe-ai/sdk`, `TYPESAFE_API_KEY` in your server environment and a TypeScript runner such as `npx tsx examples/route.ts`. The YAML on the site remains an illustrative schema, not an executable runner.

## Contributing and license

See CONTRIBUTING.md and ROADMAP.md. MIT licensed. Three.js is MIT licensed under its own copyright. All village geometry is original procedural code, with no Nintendo or Stardew Valley assets. Independent project, not affiliated with or endorsed by TypeSafe AI. Jev's service terms and upstream SDK license apply separately.
