---
inclusion: always
---

# Project Structure & Architecture

## Root Directory Layout

```text
├── src/                    # TypeScript source code
├── dist/                   # Built userscripts (production ready)
├── coverage/               # Jest test coverage reports
├── docs/                   # Documentation and screenshots
├── .kiro/                  # Kiro IDE configuration
└── config files            # Build and development tools
```

## Core Architecture (`src/jma/`)

**Entry Points:**

- `main.ts` - Production userscript entry point
- `dev.ts` - Development mode with hot reload

**Shared Utilities:**

- `jma_urls.ts` - JMA API URL construction
- `latest_amedas_date.ts` - Date/time handling for weather data
- `math.ts` - Meteorological calculations (humidity, dew point)
- `manifest.json` - Userscript metadata and permissions

## Feature Module Pattern

Each weather table type follows consistent modular architecture:

```text
src/jma/{feature}/
├── {feature}_main.ts       # Module entry point and initialization
├── dom_handler.ts          # DOM manipulation and table modification
├── dom_generators.ts       # HTML element generation utilities
├── jma_amedas_fetcher.ts   # Weather data API integration
├── presentation.ts         # Data formatting and display logic
├── *.test.ts              # Unit tests (co-located)
└── testcases/             # Test fixtures and mock data
```

**Current Feature Modules:**

- `areastable/` - Regional weather data tables
- `seriestable/` - Time series weather data tables
- `color_scale/` - Weather data visualization and coloring

## Development Rules

**File Organization:**

- Tests must be co-located with source files (`*.test.ts`)
- Test fixtures in dedicated `testcases/` subdirectories
- HTML fixtures for DOM testing, JSON for API mocking

**Module Dependencies:**

- Feature modules should be self-contained
- Shared utilities in `src/jma/` root only
- No circular dependencies between feature modules

**Naming Conventions:**

- Feature directories: lowercase with underscores
- Main files: `{feature}_main.ts` pattern
- Test files: `{source}.test.ts` pattern

## Build System

**Output Files:**

- `dist/jma.user.js` - Production userscript (minified)
- `dist/jma.dev.user.js` - Development version (with source maps)

**Configuration:**

- `rollup.config.ts` - Build pipeline and bundling
- `jest.config.ts` - Test runner configuration
- `tsconfig.json` - TypeScript compiler settings
- `biome.jsonc` - Code formatting and linting rules

## Testing Strategy

- **Unit Tests**: Logic and calculation functions
- **DOM Tests**: HTML manipulation and generation
- **Integration Tests**: API data processing
- **Fixture-Based**: Realistic JMA website HTML structures
