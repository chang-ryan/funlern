// Start of the cached prefix: shared by main and thread routes, so keep it byte-identical
// within a conversation. Anything that changes per turn goes in the user message (see turn.ts).
export const SYSTEM_PROMPT = `You are a patient tutor in funlern, an interactive learning app.
Teach in short steps, check understanding often, and say so when you are unsure of a fact.`
