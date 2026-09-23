# Willowglen mechanics

Jev selects an activity from the actions that are legal when a request begins. The server validates the context and builds the question itself. The client validates eligibility again before applying the returned action. All valid legal Jev choices execute regardless of confidence. Confidence remains visible as uncertainty information. If an action becomes unavailable, the villager waits for another Jev choice while the rest of the world continues.

## Activities

Energy costs are paid when an activity starts. "Dry" means not rainy or stormy. Prices follow the Rules panel; the defaults are shown.

| Activity | Place | Requirements | Completion |
| --- | --- | --- | --- |
| Eat | The Honeycup | Café open, a meal, meal price (3) | Hunger falls by 55 |
| Rest | Home cottage | Always | +50 energy |
| Sleep | Home cottage | 21:00 to 06:00 | +90 energy, +5 happiness |
| Work | Timber & Thread | 20 energy | Wage (8) plus skill; village fund gains its share (2) |
| Craft | Timber & Thread | 12 energy, 2 wood | +2 goods, or 3 at skill 3 or more |
| Garden | Community Garden | 12 energy; dry, no snow, not winter unless the greenhouse is built | +2 meals, +1 expanded garden, +1 in spring |
| Forage | Whispering Grove | 8 energy; dry, no snow | +1 meal (2 in autumn) and 2 coins |
| Chop | Whispering Grove | 15 energy; not stormy | +3 wood |
| Explore | Willow Pond | 8 energy; dry | +25 happiness |
| Fish | Willow Pond | 10 energy; dry, no snow | +2 meals (+1 with the dock), +10 happiness |
| Swim | Willow Pond | 10 energy; sunny summer daytime | +22 happiness, +5 hunger |
| Socialize | Village Green | 5 energy; not stormy | +20 happiness (+5 fountain, +10 festival); friendship grows |
| Read | Village Green | Dry daytime, no snow | +15 energy, +12 happiness |
| Exercise | Running loop | 18 energy; dry | +30 happiness |
| Study | Old Oak Library | 6 energy; library open | +12 happiness, +1 skill up to 5 |
| Cook | The Honeycup | 12 energy; café open | +3 meals |
| Bake | Crumb & Kettle | 10 energy, 1 wood; bakery open | +4 meals (+2 with the oven) |
| Sell | Market Row | 4 energy, goods; market open | Up to 2 goods at goods price (6), doubled by the merchant; fund +1 |
| Supper | The Lantern Inn | Inn open, meal price + 2 coins | Hunger falls by 40, +10 happiness |
| Music | The Lantern Inn | 8 energy; inn open | +15 happiness (+10 festival), 3 coins; others at the inn cheer up |
| Stargaze | Starlight Hill | 4 energy; clear night | +25 happiness |
| Donate | Village Green | 5 coins | Fund +5, +10 happiness |

Market Row opens 8 to 17, the library 8 to 20 and the inn 16 to 2 while opening hours are on. Any shop can be closed from the World panel. Food, meal payments, wood and goods are reserved at activity start. Closing a shop does not cancel an existing reservation. Villagers walk along the lanes before spending time on their activity, and climb Starlight Hill or enter the grove on stepping stones. Needs change with simulation time and stay within 0 to 100.

## A life of their own

Each villager keeps a record of their own life, and every decision includes it: the activities done today and how often, whether the last activity is being repeated back to back, how many minutes have passed since, lifetime counts and what they are known for (for example "the baker" after baking three or more times), who they met on the green today, and how their coins and happiness changed since the day began. Their personality is treated as where they started; lived experience weighs more.

Routine has real effects. A pastime not yet done today adds 4 happiness when completed. The second time is neutral, the third costs 4 happiness and any more cost 8. Eating, supper, resting and sleeping are never routine. Each option offered to Jev states its routine effect, for example "Done 2 times today: starting to feel routine (-4 happiness)." The inspector shows today's activities and marks routine ones. Life records are saved with the village.

## Friendships and companions

When socializing is legal, the request includes a second choice question that asks Jev which neighbor the villager hopes to see. Each villager's context lists every neighbor's friendship score and current activity. If the chosen friend is on the green at the same time, or left moments earlier, both gain happiness and their friendship rises by 12. Otherwise it rises by 4. The companion answer is optional; if the provider omits it the villager simply enjoys the green. An invalid companion answer fails the whole request.

