# Single Commit Per Branch Policy

Dopamine follows a **single commit per branch policy** to keep a clean, linear
git history and a simple review process — the same convention used across Juspay
repositories (e.g. [neurolink](https://github.com/juspay/neurolink)).

## Policy Overview

- ✅ Each feature branch should contain exactly **1 commit**
- ✅ Commit messages follow Conventional Commits: `type(scope): description`
- ✅ No merge commits inside feature branches
- ✅ Merges to `main` use the **rebase** (linear-history) strategy

## Enforcement

- A GitHub Actions workflow (`.github/workflows/single-commit-enforcement.yml`)
  validates the commit count and message format on every pull request to `main`.
- The `main` branch is protected: pull requests, passing CI, and code-owner
  review are required before merge.

## Compliant Workflow

```bash
# 1. Branch off main
git checkout -b feat/youtube-playlists

# 2. Make changes and commit ONCE
git add .
git commit -m "feat(youtube): support playlists in the collector"

# 3. Push and open a PR → validation passes ✅
git push -u origin feat/youtube-playlists
```

## If You Already Have Multiple Commits

Squash them into one before opening (or updating) the PR:

```bash
# Interactive rebase over the commits on your branch
git rebase -i main
# mark the first commit as 'pick' and the rest as 'squash' (or 's'),
# then write a single Conventional Commit message.

# Or soft-reset and recommit:
git reset --soft main
git commit -m "feat(youtube): support playlists in the collector"

git push --force-with-lease
```

## Why

- **Reviewability** — one self-contained change per branch is easier to review.
- **Clean history** — `git log` reads as a sequence of meaningful changes.
- **Reliable releases** — semantic-release derives versions from the single,
  well-formed commit message.
