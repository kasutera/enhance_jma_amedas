import type { Config } from 'jest'

const config: Config = {
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
  },
  testEnvironment: 'jsdom',
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.ts'
  ],
  transformIgnorePatterns: ['/node_modules']
  // setupFiles: ['./jest.setup.js']
}

export default config
