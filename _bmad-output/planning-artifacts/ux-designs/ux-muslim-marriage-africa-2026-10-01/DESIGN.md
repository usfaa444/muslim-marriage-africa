---
name: TBD
description: Burkina-first honorable ta'aruf visual system. Solemn marriage path, not a dating app. Product name undecided.
status: final
updated: 2026-10-02
sources:
  - ../../prds/prd-muslim-marriage-africa-2026-09-27/prd.md
  - ../../prds/prd-muslim-marriage-africa-2026-09-27/addendum.md
  - ../../architecture/architecture-muslim-marriage-africa-2026-09-27/ARCHITECTURE-SPINE.md
  - ../../architecture/architecture-muslim-marriage-africa-2026-09-27/SOLUTION-DESIGN.md
  - ../../briefs/brief-muslim-marriage-africa-2026-09-27/brief.md
colors:
  surface-sand: '#F4EDE0'
  surface-raised: '#FFFBF4'
  surface-indigo: '#15283F'
  ink-primary: '#1B2433'
  ink-secondary: '#5C5346'
  ink-on-indigo: '#F4EDE0'
  indigo: '#1F3A5F'
  indigo-deep: '#15283F'
  gold: '#C4A35A'
  gold-soft: '#E8D5A3'
  mihrab: '#2C4A6E'
  border-hairline: '#D9CDB8'
  border-strong: '#6F624C'
  focus-ring: '#1F3A5F'
  blur-wash: '#C8BBA6'
  danger: '#8B3A3A'
  danger-soft: '#F3E0DC'
  success: '#3D5C45'
  success-soft: '#DCE6DE'
  staff: '#6B3D2E'
  staff-soft: '#EFE4DC'
  disabled: '#B5A894'
typography:
  display:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: 28px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: '-0.01em'
  title:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: 22px
    fontWeight: '600'
    lineHeight: '1.25'
  heading:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: 18px
    fontWeight: '600'
    lineHeight: '1.3'
  body:
    fontFamily: 'Source Sans 3, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  body-strong:
    fontFamily: 'Source Sans 3, system-ui, sans-serif'
    fontSize: 16px
    fontWeight: '600'
    lineHeight: '1.5'
  meta:
    fontFamily: 'Source Sans 3, system-ui, sans-serif'
    fontSize: 13px
    fontWeight: '500'
    lineHeight: '1.4'
    letterSpacing: '0.01em'
  caption:
    fontFamily: 'Source Sans 3, system-ui, sans-serif'
    fontSize: 12px
    fontWeight: '400'
    lineHeight: '1.4'
rounded:
  sm: 6px
  md: 12px
  lg: 20px
  full: 9999px
spacing:
  '1': 4px
  '2': 8px
  '3': 12px
  '4': 16px
  '5': 24px
  '6': 32px
  '7': 48px
  gutter: 16px
  screen-pad: 16px
