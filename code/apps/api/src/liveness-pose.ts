import { randomInt } from 'node:crypto'

/**
 * Random pose for the liveness selfie (staff review console, Fay 2026-10-22 "Human review + random pose").
 * Simple gestures that need no reading skill; the member screen shows each with a pictogram.
 * The ids are also the database check list (`verification_record.pose`, `liveness_challenge.pose`).
 */
export const LIVENESS_POSES = [
  'raise_right_hand',
  'touch_left_ear',
  'look_left',
  'hand_on_chin',
  'thumbs_up',
  'two_fingers',
] as const

export type LivenessPose = (typeof LIVENESS_POSES)[number]

/** French copy, shown to the member and to the Moderator. */
export const POSE_LABEL: Record<LivenessPose, string> = {
  raise_right_hand: 'Levez la main droite',
  touch_left_ear: 'Touchez votre oreille gauche',
  look_left: 'Regardez vers la gauche',
  hand_on_chin: 'Posez la main sous le menton',
  thumbs_up: 'Levez le pouce',
  two_fingers: 'Montrez deux doigts',
}

export const CHALLENGE_TTL_MS = 10 * 60 * 1000

export function isLivenessPose(value: unknown): value is LivenessPose {
  return typeof value === 'string' && (LIVENESS_POSES as readonly string[]).includes(value)
}

/** Crypto RNG, uniform over the list. `pick` is a test seam. */
export function pickPose(pick: (max: number) => number = randomInt): LivenessPose {
  const index = pick(LIVENESS_POSES.length)
  const pose = LIVENESS_POSES[index]
  if (pose === undefined) {
    throw new Error('pose index out of range')
  }
  return pose
}
