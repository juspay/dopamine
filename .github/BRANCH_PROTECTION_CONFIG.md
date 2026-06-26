# Branch Protection Configuration

The `main` branch is protected (applied via the GitHub API; also declared in
[`settings.yml`](settings.yml) for the repository-settings app).

## Active rules on `main`

- **Required status checks** (strict / up-to-date required):
  - `Build & Test (Node 20)`
  - `Build & Test (Node 22)`
  - `TypeScript Strict Check`
- **Required pull request reviews:** 1 approval, dismiss stale reviews,
  require Code Owner review (see [`CODEOWNERS`](CODEOWNERS)).
- **Linear history required** (rebase-only merges; no merge commits).
- **No force pushes, no branch deletion.**
- **Admins are not enforced** (`enforce_admins: false`) so the sole maintainer
  can perform administrative pushes and merge their own PRs without a second
  reviewer (which is impossible in a single-maintainer repo).

## Releases and branch protection — `RELEASE_TOKEN`

`semantic-release` (`.github/workflows/release.yml`) pushes a
`chore(release): x.y.z [skip ci]` commit and tag back to `main`. The default
`GITHUB_TOKEN` **cannot bypass branch protection**, so this push-back is blocked
once protection is active.

To enable automated releases to push back to `main`, add a repository secret:

- **`RELEASE_TOKEN`** — a fine-grained or classic Personal Access Token from a
  repository **admin**, with `contents: write` (and `pull-requests: write`).

The release workflow uses `${{ secrets.RELEASE_TOKEN || secrets.GITHUB_TOKEN }}`,
so it falls back to the default token when `RELEASE_TOKEN` is not set. Without it,
the GitHub Release and tag are still created, but the in-repo `CHANGELOG.md` /
version commit-back will fail.

## Optional AI review — `yama-review.yml`

The Yama AI review job is guarded: it runs only when `YAMA_GITHUB_TOKEN`,
`LITELLM_BASE_URL`, and `LITELLM_API_KEY` secrets are present, and otherwise
skips cleanly (the check passes). It is **not** a required status check.
