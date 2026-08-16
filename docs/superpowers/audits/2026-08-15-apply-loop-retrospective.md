# Apply Loop — Retrospective on the First Closed Loop

**Subject:** `juspay/shooter#141` (first brief action ever shipped) | **Written:** 2026-08-15 | **Verdict:** SHIPPED, BUT THE PROCESS DID NOT HOLD

> The capture→apply loop closed for the first time: a saved video became a reviewed, approved,
> CI-green PR. The outcome was good. The process that produced it was not, and the gap between
> those two facts is the subject of this document. Six defects reached review, one of them
> CRITICAL, and the review bots — not the author — found them. Everything below is grounded in
> what actually happened during the run, with the cost of each failure stated.

---

## Executive Summary

Dopamine's whole purpose is to turn saved learnings into applied change. The first application
succeeded on outcome and failed on method. The failure was not carelessness on any single step;
it was that **no step existed**. There was no premise check, no plan, no design review, and no
adversarial pass over the diff. Architecture was arrived at by collision — write, be surprised,
rewrite — three times.

The sharpest finding is a contradiction inside the same session. The measurement work that
preceded this PR was rigorous: controls were run, replicates taken, and the measuring instrument
itself was validated before its numbers were trusted. None of that discipline transferred to the
engineering. Beliefs about *data* were tested adversarially; beliefs about *code* were shipped.

**The corrective is not a document.** Every failure below occurred while a document already in the
target repo said what to do. The target repo's `CLAUDE.md` opens with "BEFORE making ANY changes,
read these documents" and lists them. That instruction was available and was not followed. A
checklist that must be remembered will fail the same way. The mechanisms must **execute**.

---

## What shipped

A live token-burn and spend panel plus a `GET /api/usage` endpoint, read from Claude Code
transcripts. 16 files, +2438/−11, one commit, 18 unit checks, 17 CI checks green, approved by the
repo's own AI reviewer after one round of fixes.

Two genuinely hard findings came out of the work and are worth preserving:

- Summing every assistant record overstated output tokens by **124.6%**; keeping the *first*
  record of a streamed response understated by **4.3%**. Last-write-wins is correct.
- The transcript corpus was **9.3 GB across 15,244 files**, of which **15,155 were subagent
  transcripts** nested below the obvious directory level, invisible to a flat scan.

Neither of these is a process failure. They are the reason the feature is valuable.

---

## Failures

### F1 — Premise never checked (class: PREMISE)

Nothing verified that the action's description matched the target system before design began.

This did not bite on this PR, but it was found immediately afterwards on two others: a brief
proposed replacing a capture component in a pipeline that runs no capture at all (its collector is
configured as a passive receiver), and another proposed building a web terminal in a repo that
already has one. The brief agent knows each project's *description* but not its *configuration or
source tree*, so it confidently proposes replacing things that do not exist.

**Cost here:** zero. **Cost if unaddressed:** an entire implementation against a false premise.
**Would have been caught by:** grounding the action against the repo's code and config before
design, with authority to reject the action.

### F2 — Prior art never searched (class: KNOWLEDGE)

The target repo contained a 1045-line schema document describing exactly the data being parsed.
Line 353 states the deduplication rule that was gotten wrong. It was discovered while writing
documentation, *after* the defect had been committed.

The same repo also holds **10 design specs, 4 plans, and a research document** under
`docs/superpowers/`. Every prior feature there followed spec → plan → implement. That convention is
visible in the directory listing and was not noticed.

**Cost:** a shipped 4.3% undercount, found by luck rather than by process.
**Would have been caught by:** a mandatory search of `docs/`, `specs/`, `plans/`, `research/` for
the subject matter before writing code.

### F3 — No plan, and therefore no reviewable design (class: PROCESS)

No spec, no plan, no design pass. The architecture was reached by three successive surprises:

| step | trigger | rework |
|---|---|---|
| read files whole | 21 s scan | replaced with tail reads |
| cap file count during the walk | window returned zero files | cap moved after filtering |
| synchronous I/O throughout | flagged in review as CRITICAL | full async rewrite |

Corpus size and subagent nesting were both knowable before the first line was written.

**Cost:** three rewrites of the same module.
**Would have been caught by:** a written plan, reviewed before implementation.

### F4 — The target's architectural principles were never applied (class: KNOWLEDGE)

The most serious defect was synchronous I/O on the request path of a server whose primary function
is streaming live terminal sessions over WebSockets. A cold scan blocked the event loop for ~3 s,
which would stall every session on the host, not merely the caller.

This does not require deep insight. It follows from asking "what does this process do, and what
must therefore never block it?" — a question that was never asked. Two independent reviewers
caught it; the author did not.

A second instance: the repo's type-governance rule (all types belong in one directory, generated
from YAML specs) is stated plainly in a table in its `CLAUDE.md`. It was learned by having ESLint
reject the code.

