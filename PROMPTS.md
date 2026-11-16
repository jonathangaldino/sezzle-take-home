# Sezzle Take-Home Challenge — Development Playbook

## 1. Project Overview

Build a full-stack calculator application consisting of:

- A React frontend using TypeScript.
- A REST API backend written in Go.
- Automated tests for both applications.
- Technical documentation.
- A reproducible development environment.

The objective is to demonstrate senior-level software engineering skills, including architecture, clean code, testing, API design, maintainability, and effective AI-assisted development.

### Core Principles

1. Prioritize correctness over feature quantity.
2. Prefer simple, maintainable solutions over unnecessary abstractions.
3. Follow idiomatic Go and TypeScript conventions.
4. Keep business logic independent of infrastructure.
5. Make all important behavior testable.
6. Document meaningful architectural decisions.
7. Use AI as an engineering assistant, not as a replacement for engineering judgment.
8. Avoid implementing features outside the assignment scope unless they provide meaningful value.

### Time Constraint

Target implementation time: 2–4 hours.

Every implementation decision must consider whether its complexity is justified by the assignment.

---

# 2. Technology Stack

## Frontend

- React
- TypeScript
- Vite
- Vitest
- React Testing Library
- CSS Modules or a similarly lightweight styling approach

## Backend

- Go
- Standard library `net/http`
- Standard library `encoding/json`
- Go testing package
- `httptest` for HTTP integration tests

Avoid unnecessary backend frameworks.

## Development Infrastructure

- Git
- Docker and Docker Compose (optional)
- Makefile
- GitHub Actions

---

# 3. Architecture Guidelines

Use a monorepo with independent frontend and backend applications.

Expected structure:

    calculator/ (this root folder)
    ├── frontend/
    │   ├── src/
    │   │   ├── components/
    │   │   ├── features/
    │   │   │   └── calculator/
    │   │   ├── services/
    │   │   ├── hooks/
    │   │   ├── types/
    │   │   ├── App.tsx
    │   │   └── main.tsx
    │   ├── package.json
    │   └── vite.config.ts
    │
    ├── backend/
    │   ├── cmd/
    │   │   └── api/
    │   │       └── main.go
    │   ├── internal/
    │   │   ├── calculator/
    │   │   ├── http/
    │   │   └── config/
    │   ├── go.mod
    │   └── go.sum
    │
    ├── docs/
    │   └── decisions/
    ├── docker-compose.yml
    ├── Makefile
    ├── README.md
    ├── AI_USAGE.md
    └── .gitignore

Adjust the structure if there is a clear technical reason.

Do not introduce abstractions simply to follow a particular architectural pattern.

---

# 4. Functional Requirements

## Required Operations

- Addition
- Subtraction
- Multiplication
- Division

## Optional Operations

Implement these if they can be completed without compromising the core requirements:

- Exponentiation
- Square root
- Percentage

## Input Validation

The application must handle:

- Missing operands.
- Invalid JSON.
- Unsupported operations.
- Incorrect operand counts.
- Division by zero.
- Negative square root inputs.
- NaN and Infinity.
- Overflow and non-finite results.

---

# 5. API Contract

Implement a REST API using a versioned endpoint.

### POST /api/v1/calculations

Request:

    {
      "operation": "add",
      "operands": [10, 5]
    }

Response:

    {
      "operation": "add",
      "operands": [10, 5],
      "result": 15
    }

Supported operations:

| Operation | Arguments |
|---|---|
| add | 2 |
| subtract | 2 |
| multiply | 2 |
| divide | 2 |
| power | 2 |
| sqrt | 1 |
| percentage | 2 |

Percentage semantics:

`percentage(200, 10) = 20`

### Error Response

Use a consistent error format:

    {
      "error": {
        "code": "DIVISION_BY_ZERO",
        "message": "Cannot divide by zero"
      }
    }

Suggested HTTP status codes:

