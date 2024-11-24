import type { Config } from 'jest'

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts'
  ],
  transformIgnorePatterns: ['/node_modules']
  // setupFiles: ['./jest.setup.js']
}

export default config
