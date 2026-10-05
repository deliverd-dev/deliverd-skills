---
description: Check the Deliverd connection — who you are signed in as, and where you can publish
---

Check the Deliverd connection.

1. Call `get_profile` and report the account: name, email, and the
   organisation (`nickname`).
2. Call `list_workspaces` and list the workspaces by name.
3. If either call fails because Deliverd is not connected or the sign-in has
   expired, say so and give the fix:
   `claude mcp add --transport http deliverd https://deliverd.dev/api/mcp`,
   then run `/mcp` to sign in.

Keep the answer to a few lines.
