# Code Standards

This project uses **Ultracite** + self code standards

## Core Principles

Write code that is **accessible, performant, type-safe, and maintainable**. Focus on clarity and explicit intent over brevity.

### Type Safety & Explicitness

- Use explicit types for function parameters and return values when they enhance clarity
- Prefer `unknown` over `any` when the type is genuinely unknown
- Use const assertions (`as const`) for immutable values and literal types
- Leverage TypeScript's type narrowing instead of type assertions
- Use meaningful variable names instead of magic numbers - extract constants with descriptive names

### Modern JavaScript/TypeScript

- Use arrow functions for callbacks and short functions
- Prefer `for...of` loops over `.forEach()` and indexed `for` loops
- Use optional chaining (`?.`) and nullish coalescing (`??`) for safer property access
- Prefer template literals over string concatenation
- Use destructuring for object and array assignments
- Use `const` by default, `let` only when reassignment is needed, never `var`

### Async & Promises

- Always `await` promises in async functions - don't forget to use the return value
- Use `async/await` syntax instead of promise chains for better readability
- Handle errors appropriately in async code with try-catch blocks
- Don't use async functions as Promise executors

### React & JSX

- Use function components over class components
- Call hooks at the top level only, never conditionally
- Specify all dependencies in hook dependency arrays correctly
- Use the `key` prop for elements in iterables (prefer unique IDs over array indices)
- Nest children between opening and closing tags instead of passing as props
- Don't define components inside other components
- Use semantic HTML and ARIA attributes for accessibility:
  - Provide meaningful alt text for images
  - Use proper heading hierarchy
  - Add labels for form inputs
  - Include keyboard event handlers alongside mouse events
  - Use semantic elements (`<button>`, `<nav>`, etc.) instead of divs with roles

### Error Handling & Debugging

- Remove `console.log`, `debugger`, and `alert` statements from production code
- Throw `Error` objects with descriptive messages, not strings or other values
- Use `try-catch` blocks meaningfully - don't catch errors just to rethrow them
- Prefer early returns over nested conditionals for error cases

### Code Organization

- Keep functions focused and under reasonable cognitive complexity limits
- Extract complex conditions into well-named boolean variables
- Use early returns to reduce nesting
- Prefer simple conditionals over nested ternary operators
- Group related code together and separate concerns

### Security

- Add `rel="noopener"` when using `target="_blank"` on links
- Avoid `dangerouslySetInnerHTML` unless absolutely necessary
- Don't use `eval()` or assign directly to `document.cookie`
- Validate and sanitize user input

### Performance

- Avoid spread syntax in accumulators within loops
- Use top-level regex literals instead of creating them in loops
- Prefer specific imports over namespace imports
- Avoid barrel files (index files that re-export everything)
- Use proper image components (e.g., Next.js `<Image>`) over `<img>` tags

### Framework-Specific Guidance

**React 19+:**

- Use ref as a prop instead of `React.forwardRef`

---

## Testing

This repository uses Vitest through Vite Plus. Test files live under
`apps/**/__test__/` and `packages/**/__test__/`.

### Commands

```sh
# Run complete suite with deterministic test environment
bun run test

# Run tests continuously
bun run test:watch

# Run one suite or file
bun run test -- packages/api/src/__test__/router.test.ts
```

Test environment values are configured in `vite.config.ts`; do not require
developers to export local secrets or service credentials before running tests.
Component tests opt into `jsdom` with the `@vitest-environment jsdom` file
annotation.

### Test design

- Test behavior through public seams: `createApp().handle()`,
  `createAppRouter()` with `call()`, exported package functions, rendered
  components, and authentication adapters.
- Confirm the seam before adding a test. Do not test private procedures,
  feature-router constructors, ORM method chains, or implementation-only DOM
  attributes.
- Use plain fakes for repositories and other owned collaborators. Mock only
  system boundaries such as S3, Better Auth, time, randomness, or browser APIs.
- Assert independent expected values and user-visible outcomes. Do not
  recompute expected results with the same algorithm as production code.
- Keep tests focused and reasonably flat. Name tests after observable behavior,
  not implementation mechanics.
- Write assertions inside `it()` or `test()` blocks. Use `async`/`await`, never
  done callbacks. Do not commit `.only` or `.skip` tests.

### TDD loop

- Red before green: write one failing behavior test, then make the smallest
  implementation change needed to pass it.
- Work one vertical slice at a time; avoid writing a bulk test suite before
  implementation.
- Refactor only after behavior is green, preserving the public-seam contract.

### Verification

After test changes, run the targeted suite, then the complete suite and relevant
checks:

```sh
bun run test
bun x vp check <changed-paths>
bun x tsc -b packages/api/tsconfig.json apps/server/tsconfig.json packages/s3/tsconfig.json --pretty false
git diff --check
```

## When Oxlint + Oxfmt Can't Help

Oxlint + Oxfmt's linter will catch most issues automatically. Focus your attention on:

1. **Business logic correctness** - Oxlint + Oxfmt can't validate your algorithms
2. **Meaningful naming** - Use descriptive names for functions, variables, and types
3. **Architecture decisions** - Component structure, data flow, and API design
4. **Edge cases** - Handle boundary conditions and error states
5. **User experience** - Accessibility, performance, and usability considerations
6. **Documentation** - Add comments for complex logic, but prefer self-documenting code

## Seed workflow

Run `bun run db:seed:auth` before `bun run db:seed:dev`. Auth creates local
accounts; development fixtures add registration data without changing credentials.

## Seed workflow

Run `bun run db:seed:auth` before `bun run db:seed:dev`. Auth creates local
accounts; development fixtures add registration data without changing credentials.
