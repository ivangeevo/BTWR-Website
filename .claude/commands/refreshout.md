---
description: Clean out/ and rebuild the static export fast (for Live Server refresh)
---

Delete the `out/` directory and run a fresh static export build, so the
locally-served site (Live Server or similar, pointed at `out/`) reflects the
latest source changes instead of a stale build.

Run, in order:
1. `rm -rf out` (Bash) or `Remove-Item -Recurse -Force out` (PowerShell) — whichever tool is in use, only if `out/` exists.
2. `npx next build`

Report only pass/fail and the build's route summary — skip restating the
commands or narrating each step.
