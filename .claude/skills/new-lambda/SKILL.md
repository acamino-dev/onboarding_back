---
name: new-lambda
description: Use this skill when the user wants to create a new Lambda function. Triggers on phrases like "create a lambda", "new lambda", "add lambda", "nueva lambda", "/new-lambda". Scaffolds the complete directory structure following project conventions.
argument-hint: <LambdaName> [--method <GET|POST|DELETE>]
allowed-tools: [Read, Write, Edit, Glob, Bash]
---

# New Lambda Scaffold

Scaffold a complete Lambda function following project conventions.

The user invoked this with: $ARGUMENTS

## Step 1 — Gather test scenarios

Parse the arguments. If `LambdaName` is missing, ask for it. If `--method` is missing, default to POST.

Then ask the user to describe the **test scenarios** this lambda must satisfy — before anything else. Ask for:

1. **Success cases**: what happens on the happy path? (e.g. "given a valid employee email, create a user and return 201 with `{ userId }`")
2. **Error cases**: what should fail and with which code? (e.g. "if employee not found → 705, if email already exists → 709, if body missing fields → 702")

Do NOT ask about body fields, response fields, or env vars yet — derive those from the scenarios.

Do NOT proceed until you have at least one success case and the relevant error cases.

---

## Step 1b — Derive contracts from scenarios

From the stated scenarios, infer and summarize back to the user:

- **Request body fields** and their types (from what inputs are mentioned in the scenarios)
- **Response shape** on success (from what the success case returns)
- **Error types used**: map each error code to its class:
  - `702` bad request → `ValidationError`
  - `703` unauthorized → `AuthError`
  - `704` forbidden → `ForbiddenError`
  - `705` not found → `NotFoundError`
  - `706` method not allowed → `MethodNotAllowedError`
  - `707` too many requests → `RateLimitError`
  - `708` internal server error → generic `Error`
  - `709` conflict → `DuplicatedError`
  - `710` accessToken expired → `TokenExpiredError`
- **DB/AWS operations implied** (e.g. "look up employee by email", "insert new user row")
- **Environment variables needed** (note: `DB_SECRET_ID` is injected automatically by `template.yaml` — only list extra vars beyond DB access)

Present this as a brief contract summary and ask the user to confirm or correct it before generating any files.

---

## Step 2 — Validate name

- `LambdaName` must be camelCase starting with a verb, e.g. `registerUser`, `getEmployee`, `deleteSession`
- The directory will be `lambdas/<LambdaName>/`
- Refuse if the directory already exists

---

## Step 2b — Generate tests first

Before creating any other file, generate `tests/unit/app.test.ts` from the confirmed scenarios. Each scenario becomes one `it()` block:

- Success cases → assert `statusCode` matches (e.g. `201`) and body fields
- Error cases → assert `statusCode` is `400`, body has `{ errorCode: <code>, errorId: expect.stringMatching(/^[0-9a-f]{8}$/) }`
- Include a `beforeEach` that sets all required env vars, sets up default happy-path mock return values, and calls `jest.clearAllMocks()`
- Mock all DB/AWS calls using `jest.mock` at module level — mock the specific service files AND `shared/utils/secrets`, not `pg` directly
- Use realistic sample data (not placeholder comments) derived from the scenarios

### Mandatory infrastructure tests (always include, regardless of user scenarios)

Every lambda test suite must include these cases. They cover failure modes that exist in every lambda by design:

```typescript
it('should return 200 with errorCode 708 when DB_SECRET_ID is not set', async () => {
  delete process.env.DB_SECRET_ID
  const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
  expect(result.statusCode).toBe(400)
  const parsed = JSON.parse(result.body as string)
  expect(parsed.errorCode).toBe(708)
  expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
})

// One block per scaffolded service — replace <serviceName> and <functionName> for each
it('should return 200 with errorCode 708 when <functionName> throws a DB error', async () => {
  mock<FunctionName>.mockRejectedValue(new Error('connection timeout'))
  const result = await lambdaHandler(baseEvent as APIGatewayProxyEventV2)
  expect(result.statusCode).toBe(400)
  const parsed = JSON.parse(result.body as string)
  expect(parsed.errorCode).toBe(708)
  expect(parsed.errorId).toMatch(/^[0-9a-f]{8}$/)
})
```

