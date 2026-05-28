# onboarding-back

Auth module for the onboarding platform. Validates employees against HR data and creates user accounts. All lambdas are HTTP API (API Gateway v2).

## Stack

- Runtime: Node 22, TypeScript strict mode
- ORM: Drizzle + `pg` (PostgreSQL via Secrets Manager connection string)
- Validation: Zod
- Auth: bcrypt
- Infra: AWS SAM — `template.yaml` at root
- Package manager: pnpm (workspaces)

## Shared utilities (`shared/`)

| Path | Purpose |
|---|---|
| `shared/db/client.ts` | Drizzle client — memoized per container (Pool max=1) |
| `shared/db/schema.ts` | All table definitions: `companies`, `employees`, `users`, `passwordResetTokens` |
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

Connection string comes from Secrets Manager. Every lambda receives `DB_SECRET_ARN` as env var and calls `getSecret(DB_SECRET_ARN)` → parses `{ connectionString }` → passes to `getDb(connectionString)`.

## SAM specifics

- All functions: `arm64`, `nodejs22.x`, 30s timeout, 256MB, VPC-attached
- Build: esbuild per function (`BuildMethod: esbuild`), `@aws-sdk/*` marked external
- CORS handled at API Gateway level — lambdas do not set CORS headers
- DB secret ARN injected via SAM parameter `DbSecretArn` → env var `DB_SECRET_ARN`

## Commands

```bash
pnpm build          # sam build (all lambdas)
pnpm deploy         # sam deploy --guided
cd lambdas/<name> && npm test   # compile + unit tests for one lambda
```

## Creating a new lambda

Use `/new-lambda` — the skill handles scaffolding, template.yaml registration, and enforces all conventions.