**Cost:** the CRITICAL finding, plus a rewrite.
**Would have been caught by:** extracting and applying the repo's stated principles before design.

### F5 — Quality gates run last, and the toolchain trusted unverified (class: PROCESS)

Lint, typecheck and build were run only near the end. A freshly created worktree had no generated
framework tsconfig, so type-aware linting silently degraded and emitted 5115 problems, nearly all
noise. This was very nearly mis-triaged as pre-existing.

The irony is exact: hours earlier, in the measurement work, an evaluation harness had been
validated before its output was believed. The same standard was not applied here.

**Cost:** near-miss on triage; wasted analysis.
**Would have been caught by:** running the repo's gates on an unmodified checkout first, to
establish a trustworthy baseline.

### F6 — Scope changed mid-implementation (class: PROCESS)

The action requested CPU-load monitoring and a "one-shot rate" metric. Neither is derivable from
the available data. Cache-hit share was substituted.

The substitution was defensible and was disclosed. The problem is *when*: the decision was made
alone, mid-build, at the point of least visibility, rather than at plan time where it could have
been weighed.

**Cost:** none materialised; the reviewer's ability to weigh the trade was removed.
**Would have been caught by:** a plan enumerating what the action asks for and what is achievable.

### F7 — Compliance held by memory, not by mechanism (class: KNOWLEDGE)

The PR satisfied the repo's single-commit policy, used a conventional commit, carried no
co-author trailer, and survived a force-push that re-triggered stale bot reviews. Every one of
those was correct **because operator memory happened to contain the rule**, not because anything
verified it. The single-commit policy is mechanically checkable in one command; it was not checked.

**Cost:** zero this time. **Cost when memory is absent or wrong:** a rejected or malformed PR.
**Would have been caught by:** mechanical assertions before push.

---

## What went right, and must not be lost

Over-correcting would be its own failure. These behaviours were correct and should be preserved by
any process that replaces the current one:

- **Refusing to invent unknowns.** Billing rates for most observed models were genuinely unknown.
  Rather than guess, token counts were reported exactly and cost rendered as unknown, never as
  zero. A cost dashboard that under-reports while looking authoritative is worse than one that
  reports nothing.
- **Surfacing incompleteness.** Truncated reads are counted and exposed, so figures are never
  quietly partial.
- **Measuring rather than asserting.** The dedup and corpus findings were established with numbers
  on real data, not reasoned about.
- **Verifying the fix, not just making it.** The event-loop repair was confirmed with a probe
  running during a live scan (worst stall 3000 ms → 22 ms), not assumed from the code change.

---

## Classification

The seven failures collapse into three classes, and each needs a *different* mechanism. This is the
key structural result of the retrospective:

| class | failures | mechanism required |
|---|---|---|
| **PREMISE** — the action describes a system that does not exist | F1 | a grounding check that runs before design and may **reject the action** |
| **KNOWLEDGE** — the repo's rules, principles and prior art were not known | F2, F4, F7 | a **per-repo profile derived by reading the repo**, applied at design and at PR time |
| **PROCESS** — no plan, no review, gates late, scope drift | F3, F5, F6 | **phase gates that block**, plus adversarial review of both plan and diff |

Two properties follow directly from the evidence:

1. **Derived, not remembered.** Every KNOWLEDGE failure was a fact sitting in the target repo. The
   profile must be read from the repo on each run, so it cannot rot as the repo evolves.
2. **Executed, not ticked.** Every mechanically checkable item that passed did so by luck of
   memory. Anything a command can assert must be asserted by a command.

---

## Requirements for the corrective

Recorded here as input to the design that follows; this document does not decide the design.

- **R1** Ground the action against the target's code and configuration before any design work, with
  authority to reject the action as premised on a non-existent system.
- **R2** Search the target for prior art — schema docs, specs, plans, research, existing modules —
  and require it to be read before design.
- **R3** Derive the target's profile on every run: primary branch, package manager, gate commands,
  commit and PR policy, code-governance rules, test registration, documentation obligations, and
  review tooling with known quirks.
- **R4** Establish a trustworthy gate baseline on an unmodified checkout before editing.
- **R5** Produce a written plan, in the target's own convention, stating scope, non-scope, and any
  divergence from the action — reviewed adversarially before implementation.
- **R6** Review the diff adversarially before push, against the target's stated principles, not only
  for generic correctness.
- **R7** Assert compliance mechanically before push; never rely on operator memory for a rule a
  command can check.

---

## Open questions for the design

- Where the phase gates live, and what "blocking" means in practice for a single-operator loop.
- How much of the profile can be derived reliably versus needing a per-project override.
- Whether adversarial review is proportionate for small actions, or scaled to the size of the diff.
- What happens when a premise check fails: reject the action outright, or feed the correction back
  into brief generation so the same false premise is not proposed again.