Show the generated test file to the user and ask:
> "Do these tests capture your intent? Confirm to generate the rest of the files."

Do NOT create any other file until confirmed.

---

## Step 3 — Generate all files

Create every file listed below. Adapt content to the gathered requirements — never leave placeholder TODOs in the output.

### Directory structure to create

```
lambdas/<LambdaName>/
├── app.ts
├── services/            (one file per DB/AWS operation)
├── utils/
│   └── validators.ts
├── types/
│   └── RequestBody.d.ts
├── tests/
│   ├── unit/
│   │   └── app.test.ts
│   └── integration/
│       ├── helpers/
│       │   └── constants.ts
│       ├── setup.ts
│       └── <serviceName>.test.ts  (one file per service)
├── jest.config.ts
├── jest.integration.config.ts
├── tsconfig.json
└── package.json
```

`handleError` and `createResponse` come from `shared/` — do NOT create local copies.

---

### `app.ts` template

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { createResponse } from '../../shared/utils/createResponse'
import { handleError } from '../../shared/utils/handleError'
import { validateBody } from './utils/validators'

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const DB_SECRET_ID = process.env.DB_SECRET_ID
    if (!DB_SECRET_ID) throw new Error('DB_SECRET_ID is not set')

    const body = validateBody(event.body ?? '')

    // --- business logic ---

    return createResponse(201, { message: 'Success' })
  } catch (e) {
    return handleError(e)
  }
}
```

`DB_SECRET_ID` is always present — it is injected by `template.yaml`. The guard exists only to produce a clean 708 if the env var is missing in a misconfigured environment. Add guards for any other env vars the lambda needs. Always read env vars **inside** the handler — never at module level. Module-level reads execute at import time, before Jest's `beforeAll` can set them, breaking every generated test.

---

### `utils/validators.ts` template

```typescript
import { z } from 'zod'
import { ValidationError } from '../../../shared/constants/errors'
import type { RequestBody } from '../types/RequestBody'

const schema = z.object({
  // fields from requirements
})

export const validateBody = (rawBody: string): RequestBody => {
  if (!rawBody) throw new ValidationError('Request body is empty')

  let parsed: unknown
  try {
    parsed = JSON.parse(rawBody)
  } catch {
    throw new ValidationError('Invalid JSON body')
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    throw new ValidationError(JSON.stringify(result.error.flatten().fieldErrors))
  }

  return result.data
}
```

---

### `shared/utils/handleError.ts` — reference (do not recreate)

The shared `handleError` is the **single logging point** for the entire lambda. It generates an 8-hex-char errorId, calls `logger.errorResponse()` once, and maps errors to `errorCode`. No other file should call `logger` — doing so causes duplicate logs for every error that reaches `handleError`.

Error codes: `702` bad request · `703` unauthorized · `704` forbidden · `705` not found · `706` method not allowed · `707` too many requests · `708` internal server error · `709` conflict · `710` accessToken expired.

---

### `types/RequestBody.d.ts` template

```typescript
export type RequestBody = {
  // fields derived from requirements
}
```

---

### `tests/unit/app.test.ts`

This file was already generated and confirmed in Step 2b. Write it exactly as confirmed — do not alter the test cases.

Structure reference:

```typescript
import type { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'
// one import per scaffolded service
import { <functionName> } from '../../services/<serviceName>'

jest.mock('../../services/<serviceName>')

const mock<FunctionName> = <functionName> as jest.MockedFunction<typeof <functionName>>

const baseEvent: Partial<APIGatewayProxyEventV2> = {
  body: JSON.stringify(/* valid request body derived from scenarios */),
  headers: { 'Content-Type': 'application/json' },
}

describe('<LambdaName>', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ID = 'onBoardingCredentialsDev'
    // default happy-path return values for each service mock
    mock<FunctionName>.mockResolvedValue(/* happy-path return value */)
  })

  // one it() per confirmed scenario — success and error cases
  // + mandatory infrastructure tests (DB_SECRET_ID, each service DB error)
})
```

Do NOT mock `shared/utils/secrets` or `shared/db/client` — services are mocked at the module boundary, so `getDb` and `getSecret` are never called in unit tests.

---

### `jest.config.ts`

```typescript
export default {
  transform: { '^.+\\.ts?$': 'ts-jest' },
  clearMocks: true,
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageProvider: 'v8',
  testMatch: ['**/tests/unit/*.test.ts'],
}
```

---

### `tsconfig.json`

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "types": ["node", "jest"]
  },
  "include": ["../../shared/**/*.ts", "**/*.ts"],
  "exclude": ["node_modules", "dist"]
}
```

