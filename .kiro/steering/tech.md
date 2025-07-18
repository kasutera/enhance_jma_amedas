# Technology Stack

## Core Technologies

- **TypeScript** - Primary development language
- **Node.js 22** - Runtime environment (extends @tsconfig/node22)
- **ES2022 modules** - Module system
- **Rollup** - Build system and bundler
- **Jest** - Testing framework with jsdom environment
- **Biome** - Code formatting and linting

## Build System

- **Rollup** with TypeScript plugin for bundling
- **userscript-metadata** for generating userscript headers
- Builds both production (`*.user.js`) and development (`*.dev.user.js`) versions
- Automatic cleanup and formatting post-build

## Development Tools

- **Biome** - Unified formatter and linter
- **Lefthook** - Git hooks for pre-commit checks
- **Jest** with jsdom for DOM testing
- **TypeScript** strict configuration

## Common Commands

```bash
# Development (watch mode)
npm run dev

# Build production version
npm run build

# Run tests
npm run test

# Format code
npm run format

# Clean build artifacts
npm run clean

# Install git hooks
npx lefthook install
```

## Code Quality

- Coverage reporting enabled
- Pre-commit hooks with lefthook
- Biome formatting with 2-space indentation, 100 character line width
- Single quotes, trailing commas, semicolons as needed
