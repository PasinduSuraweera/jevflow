# Community recipe credits

These are original JevFlow implementations of decision patterns. We reviewed the original projects' README files on 2026-09-23. We did not copy their source, prompts, assets or benchmarks. These small recipes do not embed the original applications or imply endorsement.

| JevFlow recipe | Inspiration | What the original does | What this recipe does |
| --- | --- | --- | --- |
| Model Router | [Jev Tool & Model Router](https://github.com/TypeSafeAI/typesafe-router), credited in its README to BunsDev | Selects tools/models and applies fallback policies | Selects one of four model capability categories for a task, then previews a threshold policy |
| Browser Next Step | [Jev Ultrafast](https://github.com/browser-use/jev-ultrafast), browser-use | Selects operations and observed targets in a browser loop | Selects one action from an editable page snapshot, with a wait option; no browser control |
| NPC Next Move | [Jev Lab / Hundred](https://github.com/jammaru/jev-lab), jammaru | Simulates a town of NPCs with needs and decisions | Evaluates one character's next action from hunger, energy, money and nearby places; no town engine |

Every Run in JevFlow uses the visitor's API key and a real Jev request. Example context is only sample input. No simulated probabilities or output fallback are provided.

Community URLs identify the original projects. Their code and assets remain governed by their own licenses. JevFlow's original recipe code is covered by this repository's MIT license.
