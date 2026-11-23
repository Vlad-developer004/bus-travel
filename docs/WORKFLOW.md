# Git workflow

Trunk-based development with short-lived branches. `main` is always deployable.

## Branches

* `main`: protected. Only changed through pull requests. Every merge deploys to staging.
* Feature branches: `feat/<topic>`, `fix/<topic>`, `chore/<topic>`. Small, live for hours or a day or two, never for weeks.
* Hotfix: branch from `main` as usual (the fix goes through the same pipeline); if production runs an older tag, branch from that tag and tag `vX.Y.(Z+1)`.

## Commits

[Conventional Commits](https://www.conventionalcommits.org/): `feat: seat map`, `fix: release seats of expired holds`, `chore: bump prisma`, `docs: deployment guide`.
Small commits that each build and pass tests; the message explains **why**, the diff shows what.

## Pull requests

1. Push the branch, open a PR (the template asks for what/why/how to test and a short checklist).
2. CI runs: typecheck, migration-drift check, API e2e on PostgreSQL, web build, browser tests, Docker build. All must be green.
3. At least one review (the author does not merge their own change when there is a second person). Review comments are resolved or answered.
4. **Squash and merge**: one commit per PR on `main` keeps history readable and makes reverts trivial. Delete the branch.

## Merging conflicts and updating a branch

* Keep branches short so conflicts stay rare. Before review: `git fetch && git rebase origin/main` (own, not-yet-shared branches) or merge `main` into the branch (shared branches).
* Never force-push `main`; force-push a feature branch only with `--force-with-lease`.
* Lockfile conflicts: take `main`'s `package-lock.json`, run `npm install`, commit the result.

## Database changes

`npx prisma migrate dev --name <what>` creates a migration; commit it with the code. CI fails if `schema.prisma` and the migrations disagree.
Migrations must be **backwards compatible with the previous release** (expand, then contract), because rollback redeploys the old image on the new schema.

## Releases

Semantic versioning by tag: `v1.4.0` (feature), `v1.4.1` (fix). Tag only commits that are already running on staging.
