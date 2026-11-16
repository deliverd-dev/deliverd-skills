---
description: Check the Deliverd connection — who you are signed in as, your organisation, and the workspaces you can ask, track and publish in
name: status
---

Check the Deliverd connection.

1. Call `get_profile` and report the account: name, email, and the
   organisation (`nickname`).
2. Call `list_workspaces` and list the workspaces by name. If it is not in
   your tool list (v2 lists core tools first), call it through `use_tool`
   with `name: "list_workspaces"`.
3. If either call fails because Deliverd is not connected or the sign-in has
   expired, say so and give the fix:
   `claude mcp add --transport http deliverd https://deliverd.dev/api/mcp/v2`,
   then run `/mcp` to sign in.

Keep the answer to a few lines.
