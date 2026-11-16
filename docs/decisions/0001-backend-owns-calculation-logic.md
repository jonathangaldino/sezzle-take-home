# 0001. The backend owns all calculation logic

Status: Accepted

## Context

The assignment asks for a React frontend that consumes a backend API "to perform basic and advanced arithmetic operations". Every operation here is trivial to compute in JavaScript, so there is a real temptation to compute locally and use the API only for show, or to compute in both places.

## Decision

All arithmetic happens in the Go package `backend/internal/calculator`. The frontend never computes a result. It:

- validates input *shape* (a plain decimal literal, finite, not empty) so obviously bad requests are not sent;
- sends `{operation, operands}` to `POST /api/v1/calculations`;
- formats the returned float64 for display (up to 15 significant digits, see `frontend/src/features/calculator/numbers.ts`).

The domain package has no HTTP or JSON dependency: `Calculate(op string, operands []float64) (float64, error)` plus a table mapping each operation name to its arity and function. The HTTP layer translates domain errors into status codes ([0003](0003-error-envelope-and-status-mapping.md)).

No interface or dependency-injection container wraps the calculator. The HTTP layer receives it as a function value, which is enough to inject failures in tests.

## Consequences

- One source of truth for semantics (`percentage`, `power(0, 0)`, overflow handling). The UI cannot drift from the API.
- Every calculation needs a network round trip; the UI shows a loading state and treats the backend being down as an error, not a fallback to local maths.
- Frontend validation is a convenience, not a guarantee: the API re-validates everything.
- Adding an operation is one table entry in Go plus one entry in `frontend/src/features/calculator/operations.ts` (label, symbol, operand labels).
