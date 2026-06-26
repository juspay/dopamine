# Pull Request

## Description

<!-- A clear and concise description of the changes in this pull request. -->

## Related Issues

<!-- e.g. Fixes #123 / Closes #123 / Relates to #123 -->

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would change existing behaviour)
- [ ] Documentation update
- [ ] Refactoring (no functional changes)
- [ ] Performance improvement
- [ ] Build / CI configuration

## Changes Made

<!-- Bullet-point list of the key changes. -->

-

## Testing

- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] New code is covered by tests (or rationale below)
- [ ] Manually verified the affected pipeline step(s) / dashboard

## Code Quality

- [ ] `npm run lint` reviewed (Biome)
- [ ] Self-review of code completed
- [ ] No hardcoded API keys, credentials, or secrets
- [ ] TypeScript strict mode compliance (no `any` — use `unknown` + narrowing)

## Data Safety (required)

- [ ] No scraped third-party content committed (`videos/`, `knowledge_base/`, `dashboard/data/video/<real>`)
- [ ] No `.env` values, tokens, or personal handles committed
- [ ] Only synthetic `demo_*` data added under `dashboard/data/` (if any)

## Commit Message Format

- [ ] Commits follow Conventional Commits: `type(scope): description`
- [ ] Valid type used: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `build`, `ci`, `perf`, `revert`

<!-- Example: feat(youtube): support playlists in the collector -->

## Single Commit Policy

This repository follows a [single-commit-per-branch policy](SINGLE_COMMIT_POLICY.md).

- [ ] My branch contains a single, squashed commit (or I will squash before merge)
