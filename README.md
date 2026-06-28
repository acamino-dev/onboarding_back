# onboarding-back

Auth and onboarding backend for the platform. Validates employees against HR data, manages accounts and sessions, and orchestrates a KYC credit flow. All lambdas are HTTP API (API Gateway v2).

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node 22, TypeScript (strict) |
| Database | PostgreSQL (`pg`) + DynamoDB |
| Validation | Zod |
| Auth | bcrypt + JWT |
| Infra | AWS SAM (API Gateway v2) |
| Package manager | pnpm (workspaces) |
| External services | SES (email), S3 (document storage), Textract (INE OCR), Lambda (internal invoke) |

## Project structure

```
onboarding-back/
├── lambdas/
│   ├── auth/               # Registration, OTP, login, token management
│   ├── home/               # Post-login user data and credit history
│   └── kyc/                # KYC credit process
│       └── <name>/
│           ├── app.ts
│           ├── services/
│           ├── utils/validators.ts
│           ├── types/
│           ├── tests/unit/app.test.ts
│           ├── jest.config.ts
│           ├── tsconfig.json
│           └── package.json
├── shared/
│   ├── constants/
│   │   ├── errors.ts        # ValidationError, AuthError, NotFoundError, DuplicatedError, …
│   │   └── kyc.ts           # KYC_STEPS enum, MAX_CREDIT_AMOUNT, KYC_TTL_DAYS
│   ├── db/
│   │   ├── client.ts        # getDb() — memoized Pool (max=1), query(), queryOne()
│   │   ├── dynamodb.ts      # DocumentClient wrapper — get/query/scan/put/update/delete
│   │   └── types.ts         # Employee, User, PasswordResetToken
│   └── utils/
│       ├── createResponse.ts
│       ├── handleError.ts   # Single error logging point → { errorCode, errorId }
│       ├── secrets.ts       # Secrets Manager with in-memory cache
│       └── logger.ts
├── docs/                    # OpenAPI 3.0.3 specs — one file per lambda
├── architecture/            # Mermaid diagrams
├── migrations/              # PostgreSQL schema
├── scripts/                 # seed-companies.ts
├── template.yaml            # SAM template
└── samconfig.toml
```

## Commands

```bash
pnpm build                          # sam build (all lambdas)
pnpm deploy:dev                     # sam deploy --config-env dev
pnpm deploy:prod                    # sam deploy --config-env prod

cd lambdas/<group>/<name> && npm run unit          # unit tests (mocked)
cd lambdas/<group>/<name> && NODE_OPTIONS=--experimental-vm-modules npx jest \
  --config jest.integration.config.ts --verbose   # integration tests (real AWS)
```

> Both suites must pass. Unit tests mock all services — integration tests are the only ones that catch real service bugs.

## Database schema

### PostgreSQL (`migrations/001_initial_schema.sql`)

| Table | Key columns |
|---|---|
| `employees` | `id`, `employee_number`, `rfc`, `company_id`, `is_active` |
| `users` | `id`, `employee_id`, `company_id`, `email`, `password_hash`, `is_verified` |
| `password_reset_tokens` | `id`, `user_id`, `token`, `expires_at` |

Credentials live in Secrets Manager. Every lambda reads `DB_SECRET_ID` → `getSecret(id)` → `{ user, password, host, port, dbname }` → memoized Pool (max=1).

### DynamoDB tables

| Table (`${Environment}` suffix) | PK | SK | Purpose |
|---|---|---|---|
| `onboardingCompaniesDB` | `id` | — | Company catalog |
| `onboardingOtpDB` | `email` | `otp_id` | Email OTP codes (TTL 15 min) |
| `onboardingRefreshTokensDB` | `token_hash` | — | Refresh token rotation |
| `onboardingCreditHistoryRequestsDB` | `user_id` | — | Cached credit analysis results |
| `onboardingKycDB` | `kyc_id` | — | KYC process state (GSI: `userId-index`) |

## Error response format

All errors return **HTTP 400** with:

```json
{ "errorCode": <code>, "errorId": "<8-hex traceId>" }
```

| errorCode | Meaning | Class |
|---|---|---|
| 701 | Success | — |
| 702 | Bad request | `ValidationError` |
| 703 | Unauthorized | `AuthError` |
| 704 | Forbidden | `ForbiddenError` |
| 705 | Not found | `NotFoundError` |
| 706 | Method not allowed | `MethodNotAllowedError` |
| 707 | Too many requests | `RateLimitError` |
| 708 | Internal server error | `Error` |
| 709 | Conflict | `DuplicatedError` |
| 710 | Access token expired | `TokenExpiredError` |
| 711 | Email not verified | `UnverifiedError` |

Success responses use standard HTTP status codes (`200`, `201`) with a plain JSON body.

## SAM configuration

All functions share these globals:

- Architecture: `x86_64`
- Runtime: `nodejs22.x`
- Timeout: 30s / Memory: 256 MB
- VPC-attached (subnets + security groups via parameters)
- Build: esbuild per function (`Target: es2022`, `@aws-sdk/*` external)
- CORS handled at API Gateway level — lambdas do not set CORS headers

Required deploy parameters:

| Parameter | Description |
|---|---|
| `LambdaSubnetIds` | Comma-separated private subnet IDs |
| `LambdaSecurityGroupIds` | Comma-separated security group IDs |
| `Environment` | `dev` or `prod` |

## Lambdas

