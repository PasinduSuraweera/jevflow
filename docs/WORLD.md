# Willowglen mechanics

Jev selects an activity from the actions that are legal when a request begins. The server validates the context and builds the question itself. The client validates eligibility again before applying the returned action. All valid legal Jev choices execute regardless of confidence. Confidence remains visible as uncertainty information. If an action becomes unavailable, the villager waits for another Jev choice while the rest of the world continues.

| Activity | Requirements | Completion |
| --- | --- | --- |
| Eat | Open café, a meal, 3 coins | Reduce hunger by 55 |
| Rest | Always available | Restore 50 energy |
| Work | At least 20 energy | Earn 8 coins |
| Garden | Dry weather, at least 12 energy | Add 2 café meals, or 3 with an expanded garden |
| Explore | Dry weather, at least 8 energy | Add 25 happiness |
| Socialize | At least 5 energy | Add 20 happiness |
| Fish | Dry weather, at least 10 energy | Add 2 meals and 10 happiness |
| Forage | Dry weather, at least 8 energy | Add 1 meal and earn 2 coins |
| Cook | Open café, at least 12 energy | Add 3 meals |
| Read | Dry weather | Restore 15 energy and add 12 happiness |
| Exercise | Dry weather, at least 18 energy | Run a circuit and add 30 happiness |

Food and meal payment are reserved at activity start. Closing the café does not cancel an existing reservation. Rain prevents new garden and exploration choices; existing activities finish. Villagers walk along paths before spending time on their activity. Needs change with simulation time and stay within 0–100.

Socializing is currently an individual activity in the village square. There is no generated dialogue or coordinated conversation. Recent completed activities become short context memories. The world has no save system, accounts, multiplayer, persistent memory or background processing.

## Request lifecycle

Start permits repeated requests, one at a time with a minimum five-second cooldown. Idle villagers take turns. A session budget caps attempts; remaining activities finish after the budget is used. Increase the budget to continue. One decision asks once while paused and queues the activity for when the simulation starts.

Pause, key changes, world changes and hiding the tab invalidate pending results. Cancellation cannot guarantee that provider processing or billing stops. Failed requests consume budget and pause, with no automatic retry or fallback. Keys remain only in the current page and pass through the same-origin server to TypeSafe.

## Development validation

Run `npm ci`, `npm run check` and `npm test`. Tests cover legal action filtering, resource accounting, request gating, server context validation and mocked HTTP integration. They do not prove real-provider compatibility or WebGL rendering.

Before release, run in a WebGL browser on desktop and mobile, verify camera controls and character selection, supply your own Jev key, and inspect real probabilities. Check pause during a request, the budget boundary, bad keys, provider errors and continued play after low-confidence choices. The first implementation has not yet completed these live checks.

## Community progression and atmosphere

Each completed work shift adds 2 community coins in addition to the worker's 8 coins. Expand the garden for 12 community coins to increase future harvests to 3 meals. Buy lanterns for 8 coins to light the square after sunset. Purchases are explicit player actions, never model choices, and are limited to once per session.

Milestones track 12 completed activities, 4 harvests and an average happiness of 75. Happiness is a live target and can fall again. The clock advances four village minutes per simulation second. Lighting follows the clock; weather remains player-controlled. Rain, smoke, butterflies and pond ripples are decorative and make no API requests. Reduced-motion settings suppress ambient animation. The follow button tracks the selected resident; the home camera button resets the view.

## Floating game interface

The world fills the browser viewport. A bottom dock keeps Start/Pause and One decision available even when tools are closed. Controls, Residents, Village and World each open one floating panel. Close it with ×, its dock button or Escape. Selecting a villager in the world or overview opens their inspector. Starting play closes the tools; API errors reopen Controls.

Resident cards show current activity, hunger, energy and happiness, with a care indicator for hunger at least 75, energy at most 20 or happiness below 30. These are deterministic descriptions of current game state, not generated commentary. The news panel shows actual events and can collapse. On small screens the tools become a bottom sheet; on short landscape screens resident cards collapse to preserve playable space. The fullscreen button requests browser fullscreen where supported. Sky clouds have been removed.

## Night and animation

The HUD and world labels switch to a darker palette from 19:00 to 06:00; window panes glow at night. World tools offer a morning/evening time change so you can inspect either appearance while paused. Changing time invalidates pending decisions and updates the context for the next Jev request.

Exercise uses a longer running circuit. Hungry villagers with enough energy also run to a selected meal. Other travel uses a walking gait with jointed arms and legs. Fishing rods, books, baskets, hammers and watering cans accompany their respective activities. These animations are consequences of Jev choices, not additional model calls.

Eating, resting and cooking enter a building through its animated doorway. During the indoor activity the character mesh is hidden; the name marker and inspector remain available. Villagers exit after rewards are applied once. Interiors are not explorable, and cooking/resting animations inside the building are not shown. The activity description above the decision details remains present, with its left border and callout background removed.
