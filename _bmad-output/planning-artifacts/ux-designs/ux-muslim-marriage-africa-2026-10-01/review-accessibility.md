# Accessibility Review — muslim-marriage-africa

Reviewed: `DESIGN.md`, `EXPERIENCE.md`, `mockups/*.html` against WCAG 2.1 AA, NFR-006, AD-24, and the product floor (44px targets, pictogram+audio on hard steps, no color-only Reveal, chat announce must not say scan-wait, staff chrome must not leak, Lite grid readable with images deferred, indigo/sand/gold contrast). Spines win on mock conflict; mocks are still scored where builders would copy them.

## Overall verdict

The experience spine states a WCAG 2.1 AA and low-literacy floor that matches NFR-006 / AD-24, and the core indigo/sand text pairings pass AA. The contract is not implementation-ready: hairline and gold selection tokens fail 1.4.11, `reveal-control` and `audio-prompt` lack 44px targets, there is no focus-visible token, and key-screen mocks freeze scan language, emoji-audio, and fixed 48px heights that will clip dynamic type. Fix the token and component specs before build; do not treat the HTML mocks as the accessibility source of truth.

## Findings

- **high** Field and card edges fail WCAG 1.4.11: `{colors.border-hairline}` `#D9CDB8` is 1.35:1 on `{colors.surface-sand}` and 1.52:1 on `{colors.surface-raised}`; raised-on-sand is 1.13:1, so inputs are almost invisible without the hairline (`DESIGN.md` Colors / field; all `mockups/*.html` inputs and `.card`). *Fix:* specify a ≥3:1 border or a darker field well (e.g. ink-secondary or indigo at ≥3:1 against the canvas) and use it for every text field, OTP box, and card outline.

- **high** Selected pack is gold-outline-only at 2.33:1 on raised (1.4.1 + 1.4.11) (`payment-pack.html` `.pack.on`; `DESIGN.md` gold as confirmation). *Fix:* keep gold as fill/hairline only if a second signal exists (check mark, « Sélectionné », or indigo 2px ring) and the outline itself meets 3:1.

- **high** `{components.reveal-control}` has no min-height; the profile mock is a 12px gold `<span>` without button role or pressed/disabled state (`DESIGN.md` Components; `mockups/profile-blur.html`). *Fix:* make Révéler / Retirer a 44px control (48px if it is the screen primary), expose role+state, and keep caption + covered-face pictogram so gold is never the only Reveal signal.

- **high** No focus-visible token or 3:1 focus ring (`DESIGN.md`; `EXPERIENCE.md` Accessibility Floor only names focus *order*). *Fix:* add a focus ring (indigo on sand, gold-soft or sand on indigo) at ≥3:1 and require it on every control, including Reveal, audio-prompt, nav, and pack cards.

- **high** Shared mock CSS sets `height: 48px` on `.btn` and inputs, not `min-height`, which will clip labels at the largest accessibility size (`mockups/*.html` vs `DESIGN.md` button-primary / field and `EXPERIENCE.md` dynamic type). *Fix:* change the contract CSS to `min-height: 48px` (44px quiet), allow wrap, and add a largest-type example so primary verbs never truncate.

- **high** Member chat meta announces scan: « 20:14 · arrivé — pas d’attente de scan » (`mockups/chat-thread.html`). DESIGN chat-bubble is time-only; EXPERIENCE send announce is « Message envoyé », never « en vérification ». *Fix:* meta = time only (optional « arrivé »); AT live region = « Message envoyé ». Delete “scan” from member chrome, including negations.

- **high** Hard-step audio is underspecified and wrongly drawn: `{components.audio-prompt}` has no target size; `payment-pack.html` uses a 🔊 glyph in 12px `.note` with no Mooré/Dioula toggle (`DESIGN.md` audio-prompt / pack-card; NFR-006 / AD-24). *Fix:* speaker pictogram + `mos`/`dyu` toggle at ≥44px on no-auto-renew, onboarding, photo rules, and Mahram invite; pictogram path remains if 2G audio fails.

- **medium** NFR-006 critical path (onboarding, photo rules, liveness, Mahram-invite explainer) is spine-only: no pictogram inventory and no composed “completable without a paragraph” layout (`EXPERIENCE.md` IA / audio-prompt; missing mocks). *Fix:* add one composed hard-step frame (pictograms + audio-prompt + primary) and a named pictogram set for photo rules and liveness fail/retake.

- **medium** Unrevealed photo is specified as a covered-face pictogram but mocks use ▣; Lite deferred thumb is an empty dashed box with no accessible name (`DESIGN.md` blur-photo; `mockups/discovery-lite.html`, `mockups/profile-blur.html`). *Fix:* ship a covered-face glyph + caption (« Photo floue » / « Image différée »); `aria-hidden` on decorative marks; lite-placeholder labeled or hidden.

- **medium** Lite grid stays two-column with criteria visible when the thumb is deferred (`discovery-lite.html` Oumar card) but those criteria are 12px `{typography.meta}` muted — the only readable content on 2G. *Fix:* name, city, age, marital/practice at `{typography.body}` (16px) whenever the image is a placeholder.

- **medium** Interactive mocks are non-widgets: bottom nav `<span>`, pack `<div>`, discovery `<article>` without a button/link — contradicts “role + state on every control” (`EXPERIENCE.md` Accessibility Floor; `discovery-lite.html`, `payment-pack.html`, `profile-blur.html`). *Fix:* nav as `aria-current` tabs/links, packs as radio cards or buttons, cards as links; 64px nav height already meets the 44px floor.

- **medium** Member-facing English enums `ready_now` and `within_year` (`discovery-lite.html`, `profile-blur.html`) violate AD-24 French UI and the low-literacy floor. *Fix:* French labels only (*prêt maintenant*, *dans l’année*).

- **low** Visible auth labels are not tied with `for`/`id` (aria-label duplicates); `profile-blur.html` nav lacks the `aria-label` used on discovery (`mockups/auth.html`, `mockups/profile-blur.html`). *Fix:* one visible `<label for>` per field; consistent `aria-label="Navigation"` on member nav.

- **low** `{colors.disabled}` `#B5A894` is 2.01:1 on sand (`DESIGN.md`). Inactive components are exempt from 1.4.3; do not reuse this token for helper or completeness copy.

## What is already adequate

- Body contrast: ink-primary on sand 13.4:1; ink-on-indigo on indigo 9.9:1; ink-secondary on sand 6.5:1; gold-soft chip text (indigo-deep) 10.3:1; staff badge and danger-on-danger-soft pass AA. DESIGN correctly forbids gold as body text on sand.
- Target floor in the spine: primary/secondary 48px, quiet 44px, fields/OTP 48px, voice play 44px, bottom nav 64px.
- Chat spine: immediate `delivered`, banned pending/held/scan-wait states, send announce « Message envoyé », meta is time-only, no member transcript of voice.
- Staff chrome: `staff-only-badge` on the flag queue header and every row; absent from auth, discovery, profile, chat, mahram, payment, marriage. Separate shells; staff unblur not in member tab order.
- Lite third card keeps name, city, age, and “critères visibles” with the image deferred; two-column small thumbs; no full-bleed hero.
- Reveal blur state has wash + caption (not color-only in the spine); no hover-only Reveal; captcha/liveness must have a non-color fail state.
- `lang="fr"`, French-first microcopy, Reduce Motion on mihrab fade, Mahram read-only (no compose) with labeled pause / end / flag.
- Dynamic-type and pictogram-fallback rules are written in the spine even where mocks omit them.
