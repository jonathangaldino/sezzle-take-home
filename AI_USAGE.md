# AI usage

This project was built with AI assistance. This document records what was used, how, and what a human decided. It is limited to facts that can be checked against the repository and its git history.

## Tools

| Tool | Role |
|---|---|
| Claude Code (Anthropic's CLI), main session on Claude Fable 5.2 | Orchestrator. Planned the work, wrote briefs for subagents, re-ran the checks itself after each subagent finished, and made the commits. It did not write application code. |
| Claude Code subagents on Claude Opus 5.5 | Implementation, tests, the independent review, documentation, Docker/CI. |

## Prompts

- The assignment: [TASK.md](TASK.md).
- The developer's playbook: [PROMPTS.md](PROMPTS.md). It contains the project principles, technology stack, architecture guidelines, the API contract, global instructions for the AI, and the implementation prompts 00 to 10 that structured the work. It is not reproduced here.
- The developer's opening instruction to the orchestrator was, in substance: work on this take-home, whose requirements are in `TASK.md` and implementation details in `PROMPTS.md`; spawn subagents running Opus 5.5; you are only the orchestrator, you coordinate and do not implement.

## Human decisions

After PROMPT 00 (repository inspection and requirements analysis) the orchestrator presented an architecture proposal: directory structure, clarifications of the API contract including the error-code table, edge cases, milestones and an explicit out-of-scope list. It asked three questions. The developer's answers:

1. Run prompts 01 to 10 straight through, stopping only when a human decision is needed.
2. Initialise git and commit once per prompt on `main`.
3. Optional scope: Docker + Compose, GitHub Actions CI, and ADRs under `docs/decisions/`. Session history was declined.

The developer then approved the proposal.

## How the work was executed

| Step | Prompt(s) | Done by |
|---|---|---|
| Scaffold | 01 | one subagent |
| Backend: domain, then HTTP | 02, 03 | one subagent, in parallel with the frontend |
| Frontend: API client, UI, tests | 04, 05, 06 | one subagent, built against the agreed contract with the API mocked |
| Independent review and end-to-end run | 07 | a fresh subagent (see below) |
| Documentation; Docker and CI | 08; 09 | two subagents in parallel |
| Final audit | 10 | after this document was written |
| Config test and Playwright end-to-end tests | after 10 | a further subagent; re-verified by the orchestrator |

Each subagent brief contained: the `PROMPTS.md` sections to read, the design decisions already settled, explicit out-of-scope items, a ban on state-changing git commands, and a list of validation commands that had to be actually run and reported with their real output.

The PROMPT 07 reviewer was given the code and the assignment but none of the earlier agents' conclusions. It was asked to review, run the real stack end to end for the first time (curl through the Vite proxy, and a headless Chromium Playwright script kept outside the repository), and fix only meaningful issues.

The PROMPT 10 final audit reported a backend total coverage of 79.2% (`internal/config` and `cmd/api` untested) and no end-to-end test in the repository. The developer decided to add a test for `internal/config` and Playwright end-to-end tests that run the browser against the real Go server and Vite dev server. A further Opus 5.5 subagent implemented them, and the orchestrator re-verified the result.

The resulting commits are visible with `git log`.

## How output was reviewed and validated

- The orchestrator re-ran lint, tests and builds itself before committing application code rather than relying on a subagent's report. For the Docker commit it re-checked only that the Compose file is valid; the containers were run by the Docker subagent and again in the final audit.
- The frontend subagent checked the rendered UI in a real browser at 1280, 375 and 320 px wide, in light and dark themes.
- PROMPT 07 was an independent review by an agent that had not written the code.
- Coverage and API examples in the README were captured by running the commands, not written from expectation.

## Decisions made or corrected through review

Corrections found in the PROMPT 07 review:

- **Display precision.** The UI rounded results to 12 significant digits, so `1.0000000000001 + 1` displayed as "1 + 1 = 2". Changed to 15 digits, the most float64 always round-trips, with tests (`frontend/src/features/calculator/numbers.ts`).
- **Backend down in development.** The Vite proxy answers 502 `text/plain` when the backend is not running, which the UI reported as an "unexpected response". 502/503/504 responses without the API error envelope are now reported as the service being unreachable (`frontend/src/services/calculatorApi.ts`).
- **Missing tests.** Added backend tests for HEAD/OPTIONS returning 405 and for unclean-path redirects passing through the JSON 404/405 wrapper.

Reviewed and deliberately not changed:

- `percentage` computes `a * b / 100`, which can overflow for huge inputs where `a * (b / 100)` would not. Kept, because it is more precise on ordinary inputs ([ADR 0004](docs/decisions/0004-float64-numeric-model.md)).
- `power(0, -1)` and a negative base with a fractional exponent report `RESULT_NOT_FINITE` rather than a dedicated code.

Caught earlier:

- **`null` operands.** At the proposal stage, before any code was written: Go's JSON decoder silently turns `null` into `0` for a `[]float64`, so `[1, null]` would have computed `1 + 0`. The request type decodes into `[]*float64` and rejects `null`.
- **Layout.** The frontend subagent's browser check caught an input stretching when its sibling field showed an error, and fixed it.

Scope decisions:

- No service interface or dependency injection for the calculator: a function plus an operation table.
- No CORS middleware: the frontend reaches the API same-origin ([ADR 0005](docs/decisions/0005-same-origin-api-no-cors.md)).
- No router, state-management, data-fetching or UI-component libraries.
- Empty placeholder directories from the playbook's suggested tree (`components/`, `hooks/`, `types/`) were not created.

Deviations from the playbook:

- oxlint instead of ESLint, because it is what the current Vite `react-ts` template ships.
- HTTP 413 `REQUEST_TOO_LARGE` added to the suggested status codes.
- Prompts 02 + 03 and 04 to 06 were batched into one subagent each instead of run one by one.

## Limits of verification

- No screen-reader testing.
- Colour contrast was not measured with a tool.
- Only Chromium was driven in browser checks, and the end-to-end suite is configured for Chromium only.
- The GitHub Actions workflow, including the end-to-end job, was not executed locally.
