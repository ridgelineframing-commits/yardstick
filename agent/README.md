# Yardstick Takeoff QA Agent

This optional Cloudflare Worker adds a project-scoped, durable QA agent. The
desktop and PWA remain fully functional offline; the local QA engine is the
default and never uploads a plan.

The Worker accepts a minimized structured takeoff snapshot at `POST /api/review`.
It does not accept or store the source PDF. Each project ID maps to an isolated
Agent instance with persistent review state.

## Develop

```powershell
npm install
npm run agent:types
npm run agent:dev
```

## Deploy

Set `ALLOWED_ORIGIN` in `wrangler.jsonc` to the production web origin, authenticate
Wrangler, and run:

```powershell
npm run agent:deploy
```

The production deployment should add application authentication before exposing
customer projects. Approval remains client-side: agent results are proposals,
and Yardstick applies only operations that the user explicitly approves.
