/**
 * Member side of the random-pose selfie (staff review console). The pose ids and French labels mirror
 * `apps/api/src/liveness-pose.ts`; `liveness-pose-ui.test.ts` fails if they drift apart.
 * Each pictogram is a small inline SVG (no network, works on 2G), decorative next to the written label.
 */

export const POSE_LABEL: Record<string, string> = {
  raise_right_hand: 'Levez la main droite',
  touch_left_ear: 'Touchez votre oreille gauche',
  look_left: 'Regardez vers la gauche',
  hand_on_chin: 'Posez la main sous le menton',
  thumbs_up: 'Levez le pouce',
  two_fingers: 'Montrez deux doigts',
}

const STROKE = 'fill="none" stroke="#0B1D36" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"'
const GOLD = 'fill="none" stroke="#C9A86C" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"'
const HEAD = `<circle cx="24" cy="17" r="7" ${STROKE}/><path d="M11 44c1-9 6-14 13-14s12 5 13 14" ${STROKE}/>`

/** 48 by 48 pictograms. Gold marks the gesture. "Right" and "left" are the member's own. */
export const POSE_PICTO: Record<string, string> = {
  raise_right_hand: `${HEAD}<path d="M14 33 L9 20 L9 8" ${GOLD}/><path d="M6.5 10 L9 6.5 L11.5 10" ${GOLD}/>`,
  touch_left_ear: `${HEAD}<path d="M36 40 C40 32 39 22 33 17" ${GOLD}/><circle cx="32" cy="17" r="1.8" fill="#C9A86C"/>`,
  look_left: `<circle cx="24" cy="17" r="7" ${STROKE}/><path d="M11 44c1-9 6-14 13-14s12 5 13 14" ${STROKE}/><path d="M36 17 H45 M41 13 L45 17 L41 21" ${GOLD}/><circle cx="27" cy="16" r="1.4" fill="#0B1D36"/>`,
  hand_on_chin: `${HEAD}<path d="M15 38 C17 30 20 27 24 26 C27 26 28 27 28 28" ${GOLD}/>`,
  thumbs_up: `<path d="M14 22 H20 V42 H14 Z" ${STROKE}/><path d="M20 24 L27 12 C29 8 33 9 32 14 L30 21 H38 C41 21 42 24 41 27 L38 39 C37 41 36 42 33 42 H20" ${GOLD}/>`,
  two_fingers: `<path d="M17 44 V30 C17 27 19 25 22 25 H30 C33 25 34 27 34 30 V44" ${STROKE}/><path d="M21 25 L17 8 M27 25 L31 8" ${GOLD}/><path d="M28 25 V20 M33 26 V22" ${STROKE}/>`,
}

export function poseSvg(pose: string): string {
  const body = POSE_PICTO[pose]
  if (!body) {
    return ''
  }
  return `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true" focusable="false">${body}</svg>`
}

/** The Moderator's reason category, in plain French for the member (no note, never a payment). */
export const MEMBER_REJECT_REASON: Record<string, string> = {
  unreadable: 'la photo de la pièce est illisible',
  not_an_id: "le document envoyé n'est pas une pièce d'identité",
  mismatch: 'le nom ou le visage ne correspond pas',
  expired: 'la pièce est expirée',
  pose_not_done: "le geste demandé n'apparaît pas sur le selfie",
  not_same_person: 'le visage ne correspond pas à la pièce ou aux photos du profil',
  photo_of_photo: "le selfie semble être la photo d'une photo ou d'un écran",
  unclear: "le selfie n'est pas assez net",
}

export const ID_REJECTED_TEXT = "Votre pièce d'identité n'a pas été acceptée"
export const ID_RETAKE_TEXT = "Envoyez une nouvelle photo de votre pièce avec le bouton « Remplacer »."
export const LIVE_REJECTED_TEXT = "Votre selfie n'a pas été accepté"
export const LIVE_RETAKE_TEXT = 'Reprenez le selfie en faisant le nouveau geste demandé.'
export const HELD_TEXT =
  "Votre compte est en attente d'une vérification complémentaire. Aucune action n'est demandée pour le moment."
export const POSE_EXPIRED_TEXT = 'Le geste a expiré. Reprenez le selfie avec le nouveau geste.'
export const POSE_UNAVAILABLE_TEXT = "Le geste à faire n'a pas pu être chargé. Réessayez."

const NOTICE =
  'hidden w-full min-w-0 whitespace-normal break-words text-xs text-[#9B2C2C] font-medium p-3 rounded-md border border-[#9B2C2C]/30 bg-[#9B2C2C]/5'

/** Under the ID step: the reason the ID was refused, and what to do. */
export const ID_REJECT_NOTICE = `<p class="${NOTICE}" data-testid="id-reject" id="id-reject" role="status"></p>`

/** Above the camera: the pose to perform, its pictogram, and the countdown. */
export const POSE_CARD = `<p class="${NOTICE}" data-testid="live-reject" id="live-reject" role="status"></p>
<div class="hidden w-full min-w-0 flex items-center gap-3 p-3 rounded-md border border-soft-gold/60 bg-soft-gold/10" data-testid="pose-card" id="pose-card">
<span class="w-14 h-14 shrink-0 rounded-md bg-cream border border-hairline flex items-center justify-center" id="pose-picto"></span>
<div class="min-w-0">
<p class="text-[11px] font-semibold uppercase tracking-wider text-deep-navy/75">Geste demandé pour le selfie</p>
<p class="text-sm font-semibold text-deep-navy break-words" data-testid="pose-label" id="pose-label" aria-live="polite"></p>
<p class="text-[11px] text-deep-navy/75 break-words">Faites ce geste face à la caméra au moment de la photo.</p>
<p class="hidden text-xs font-semibold text-deep-navy" id="pose-countdown" aria-live="assertive"></p>
</div>
</div>`

export const HELD_NOTICE = `<p class="hidden w-full min-w-0 whitespace-normal break-words text-xs text-deep-navy font-medium p-3 rounded-md border border-hairline bg-cream" data-testid="id-held" id="id-held" role="status">${HELD_TEXT}</p>`
