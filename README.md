# onboarding-back

Auth module for the onboarding platform. Validates employees against HR data and creates user accounts.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node 22, TypeScript (strict) |
| ORM | Drizzle + `pg` (PostgreSQL) |
| Validation | Zod |
| Auth | bcrypt |
| Infra | AWS SAM (API Gateway v2 HTTP API) |
| Package manager | pnpm (workspaces) |

## Project structure

```
onboarding-back/
├── lambdas/
│   └── <name>/             # one directory per Lambda
│       ├── app.ts           # handler entrypoint
│       ├── services/        # one file per DB/AWS operation
│       ├── utils/
│       │   └── validators.ts
│       ├── types/
│       │   └── RequestBody.d.ts
│       ├── tests/unit/
│       │   └── app.test.ts
│       ├── jest.config.ts
│       ├── tsconfig.json
│       └── package.json
├── shared/
│   ├── constants/errors.ts  # ValidationError, NotFoundError, DuplicatedError, AuthError
│   ├── db/
│   │   ├── client.ts        # Drizzle client — memoized per container (Pool max=1)
│   │   └── schema.ts        # companies, employees, users, passwordResetTokens
│   └── utils/
│       ├── createResponse.ts
│       ├── handleError.ts
│       └── secrets.ts       # Secrets Manager with in-memory cache
├── docs/                    # OpenAPI 3.0.3 specs — one file per lambda
├── architecture/            # Mermaid diagrams
├── template.yaml            # SAM template
└── samconfig.toml
```

## Commands

```bash
pnpm build                          # sam build (all lambdas)
pnpm deploy                         # sam deploy --guided

cd lambdas/<name> && npm test       # compile + unit tests for one lambda
```

## Database schema

Four tables, all in PostgreSQL:

- **companies** — `id`, `name`, `tenant_id`, `created_at`
- **employees** — `id`, `employee_number`, `rfc`, `company_id`, `tenant_id`, `first_name`, `last_name`, `email`, `is_active`, `created_at`
- **users** — `id`, `employee_id`, `company_id`, `tenant_id`, `email`, `password_hash`, `is_active`, `created_at`, `updated_at`
- **passwordResetTokens** — `id`, `user_id`, `token`, `tenant_id`, `expires_at`, `created_at`

Connection string lives in Secrets Manager. Every lambda reads `DB_SECRET_ARN` → `getSecret(arn)` → parses `{ connectionString }`.

## Error response format

All errors return **HTTP 200** with:

```json
{ "errorCode": <code>, "errorId": "<8-hex traceId>" }
```

| errorCode | Meaning | Class |
|---|---|---|
| 701 | Success (no error) | — |
| 702 | Bad request | `ValidationError` |
| 703 | Unauthorized | `AuthError` |
| 704 | Forbidden | `ForbiddenError` |
| 705 | Not found | `NotFoundError` |
| 706 | Method not allowed | `MethodNotAllowedError` |
| 707 | Too many requests | `RateLimitError` |
| 708 | Internal server error | `Error` |
| 709 | Conflict | `DuplicatedError` |
| 710 | Access token expired | `TokenExpiredError` |

Success responses use standard HTTP status codes (`200`, `201`) with a plain JSON body. Absent `errorCode` means success.

## SAM configuration

All functions share these globals:

- Architecture: `arm64`
- Runtime: `nodejs22.x`
- Timeout: 30s
- Memory: 256 MB
- VPC-attached (subnets + security groups via parameters)
- Build: esbuild per function (`Target: es2022`, `@aws-sdk/*` external)
- CORS handled at API Gateway level — lambdas do not set CORS headers

Required SAM parameters at deploy time:

| Parameter | Description |
|---|---|
| `LambdaSubnetIds` | Comma-separated private subnet IDs |
| `LambdaSecurityGroupIds` | Comma-separated security group IDs |
| `DbSecretArn` | ARN of the Secrets Manager secret with `{ connectionString }` |

## Lambdas

### POST /auth/register — `register-service`

Validates an employee and creates a user account.

**Flow:**
1. Parse + validate request body (Zod)
2. Fetch DB connection string from Secrets Manager
3. Verify company exists for `(company_id, tenant_id)`
4. Find active employee by `(employee_number, company_id, tenant_id)`
5. Cross-check `rfc` against employee record (case-insensitive)
6. Assert no existing user for this employee
7. Hash password (bcrypt, 10 rounds) and insert user row

**Request body:**

| Field | Type | Constraints |
|---|---|---|
| `employee_number` | string | 1–100 chars |
| `rfc` | string | exactly 13 chars |
| `company_id` | string (UUID) | valid UUID |
| `tenant_id` | string (UUID) | valid UUID |
| `password` | string | 8–72 chars |

**Success:** `201` `{ "message": "Account created successfully" }`

**Errors:** `702` validation · `705` company/employee not found · `709` user already exists · `708` unexpected failure

Full OpenAPI spec: [`docs/register-service.yaml`](docs/register-service.yaml)

## Adding a new lambda

Use the `/new-lambda` skill — scaffolds the full directory structure, registers the function in `template.yaml`, and generates the OpenAPI doc in `docs/`.

```
/new-lambda <LambdaName> [--method GET|POST|DELETE]
```
