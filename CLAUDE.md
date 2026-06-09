# onboarding-back

Auth module for the onboarding platform. Validates employees against HR data and creates user accounts. All lambdas are HTTP API (API Gateway v2).

## Stack

- Runtime: Node 22, TypeScript strict mode
- DB: Raw SQL + `pg` (PostgreSQL — credentials from Secrets Manager)
- Validation: Zod
- Auth: bcrypt
- Infra: AWS SAM — `template.yaml` at root
- Package manager: pnpm (workspaces)

## Shared utilities (`shared/`)

| Path | Purpose |
|---|---|
| `shared/db/client.ts` | Async `getDb()` — fetches credentials from Secrets Manager via `DB_SECRET_ID` env var, creates memoized Pool (max=1), exposes `query()` and `queryOne()` |
| `shared/db/types.ts` | TypeScript types for table rows: `Company`, `Employee`, `User`, `PasswordResetToken` |
| `shared/constants/errors.ts` | `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `MethodNotAllowedError`, `RateLimitError`, `DuplicatedError`, `TokenExpiredError` |
| `shared/utils/createResponse.ts` | Standard HTTP response builder — `createResponse(statusCode, body)` |
| `shared/utils/handleError.ts` | Maps errors → real HTTP status + `{ errorCode, errorId }` response |
| `shared/utils/secrets.ts` | Secrets Manager with in-memory cache — `getSecret(arn)` |

## Error response format

Errors always return HTTP 200 with:
```json
{ "errorCode": <internalStatusCode>, "errorId": "<8-hex traceId>" }
```
`errorCode` values:
- `701` success (no error)
- `702` bad request (ValidationError)
- `703` unauthorized (AuthError)
- `704` forbidden (ForbiddenError)
- `705` not found (NotFoundError)
- `706` method not allowed (MethodNotAllowedError)
- `707` too many requests (RateLimitError)
- `708` internal server error (generic Error)
- `709` conflict (DuplicatedError)
- `710` accessToken expired (TokenExpiredError)

Success responses use standard HTTP status codes (`201`, `200`, etc.) with a plain body.

## DB access pattern

Every lambda receives `DB_SECRET_ID` as env var (set in `template.yaml` via `!Sub onBoardingCredentials${Environment}`). Services call `await getDb()` — which reads `DB_SECRET_ID`, fetches the secret `{ user, password, host, port, dbname }` from Secrets Manager, and creates a memoized Pool. No connection string is constructed or passed anywhere; services take no DB parameters.

## Migrations & Schema

- Schema defined in `migrations/001_initial_schema.sql`
- Tables: `companies`, `employees`, `users`, `password_reset_tokens`
- All column names use `snake_case` (e.g., `employee_number`, `company_id`)
- Query examples: `db.query(sql, [param1, param2])` returns `{ rows: T[] }`, `db.queryOne(sql, params)` returns `T | undefined`

## SAM specifics

- All functions: `arm64`, `nodejs22.x`, 30s timeout, 256MB, VPC-attached
- Build: esbuild per function (`BuildMethod: esbuild`), `@aws-sdk/*` marked external
- CORS handled at API Gateway level — lambdas do not set CORS headers
- DB secret ID injected via SAM `!Sub onBoardingCredentials${Environment}` → env var `DB_SECRET_ID`
- IAM policy grants `secretsmanager:GetSecretValue` on `onBoardingCredentials${Environment}-*`
- Deploy with `sam deploy --config-env dev` or `--config-env prod`

## Commands

```bash
pnpm build          # sam build (all lambdas)
pnpm deploy         # sam deploy --guided
cd lambdas/<name> && npm test   # compile + unit tests for one lambda
```

## Testing conventions

Every lambda test suite (`tests/unit/app.test.ts`) must cover these cases in addition to its business-logic scenarios:

| Case | Expected errorCode |
|---|---|
| `DB_SECRET_ID` env var not set | `708` |
| Each service function throws a generic DB error | `708` |

**Pattern** — use `beforeEach` (not `beforeAll`) to reset mocks and env vars. Mock all service modules. Each service's DB error test simulates the wrapped error the service already produces: `new Error('Error on <fn>: ...')`. Do not mock `shared/utils/secrets` or `shared/db/client` — services are mocked so `getDb` is never called in unit tests.

The 708 cases are infrastructure-level and apply to every lambda by design. They are generated automatically by `/new-lambda` and must be preserved when tests are modified manually.

## Creating a new lambda

Use `/new-lambda` — the skill handles scaffolding, template.yaml registration, and enforces all conventions.
