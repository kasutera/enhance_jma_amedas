# Project Structure

## Root Structure

```text
├── src/                    # Source code
├── dist/                   # Built userscripts
├── coverage/               # Test coverage reports
├── docs/                   # Documentation and screenshots
├── node_modules/           # Dependencies
└── config files            # Build and tool configurations
```

## Source Code Organization (`src/`)

- **Entry point**: `src/jma/main.ts` - Main application entry
- **Modular architecture**: Separate modules for different table types
- **Feature modules**: `areastable/` and `seriestable/` subdirectories
- **Development entry**: `src/dev.ts` - Development mode entry point

## Feature Module Structure

Each feature module (areastable, seriestable) follows consistent organization:

```text
src/jma/{feature}/
├── {feature}_main.ts       # Feature entry point
├── dom_handler.ts          # DOM manipulation logic
├── dom_generators.ts       # HTML generation utilities
├── jma_amedas_fetcher.ts   # Data fetching logic
├── presentation.ts         # Data presentation layer
├── *.test.ts              # Unit tests
└── testcases/             # Test fixtures and data
```

## Shared Components (`src/jma/`)

- `jma_urls.ts` - URL construction utilities
- `latest_amedas_date.ts` - Date handling
- `math.ts` - Mathematical calculations
- `manifest.json` - Userscript metadata

## Build Output (`dist/`)

- `jma.user.js` - Production userscript
- `jma.dev.user.js` - Development userscript with hot reload

## Testing Structure

- Tests co-located with source files (`*.test.ts`)
- Test fixtures in `testcases/` subdirectories
- HTML fixtures for DOM testing
- JSON fixtures for API response testing

## Configuration Files

- `rollup.config.ts` - Build configuration
- `jest.config.ts` - Test configuration  
- `tsconfig.json` - TypeScript configuration
- `biome.jsonc` - Code formatting/linting rules
