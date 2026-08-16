# Apply Gate — Design

## Goal

Make the capture→apply loop produce PRs that satisfy the **target repository's own**
rules, principles and prior art — mechanically, on every run — instead of relying on
whatever the operator happens to remember. Three artifacts: a **preflight** that runs
before design and can reject an action, a **protocol** of phase gates, and a **PR gate**
that asserts compliance before push.

## Why

The first closed loop (`juspay/shooter#141`) shipped a good outcome through a process
that did not hold. Six defects reached review, one CRITICAL — synchronous I/O on the
request path of a server whose job is streaming live terminals. The review bots found
them; the author did not.

Full evidence in `docs/superpowers/audits/2026-08-15-apply-loop-retrospective.md`. Its
two structural results drive this design:

- **Derived, not remembered.** Every knowledge failure was a fact sitting in the target
  repo — a 1045-line schema doc whose line 353 stated the dedup rule that was gotten
  wrong; a type-governance rule stated plainly in a table; ten prior design specs
  establishing a spec→plan→implement convention. All available, none read.
- **Executed, not ticked.** Every mechanically checkable rule that passed did so by luck
  of memory. A checklist is a document, and each failure happened while a document
  already said what to do.

## Failure classes → mechanisms

| Class | Retro refs | Mechanism |
|---|---|---|
| **Premise** — action describes a system that does not exist | F1 | Preflight premise check, authority to reject |
| **Knowledge** — repo rules, principles, prior art unknown | F2, F4, F7 | Repo profile derived per run; applied at design, review and PR |
| **Process** — no plan, no review, gates late, scope drift | F3, F5, F6 | Blocking phase gates + adversarial review of plan and diff |

## Architecture

Three units, each independently usable. The protocol sequences them; neither script
depends on the other.

```
action (from project_briefs.json)
   │
   ▼
① apply-preflight ──reject──► brief feedback (premise correction)
   │ profile.json + prior-art + baseline
   ▼
② protocol: plan → adversarial plan review → implement → adversarial diff review
   │
   ▼
③ apply-pr-gate ──fail──► auto-remediate (≤2) ──still failing──► escalate
   │
   ▼
 push + PR
```

### ① `apply-preflight`

Input: project name + action. Output: `apply/preflight.<project>.<slug>.json` plus a
human-readable report. Non-zero exit on premise rejection.

Four stages, in order — each cheap stage gates the expensive one after it:

**Premise.** Extract the concrete claims the action makes about the target ("replace the
existing X", "the pipeline does Y"), resolve each against the repo's source and config,
and judge whether the premise holds. This is the stage that catches a brief proposing to
replace a capture component in a pipeline configured to receive passively, or to build a
web terminal that already exists.

**Prior art.** Glob the target for `docs/`, `specs/`, `plans/`, `research/`, `README`,
`CONTRIBUTING`, and any `*SCHEMA*` / `*DESIGN*` documents; rank by subject overlap with
the action. Emits a **must-read** list. The schema document missed in F2 ranks first for
any action touching transcript parsing.

**Profile.** Hybrid extraction, per the decision below:

| Field | Source | Method |
|---|---|---|
| primary branch | `origin/HEAD`, CI `on.pull_request.branches` | mechanical |
| package manager + version | lockfile, `packageManager` | mechanical |
| gate commands | `package.json` scripts, CI workflow steps | mechanical |
| commit / PR policy | CI policy jobs, `commitlint`, `CONTRIBUTING` | mechanical where a check exists, else LLM |
| code-governance rules | `CLAUDE.md`, `AGENTS.md`, ESLint config | LLM summarisation into assertable statements |
| architectural principles | `CLAUDE.md`, `README`, architecture docs | LLM summarisation |
| test registration | test script shape, test dir conventions | mechanical |
| doc obligations | presence of API/env reference docs | mechanical |
| review tooling + quirks | CI workflows, prior PR reviews | mechanical + known-quirk table |

Mechanical facts stay deterministic; prose becomes a list of statements a reviewer can
apply. **F4 lived in prose** — "this server streams live terminals" is not a config key —
so prose extraction is load-bearing, not a nicety.

**Baseline.** Run the profile's gate commands on the unmodified checkout and record the
result. Establishes that the toolchain is trustworthy before its output is believed. F5
was a fresh worktree missing a generated framework tsconfig, silently degrading
type-aware lint to 5115 mostly-noise problems.

### ② `apply-protocol.md`

Phases, each gated:

1. **Preflight** — must pass; premise rejection ends the action.
2. **Read** — the must-read list is read before design. Non-negotiable; this is F2.
3. **Plan** — written into the *target's* convention (`docs/superpowers/plans/` where that
   exists), stating scope, non-scope, and **any divergence from the action**. F6's
   substitution of cache-hit share for CPU load belongs here, where it is visible, not
   mid-build.
