import { setRecaptchaVerifier } from './recaptcha.js'

setRecaptchaVerifier(async (token) => token === 'test-ok')
