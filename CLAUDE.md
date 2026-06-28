# onboarding-back

Auth module for the onboarding platform. Validates employees against HR data and creates user accounts. All lambdas are HTTP API (API Gateway v2).

## Stack

- Runtime: Node 22, TypeScript strict mode
- DB: PostgreSQL (employees, users, auth) + DynamoDB (companies, otp)
- Validation: Zod
- Auth: bcrypt
- Infra: AWS SAM — `template.yaml` at root
- Package manager: pnpm (workspaces)

## TypeScript rules

- All functions must have explicit return types
- `any` is not permitted — use specific types or `unknown` with guards
- No semicolons (`;`) — configured in ESLint/Prettier

## Shared utilities (`shared/`)

| Path | Purpose |
|---|---|
| `shared/db/client.ts` | Async `getDb()` — fetches credentials from Secrets Manager via `DB_SECRET_ID` env var, creates memoized Pool (max=1), exposes `query()` and `queryOne()` |
| `shared/db/dynamodb.ts` | DynamoDB DocumentClient wrapper — `dynamoDb.get()`, `dynamoDb.query()`, `dynamoDb.scan()`, `dynamoDb.put()`, `dynamoDb.update()`, `dynamoDb.delete()`. Types: `Company = { id, name, created_at }`, `Otp = { email, otp_id, code, expires_at, used }` |
| `shared/db/types.ts` | TypeScript types for PostgreSQL table rows: `Employee`, `User`, `PasswordResetToken` |
| `shared/constants/errors.ts` | `ValidationError`, `AuthError`, `ForbiddenError`, `NotFoundError`, `MethodNotAllowedError`, `RateLimitError`, `DuplicatedError`, `TokenExpiredError`, `UnverifiedError` |
| `shared/utils/createResponse.ts` | Standard HTTP response builder — `createResponse(statusCode, body)` |
| `shared/utils/handleError.ts` | Maps errors → HTTP 400 + obfuscated `{ errorCode, errorId }` response. **Single logging point** — calls `logger.errorResponse()` once per request. |
| `shared/utils/secrets.ts` | Secrets Manager with in-memory cache — `getSecret(arn)` |
| `shared/utils/logger.ts` | Logging — `logger.error(context, error, details?)` and `logger.errorResponse(errorId, errorCode, context, error, details?)`. Only called from `handleError`. |

## Error response format

Errors always return HTTP 400 with:
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
- `711` email not verified (UnverifiedError)

Success responses use standard HTTP status codes (`201`, `200`, etc.) with a plain body.

## DB access pattern

Every lambda receives `DB_SECRET_ID` as env var (set in `template.yaml` via `!Sub onboardingCredentials${Environment}`). Services call `await getDb()` — which reads `DB_SECRET_ID`, fetches the secret `{ user, password, host, port, dbname }` from Secrets Manager, and creates a memoized Pool. No connection string is constructed or passed anywhere; services take no DB parameters.

## Migrations & Schema

- PostgreSQL schema defined in `migrations/001_initial_schema.sql`
- PostgreSQL tables: `employees`, `users`, `password_reset_tokens`
- All PostgreSQL column names use `snake_case` (e.g., `employee_number`, `company_id`)
- Query examples: `db.query(sql, [param1, param2])` returns `{ rows: T[] }`, `db.queryOne(sql, params)` returns `T | undefined`
- DynamoDB table `onboardingCompaniesDB${Environment}` defined in `template.yaml` (CompaniesTable resource)
- Companies schema: `{ id (PK, string), name (string), created_at (number, unix timestamp) }`
- DynamoDB table `onboardingOtpDB${Environment}` defined in `template.yaml` (OtpTable resource)
- OTP schema: `{ email (PK, string), otp_id (SK, string UUID), code (string, 6-digit numeric), expires_at (number, unix timestamp — TTL), used (boolean) }`
- OTP TTL: DynamoDB auto-deletes records via `expires_at` (15 min from creation)
- OTP access pattern: query by `email` (PK) → filter by `code` match + `used = false` in app

## SAM specifics

