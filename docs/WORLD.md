# Willowglen mechanics

Jev selects an activity from the actions that are legal when a request begins. The server validates the context and builds the question itself. The client validates eligibility again before applying the returned action. Confidence below 50% pauses for review.

| Activity | Requirements | Completion |
| --- | --- | --- |
| Eat | Open café, a meal, 3 coins | Reduce hunger by 55 |
| Rest | Always available | Restore 50 energy |
| Work | At least 20 energy | Earn 8 coins |
| Garden | Dry weather, at least 12 energy | Add 2 café meals |
| Explore | Dry weather, at least 8 energy | Add 25 happiness |
| Socialize | At least 5 energy | Add 20 happiness |

Food and meal payment are reserved at activity start. Closing the café does not cancel an existing reservation. Rain prevents new garden and exploration choices; existing activities finish. Villagers walk along paths before spending time on their activity. Needs change with simulation time and stay within 0–100.

Socializing is currently an individual activity in the village square. There is no generated dialogue or coordinated conversation. Recent completed activities become short context memories. The world has no save system, accounts, multiplayer, persistent memory or background processing.

## Request lifecycle

Start permits repeated requests, one at a time with a minimum five-second cooldown. Idle villagers take turns. A session budget caps attempts; remaining activities finish after the budget is used. Increase the budget to continue. One decision asks once while paused and queues the activity for when the simulation starts.

Pause, key changes, world changes and hiding the tab invalidate pending results. Cancellation cannot guarantee that provider processing or billing stops. Failed requests consume budget and pause, with no automatic retry or fallback. Keys remain only in the current page and pass through the same-origin server to TypeSafe.

## Development validation

Run `npm ci`, `npm run check` and `npm test`. Tests cover legal action filtering, resource accounting, request gating, server context validation and mocked HTTP integration. They do not prove real-provider compatibility or WebGL rendering.

Before release, run in a WebGL browser on desktop and mobile, verify camera controls and character selection, supply your own Jev key, and inspect real probabilities. Check pause during a request, the budget boundary, bad keys, provider errors and low-confidence behavior. The first implementation has not yet completed these live checks.
