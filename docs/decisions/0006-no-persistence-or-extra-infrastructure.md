# 0006. No database and no infrastructure beyond what the assignment needs

Status: Accepted

## Context

The assignment asks for a calculator: stateless request/response arithmetic. It lists correctness, clarity and maintainability as priorities over extra features, within a 2–4 hour budget. Common additions (history, accounts, caching, observability stacks) each bring storage, migrations, configuration and tests.

## Decision

Build none of the following:

- Database or any persistence; calculation history.
- Authentication, rate limiting.
- Expression parsing (the API takes one operation and its operands, not a formula string).
- Frontend state-management, data-fetching, routing or component libraries. React state plus one custom hook (`useCalculator`) and a small typed `fetch` client cover the needs.
- Backend framework, router, service interfaces or DI (see [0002](0002-go-standard-library-only.md)).

What was added, because it is cheap and directly serves the deliverables: a Makefile, Dockerfiles and Docker Compose (the assignment's optional full-stack Dockerfile), a GitHub Actions workflow running the lint and test checks plus the frontend build, and these ADRs.

## Consequences

- The backend is a pure function behind HTTP; it scales horizontally with no coordination and has nothing to back up or migrate.
- The frontend bundle contains only React and application code.
- A public deployment would need rate limiting at the edge (a reverse proxy or gateway), and any "history" feature would need a storage decision first. Both are deliberate omissions, not oversights.
