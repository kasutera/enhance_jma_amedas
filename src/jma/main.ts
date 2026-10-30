import { initializeApplication } from './application'

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApplication, { once: true })
} else {
  initializeApplication()
}