## Village council

The village fund grows from work shifts, market sales and donations. You can buy projects yourself, or hold a council meeting that asks Jev to choose among affordable projects or to keep saving. Meetings use the same request budget and pacing. With "Meet daily" on, one meeting happens after noon on any day with an affordable project.

| Project | Cost | Effect |
| --- | --- | --- |
| Expand the garden | 12 | +1 meal per harvest |
| Light the lanes | 8 | Lanterns after sunset |
| Build a stone oven | 14 | +2 meals per bake |
| Build a fountain | 15 | +5 happiness when socializing |
| Extend the dock | 16 | +1 meal per fishing trip |
| Raise a greenhouse | 20 | Gardening in any weather or season |

## Conditions and rules

The World panel sets the time of day, weather (sunny, cloudy, rainy, stormy, snowy), season, automatic weather, how often seasons turn, which shops are open, the festival and merchant events, supplies, a village bulletin and scenario presets. Winter raises hunger by a quarter; storms and rain make moods fade faster; the festival stops them fading. Automatic weather changes every three village hours using a seeded random sequence stored with the world.

The Rules panel sets the pace of hunger, tiredness and mood fading, the café meal price, workshop wage, goods price, the village share per shift and day length. The server validates every value and rebuilds the legal options from it. Request pacing, the parallel limit and the request budget are never affected by rules.

Every context includes the clock, time of day, day number, season, weather, which places are open, prices, stock, upgrades, events, the bulletin, the villager's goal, skill and recent memories. Jev sees only activities that are legal right now.

## Residents

Residents can be added up to eight, renamed, given new personalities, goals, colors, hats and homes, have their needs, coins and skill adjusted, or moved away. Names must be unique because the companion question uses them as options. Changing a resident, rule or condition cancels any pending request so Jev always answers for the world as it is.

## Saves

Saves contain world state, residents, friendships, upgrades, rules and up to 300 recent decisions. They never contain the API key. Imports are rebuilt field by field with limits, so a damaged or hostile file cannot inject invalid state. After loading, residents gather on the green and no activity is in progress.

## Request lifecycle

Start permits repeated requests. Idle villagers decide at the same time: up to 4 requests are in flight by default (choose 1, 2, 4 or 8 in Controls), new requests start at least 0.4 seconds apart and at most 40 start per minute. Each result is rechecked against the world when it arrives, so a choice made stale by a neighbor, such as the last café meal being taken, is dropped and asked again. A failed request pauses the village and cancels every other request in flight. A session budget caps attempts; remaining activities finish after the budget is used. Increase the budget to continue. One decision asks once while paused and queues the activity for when the simulation starts.

Pause, key changes, world changes and hiding the tab invalidate pending results. Cancellation cannot guarantee that provider processing or billing stops. Failed requests consume budget and pause, with no automatic retry or fallback. Keys remain only in the current page and pass through the same-origin server to TypeSafe.

## Development validation

Run `npm ci`, `npm run check` and `npm test`. Tests cover legal action filtering across every weather, season and time combination, server and client agreement on options, resource accounting, companions, friendships, the council, rules, resident editing, save sanitization, request gating, server context validation and mocked HTTP integration.

## Interface

The world fills the browser viewport. A bottom dock keeps Start/Pause and One decision available even when tools are closed. Controls, Residents, Village, World and Rules each open one floating panel. Close it with ×, its dock button or Escape. Selecting a villager in the world, the overview or the minimap opens their inspector. Drag to turn the camera, shift-drag or right-drag to pan, and scroll or pinch to zoom. Keyboard: Space plays or pauses, Q and E turn, W A S D or arrows pan, plus and minus zoom, F follows the selected villager.

Eating, resting, sleeping, studying, cooking, baking and supper enter a building through its animated doorway. During the indoor activity the character mesh is hidden; the name marker and inspector remain available. Floating glass tags follow places and villagers. Place tags show opening status, who is there or who lives there, and move the camera when clicked. Villager tags show the current activity, pulse while Jev is choosing and turn amber when a villager needs care. On small screens and when zoomed out, place tags shrink to icons. Seasons recolor the grass and trees, winter hides flowers and freezes the pond, and wood and goods appear as logs by the workshop and crates at the market.