---

### `package.json`

```json
{
  "name": "<lambda-name-kebab>",
  "version": "1.0.0",
  "description": "",
  "main": "app.js",
  "author": "",
  "license": "MIT",
  "scripts": {
    "unit": "jest",
    "lint": "eslint '*.ts' --quiet --fix",
    "compile": "tsc",
    "test": "npm run compile && npm run unit && npm run test:integration",
    "test:integration": "NODE_OPTIONS=--experimental-vm-modules jest --config jest.integration.config.ts"
  },
  "dependencies": {},
  "devDependencies": {
    "ts-node": "^10.9.2"
  }
}
```

---

### `jest.integration.config.ts`

```typescript
export default {
  transform: { '^.+\\.ts?$': 'ts-jest' },
  clearMocks: true,
  collectCoverage: false,
  testMatch: ['**/tests/integration/*.test.ts'],
  testTimeout: 30000,
  setupFiles: ['./tests/integration/setup.ts'],
}
```

---

### `tests/integration/setup.ts`

Sets all env vars integration tests need — must run before any test file imports anything that reads `process.env`.

```typescript
process.env.DB_SECRET_ID = 'onboardingCredentialsDev'
// Add one line per extra env var the lambda reads in its handler.
// Use the Dev table name exactly as it appears in AWS (capital D in "Dev"):
// process.env.OTP_TABLE_NAME = 'onboardingOtpDBDev'
// process.env.COMPANIES_TABLE_NAME = 'onboardingCompaniesDBDev'
```

Rules:
- `DB_SECRET_ID` is always required — always include it
- Add an entry for every env var guarded in `app.ts` (any `if (!X) throw ...` block)
- Table names follow the pattern `onboarding<TablePurpose>DB<Env>` with capital first letter on `Dev` — match exactly what SAM creates (`onboardingOtpDBDev`, `onboardingCompaniesDBDev`)
- Without this file the `jest.integration.config.ts` `setupFiles` entry will not pick it up — both must exist

---

### `tests/integration/helpers/constants.ts`

Holds all fixture IDs and data used across integration tests. Use deterministic UUIDs so seeds are idempotent.

```typescript
export const TEST_TENANT_ID = '<deterministic-uuid>'
export const TEST_COMPANY_ID = '<deterministic-uuid>'

// One entry per fixture row needed by the suite.
// Key names should reflect the state of the row (e.g. active, inactive, withUser, clean, forCreate).
export const <ENTITIES> = {
  <fixture>: {
    id: '<deterministic-uuid>',
    // ...fields needed by tests
  },
} as const

// Export IDs for any seeded rows that tests need to reference directly
export const SEEDED_<ROW>_ID = '<deterministic-uuid>'
```

Rules:
- All IDs must be deterministic UUIDs (not `crypto.randomUUID()`)
- Name fixtures after their DB state, not after test cases
- Export only what tests actually use

---

### Integration test data setup

All test data — DynamoDB and PostgreSQL — is managed with `beforeAll`/`afterAll` inside the test file. Never use a seed script for per-lambda test fixtures.

