# Vite Plugin: Strip Test Code

A pragmatic Vite plugin that allows co-locating test helpers with application code and completely strips them from production builds.

## Current Pattern

You already have test runtime helpers that conditionally run:

```typescript
// src/test-runtime-helpers.ts
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  window.__phrasesCollection = phrasesCollection
  // ...
}
```

```typescript
// src/main.tsx
import 'test-runtime-helpers' // ← This still loads the file in production!
```

**Problem:** Even with conditional logic, the file is still bundled, imports are resolved, and unused code may remain.

## Proposed Solution

A Vite plugin that:

1. **Identifies test files** by pattern (`.spec.ts`, `.test.ts`, or user-defined patterns)
2. **Tracks imports** from these test files in application code
3. **Strips everything** - removes imports, function calls, and the files themselves from production builds

## Usage Example

### 1. Co-locate test helpers with routes

```
src/
  routes/
    learn/
      index.tsx           # Route component
      index.spec.ts       # Test helpers for this route
  test-runtime-helpers.ts # Global test helpers
  main.tsx
```

### 2. Write test helpers alongside app code

```typescript
// src/routes/learn/index.spec.ts
export function expectCorrectAnswerFlow(userAnswer: string, correctAnswer: string) {
  expect(userAnswer).toBe(correctAnswer)

  // Server-side check
  expect.server(async (data) => {
    const card = await server.db.cards.findFirst({ where: { id: data.cardId }})
    expect(card.last_reviewed_at).toBeTruthy()
  }, { cardId: '...' })
}

// Expose helpers to window for Playwright
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  window.__learnHelpers = { expectCorrectAnswerFlow }
}
```

### 3. Import and use in application code

```typescript
// src/routes/learn/index.tsx
import { expectCorrectAnswerFlow } from './index.spec'

export function LearnRoute() {
  const handleAnswer = (answer: string) => {
    const isCorrect = checkAnswer(answer)

    // This call will be stripped in production
    expectCorrectAnswerFlow(answer, card.answer)

    if (isCorrect) {
      updateCardProgress()
    }
  }

  return <AnswerForm onSubmit={handleAnswer} />
}
```

### 4. In production, everything is stripped

```typescript
// src/routes/learn/index.tsx (PRODUCTION BUILD)
// import { expectCorrectAnswerFlow } from './index.spec' ← REMOVED

export function LearnRoute() {
  const handleAnswer = (answer: string) => {
    const isCorrect = checkAnswer(answer)

    // expectCorrectAnswerFlow(answer, card.answer) ← REMOVED

    if (isCorrect) {
      updateCardProgress()
    }
  }

  return <AnswerForm onSubmit={handleAnswer} />
}
```

## Plugin Configuration

```typescript
// vite.config.ts
import { stripTestCode } from 'vite-plugin-strip-test-code'

export default defineConfig({
  plugins: [
    stripTestCode({
      // When to strip (default: production only)
      enabled: process.env.NODE_ENV === 'production',

      // File patterns to identify as test code
      patterns: [
        '**/*.spec.ts',
        '**/*.spec.tsx',
        '**/*.test.ts',
        '**/test-runtime-helpers.ts'
      ],

      // Optional: specific functions/imports to strip even from non-test files
      stripFunctions: [
        'expect.server',
        'expect',
      ],

      // Optional: log what was stripped
      verbose: false
    })
  ]
})
```

## How It Works

### Phase 1: Identify Test Files

During the build, track all modules that match the test patterns:

```typescript
const testFiles = new Set<string>()

function isTestFile(id: string): boolean {
  return patterns.some(pattern => minimatch(id, pattern))
}
```

### Phase 2: Track Imports

Build a dependency graph of what gets imported from test files:

```typescript
const testImports = new Map<string, Set<string>>() // file -> imported identifiers

function resolveId(source: string, importer: string) {
  const resolved = // ... resolve the import
  if (isTestFile(resolved)) {
    testFiles.add(resolved)
  }
  return resolved
}
```

### Phase 3: Strip from AST

Use a transformer to remove:
- Import statements from test files
- Function calls to imported test functions
- The test files themselves from the bundle

```typescript
function transform(code: string, id: string) {
  if (isTestFile(id)) {
    // Don't include this file at all
    return { code: '', map: null }
  }

  // Parse and remove imports/calls from test files
  const ast = parse(code)
  const importedFromTests = new Set<string>()

  // Remove import declarations
  ast.body = ast.body.filter(node => {
    if (node.type === 'ImportDeclaration') {
      if (isTestFile(resolveImportPath(node.source.value))) {
        // Track what was imported
        node.specifiers.forEach(spec => {
          importedFromTests.add(spec.local.name)
        })
        return false // Remove this import
      }
    }
    return true
  })

  // Remove function calls to test functions
  walk(ast, {
    CallExpression(node) {
      if (isTestFunctionCall(node, importedFromTests)) {
        // Replace with undefined or remove statement
        this.remove()
      }
    }
  })

  return { code: generate(ast), map: null }
}
```

## Implementation Sketch

