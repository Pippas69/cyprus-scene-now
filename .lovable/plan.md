

## Plan: Set Up Unit Testing Framework and Write Initial Tests

### Overview
Set up Vitest testing infrastructure from scratch and write unit tests for the project's core utility libraries. These are pure-logic files with no UI dependencies, making them ideal starting points.

### Step 1 — Install testing dependencies
Add to `devDependencies`:
- `vitest` ^3.2.4
- `@testing-library/jest-dom` ^6.6.0
- `@testing-library/react` ^16.0.0
- `jsdom` ^20.0.3

### Step 2 — Create test configuration files
- **`vitest.config.ts`** — Vitest config with jsdom environment, globals, setup file, and `@/` alias
- **`src/test/setup.ts`** — Jest-DOM matchers + `matchMedia` mock
- **`tsconfig.app.json`** — Add `"vitest/globals"` to types array

### Step 3 — Write unit tests for core utility files

| Test file | Module under test | What's tested |
|---|---|---|
| `src/lib/__tests__/boostWindow.test.ts` | `boostWindow.ts` | Daily/hourly window computation, deactivation capping, timezone normalization, `isTimestampWithinWindow` |
| `src/lib/__tests__/businessRanking.test.ts` | `businessRanking.ts` | Plan tier indexing, plan slug mapping, city distance lookup, sort order (Elite manual order, plan hierarchy, proximity) |
| `src/lib/__tests__/phoneValidation.test.ts` | `phoneValidation.ts` | Valid/invalid phone formats, digit counting, edge cases (8-15 digits) |
| `src/lib/__tests__/eventVisibility.test.ts` | `eventVisibility.ts` | Paused event detection via 1970 sentinel year |
| `src/lib/__tests__/reservationValidation.test.ts` | `reservationValidation.ts` | Schema validation for names, party size, phone, special requests |

### Step 4 — Run all tests and verify they pass

### Technical details
- Tests use `describe`/`it`/`expect` from Vitest globals
- No mocking needed — all target files are pure functions
- Test files placed in `__tests__/` subdirectories alongside source

