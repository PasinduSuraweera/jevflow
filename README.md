# JevFlow

**Willowglen: a little world with a mind of its own.**

An original open-source village simulation by [Pasindu Suraweera](https://github.com/PasinduSuraweera). Watch villagers decide how to spend their days using TypeSafe AI's Jev System One. Reshape their world, their rules and the residents themselves, then inspect the decisions that follow.

## What works

- A larger low-poly 3D island with an uneven, seeded coastline: three cottages, a café, workshop, garden, pond, library, bakery with windmill, market stalls, an inn, Whispering Grove and Starlight Hill with a telescope.
- Five residents to start (Mira, Rowan, Pip, Juniper and Oswin), each with a personality, a personal goal, a home cottage, needs, coins, skill, friendships and recent memories. Add up to eight, customize any of them, or ask one to move away.
- Twenty-two activities chosen by real Jev decisions, including chopping wood, crafting and selling goods, baking, studying, swimming, supper and music at the inn, stargazing, sleeping and donating to the village fund. Ordinary code controls movement and resource changes.
- A second Jev answer in the same request picks who a villager hopes to meet on the green. Overlapping visits deepen friendships.
- A village council asks Jev which community project to fund, on demand or once a day. Six projects include a fountain, greenhouse, stone oven and longer dock.
- World conditions: time of day, five weather types, four seasons, automatic weather and seasons, opening hours, shop closures, a festival, a traveling merchant, supplies, a bulletin every villager reads, and scenario presets.
- Rules: hunger, tiredness and mood pace, meal price, wage, goods price, the village share per shift and day length.
- Save and load in the browser, export and import JSON files, and export the decision log. Saves never include the API key.
- Select a villager to inspect the exact submitted context, returned probabilities, companion choice and confidence.
- Villagers decide at the same time: up to 4 requests in flight by default (1 to 8 in Controls), starts spaced 0.4 seconds apart and at most 40 per minute, within a request budget. Pause, one-decision mode and simulation speed.
- Each villager knows their own life. Jev sees what they did today, anything repeated back to back, lifetime habits and what they are known for, who they met, and how their coins and mood changed today. Routine has real effects: a pastime not yet done today adds happiness, repeating it wears thin.
- Seasonal colors, snow, storms with lightning, rain, fireflies, chimney smoke, a turning windmill, stock shown as logs and market crates, day/night lighting and lantern upgrades.
- A liquid glass interface with original line icons and drawn resident portraits whose faces follow each villager's mood and energy. Translucent, blurred panels and floating tags sit over the 3D world. Building tags show live status such as opening hours, who is there or who lives there; resident tags show their current activity. Click a building tag to fly there or a resident tag to select them.
- Drag to turn the camera, shift-drag or right-drag to pan, pinch or scroll to zoom, keyboard shortcuts and a clickable minimap.
- The original seven-recipe decision workbench remains at `/lab`.

There are no local model simulations or fallback decisions. Without a key, the village is visible but villagers do not choose activities. Confidence is informational and never pauses the village. Request errors pause the world.

Integration is tested with mocked provider responses. The bigger world was also checked with a small number of real Jev requests and in a software-rendered WebGL browser at desktop and phone sizes. Validate on real GPUs and mobile devices before release.

## Run locally

Requires Node.js 22 or later, npm and a browser with WebGL enabled. Three.js is served locally.

```sh
git clone https://github.com/PasinduSuraweera/jevflow.git
cd jevflow
npm ci
npm start
```

Open http://localhost:3000. Paste your key and click **Start village**. Use the World and Rules tabs to change conditions and the Residents tab to customize villagers. This authorizes repeated live requests until you pause or exhaust the session budget (30 attempts by default). Each request sends context to TypeSafe and may incur charges. **One decision** sends one request while paused; Start lets the selected activity play out. Speed changes simulation time, not request pacing.

The budget counts request attempts, including council meetings, failures and cancellations, not tokens or currency. Refreshing resets the world and budget unless you saved. Hiding the tab pauses it. See [world mechanics](docs/WORLD.md).

```sh
npm run check
npm test
```

Use `npm start` for the complete app. A plain static server has no API backend, so the village stays disabled. The connection status detects this and provides a retry button.

## Key handling and trust

The key is kept in the page's password input, never in localStorage, cookies, sessionStorage or save files. Village saves use localStorage and contain only world state. It clears on refresh/page exit or **Clear**. Extensions, compromised hosts, and browser password managers are outside the application's control.

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

Controls include a 32 KB JSON input limit, 64 KB provider response limit, a 15-second provider deadline, schema and response validation, origin checks, no CORS permission, no automatic API retries, eight concurrent live requests, and 60 requests/minute per socket IP. Set `MAX_CONCURRENT` and `RATE_LIMIT` to change these server limits. Limits are in-memory and reset on restart. Behind a reverse proxy all visitors may share its socket-IP limit. Multi-instance/public production hosting should add deployment-level rate limiting, request-size limits, TLS and appropriate abuse controls. This starter has no account authentication.

Origin checking protects browser requests; it does not authenticate non-browser clients. A user must supply their own valid provider key. The server never accepts a user-selected upstream URL or uses a shared server API key.

## Deploy on Vercel

The repository includes a Vercel setup. `npm run build:vercel` publishes the village at `/`, the workbench at `/lab` and Three.js under `/vendor`. `api/decision.mjs` and `api/status.mjs` run the same request handler as the Node server as Vercel Functions, with the same key handling, origin checks and validation. `vercel.json` sets the build, the 30 second function limit and the security headers.

1. Import the GitHub repository at vercel.com/new. Leave the framework preset as Other; `vercel.json` supplies the commands.
2. Deploy. The production origin is read from Vercel's `VERCEL_PROJECT_PRODUCTION_URL`, and each preview deployment's own URL is also accepted.
3. With a custom domain, set `PUBLIC_ORIGIN` to its exact origin, for example `https://willowglen.example.com`, then redeploy.
4. Optionally set `RATE_LIMIT` and `MAX_CONCURRENT`. Function instances keep these limits in memory separately, so enable rate limiting on `/api/decision` in the Vercel Firewall for a public site.

Do not add a Jev key to Vercel. Each visitor pastes their own key, which passes through the function to TypeSafe and is never stored. The same trust notes as self-hosting apply: only use a deployment you control.

## Layout

| Path | Purpose |
| --- | --- |
| `dist/world.html`, `world.js`, `world.css` | Village UI and request lifecycle |
| `dist/village-view.js` | Original procedural Three.js scene and floating tags |
| `dist/icons.js` | Original line icons and resident portraits |
| `dist/village-engine.js` | Deterministic simulation and legal activities |
| `dist/index.html` | Workbench served at `/lab` |
| `server/village.mjs` | Validated village and council context and Jev questions |
| `server/index.mjs` | Static server, bounded BYOK proxy and request controls |
| `server/vercel.mjs`, `api/`, `vercel.json` | Vercel Functions and static build using the same handler |
| `server/decisions.mjs` | Provider request mapping and response validation |
| `test/` | Mocked HTTP integration and policy tests |
| `examples/route.ts` | Separate official SDK example |

The server uses Node's built-in fetch against the official HTTP API. Reference: [TypeSafe SDK types](https://github.com/typesafe-ai/typesafe-sdk-js/blob/main/src/types.ts).

The separate SDK example needs `npm install @typesafe-ai/sdk`, `TYPESAFE_API_KEY` in your server environment and a TypeScript runner such as `npx tsx examples/route.ts`. The YAML on the site remains an illustrative schema, not an executable runner.

## Contributing and license

See CONTRIBUTING.md and ROADMAP.md. MIT licensed. Three.js is MIT licensed under its own copyright. All village geometry is original procedural code, with no Nintendo or Stardew Valley assets. Independent project, not affiliated with or endorsed by TypeSafe AI. Jev's service terms and upstream SDK license apply separately.
