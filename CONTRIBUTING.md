# Contributing

Create a focused branch and open a pull request explaining the user-visible behavior and validation.

Before submitting, run `npm run check` and `npm test`. Run the app with `npm start` and check the affected flows, keyboard controls and mobile layout. Automated tests mock the provider and use no real key.

Keep secrets, private input data, and provider error bodies out of commits and logs. Distinguish local examples from live model predictions. Treat action previews as advisory, not external authorization. Keep visible copy free of em dashes.

Use ROADMAP.md to coordinate larger changes. No provider integration should accept an arbitrary user-controlled upstream URL.