- 400: Invalid request or malformed JSON.
- 404: Unknown route.
- 405: Unsupported HTTP method.
- 422: Invalid mathematical operation.
- 500: Unexpected internal error.

Document any deviations from this contract.

---

# 6. Global Instructions for Claude Code

These instructions apply to every implementation prompt in this document.

You are acting as a Senior Software Engineer responsible for delivering this take-home assignment.

Your responsibilities:

- Understand the requirements before implementing.
- Make pragmatic architectural decisions.
- Write production-quality, idiomatic code.
- Keep the implementation appropriately scoped.
- Write meaningful tests.
- Verify your changes instead of assuming they work.
- Identify edge cases proactively.
- Avoid unnecessary dependencies.
- Avoid speculative abstractions.
- Explain important trade-offs.

## Execution Rules

1. Execute only the current prompt.
2. Do not automatically proceed to subsequent prompts.
3. Inspect existing files before modifying them.
4. Preserve existing working code unless there is a clear reason to change it.
5. Do not overwrite configuration files without inspecting their contents.
6. Do not install dependencies without a reason.
7. Do not introduce TODOs as substitutes for required implementation.
8. Never claim tests passed without actually executing them.
9. Never fabricate test coverage numbers.
10. Report any incomplete work or technical limitations honestly.

## AI-Assisted Development

Use your reasoning capabilities to identify potential problems before writing code.

When appropriate:

- Challenge unclear requirements.
- Identify edge cases.
- Suggest simpler alternatives.
- Review your own implementation.
- Identify missing tests.
- Explain non-obvious decisions.

The goal is not to maximize generated code. The goal is to maximize engineering quality.

---

# 7. Implementation Prompts

Each section below is an independent prompt.

Execute them sequentially.

---

## PROMPT 00 — Repository Inspection and Requirements Analysis

Before implementing anything, inspect the current repository.

Tasks:

1. Inspect the existing directory structure.
2. Identify existing configuration and tooling.
3. Check whether frontend or backend projects already exist.
4. Review the requirements in this document.
5. Identify ambiguities and technical risks.
6. Propose the implementation architecture.
7. Identify the minimum dependencies required.

Do not implement the application yet.

Deliverables:

- Architecture proposal.
- Proposed directory structure.
- API contract confirmation.
- List of implementation milestones.
- Potential edge cases.
- Estimated complexity of each milestone.

Explicitly identify anything that could cause unnecessary complexity or exceed the assignment scope.

Wait for approval before implementation.

---

## PROMPT 01 — Project Initialization

Initialize the repository according to the approved architecture.

Tasks:

### Frontend

- Create a React application using Vite.
- Configure TypeScript.
- Configure Vitest.
- Configure React Testing Library.
- Configure the development scripts.
- Ensure the project builds successfully.

### Backend

- Initialize the Go module.
- Create the application entry point.
- Establish the internal package structure.
- Configure a basic HTTP server.
- Add a health endpoint if useful.

### Repository

- Create or update `.gitignore`.
- Create the root README.
- Create the Makefile with common development commands.
- Keep frontend and backend independently executable.

Do not implement calculator functionality yet.

Validation:

- Frontend dependencies install successfully.
- Frontend builds successfully.
- Backend compiles successfully.
- Backend server starts successfully.

Report the commands executed and their results.

---

## PROMPT 02 — Backend Domain Implementation

Implement the calculator's core business logic.

Requirements:

- Addition.
- Subtraction.
- Multiplication.
- Division.
- Exponentiation.
- Square root.
- Percentage.

Architecture:

Keep mathematical operations independent of HTTP handlers.

Use a clear service interface or another lightweight abstraction if justified.

Requirements:

1. Validate operand counts.
2. Validate operation names.
3. Prevent division by zero.
4. Prevent square roots of negative numbers.
5. Handle non-finite values.
6. Detect overflow where applicable.
7. Return meaningful errors.
8. Keep the implementation idiomatic Go.