**DynamoDB example:**

```typescript
beforeAll(async () => {
  await Promise.all(
    Object.values(TEST_ENTITIES).map((item) =>
      dynamoDb.put({ TableName: TABLE_NAME, Item: { ...item, created_at: Math.floor(Date.now() / 1000) } })
    )
  )
})

afterAll(async () => {
  await Promise.all(
    Object.values(TEST_ENTITIES).map((item) =>
      dynamoDb.delete({ TableName: TABLE_NAME, Key: { id: item.id } })
    )
  )
})
```

**PostgreSQL example** (insert rows, then delete in reverse FK order):

```typescript
beforeAll(async () => {
  const db = await getDb()
  await db.query(
    'INSERT INTO employees (id, employee_number, rfc, company_id, is_active) VALUES ($1, $2, $3, $4, $5) ON CONFLICT DO NOTHING',
    [TEST_EMPLOYEE.id, TEST_EMPLOYEE.employee_number, TEST_EMPLOYEE.rfc, TEST_COMPANY_ID, true]
  )
  await db.query(
    'INSERT INTO users (id, employee_id, company_id, email, password_hash, otp_verified) VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT DO NOTHING',
    [TEST_USER.id, TEST_EMPLOYEE.id, TEST_COMPANY_ID, TEST_EMAIL, '$2b$10$placeholder.hash.for.integration.tests.only', false]
  )
})

afterAll(async () => {
  const db = await getDb()
  await db.query('DELETE FROM users WHERE id = $1', [TEST_USER.id])
  await db.query('DELETE FROM employees WHERE id = $1', [TEST_EMPLOYEE.id])
})
```

Rules:
- Use `ON CONFLICT DO NOTHING` on inserts — safe to re-run if a prior test left data
- Always delete in reverse FK order (users before employees)
- Use placeholder `password_hash` string when the service under test never checks the password — avoids adding bcryptjs as a dev dep
- `TEST_COMPANY_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'` is the seeded company — reuse it across all lambdas

---

### `tests/integration/<serviceName>.test.ts` — one file per service

Integration tests call service functions directly against a real DB — no mocks, no `lambdaHandler`.

**What to cover per service:**

| Service type | Cases to test |
|---|---|
| SELECT (read) | happy path returns correct row; each NOT FOUND path throws the right custom error |
| INSERT (write) | row is actually in DB after call (verify with `db.queryOne`); FK/unique violations throw wrapped `Error` matching `/Error on <fn>/` |
| UPDATE/DELETE | row state changed in DB after call; row-not-found throws expected error |

**Pattern:**

```typescript
import { <CustomError> } from '../../../../shared/constants/errors'
import { getDb } from '../../../../shared/db/client'
import { <serviceFunction> } from '../../services/<serviceName>'
import { /* constants */ } from './helpers/constants'

// Seed and clean up all test data in beforeAll/afterAll (DynamoDB and PostgreSQL)
beforeAll(async () => {
  await dynamoDb.put({ TableName: TABLE_NAME, Item: { ...TEST_ENTITY, created_at: Math.floor(Date.now() / 1000) } })
})

afterAll(async () => {
  await dynamoDb.delete({ TableName: TABLE_NAME, Key: { id: TEST_ENTITY.id } })
})

describe('<serviceName> integration', () => {
  // For write services against PostgreSQL: clean up inserted rows after each test
  afterEach(async () => {
    const db = await getDb()
    await db.query('DELETE FROM <table> WHERE <condition>', [/* fixture id */])
  })

  it('happy path — <describe expected result>', async () => {
    const result = await <serviceFunction>(/* fixture args */)
    // Assert on returned value or verify DB state
    expect(result.<field>).toBe(<expectedValue>)
  })

  it('throws <CustomError> when <condition>', async () => {
    await expect(<serviceFunction>(/* bad args */)).rejects.toThrow(<CustomError>)
  })

  it('throws wrapped Error when DB constraint is violated', async () => {
    await expect(<serviceFunction>(/* args that violate FK/unique */)).rejects.toThrow(
      /Error on <serviceName>/
    )
  })
})
```

