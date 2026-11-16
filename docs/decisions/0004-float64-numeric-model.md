# 0004. float64 numeric model and its limits

Status: Accepted

## Context

A calculator must pick a number representation. Options: IEEE 754 float64 (native in Go and JSON/JavaScript), a decimal type (e.g. shopspring/decimal), or arbitrary-precision rationals (`math/big`). The API transports numbers as JSON, and the frontend parses them into JavaScript numbers, which are float64.

## Decision

All operands and results are float64 end to end. The domain package documents that it is not decimal-exact and not suitable for money.

Rules enforced by `calculator.Calculate`:

- Operands must be finite (NaN/±Inf rejected). Over JSON this cannot actually happen: JSON has no NaN/Infinity literals, and `encoding/json` rejects out-of-range literals such as `1e999`, which surface as 400 `INVALID_JSON`.
- A result that is NaN or ±Inf is rejected as 422 `RESULT_NOT_FINITE` (overflow, `power(0, -1)`, `power(-8, 0.5)`).
- Underflow is not an error: `1e-200 * 1e-200` returns `0`.
- `-0` is normalised to `0`, so clients never display "-0".
- `power` follows `math.Pow`, so `power(0, 0) = 1`.
- `percentage(a, b)` is b% of a, computed as `a * b / 100`. For ordinary inputs this is more accurate than `a * (b / 100)`, because `b / 100` is usually inexact before the multiplication: `300 * 7 / 100 = 21`, whereas `300 * (7 / 100) = 21.000000000000004`. The cost is reporting `RESULT_NOT_FINITE` when `a * b` overflows even though the true answer fits (`a = 1e308, b = 50`). Precision on normal inputs was preferred over range at the extreme.

The frontend displays results rounded to 15 significant digits (the most float64 always round-trips), so `0.1 + 0.2` shows `0.3` while the API returns `0.30000000000000004`. Inputs differing in the 13th–15th digit are still shown distinctly.

## Consequences

- No dependencies and no custom JSON number handling; values map 1:1 between Go, JSON and JavaScript.
- Binary rounding artefacts are visible in the raw API response. Callers needing exact decimal results (currency) must not use this API.
- Integers above 2^53 lose precision.
- Switching to a decimal type later would change the API's number encoding (likely to strings) and is a breaking change.
