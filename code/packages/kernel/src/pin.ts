/** Digits in a shared-device PIN. Stitch 10-pin-lock shows six slots; Fay chose six on 2026-10-22. */
export const PIN_LENGTH = 6

/** PINs saved before the six-digit rule. Unlock still accepts one until the member sets a new PIN. */
export const LEGACY_PIN_LENGTH = 4

/** Refusal for a new PIN that is not PIN_LENGTH digits. The API sends it and the PIN screen shows it. */
export const PIN_SET_LENGTH_MESSAGE = 'pin : six chiffres sont requis.'

/** Refusal for an unlock attempt that is neither PIN_LENGTH nor LEGACY_PIN_LENGTH digits. */
export const PIN_UNLOCK_LENGTH_MESSAGE = 'pin : quatre ou six chiffres sont requis.'