Rules:
- All data (DynamoDB and PostgreSQL) → `beforeAll`/`afterAll` in the test file. Never a separate seed script.
- `afterEach` cleanup only on write services (INSERT/UPDATE/DELETE) — SELECT services need none
- Assert DB state directly with `db.queryOne` for INSERT tests — don't trust the function's return alone
- Use fixture constants for all IDs, never inline raw UUIDs in test bodies
- No mocks — `DB_SECRET_ID` must be in env; tests fail fast if not set

---

## Step 4 — Register in template.yaml

After creating all files, add the Lambda resource to `template.yaml` following the existing pattern. Key sections to add:

1. **Lambda function resource** under `Resources:` — copy an existing similar Lambda block and adapt:
   - Resource key: `<PascalCaseName>Function` — e.g. `GetCompaniesFunction`, `RegisterFunction`
   - `FunctionName: !Sub onboarding<PascalCaseName>${Environment}` — e.g. `!Sub onboardingGetCompanies${Environment}`, `!Sub onboardingRegister${Environment}`
   - `Handler` path
   - `Events` (API Gateway path and method)
   - `Environment` → `Variables`: always include `DB_SECRET_ID: !Sub onBoardingCredentials${Environment}` plus any extra vars
   - `Policies`: always include the Secrets Manager policy block:
     ```yaml
     - Statement:
         - Effect: Allow
           Action:
             - secretsmanager:GetSecretValue
           Resource: !Sub arn:aws:secretsmanager:${AWS::Region}:${AWS::AccountId}:secret:onBoardingCredentials${Environment}-*
     - VPCAccessPolicy: {}
     ```

2. **API Gateway event** path convention: `/api/{entity}/{action}` e.g. `/api/user/register`

Show the user the exact YAML block to add and its location in `template.yaml` before writing it — wait for confirmation.

---

## Step 5 — Generate OpenAPI documentation

After `template.yaml` is confirmed and written, create `docs/<lambdaName>.yaml` at the project root.

Derive everything from the already-confirmed contracts (Step 1b) and the API path (Step 4) — no new questions.

### Rules

- One file per lambda. Never read or modify existing files in `docs/`.
- Check if `docs/` exists; create it if not.
- Use OpenAPI 3.0.3.
- Document two responses: `"200"` for success and `"400"` for errors — each with their own schema.
- Map each errorCode to a human-readable description in the error schema's `enum`/`description`.

### Template

```yaml
openapi: 3.0.3
info:
  title: <LambdaName>
  version: 1.0.0

paths:
  /api/{entity}/{action}:           # exact path from Step 4
    <method>:                       # get | post | delete | patch
      summary: <one-line description from scenarios>
      requestBody:                  # omit entirely for GET/DELETE with no body
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/RequestBody'
      responses:
        "200":
          description: Success
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SuccessResponse'
        "400":
          description: Error — check `errorCode` for the specific failure reason
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/ErrorResponse'

components:
  schemas:
    RequestBody:
      type: object
      required:
        - <required fields>
      properties:
        <field>:
          type: <string|number|boolean>
          # repeat per field

    SuccessResponse:
      type: object
      properties:
        # success fields derived from scenarios (e.g. userId, message)

    ErrorResponse:
      type: object
      required:
        - errorCode
        - errorId
      properties:
        errorCode:
          type: integer
          description: |
            Internal error code:
            702 – validation error
            703 – auth error
            705 – not found
            708 – generic error
            709 – duplicate
          enum: [702, 703, 705, 708, 709]   # only codes actually used by this lambda
        errorId:
          type: string
          description: 8-character hex error ID for tracing
          pattern: '^[0-9a-f]{8}$'
```

Fill every placeholder from confirmed contracts. Only include in `errorCode.enum` the codes that appear in the confirmed error scenarios.

---

## Step 6 — Run tests and fix until green

