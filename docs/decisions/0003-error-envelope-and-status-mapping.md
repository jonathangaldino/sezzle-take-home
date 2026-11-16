# 0003. Error envelope and HTTP status mapping

Status: Accepted

## Context

Clients need to tell apart "your request is malformed" from "your request is well-formed but has no mathematical answer", and need a stable machine-readable code rather than parsing messages. The playbook (`PROMPTS.md` section 5) suggests 400/404/405/422/500 and a `{"error": {"code", "message"}}` envelope.

## Decision

Every non-2xx response from the API, including 404 and 405 from the router, uses:

```json
{"error": {"code": "DIVISION_BY_ZERO", "message": "Cannot divide by zero"}}
```

| Status | Codes | Meaning |
|---|---|---|
| 400 | `INVALID_JSON`, `INVALID_REQUEST`, `UNSUPPORTED_OPERATION`, `INVALID_OPERAND_COUNT` | The request is malformed or does not match the schema |
| 413 | `REQUEST_TOO_LARGE` | Body exceeds 1 MB |
| 422 | `DIVISION_BY_ZERO`, `NEGATIVE_SQUARE_ROOT`, `RESULT_NOT_FINITE` | Valid request, no finite real result |
| 404 | `NOT_FOUND` | Unknown route |
| 405 | `METHOD_NOT_ALLOWED` | Known route, wrong method; `Allow` header set |
| 500 | `INTERNAL_ERROR` | Unexpected error or recovered panic; generic message |

The domain package returns sentinel errors; `writeCalculationError` maps them with `errors.Is`. Domain error messages are written for end users, so they are returned as-is (capitalised). Unknown errors are logged and returned as a generic 500.

`413` is an addition to the playbook's suggested codes: it is the correct status for an oversized body, and folding it into 400 would hide the cause.

## Consequences

- The frontend can display `error.message` directly and does not need its own message table.
- Codes are part of the public contract; renaming one is a breaking change.
- A `null` operand would silently decode to `0` with `[]float64`, so the request type decodes into `[]*float64` and rejects `null` as `INVALID_REQUEST`.
- Some cases land in 400 `INVALID_JSON` rather than a more specific code because `encoding/json` rejects them before the handler sees them, e.g. numbers outside float64 range such as `1e999`, or a string operand.
