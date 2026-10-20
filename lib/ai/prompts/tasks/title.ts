import dedent from 'dedent'

/** Names a conversation from the learner's first message. Its own call, outside the tutor's cached prefix. */
export function titlePrompt(question: string) {
  return dedent`
    Write a short title for a tutoring conversation that starts with the learner's message below.
    Name the topic in 2 to 6 words, in sentence case, with no quotes and no ending punctuation.

    <message>
    ${question}
    </message>
  `
}