**GOAL: all tests in `tests/unit/app.test.ts` must pass before proceeding to the summary. Do not report success until `npm test` exits with code 0.**

Run:

```bash
cd lambdas/<LambdaName> && npm run compile && npm run unit
```

If any test fails:
1. Read the full error output
2. Identify which file causes the failure (`app.ts`, `validators.ts`, a service file, or the test itself if the mock is wrong)
3. Fix the minimal change needed — do not alter test assertions unless the scenario contract (Step 1b) was misread
4. Re-run `npm run compile && npm run unit`
5. Repeat until green

Common failure causes and fixes:
- `DB_SECRET_ID is not set` → env var read is at module level; move inside handler (see `app.ts` template)
- Mock returns wrong shape → update `mockResolvedValue` in the test to match the actual return type of the service
- `ValidationError` not thrown for missing fields → add required field to Zod schema in `validators.ts`
- Type error on compile → fix the TS type mismatch in the flagged file

Only proceed to Step 7 once unit tests pass. Integration tests (`npm run test:integration`) require a live DB — run those separately after seeding.

---

## Step 7 — Summary

After all files are created and tests are green, print:

```
Lambda `<LambdaName>` created:
  lambdas/<LambdaName>/       ← all source files
  template.yaml               ← resource block added
  docs/<lambdaName>.yaml      ← OpenAPI 3.0 spec
  tests: ✓ all passing

Next steps:
  pnpm build                             ← sam build
```

---

## DB queries (raw SQL)

All database operations use raw SQL with parameterized queries. Example service:

```typescript
import type { Employee } from '../../../shared/db/types'
import { NotFoundError } from '../../../shared/constants/errors'
import { getDb } from '../../../shared/db/client'

export const findEmployee = async (
  employeeNumber: string,
  companyId: string,
): Promise<Employee> => {
  const db = await getDb()

  try {
    const employee = await db.queryOne<Employee>(
      'SELECT * FROM employees WHERE employee_number = $1 AND company_id = $2 AND is_active = TRUE',
      [employeeNumber, companyId]
    )

    if (!employee) {
      throw new NotFoundError('Employee not found', {
        file: 'lambdas/<LambdaName>/services/findEmployee.ts',
        function: 'findEmployee',
        operation: 'find active employee',
        employeeNumber,
        companyId,
      })
    }

    return employee
  } catch (error) {
    if (error instanceof NotFoundError) throw error
    throw new Error(`Error on findEmployee: ${error instanceof Error ? error.message : String(error)}`)
  }
}
```

Rules:
- Use `db.query<T>(sql, params)` for INSERT/UPDATE/DELETE (returns `{ rows: T[] }`)
- Use `db.queryOne<T>(sql, params)` for SELECT returning ≤1 row (returns `T | undefined`)
- All column names are `snake_case` (e.g., `employee_number`, `company_id`, `is_active`)
- Parameterize all user input with `$1`, `$2`, etc.
- **Wrap DB operations in try/catch** — re-throw domain errors directly, wrap raw DB errors as `Error on <serviceName>: <message>` (see pattern below)
- Never call `logger` in a service — `handleError` is the single logging point

---

## Code conventions (always enforce)

- All functions use arrow function syntax: `export const fn = (...): ReturnType => { ... }` and `export const fn = async (...): Promise<ReturnType> => { ... }` — never `function` declarations
- Services wrap DB operations in `try/catch`. Re-throw domain errors (`NotFoundError`, `DuplicatedError`, etc.) directly. Wrap raw DB/infrastructure errors as `Error on <serviceName>: <message>` — this is what the unit test infrastructure tests assert against (`/Error on <fn>/`).
- Environment variable reads at module level always guard with `if (!varName) throw new Error(...)`
- No comments unless the WHY is non-obvious
- No `console.*` calls anywhere — all logging goes through `logger.ts`. `handleError` is the only caller of `logger` and it does so exactly once per failed request. Adding `logger.error` inside a service creates duplicate logs.
- Explicit return types on all functions (ESLint enforces this)