components:
  button-primary:
    background: '{colors.indigo}'
    color: '{colors.ink-on-indigo}'
    radius: '{rounded.md}'
    min-height: 48px
    font: '{typography.body-strong}'
    focus-ring: '{colors.gold-soft}'
  button-secondary:
    background: '{colors.surface-raised}'
    color: '{colors.indigo}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
    min-height: 48px
    focus-ring: '{colors.focus-ring}'
  button-quiet:
    background: transparent
    color: '{colors.ink-secondary}'
    min-height: 44px
    focus-ring: '{colors.focus-ring}'
  chat-bubble:
    mine-background: '{colors.indigo}'
    mine-color: '{colors.ink-on-indigo}'
    theirs-background: '{colors.surface-raised}'
    theirs-color: '{colors.ink-primary}'
    radius: '{rounded.lg}'
  blur-photo:
    wash: '{colors.blur-wash}'
    overlay: '{colors.indigo-deep}'
    radius: '{rounded.md}'
  reveal-control:
    background: '{colors.gold-soft}'
    color: '{colors.indigo-deep}'
    radius: '{rounded.md}'
    min-height: 44px
    focus-ring: '{colors.focus-ring}'
  admin-flag-row:
    background: '{colors.surface-raised}'
    accent: '{colors.staff}'
    radius: '{rounded.sm}'
  staff-only-badge:
    background: '{colors.staff}'
    color: '{colors.surface-raised}'
    radius: '{rounded.sm}'
    font: '{typography.caption}'
  operator-reach-mode:
    background: '{colors.surface-raised}'
    color: '{colors.ink-primary}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
    min-height: 48px
    font: '{typography.body}'
    focus-ring: '{colors.focus-ring}'
    accent: '{colors.staff}'
  operator-message-cap:
    background: '{colors.surface-raised}'
    color: '{colors.ink-primary}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
    min-height: 48px
    font: '{typography.body}'
    focus-ring: '{colors.focus-ring}'
    accent: '{colors.staff}'
  card-grid-toggle:
    background: '{colors.surface-raised}'
    color: '{colors.indigo}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
    min-height: 44px
    font: '{typography.meta}'
    focus-ring: '{colors.focus-ring}'
  focused-card:
    background: '{colors.surface-raised}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
    action-min-height: 48px
  shared-trait:
    background: '{colors.surface-sand}'
    color: '{colors.ink-secondary}'
    border: '{colors.border-hairline}'
    radius: '{rounded.sm}'
    font: '{typography.meta}'
  mahram-grant-row:
    background: '{colors.surface-raised}'
    color: '{colors.ink-primary}'
    border: '{colors.border-strong}'
    radius: '{rounded.md}'
    min-height: 48px
    font: '{typography.body}'
    focus-ring: '{colors.focus-ring}'
---

# TBD — Visual identity

Working title muslim-marriage-africa. Product name is TBD. Do not substitute a shortlist name in UI, mocks, or tokens.

Spines win on conflict with any file in `mockups/`.

## Brand & Style

This is a Burkina-first honorable ta'aruf product. The visual register is a solemn path (*sira*) toward nikah: mihrab geometry, sand courtyards, indigo night, a restrained gold for confirmation. A one-at-a-time focused card with pass / invite swipe is the product — not dating chrome. What stays rejected is dishonest chrome only: fake presence (« en ligne »), invented scale (« +247.8k actifs »), a public likes counter, and a heart stack of likes. Never neon.

The product looks like a family would be willing to sit with it. Photos are treated as trusts, not merch. Staff surfaces are visibly staff: a `{components.staff-only-badge}` marks every queue that members must never see.

Voice of the brand is quiet and specific. French-first. No *dating*, no *rencontre romantique*, no invented member counts, no celebrity-couple hero. The public number that may appear is Verified marriages, starting at 0.

## Colors

- **Sand (`{colors.surface-sand}`)** is the member canvas. Warm, paper-like, low glare on cheap Androids in daylight.
- **Raised (`{colors.surface-raised}`)** lifts cards and incoming chat bubbles without a drop shadow.
- **Indigo (`{colors.indigo}` / `{colors.indigo-deep}`)** is the solemn field: headers, primary actions, outgoing bubbles, mahram-presence chrome. It is not a dating-app purple.
- **Gold (`{colors.gold}` / `{colors.gold-soft}`)** marks confirmation and Reveal — dual-confirm marriage, pack purchase success (Brothers always; Sisters on the message quota wall in both `sister_reach_mode` values, and on Invite checkout when `same_quota_as_brothers`), granted Reveal. Never used for “boost” or ranking (those are NEXT and must not sneak in as gold badges). Never used to imply a brother-free pack. Never a likes counter.
- **Mihrab (`{colors.mihrab}`)** is the arched header wash on public and onboarding screens.
- **Blur wash (`{colors.blur-wash}`)** is the only authorized appearance of an unauthorized Photo. It is a server derivative, not a CSS filter over a clear image.
- **Danger (`{colors.danger}`)** is for Block, end Chat, delete, and suspend. Warning (the sanction) uses `{colors.staff}` so warning and suspend do not share one red.
- **Staff (`{colors.staff}`)** is exclusive to moderator/operator chrome and the staff-only badge.