- All functions: `x86_64`, `nodejs22.x`, 30s timeout, 256MB, VPC-attached
- Build: esbuild per function (`BuildMethod: esbuild`), `@aws-sdk/*` marked external
- CORS handled at API Gateway level — lambdas do not set CORS headers
- PostgreSQL secret ID injected via SAM `!Sub onboardingCredentials${Environment}` → env var `DB_SECRET_ID`
- Companies table name injected via SAM → env var `COMPANIES_TABLE_NAME`
- OTP table name injected via SAM → env var `OTP_TABLE_NAME`
- IAM policy grants `secretsmanager:GetSecretValue` on `onboardingCredentials${Environment}-*`
- IAM policy grants `dynamodb:GetItem`, `dynamodb:Scan` on companies table
- IAM policy grants `dynamodb:PutItem`, `dynamodb:Query`, `dynamodb:UpdateItem` on OTP table
- DynamoDB tables use on-demand billing (PAY_PER_REQUEST)
- Deploy with `sam deploy --config-env dev` or `--config-env prod`

## Commands

```bash
pnpm build          # sam build (all lambdas)
pnpm deploy:dev     # sam deploy --config-env dev
cd lambdas/<name> && npm test   # compile + unit tests for one lambda
npx ts-node scripts/seed-companies.ts  # seed initial companies (set ENVIRONMENT env var)
```

## Service error handling

Every service wraps its DB operations in `try/catch`:
- Domain errors (`NotFoundError`, `DuplicatedError`, etc.) — re-throw directly
- Raw DB/infrastructure errors — wrap as `Error on <serviceName>: <original message>`

This is what the unit test 708 cases assert: `mockX.mockRejectedValue(new Error('Error on X: connection timeout'))`.

## Logging

**Single logging point: `handleError`.**

- `handleError` calls `logger.errorResponse()` once per failed request.
- Services and utilities throw errors — they never call `logger`.
- Adding `logger.error` inside a service or utility creates a duplicate log for every error that passes through `handleError`.
- `logger.ts` is the only file with `console.*` calls.

## Testing conventions

### Running tests — ALWAYS run both suites

After any service change, **both** test suites must be run. Unit tests alone are not sufficient verification.

**Why:** Unit tests mock all services (`jest.mock('../../services/...')`). They test the lambda handler in isolation — they never execute the real service code. Service-layer bugs (wrong HTTP fields, broken auth flows, bad cookie handling, incorrect DB queries) are completely invisible to unit tests and only surface in integration tests.

```bash
# From lambdas/<group>/<name>/

# Unit tests (fast, mocked, no AWS):
npm run unit

# Integration tests (hit real AWS/external services):
NODE_OPTIONS=--experimental-vm-modules npx jest --config jest.integration.config.ts --verbose
```

**Rule:** A change is only verified when BOTH suites pass. If integration tests don't exist yet for a lambda, note it explicitly — do not claim the change is verified on unit tests alone.

### `noEmit` is mandatory — never run tests that emit `.js`

Every `tsconfig.json` (lambda-level **and** `tsconfig.base.json`) MUST set `"noEmit": true`. Both unit and integration runs must execute under this config.

**Why:** `tsc` compiles `.ts` → `.js` by default. Tests run TypeScript directly via `ts-jest` (in-memory), so emitted `.js` is never needed. If a compile step emits `.js` next to a `.ts`, Jest resolves the `.js` **before** the `.ts` — so a **stale compiled version runs instead of the current source**, and edits to the `.ts` silently have no effect on test output. This has bitten the repo twice (`shared/` instanceof breakage; `validateIneBack` name extraction).

**Rules:**
- Never remove `"noEmit": true` from any tsconfig, and never run `tsc`/tests with a config that emits.
- Tracked/compiled `.js` are forbidden under `lambdas/**/services/`, `lambdas/**/tests/`, and `shared/**` — `.gitignore` blocks them; do not force-add.
- Symptom check: if a source `.ts` change has **zero effect** on test output, look for a shadowing `.js` and delete it.

### Unit test required cases

Every lambda test suite (`tests/unit/app.test.ts`) must cover these cases in addition to its business-logic scenarios:

| Case | Expected errorCode |
|---|---|
| `DB_SECRET_ID` env var not set | `708` |
| Each service function throws a generic DB error | `708` |

**Pattern** — use `beforeEach` (not `beforeAll`) to reset mocks and env vars. Mock all service modules. Each service's DB error test simulates a raw error: `new Error('connection timeout')`. Do not mock `shared/utils/secrets` or `shared/db/client` — services are mocked so `getDb` is never called in unit tests.

The 708 cases are infrastructure-level and apply to every lambda by design. They are generated automatically by `/new-lambda` and must be preserved when tests are modified manually.

## Creating a new lambda

Use `/new-lambda` — the skill handles scaffolding, template.yaml registration, and enforces all conventions.
