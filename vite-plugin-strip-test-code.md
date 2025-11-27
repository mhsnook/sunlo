# Vite Plugin: Strip Test Code

A Vite plugin that strips test code from production builds, allowing you to co-locate test helpers with application code.

## Quick Start

### 1. Add the plugin to your Vite config

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import { stripTestCode } from './vite-plugin-strip-test-code'

export default defineConfig({
  plugins: [
    // Add BEFORE other plugins
    stripTestCode({
      enabled: process.env.NODE_ENV === 'production',
      verbose: true // Set to true to see what's being stripped
    }),
    // ... other plugins
  ]
})
```

### 2. Write test helpers with `.spec.ts` extension

```typescript
// src/routes/learn/index.spec.ts
export function expectCorrectAnswer(answer: string) {
  console.log('[TEST] Checking answer:', answer)
  // ... test logic
}

// Expose for Playwright
if (typeof window !== 'undefined') {
  window.__learnHelpers = { expectCorrectAnswer }
}
```

### 3. Import and use in your application

```typescript
// src/routes/learn/index.tsx
import { expectCorrectAnswer } from './index.spec'

export function LearnRoute() {
  const handleAnswer = (answer: string) => {
    // This works in dev, stripped in production
    expectCorrectAnswer(answer)

    // Your regular app logic
    submitAnswer(answer)
  }

  return <AnswerForm onSubmit={handleAnswer} />
}
```

### 4. Build and verify

```bash
# Development - test code is included
pnpm dev
# Open console, you'll see [TEST] logs

# Production - test code is stripped
pnpm build
# Search the bundle, test code is gone
grep -r "expectCorrectAnswer" dist/
# No results!
```

## Testing the Demo

This repo includes a demo component to test the plugin:

1. **Add the plugin to vite.config.ts** (see Quick Start above)

2. **Import the demo component somewhere visible** (optional):
   ```typescript
   // src/main.tsx or any route
   import { DemoComponent } from './demo-component'

   // Render it somewhere
   <DemoComponent />
   ```

3. **Run in dev mode**:
   ```bash
   pnpm dev
   ```
   - Click the "Run Test" button
   - Open browser console
   - You should see: `[TEST] Checking: 15 === 15`
   - You should see: `✓ Passed` messages

4. **Build for production**:
   ```bash
   pnpm build
   ```

5. **Verify test code is stripped**:
   ```bash
   # Should find nothing
   grep -r "demoExpect" dist/
   grep -r "demo-test-helpers" dist/
   grep -r "\[TEST\]" dist/

   # Check bundle size
   ls -lh dist/assets/*.js
   ```

6. **Preview production build** (optional):
   ```bash
   pnpm preview
   ```
   - Click the button
   - No test logs in console
   - But the alert still works (that's app code, not test code)

## Configuration Options

```typescript
interface StripTestCodeOptions {
  /** Enable the plugin (default: true in production, false otherwise) */
  enabled?: boolean

  /** File patterns to identify as test code */
  patterns?: string[]
  // Default: ['**/*.spec.ts', '**/*.spec.tsx', '**/*.test.ts', '**/*.test.tsx']

  /** Log what's being stripped (default: false) */
  verbose?: boolean
}
```

### Custom Patterns

```typescript
stripTestCode({
  patterns: [
    '**/*.spec.ts',
    '**/*.spec.tsx',
    '**/test-runtime-helpers.ts', // Include specific files
    '**/*.e2e.ts'
  ]
})
```

## How It Works

The plugin operates in three phases:

1. **File Exclusion** - During `load()` hook, test files return empty code
2. **Import Removal** - During `transform()` hook, imports from test files are removed
3. **Call Removal** - Function calls to imported test functions are stripped

## Current Limitations

This is a minimal implementation using regex-based transformations:

- ✅ Removes simple imports: `import { foo } from './file.spec'`
- ✅ Removes simple function calls: `foo(arg1, arg2)`
- ✅ Removes side-effect imports: `import './file.spec'`
- ⚠️ May not handle complex nested calls perfectly
- ⚠️ Doesn't use AST parsing (intentionally kept simple)

For production use, you'd want:
- Full AST parsing (Babel/SWC)
- Better handling of spread operators, destructuring
- Source map support
- More robust pattern matching

## Migrating Your Existing Code

If you have existing test helpers like `test-runtime-helpers.ts`:

### Before
```typescript
// src/test-runtime-helpers.ts
if (import.meta.env.DEV || import.meta.env.MODE === 'test') {
  window.__helpers = something
}

// src/main.tsx
import 'test-runtime-helpers' // Still in bundle, just conditional
```

### After
```typescript
// src/test-runtime-helpers.spec.ts (renamed!)
// No if statement needed - entire file is stripped!
window.__helpers = something

// src/main.tsx
import 'test-runtime-helpers.spec' // Completely removed in prod
```

## Troubleshooting

**Test code still in production bundle?**
- Check that `enabled: true` is set for production builds
- Verify file has `.spec.ts` or `.test.ts` extension
- Run with `verbose: true` to see what's being processed

**Import errors in production?**
- The imports will be removed, but TypeScript might complain
- This is expected - the code is only meant to run in dev/test

**Bundle size didn't decrease?**
- Check with `verbose: true` to confirm files are being stripped
- Use `grep -r "testFunctionName" dist/` to verify removal

## Next Steps

Once this basic version works, you can extend it to:
- Add AST-based transformation for more robust stripping
- Integrate with Playwright for inline test assertions
- Support `expect.server()` calls for server-side checks
- Add source map support

## Files Created

- `/vite-plugin-strip-test-code.ts` - The plugin implementation
- `/src/demo-test-helpers.spec.ts` - Demo test helper functions
- `/src/demo-component.tsx` - Demo component using test helpers
- `/vite-plugin-strip-test-code.md` - This documentation