Contrast floor (WCAG 2.1 AA text; 1.4.11 ≥3:1 for UI chrome):

| Pair | Role | Floor |
|---|---|---|
| `{colors.ink-primary}` on `{colors.surface-sand}` | Body | AA |
| `{colors.ink-on-indigo}` on `{colors.indigo}` | Primary button / mine bubble | AA |
| `{colors.ink-secondary}` on `{colors.surface-sand}` | Meta / quiet | AA |
| `{colors.indigo-deep}` on `{colors.gold-soft}` | Reveal control | AA |
| `{colors.surface-raised}` on `{colors.staff}` | Staff-only badge | AA |
| `{colors.ink-primary}` on `{colors.surface-raised}` | Theirs bubble / cards | AA |
| `{colors.border-strong}` on sand or raised | Field, card, OTP outline | ≥3:1 |
| `{colors.focus-ring}` on sand | Focus visible | ≥3:1 |
| `{colors.danger}` on `{colors.danger-soft}` | Destructive | AA |
| `{colors.success}` on `{colors.success-soft}` | Non-chat confirmation only (export ready, CIL completed) | AA |

`{colors.gold}` is never text on sand. Selected pack uses gold fill **plus** the word « Sélectionné » and an indigo focus ring — gold outline alone is forbidden. `{colors.border-hairline}` is dividers only, never the only edge of a text field. `{colors.disabled}` is inactive chrome only (exempt 1.4.3); never helper copy. `{colors.surface-indigo}` is an alias of `{colors.indigo-deep}` for header wash.

## Typography

Serif for path and ceremony (`{typography.display}`, `{typography.title}`, `{typography.heading}`). Humanist sans for everything a thumb must read (`{typography.body}`, `{typography.meta}`).

Dynamic type: honor the platform. Largest accessibility setting must not truncate primary actions. No all-caps display. No italic body on 2G-class screens (italics raster poorly on low-dpi).

Member-facing strings stay French. Mooré/Dioula are audio, not a second type ramp.

## Layout & Spacing

Scale: 4 / 8 / 12 / 16 / 24 / 32 / 48. Member screens are single-column, `{spacing.screen-pad}` 16px, bottom nav reserved 64px. Discover and Search default to **one focused card** — no full-bleed hero, no supermarket grid as the first view. An optional two-column Lite grid sits behind `{components.card-grid-toggle}` on the same screen. Card payload budget is AD-16 (first-card / first-grid metadata + blur thumbs ≤150KB). Lite: small image, text first.

Staff console is a two-pane layout from 768px (comfortable at 1024): queue left, case right. Below 768 it stacks, queue first.

Modal stacks one level. Contact-share interstitial, PIN lock, and sanction confirm are the only full-screen overlays on the member path.

## Elevation & Depth

No material drop shadows on member cards. Depth is tone: sand vs raised vs indigo. Staff panes may use a 1px `{colors.border-hairline}` only.

Blurred photos must not be “glassmorphism.” They are a flat wash plus a pictogram of a covered face. No shimmer that implies the original is underneath and peekable.

## Shapes

`{rounded.md}` (12px) for cards, photos, inputs. `{rounded.lg}` (20px) for chat bubbles (one square corner toward the sender). `{rounded.sm}` for staff rows and the staff-only badge. Soft mihrab arch on public landing and splash only — not on every card.

No pills that look like dating chips. Stage chips (`invite` / `chat` / `meeting` / `married`) are small rectangles, not story rings. `{rounded.full}` is reserved for the OTP digit wells only.

