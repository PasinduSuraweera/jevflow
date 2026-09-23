import { choice, TypeSafeClient } from "@typesafe-ai/sdk";

// Server only. Set TYPESAFE_API_KEY in your environment.
const client = new TypeSafeClient();
const result = await client.systemOne({
  state: { document: "Please refund my duplicate charge." },
  questions: {
    team: choice("Which team should handle this?", {
      billing: null,
      technical: null,
      other: null,
    }),
  },
});

// Your application owns the next step.
const team = result.answers.team.choice;
console.log({ route: team });