Numeric precision:

Use `float64` as a pragmatic choice for this generic calculator.

Document floating-point limitations and do not present this implementation as suitable for financial calculations requiring decimal precision.

Testing:

Create table-driven unit tests covering:

- Normal arithmetic.
- Positive and negative operands.
- Zero operands.
- Decimal values.
- Division by zero.
- Negative square root.
- Exponentiation edge cases.
- Invalid operand counts.
- Non-finite values.
- Overflow.

Do not proceed to HTTP implementation until domain tests pass.

---

## PROMPT 03 — Backend REST API

Implement the HTTP layer.

Endpoint:

POST `/api/v1/calculations`

Requirements:

1. Parse JSON requests.
2. Validate request structure.
3. Validate HTTP methods.
4. Reject malformed JSON.
5. Reject unsupported operations.
6. Delegate calculations to the domain service.
7. Return consistent JSON responses.
8. Return appropriate HTTP status codes.
9. Prevent accidental exposure of internal errors.
10. Configure reasonable request body limits.

Use the standard Go HTTP library.

Keep HTTP concerns separate from business logic.

Testing:

Use `httptest` to test the HTTP handlers.

Cover:

- Successful requests.
- Invalid JSON.
- Missing operands.
- Unsupported operations.
- Division by zero.
- Incorrect HTTP methods.
- Unknown routes.
- Unexpected internal errors.

Also verify response status codes and JSON structures.

---

## PROMPT 04 — Frontend Architecture and API Integration

Implement the frontend foundation.

Requirements:

- React with TypeScript.
- Clear component organization.
- Centralized API client.
- Explicit TypeScript interfaces for API requests and responses.
- Appropriate loading and error states.
- Avoid unnecessary global state management.

Create a calculator feature responsible for:

- Operation selection.
- Operand input.
- Form submission.
- API communication.
- Result presentation.

Important:

The frontend must never perform the actual mathematical calculations.

All calculations must be performed by the Go backend.

Implement input validation for usability, but remember that backend validation remains authoritative.

Handle:

- Empty inputs.
- Invalid numeric values.
- Incorrect operand counts.
- Network failures.
- HTTP errors.
- Loading states.

Ensure the API base URL can be configured through environment variables.

---

## PROMPT 05 — User Interface Implementation

Create a polished, responsive calculator interface.

Design direction:

- Minimalist.
- Professional.
- Modern.
- Clear visual hierarchy.
- Responsive on desktop and mobile.

Requirements:

1. Operation selector.
2. Dynamic operand inputs.
3. Calculate action.
4. Result presentation.
5. Loading indicator.
6. Error feedback.
7. Clear/reset action.
8. Basic mobile responsiveness.

Optional:

Add a lightweight session-based calculation history if the core functionality is already complete.

Avoid excessive animations, decorative elements, or unnecessary UI complexity.

The interface should feel like a small, finished software product.

---

## PROMPT 06 — Frontend Testing

Implement meaningful frontend tests.

Use Vitest and React Testing Library.

Cover:

- Initial component rendering.
- Operation selection.
- Dynamic operand fields.
- Form validation.
- Successful calculations.
- Loading states.
- API failures.
- Error messages.
- Result rendering.
- Reset behavior.

Mock the API boundary rather than duplicating backend mathematical logic in frontend tests.

Prefer behavior-oriented tests over implementation-detail assertions.

Execute the complete frontend test suite.

---

## PROMPT 07 — Integration and Quality Review

Review the complete application as an independent Senior Software Engineer.

Do not immediately rewrite existing code.

First inspect the implementation and identify:

- Architectural inconsistencies.
- Incorrect error handling.
- Missing validations.
- Type safety issues.
- Potential security problems.
- Incorrect HTTP semantics.
- Unnecessary abstractions.
- Missing test cases.
- Frontend/backend contract mismatches.

Then fix only meaningful issues.