## Components

Keeper mocks (spines win): `mockups/auth.html` (auth), `mockups/discovery-lite.html` (Lite grid only — **spine wins: default is the single focused card**), `mockups/profile-blur.html` (blur-photo + reveal-control), `mockups/chat-thread.html` (chat-bubble delivered), `mockups/mahram-readonly.html` (mahram-banner), `mockups/admin-flag-queue.html` (admin-flag-row + staff-only-badge), `mockups/payment-pack.html` (pack-card + audio-prompt), `mockups/marriage-confirm.html` (dual-confirm).

- **button-primary** — Indigo fill, `min-height` 48px. One per screen. Label is a verb in French.
- **button-secondary** — Indigo outline on raised. Decline, later, cancel.
- **button-quiet** — Text only. Used for “Refuser discrètement” so decline does not shout.
- **field** — `min-height` 48px (not fixed height), `{colors.border-strong}` outline, `{typography.body}` value, `{typography.meta}` label above. Focus ring `{colors.focus-ring}` 2px. YAML `components` is the brand-layer subset; this body list is canonical.
- **age-gate** — Date-of-birth field plus a single sentence that the path is for adults 19+. A1 stays open; do not add “law says 19” copy.
- **otp-input** — Four-to-six discrete boxes, 48px, numeric keypad. SMS is the channel.
- **liveness-capture** — Camera frame with pictogram + audio affordance. No beauty filter. No AR overlay.
- **completeness-meter** — Named missing Islamic criteria as a list, not a shame bar. Gold fill only when Invite-ready.
- **focused-card** — Default Discover / Search presentation. One Profile. Small blur-photo (xs/sm). Under the photo: `{components.shared-trait}` chips for **shared traits only** (open to polygamy, same town, kids / accepts a partner with kids, other shared Profile fields already in the PRD). Tap opens full Profile. Actions: pass (dismiss / swipe away — not a like), swipe or `{components.button-primary}` to invite, quick message. No public likes counter. No heart stack.
- **discovery-card** — Grid variant only (optional toggle). Small: blur-photo thumb (xs/sm), city, age, marital status, practice. No giant image. Favourite is a quiet bookmark, not a heart.
- **card-grid-toggle** — On Discover and Search. `{typography.meta}`, `{rounded.md}`, `min-height` 44px. Selected view uses indigo text + `{colors.border-strong}`, not gold “boost.”
- **shared-trait** — Meta chip under the focused-card photo. Only traits in common that already exist on both Profiles. Omit when none shared. Not a dating interest pill.
- **blur-photo** — Server `blur` derivative in `{colors.blur-wash}`. Never a client-side blur over `original`. Unrevealed state shows a covered-face pictogram. Not-yet-public Profile Photo uses the same wash plus caption « Photo en revue — pas encore publique ».
- **reveal-control** — Gold-soft control, `min-height` 44px, role button, pressed/disabled states. Caption + covered-face pictogram so gold is never the only Reveal signal. Per viewer. Disabled until Chat exists (Sister accept).
- **chat-bubble** — Immediate. Mine indigo, theirs raised. Meta line is time only (optional « arrivé »). No “en vérification”, no hourglass, no scan wait, no member-facing “scan” word including negations. Voice-note is a waveform inside the same bubble.
- **voice-note** — Play control 44px. No transcription shown to members.
- **mahram-banner** — Persistent indigo-deep bar: « Un wali lit cette discussion ». No compose on the Mahram client.
- **contact-share-interstitial** — Raised sheet, not a chat hold. Explains that numbers, WhatsApp, and links wait for both yes. Not an AI message.
- **invite-row** — Sender pseudonym, marital status + polygamy intent **before** accept, Flash excerpt, quiet decline.
- **flash-composer** — 280-character field + Ice Breaker picker (deen/family only). Phone / WhatsApp / links refused here (`CONTACT_SHARE_REQUIRED`).
- **stage-chip** — `invite` / `chat` / `meeting` / `married` in meta type. Always visible on Chat.
- **admin-flag-row** — Staff only. Columns: already-delivered excerpt, person, reason (`flag-for-admin` | `scan-deferred` | `scan-failed`), age in queue, SLA. `{components.staff-only-badge}` leading the row.
- **staff-only-badge** — Brown chip « Équipe seulement ». Required on flag queue, case, sanction, operator config, operator-reach-mode. Never on member Chat.
- **sanction-action** — Three distinct controls: Avertissement (staff), Suspension (danger), Autre action publiée (secondary). AI is not a fourth button.
- **operator-reach-mode** — Staff control on Operator pricing/policy. Two values only: `free_unlimited` (DEFAULT) | `same_quota_as_brothers`. `{typography.body}` labels, `{colors.border-strong}` outline, `min-height` 48px, `{colors.focus-ring}`. `{components.staff-only-badge}` leads the group. Selected value uses staff accent, not gold “boost.” No third brother-free option. `{components.operator-message-cap}` sits next to this control.
- **operator-message-cap** — Staff control next to `operator-reach-mode`. Shows the **current admin** `daily_message_cap` value. No locked number in the label. `{typography.body}`, `{colors.border-strong}`, `min-height` 48px, `{colors.focus-ring}`. `{components.staff-only-badge}` leads the group. Audited save. Staff accent, not gold.
- **mahram-grant-row** — Sister grant / revoke-one row. Raised, `{colors.border-strong}`, `min-height` 48px. Empty list is `{components.empty-state}`, not a pre-checked stack.
- **pack-card** — 1 / 3 / 6 months, XOF, Orange / Moov / Wave. Shown to Brothers always. Shown to Sisters on the **message quota wall** in both `sister_reach_mode` values (Free-tier messages are capped). In `free_unlimited`, the card is for unlimited messages, not Invite reach. Selected state: gold-soft fill + visible word « Sélectionné » + indigo ring ≥3:1. Line « Pas de renouvellement automatique » always visible with audio-prompt.
- **audio-prompt** — Speaker pictogram + `mos` / `dyu` toggle, each ≥44px. Hard steps: onboarding, photo rules, no-auto-renew, Mahram invite. If audio fails, pictograms remain.
- **pin-lock** — Full-screen sand, four digits, no photo behind.
- **empty-state** — One sentence + one action. No illustrated couples.
- **error-banner** — Danger-soft, retry verb. Payment errors never hide Free/safety. Safety screens (verification, blur/reveal, mahram, report, block) and Chat after accept stay free in both `sister_reach_mode` values.
- **lite-placeholder** — Hairline rectangle the size of an xs thumb. Criteria text still shows.

## Do's and Don'ts

| Do | Don't |
|---|---|
| Use TBD or the working title in internal docs | Print Nisfuddin / Nikahsira / Sakinaa as if decided |
| Show Chat as already delivered | Show a scan wait, hold, or “en cours de vérification” on Chat |
| Serve blur derivatives from the server | CSS-blur a clear original |
| Mark staff queues with staff-only-badge | Let flag-queue chrome leak into member Chat |
| Default one focused card; optional Lite grid behind a toggle | Full-bleed face grid as the first view |
| Gold for Reveal and dual-confirm | Gold “Premium verified” identity badge |
| *mariage / ta'aruf / nikah / khitba*; pass / invite swipe | *dating / rencontre romantique*; « en ligne »; « +247.8k actifs »; heart stack |
| Quiet decline | Guilt timer or “elle a vu” |
| Disclose hosting on the privacy page | Hide Scaleway / Île-de-France |
| Show Sister pack-card on the message quota wall in both modes | Require a reach pack in `free_unlimited`, or invent a brother-free mode |
| Keep verification, blur, mahram, report, block, and Chat after accept free | Gold-badge a safety screen as Premium |
