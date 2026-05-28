---
name: new-lambda
description: Use this skill when the user wants to create a new Lambda function. Triggers on phrases like "create a lambda", "new lambda", "add lambda", "nueva lambda", "/new-lambda". Scaffolds the complete directory structure following project conventions.
argument-hint: <LambdaName> [--method <GET|POST|DELETE>]
allowed-tools: [Read, Write, Edit, Glob, Bash]
---

# New Lambda Scaffold

Scaffold a complete Lambda function following project conventions.

The user invoked this with: $ARGUMENTS

## Step 1 — Gather requirements

Parse the arguments. If `LambdaName` is missing, ask for it. If `--method` is missing, default to POST.

Then ask the user:

1. **Request body fields**: names, types (`string | boolean | number`), and whether they are required
2. **Response fields**: any extra fields returned on success beyond `message`
3. **Environment variables needed**: e.g. `DB_SECRET_ARN`, `TABLE_NAME`
4. **Brief description** of what the lambda does (used for test setup)

Do NOT proceed to file generation until you have all answers.

---

## Step 2 — Validate name

- `LambdaName` must be camelCase starting with a verb, e.g. `registerUser`, `getEmployee`, `deleteSession`
- The directory will be `lambdas/<LambdaName>/`
- Refuse if the directory already exists

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
├── tests/unit/
│   └── app.test.ts
├── jest.config.ts
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

const DB_SECRET_ARN = process.env.DB_SECRET_ARN
if (!DB_SECRET_ARN) throw new Error('DB_SECRET_ARN is not set')

export const lambdaHandler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyStructuredResultV2> => {
  try {
    const body = validateBody(event.body ?? '')

    // --- business logic ---

    return createResponse(201, { message: 'Success' })
  } catch (e) {
    return handleError(e)
  }
}
```

Replace env var guards with whatever vars the lambda actually needs.

---

### `utils/validators.ts` template

```typescript
import { z } from 'zod'
import { ValidationError } from '../../../shared/constants/errors'
import type { RequestBody } from '../types/RequestBody'

const schema = z.object({
  // fields from requirements
})

export function validateBody(rawBody: string): RequestBody {
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

The shared `handleError` generates an 8-hex-char errorID via `shake128`, logs it, and maps errors to `internalStatusCode`:

```typescript
import crypto from 'crypto'
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { AuthError, DuplicatedError, NotFoundError, ValidationError } from '../constants/errors'

const HEADERS = { 'Content-Type': 'application/json' } as const

const createErrorId = (): string =>
  crypto.createHash('shake128', { outputLength: 4 }).update(`${Date.now()}${Math.random()}`).digest('hex')

export function handleError(error: unknown): APIGatewayProxyStructuredResultV2 {
  const errorId = createErrorId()
  console.error(`Error ID: ${errorId} - ${error}`)

  let internalStatusCode: number
  switch (true) {
    case error instanceof ValidationError:
      internalStatusCode = 702
      break
    case error instanceof AuthError:
      internalStatusCode = 703
      break
    case error instanceof NotFoundError:
      internalStatusCode = 705
      break
    case error instanceof DuplicatedError:
      internalStatusCode = 709
      break
    default:
      internalStatusCode = 708
      break
  }

  return {
    statusCode: 200,
    headers: HEADERS,
    body: JSON.stringify({ polaris: internalStatusCode, neptune: errorId }),
  }
}
```

Error codes: `702` validation, `703` auth, `705` not found, `708` generic, `709` duplicate.

---

### `types/RequestBody.d.ts` template

```typescript
export type RequestBody = {
  // fields derived from requirements
}
```

---

### `tests/unit/app.test.ts` template

```typescript
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { lambdaHandler } from '../../app'

const mockEvent: any = {
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    // valid sample body matching RequestBody
  }),
  isBase64Encoded: false,
}

describe('Unit test for app handler', function () {
  beforeAll(() => {
    jest.clearAllMocks()
    process.env.DB_SECRET_ARN = 'arn:aws:secretsmanager:us-east-1:123456789:secret:dev'
    // Add other required env vars here
  })

  it('should respond with 201 when everything is successful', async () => {
    const result: APIGatewayProxyStructuredResultV2 = await lambdaHandler(mockEvent)
    expect(result.statusCode).toBe(201)
  })
})
```

Fill in the actual env vars and a valid sample body.

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
    "test": "npm run compile && npm run unit"
  },
  "dependencies": {}
}
```

---

## Step 4 — Register in template.yaml

After creating all files, add the Lambda resource to `template.yaml` following the existing pattern. Key sections to add:

1. **Lambda function resource** under `Resources:` — copy an existing similar Lambda block and adapt:
   - `FunctionName`
   - `Handler` path
   - `Events` (API Gateway path and method)
   - `Environment` → `Variables` (add required env vars)
   - `Policies` (add as needed)

2. **API Gateway event** path convention: `/api/{entity}/{action}` e.g. `/api/user/register`

Show the user the exact YAML block to add and its location in `template.yaml` before writing it — wait for confirmation.

---

## Step 5 — Summary

After all files are created, print:

```
Lambda `<LambdaName>` created:
  lambdas/<LambdaName>/       ← all source files
  template.yaml               ← resource block added (pending confirmation)

Next steps:
  cd lambdas/<LambdaName> && npm test    ← compile + unit test
  pnpm build                             ← sam build
```

---

## Code conventions (always enforce)

- Every service function wraps its body in `try/catch`, rethrows custom errors (`ValidationError`, `NotFoundError`, `DuplicatedError`, `AuthError`) as-is, wraps unknown errors as `new Error("Error on <functionName>: " + e)`
- Environment variable reads at module level always guard with `if (!varName) throw new Error(...)`
- No comments unless the WHY is non-obvious
- No trailing whitespace, no `console.log` (use `console.error` only in `handleError`)
- Explicit return types on all functions (ESLint enforces this)