Run:

### Backend

    gofmt -w .
    go vet ./...
    go test ./...

### Frontend

    npm run lint
    npm run test
    npm run build

Adapt commands to the actual scripts configured in the project.

Verify that the complete application works end-to-end.

Never report a successful validation unless the corresponding command was executed successfully.

---

## PROMPT 08 — Documentation

Create professional project documentation.

### README.md

Include:

1. Project overview.
2. Features.
3. Technology stack.
4. Architecture overview.
5. Directory structure.
6. Prerequisites.
7. Installation instructions.
8. How to run the backend.
9. How to run the frontend.
10. How to execute tests.
11. API documentation.
12. Example requests and responses.
13. Error handling.
14. Design decisions.
15. Known limitations.

### Design Decisions

Document meaningful decisions, including:

- Why Go was chosen.
- Why React and TypeScript were chosen.
- Why the backend owns the calculation logic.
- Why the HTTP standard library was sufficient.
- Why the application does not require a database.
- Numeric precision limitations.
- Why additional infrastructure was avoided.

Keep the explanations concise and technically defensible.

### AI_USAGE.md

Document:

- AI tools used.
- Their role in development.
- Important prompts used.
- How generated code was reviewed.
- How tests were validated.
- Examples of decisions made or corrected through engineering judgment.

Only document actual tools, prompts, and actions.

Do not fabricate development activity.

---

## PROMPT 09 — Docker and CI (Optional)

Only execute this prompt if all core functionality, tests, and documentation are complete.

Implement a lightweight Docker-based development or deployment setup.

Requirements:

- Backend Dockerfile.
- Frontend Dockerfile.
- Docker Compose.
- Correct frontend-to-backend API configuration.
- Health checks where appropriate.

If time permits, create a GitHub Actions workflow that:

- Runs Go tests.
- Runs Go vet.
- Runs frontend tests.
- Runs frontend build.

Keep the infrastructure simple.

Do not introduce Kubernetes or other unnecessary infrastructure.

---

## PROMPT 10 — Final Submission Audit

Perform a final review against the original Sezzle assignment.

Create a checklist covering every deliverable.

Verify:

- [ ] React frontend implemented.
- [ ] TypeScript used.
- [ ] Go backend implemented.
- [ ] All required arithmetic operations work.
- [ ] API returns JSON.
- [ ] Input validation implemented.
- [ ] Division by zero handled.
- [ ] Frontend error handling implemented.
- [ ] Responsive interface implemented.
- [ ] Backend unit tests pass.
- [ ] Frontend tests pass.
- [ ] Integration tests pass.
- [ ] README completed.
- [ ] API examples documented.
- [ ] Design decisions documented.
- [ ] AI prompts documented.
- [ ] Build succeeds.
- [ ] Repository contains no unnecessary files.
- [ ] No secrets or credentials committed.
- [ ] Git history is clean and understandable.

Generate a final report containing:

1. Implemented functionality.
2. Architecture summary.
3. Test execution results.
4. Actual coverage results.
5. Build verification.
6. Known limitations.
7. Remaining issues, if any.
8. Final assessment of submission readiness.

Do not claim completion if any mandatory requirement remains unfulfilled.

---

# 8. Definition of Done

The project is considered complete when:

- The frontend communicates with the Go backend.
- All required operations work correctly.
- Invalid requests are handled consistently.
- Tests pass.
- The application builds.
- Documentation allows another engineer to run the project independently.
- Architectural decisions are understandable.
- AI usage is transparently documented.
- The implementation remains within the assignment's intended scope.

# 9. Final Engineering Principle

This assignment is not an opportunity to demonstrate how much infrastructure or code can be produced.

It is an opportunity to demonstrate engineering judgment.

Prefer a small, correct, well-tested, well-documented application over a large and unnecessarily sophisticated implementation.

Every abstraction, dependency, feature, and architectural decision should have a clear justification.
