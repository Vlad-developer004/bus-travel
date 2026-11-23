## What and why
<!-- One or two sentences. Link the issue if there is one. -->

## How to test
<!-- Steps, or "covered by e2e: <test name>" -->

## Checklist
- [ ] CI is green (typecheck, e2e, build, Docker)
- [ ] DB change? Migration committed and **backwards compatible** (the previous release must still work after it)
- [ ] New env variable? Added to `.env.example` / `deploy/.env.server.example` and `validateEnv`
- [ ] User-facing text? Added to all four `messages/*.json` files