### Auth group (`/auth/*`)

| Lambda | Route | Purpose |
|---|---|---|
| `register` | `POST /auth/register` | Validate employee + create account |
| `getCompanies` | `POST /auth/getCompanies` | Return company catalog from DynamoDB |
| `sendOTP` | `POST /auth/sendOTP` | Send email verification OTP via SES |
| `verifyOTP` | `POST /auth/verifyOTP` | Verify OTP, mark user as verified |
| `login` | `POST /auth/login` | Authenticate, issue JWT + refresh token cookie |
| `sendRecoveryOTP` | `POST /auth/sendRecoveryOTP` | Send password-reset OTP via SES |
| `resetPassword` | `POST /auth/resetPassword` | Verify recovery OTP + update password hash |
| `renewToken` | `POST /auth/renewToken` | Rotate refresh token, issue new JWT |
| `validateCredentials` | Lambda authorizer | Verify JWT + refresh token on protected routes |

**Register flow:** validate body → find active employee by `(employee_number, company_id, rfc)` → assert email not taken → bcrypt + pepper hash → insert user.

**Login flow:** validate body → find user → bcrypt compare → assert verified → sign JWT → store refresh token hash → set `httpOnly` cookie.

**Token renewal:** extract refresh cookie → verify hash in DynamoDB → rotate token → issue new JWT.

### Home group (`/home/*`)

| Lambda | Route | Purpose |
|---|---|---|
| `getUserInfo` | `POST /home/user/info` | Return authenticated user's email from JWT context |
| `requestCreditHistory` | `POST /home/credit` | Return cached analysis or invoke `getCreditHistory` and cache result |
| `getCreditHistory` | internal (Lambda invoke) | Scrape external credit portal, compute credit metrics |

`getCreditHistory` is invoked internally by `requestCreditHistory` — not exposed via API Gateway. It logs into an external portal, fetches credit contracts and payments, then computes `acaminoTenure`, `creditFrequency`, `daysPastDue`, `nextPaymentDate`.

### KYC group (`/kyc/*`)

| Lambda | Route | Purpose |
|---|---|---|
| `creditConditions` | `POST /kyc/credit/conditions` | Validate amount/term against credit offer, create KYC process |
| `getKycStatus` | `POST /kyc/status` | Return current KYC process for authenticated user |
| `getUploadUrl` | `POST /kyc/upload-url` | Generate presigned S3 PUT URL for current document step |
| `validateIneFront` | `POST /kyc/validate-ine-front` | Analyze INE front with Textract, extract name, advance step |

**KYC step machine:**

```
CONDITIONS → INE_FRONT → INE_BACK → ADDRESS → CURP → BANK → REVIEW → BIOMETRIC → STATUS
```

- `creditConditions` — creates the process at `CONDITIONS`, blocks duplicates, validates amount ≤ `MAX_CREDIT_AMOUNT` and term ≥ `MIN_PLAZO_MONTHS`.
- `getUploadUrl` — accepts `INE_FRONT | INE_BACK | ADDRESS | CURP | BANK`, saves S3 key to KYC record.
- `validateIneFront` — calls Textract `AnalyzeDocument` (FORMS), extracts name from LINE blocks, validates `vigencia`, advances step to `INE_BACK`.
- Steps `INE_BACK` → `STATUS` are pending implementation (see TODO).

**Limits:** `MAX_CREDIT_AMOUNT = 35000`, `MIN_PLAZO_MONTHS = 3`, `KYC_TTL_DAYS = 15`.

## Adding a new lambda

```bash
/new-lambda <LambdaName> [--method GET|POST|DELETE]
```

Scaffolds full directory structure, registers function in `template.yaml`, generates OpenAPI doc in `docs/`.

---

## TODO

> Track work-in-progress and known gaps here. Remove items once merged.

### KYC — document validation lambdas

- [ ] Persist `s3Key` for **every** uploaded document in the KYC record, not just the current step — each step (`INE_FRONT`, `INE_BACK`, `ADDRESS`, `CURP`, `BANK`) must store its own key in a `s3Keys: { [step]: string }` map, along with the exact ISO 8601 timestamp when that step occurred (`stepTimestamps: { [step]: string }`)
- [ ] `validateIneBack` — Textract analysis for INE back, extract CURP, advance step to `ADDRESS`
- [ ] `validateAddress` — validate address proof document, advance step to `CURP`
- [ ] `validateCurp` — validate CURP document, advance step to `BANK`
- [ ] `validateBank` — validate bank account document, advance step to `REVIEW`
- [ ] `reviewKyc` — internal/admin endpoint to approve or reject KYC in `REVIEW` state
- [ ] `biometric` — biometric verification step before final `STATUS`

### Auth

- [ ] Rate limiting on OTP endpoints (`sendOTP`, `sendRecoveryOTP`) — no throttle currently

### Home

- [ ] `getCreditHistory` integration tests — uses external portal scraping, no integration suite yet

### Infra / general

- [ ] S3 bucket lifecycle policy — KYC documents accumulate indefinitely, no expiry rule
- [ ] CI/CD pipeline — deploys are manual (`sam deploy`), no GitHub Actions or CodePipeline
- [ ] File size limit on KYC uploads — presigned URL in `getUploadUrl` has no `ContentLengthRange` condition; enforce a max (e.g. 10 MB) via S3 presigned URL policy condition so oversized documents are rejected at S3 before the lambda validates them
