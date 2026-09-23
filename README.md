# JevFlow

**Semantic if-statements for your software.**

A developer playground for structured AI decisions, created by [Pasindu Suraweera](https://github.com/PasinduSuraweera). The goal is to help developers test decisions, inspect uncertainty, and decide when software should act or ask for review.

## Current status

This initial version is a responsive static website with a working **local simulation**. It does not call Jev. Example probabilities are illustrative, not measured model confidence. The planned live API features are not implemented yet.

- Editable JSON with validation, reset, and Ctrl/Cmd + Enter
- Support Routing, Agent Guardrails, RAG Decisions, and GitHub Triage examples
- Structured results, illustrative confidence, and suggested actions
- Copyable TypeScript and YAML examples
- Responsive layout and reduced-motion support

## Run locally

Clone this repository, then serve the static files:

```sh
git clone https://github.com/PasinduSuraweera/jevflow.git
cd jevflow
python3 -m http.server 8080 --directory dist
```

Open http://localhost:8080. The website needs no build step. Google Fonts are optional external requests; system font fallbacks are provided. Playground context is processed locally and is not sent to a model.

## Project structure

| Path | Purpose |
| --- | --- |
| `dist/index.html` | Page structure and content |
| `dist/style.css` | Responsive styling |
| `dist/app.js` | Local rules and playground interactions |
| `examples/route.ts` | Official TypeSafe SDK integration example |
| `ROADMAP.md` | Proposed first live release |

## Actual Jev integration

The separate server-side example uses the [official TypeSafe SDK](https://github.com/typesafe-ai/typesafe-sdk-js). With Node.js 20 or later:

```sh
npm install @typesafe-ai/sdk
export TYPESAFE_API_KEY="your-key"
npx tsx examples/route.ts
```

This example makes a real API request and may incur provider charges. Keep the key on your server. Never commit it or embed it in client JavaScript. The example logs a selected route; it does not execute business actions.

The YAML on the website illustrates a possible workflow schema. No YAML workflow runner is included.

## Limitations

The guardrail demo is not a security control. The RAG demo measures token overlap rather than semantic relevance. Local rule results do not establish Jev accuracy, calibration, latency, or safety. This repository does not yet include a hosted API proxy, rate limiting, batch evaluation, or persistent storage.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Development continues through reviewable branches and pull requests. See [ROADMAP.md](ROADMAP.md) for the proposed BYOK workbench.

## License and attribution

MIT for JevFlow's code. Independent project, not affiliated with or endorsed by TypeSafe AI. Jev and System One are TypeSafe AI products; their service terms and SDK licensing apply separately.
