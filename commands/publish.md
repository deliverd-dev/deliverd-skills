---
description: Publish an HTML page to a persistent, secure Deliverd URL
argument-hint: "[file or description] [for <audience>]"
---

Publish to Deliverd: $ARGUMENTS

1. Work out what to publish. If a file path was given, read it. If an HTML page
   was just built in this conversation, use that. If nothing obvious exists,
   ask what to publish rather than inventing a page. If what you have is not
   yet a complete, self-contained HTML document, follow the `artifact` skill to
   make it one first.
2. Work out who should see it. Use the audience named above if there is one
   ("Finance team", "Sarah Jones", "only me"); otherwise ask, offering
   "only me" as the safe default. Never choose "everyone" on your own.
3. Call `publish_report` with `content` (or `files` for a multi-file bundle),
   `title`, `audience` and `sourceTool: "claude-code"`.
4. If the result lists audience candidates because a phrase was ambiguous,
   show them and ask which was meant, then call `publish_report` again.
5. If `status` is `pending_approval`, say the report is held for approval
   and who it is waiting on; do not describe it as published.
6. Otherwise, reply with the `url`, the audience, and any `warnings`, in two or
   three lines.

If the Deliverd tools are not available, say so and point to
`claude mcp add --transport http deliverd https://deliverd.dev/api/mcp`.