4. **Plan review** — adversarial panel against the profile's principles.
5. **Implement.**
6. **Diff review** — adversarial panel against the profile's principles, not generic
   correctness. F4 is caught here even if the plan missed it.
7. **PR gate** — ③.

### ③ `apply-pr-gate`

Reads the profile and the working tree; asserts before push:

| Assertion | Basis |
|---|---|
| not committing to the primary branch | profile |
| commit count matches policy (e.g. exactly 1) | profile — `git rev-list --count` |
| subject matches the repo's commit convention | profile / commitlint |
| no co-author trailer | operator policy |
| gates green, compared against the recorded baseline | ①'s baseline |
| new tests registered in the runner | profile's test-registration rule |
| docs updated where the diff creates an obligation | new endpoint → API reference; new env var → env reference |
| PR body carries required links | operator policy |

Every one of these is a command, not a judgement. F7 passed on memory alone; this removes
memory from the path.

## Decisions

**Premise failure rejects, and feeds back.** A failed premise halts the action *and*
writes the correction into brief generation, so the same false premise is not proposed
again. The brief agent currently sees each project's description but not its
configuration or source tree, which is why it proposes replacing components that are not
there. Fixing it at the source improves every remaining action, not the one in hand.

**Profile is hybrid and re-derived every run.** Mechanical facts parsed deterministically;
prose principles summarised by an LLM into assertable statements. Re-derived per run
rather than cached, because staleness is precisely the failure mode being removed — a
cached profile rots as the target evolves and reintroduces "remembered, not derived".

**The full review panel always runs.** Both plan and diff, regardless of diff size. The
cheaper alternative — scaling by size and risk — was considered and rejected: risk
assessment is itself a judgement, and misjudging it is how F4 shipped.

**Gates hard-stop, with bounded auto-remediation.** A failed gate halts the phase. For
**remediable** gates the loop may fix and re-run automatically, escalating after two
failed attempts. Auto-remediation is explicitly **not** available to the premise check,
which rejects outright. Everything auto-remediated is reported, never swallowed — an
invisible fix is indistinguishable from a rule that was never enforced.

Remediable: lint, format, failing tests introduced by the change, missing test
registration, missing doc updates, commit-message format, commit squashing.
Not remediable: premise failure, baseline gate failures pre-existing in the target, any
finding from an adversarial review (these are decisions, not chores).

## Error handling

- **Target unreachable / not a git repo** → hard fail with the resolved path.
- **No convention files found** → profile falls back to conservative defaults (assume
  primary branch from `origin/HEAD`, assume no auto-fix authority) and the report says so.
  Silence about an unknown rule is treated as an unknown, never as permission.
- **Baseline gates already failing** → record and continue, but the PR gate compares
  *against the baseline* rather than demanding green, so pre-existing breakage in the
  target is never attributed to this change.
- **LLM extraction fails or returns junk** → the mechanical profile still stands; prose
  principles are reported as unavailable and the diff review is told so explicitly rather
  than silently reviewing against nothing.

## Testing

- Profile extraction against fixture repos covering the shapes in the portfolio: primary
  branch `release` vs `main`; pnpm vs npm; single-commit policy present vs absent;
  convention files present vs absent.
- Premise check against two known-false cases from the retrospective (capture component in
  a passive pipeline; web terminal that already exists) and one known-true case.
- PR gate assertions each tested against a repo state that violates exactly that rule —
  a two-commit branch, a non-conventional subject, an unregistered test file.
- Baseline comparison: a target with pre-existing lint failures must not fail the PR gate
  for them.

## Authoritative gate

An action may not enter implementation without a passing preflight and a reviewed plan.
A branch may not be pushed without a passing PR gate. These are the two hard edges; the
rest of the protocol is sequencing.

## Out of scope (later phases)

- Automating the merge. The PR gate ends at push; merging stays a human decision.
- Retrofitting the gate over `juspay/shooter#141`, which is already approved.
- Multi-action batching — one action at a time until the loop has run clean several times.
- Feeding *diff-review* findings back into brief generation. Only premise corrections
  feed back initially; review findings are noisier and need evidence they generalise.