```typescript
// vite-plugin-strip-test-code.ts
import { Plugin } from 'vite'
import { parse } from '@babel/parser'
import traverse from '@babel/traverse'
import generate from '@babel/generator'
import { minimatch } from 'minimatch'

export interface StripTestCodeOptions {
  enabled?: boolean
  patterns?: string[]
  stripFunctions?: string[]
  verbose?: boolean
}

export function stripTestCode(options: StripTestCodeOptions = {}): Plugin {
  const {
    enabled = process.env.NODE_ENV === 'production',
    patterns = ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts'],
    stripFunctions = [],
    verbose = false
  } = options

  const testFiles = new Set<string>()
  const testImportMap = new Map<string, Set<string>>() // file -> imported test identifiers

  function isTestFile(id: string): boolean {
    if (!id) return false
    return patterns.some(pattern => minimatch(id, pattern))
  }

  return {
    name: 'strip-test-code',

    enforce: 'pre',

    resolveId(source, importer) {
      // Track test files during resolution
      if (!enabled) return null

      // Let Vite resolve the path first
      return null // continue to default resolution
    },

    load(id) {
      if (!enabled) return null

      // If this is a test file, return empty code
      if (isTestFile(id)) {
        if (verbose) {
          console.log(`[strip-test-code] Excluding test file: ${id}`)
        }
        return { code: '', map: null }
      }

      return null
    },

    transform(code, id) {
      if (!enabled) return null
      if (isTestFile(id)) return { code: '', map: null }

      // Parse and remove test-related code
      const ast = parse(code, {
        sourceType: 'module',
        plugins: ['typescript', 'jsx']
      })

      const importedTestIdentifiers = new Set<string>()
      let hasChanges = false

      // First pass: collect and remove test imports
      traverse(ast, {
        ImportDeclaration(path) {
          const importPath = path.node.source.value
          // Check if this import is from a test file
          // (In real implementation, properly resolve relative paths)
          if (patterns.some(p => importPath.includes(p.replace('**/', '').replace('.ts', '')))) {
            if (verbose) {
              console.log(`[strip-test-code] Removing import from ${importPath} in ${id}`)
            }
            path.node.specifiers.forEach(spec => {
              if (spec.type === 'ImportSpecifier' && spec.local) {
                importedTestIdentifiers.add(spec.local.name)
              }
            })
            path.remove()
            hasChanges = true
          }
        }
      })

      // Second pass: remove calls to imported test functions
      if (importedTestIdentifiers.size > 0) {
        traverse(ast, {
          CallExpression(path) {
            const callee = path.node.callee

            // Check if this is a call to an imported test function
            if (callee.type === 'Identifier' && importedTestIdentifiers.has(callee.name)) {
              if (verbose) {
                console.log(`[strip-test-code] Removing call to ${callee.name}() in ${id}`)
              }

              // Remove the entire statement if it's an expression statement
              if (path.parentPath.isExpressionStatement()) {
                path.parentPath.remove()
              } else {
                // Replace with undefined if used as expression
                path.replaceWith({ type: 'Identifier', name: 'undefined' })
              }
              hasChanges = true
            }
          }
        })
      }

      if (!hasChanges) return null

      const output = generate(ast, { retainLines: true })
      return { code: output.code, map: output.map }
    }
  }
}
```

## Benefits

1. **Co-location** - Test helpers live next to the code they test
2. **Zero runtime cost** - Completely removed from production (no if/else checks)
3. **Better DX** - Import and use test helpers naturally in app code
4. **Type safety** - TypeScript works normally in dev, no errors in production
5. **Simpler than conditional logic** - No need for `if (import.meta.env.DEV)` everywhere

## Example: Updating Your Current Code

### Before (current approach)

```typescript
// src/test-runtime-helpers.ts
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  window.__phrasesCollection = phrasesCollection
}
```

```typescript
// src/main.tsx
import 'test-runtime-helpers' // Still bundled, just conditional
```

### After (with plugin)

```typescript
// src/test-runtime-helpers.spec.ts (renamed to match pattern)
// No conditional needed - entire file is stripped!
window.__phrasesCollection = phrasesCollection
window.__cardsCollection = cardsCollection
// ...
```

```typescript
// src/main.tsx
import 'test-runtime-helpers.spec' // Completely removed in production
```

## Future: Playwright Integration

Once this plugin is working, we can extend it to work with Playwright:

1. **Inline expectations** - Write `expect()` calls in app code that get stripped in production
2. **Server-side checks** - `expect.server()` calls bridged to Node.js via Playwright
3. **Test orchestration** - Playwright specs just navigate and interact, inline expects validate

But let's start with just the stripping mechanism first!

## Next Steps

1. Build minimal version that strips `.spec.ts` files and their imports
2. Test with your existing `test-runtime-helpers.ts` → `test-runtime-helpers.spec.ts`
3. Expand to track and remove function calls
4. Add proper source map support
5. Handle edge cases (dynamic imports, re-exports, etc.)

---

Would you like me to start building a minimal working version of this plugin?
