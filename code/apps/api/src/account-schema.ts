import { sql } from 'drizzle-orm'
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

/** Identity-owned account. `coc_version` is the Code of conduct version accepted at signup. */
export const account = pgTable(
  'account',
  {
    id: uuid('id').primaryKey(),
    email: text('email').notNull().unique(),
    pseudonym: text('pseudonym').notNull().unique(),
    gender: text('gender').notNull(),
    roles: text('roles').array().notNull(),
    status: text('status').notNull(),
    age_attested: boolean('age_attested').notNull(),
    coc_version: text('coc_version').notNull(),
    civil_given_name: text('civil_given_name').notNull(),
    civil_family_name: text('civil_family_name').notNull(),
  },
  (table) => [
    // A staff account (Story 12.1) is not a Member: gender `none`, staff roles only.
    check(
      'account_gender_check',
      sql`${table.gender} in ('sister', 'brother') or (${table.gender} = 'none' and cardinality(${table.roles}) > 0 and ${table.roles} <@ ARRAY['moderator', 'operator']::text[])`,
    ),
    check(
      'account_status_check',
      sql`${table.status} in ('Active', 'deactivated', 'held', 'pending_deletion')`,
    ),
  ],
)

/** Password hash lives here. This story inserts kind `password` only. */
export const credential = pgTable(
  'credential',
  {
    id: uuid('id').primaryKey(),
    account_id: uuid('account_id')
      .notNull()
      .references(() => account.id),
    kind: text('kind').notNull(),
    secret_hash: text('secret_hash'),
    provider_subject: text('provider_subject'),
    email_verified_at: timestamp('email_verified_at', { withTimezone: true, mode: 'string' }),
  },
  (table) => [check('credential_kind_check', sql`${table.kind} in ('password', 'google_oidc', 'apple')`)],
)

/** FR-006 link. Raw token is never stored. `credential.email_verified_at` stays the verified marker. */
export const emailVerification = pgTable('email_verification', {
  id: uuid('id').primaryKey(),
  account_id: uuid('account_id')
    .notNull()
    .references(() => account.id),
  token_hash: text('token_hash').notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  consumed_at: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
  superseded_at: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
})

/** FR-008 single-use link. Raw token is never stored. Not `email_verification`. */
export const passwordReset = pgTable('password_reset', {
  id: uuid('id').primaryKey(),
  account_id: uuid('account_id')
    .notNull()
    .references(() => account.id),
  token_hash: text('token_hash').notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  consumed_at: timestamp('consumed_at', { withTimezone: true, mode: 'date' }),
  superseded_at: timestamp('superseded_at', { withTimezone: true, mode: 'date' }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
})

/**
 * Profile is 1:1 with account via `account_id`.
 * This insert writes `account_id` and `dob` only.
 * `city`, `country`, and `visibility` may be null. A held account then sets `visibility` to `held`.
 */
export const profile = pgTable(
  'profile',
  {
    account_id: uuid('account_id')
      .primaryKey()
      .references(() => account.id),
    dob: date('dob', { mode: 'string' }).notNull(),
    city: text('city'),
    country: text('country'),
    origin: text('origin'),
    marital_status: text('marital_status'),
    polygamy_intent: text('polygamy_intent'),
    education: text('education'),
    profession: text('profession'),
    madhhab: text('madhhab'),
    practice: text('practice'),
    life_plans: text('life_plans'),
    bio_live: text('bio_live'),
    bio_pending: text('bio_pending'),
    visibility: text('visibility'),
    review_queued_at: timestamp('review_queued_at', { withTimezone: true, mode: 'string' }),
    review_passed_at: timestamp('review_passed_at', { withTimezone: true, mode: 'string' }),
    photo_blur: boolean('photo_blur').notNull().default(true),
  },
  (table) => [
    check(
      'profile_visibility_check',
      sql`${table.visibility} is null or ${table.visibility} in ('unpublished', 'public', 'held', 'emergency_hidden')`,
    ),
  ],
)

/**
 * Phone OTP, liveness, and ID. `hash` is the code hash; the raw code is never stored.
 * `evidence_uri` points at the sealed object for liveness and ID; no image data sits in the row.
 * Staff review console: `pose` is the random pose asked for a liveness selfie; `decision_*` is the
 * Moderator's decision on a liveness or ID row (reason category, optional note, who and when).
 */
export const verificationRecord = pgTable(
  'verification_record',
  {
    id: uuid('id').primaryKey(),
    account_id: uuid('account_id')
      .notNull()
      .references(() => account.id),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
    vendor: text('vendor'),
    evidence_uri: text('evidence_uri'),
    phone_e164: text('phone_e164'),
    hash: text('hash'),
    expires_at: timestamp('expires_at', { withTimezone: true, mode: 'date' }),
    pose: text('pose'),
    decision_reason: text('decision_reason'),
    decision_note: text('decision_note'),
    decided_at: timestamp('decided_at', { withTimezone: true, mode: 'date' }),
    decided_by: uuid('decided_by').references(() => account.id),
  },
  (table) => [
    index('verification_record_account_kind_id').on(table.account_id, table.kind, table.id),
    check(
      'verification_record_pose_check',
      sql`${table.pose} is null or (${table.kind} = 'liveness' and ${table.pose} in ('raise_right_hand', 'touch_left_ear', 'look_left', 'hand_on_chin', 'thumbs_up', 'two_fingers'))`,
    ),
    check(
      'verification_record_kind_check',
      sql`${table.kind} in ('phone_otp', 'liveness', 'id_document')`,
    ),
    check(
      'verification_record_status_check',
      sql`${table.status} in ('pending', 'granted', 'rejected', 'held')`,
    ),
  ],
)

/**
 * The random pose asked before a liveness selfie. One live challenge per account: a new one replaces it,
 * and the selfie upload deletes it in the same unit of work as the liveness row (single use).
 */
export const livenessChallenge = pgTable(
  'liveness_challenge',
  {
    account_id: uuid('account_id')
      .primaryKey()
      .references(() => account.id),
    id: uuid('id').notNull().unique(),
    pose: text('pose').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
  },
  (table) => [
    check(
      'liveness_challenge_pose_check',
      sql`${table.pose} in ('raise_right_hand', 'touch_left_ear', 'look_left', 'hand_on_chin', 'thumbs_up', 'two_fingers')`,
    ),
  ],
)

/** SMS row. Template and ids only. No phone and no code. */
export const smsDispatch = pgTable('sms_dispatch', {
  id: uuid('id').primaryKey(),
  account_id: uuid('account_id').references(() => account.id),
  template: text('template').notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
})

/** Shared-device PIN. Hash only. No fail-count column. */
export const pinLock = pgTable('pin_lock', {
  id: uuid('id').primaryKey(),
  account_id: uuid('account_id')
    .notNull()
    .unique()
    .references(() => account.id),
  pin_hash: text('pin_hash').notNull(),
})

/**
 * Web session. No remember-me column and no gender column.
 * `mfa_state` is set on staff sessions only; a staff session is usable only at `done`.
 */
export const session = pgTable(
  'session',
  {
    id: uuid('id').primaryKey(),
    account_id: uuid('account_id')
      .notNull()
      .references(() => account.id),
    kind: text('kind').notNull(),
    expires_at: timestamp('expires_at', { withTimezone: true, mode: 'date' }).notNull(),
    last_seen_at: timestamp('last_seen_at', { withTimezone: true, mode: 'date' }).notNull(),
    mfa_state: text('mfa_state'),
  },
  (table) => [
    check('session_kind_check', sql`${table.kind} in ('web', 'capacitor', 'mahram', 'staff')`),
    check(
      'session_mfa_state_check',
      sql`(${table.kind} = 'staff' and ${table.mfa_state} is not null and ${table.mfa_state} in ('password_change', 'enroll', 'verify', 'done')) or (${table.kind} <> 'staff' and ${table.mfa_state} is null)`,
    ),
  ],
)

/**
 * Staff sign-in factors (Story 12.1). Created only by the server command.
 * TOTP secrets are AES-256-GCM envelopes under `STAFF_MFA_KEY`, never plaintext.
 * `totp_last_step` refuses a code that was already accepted.
 */
export const staffCredential = pgTable('staff_credential', {
  account_id: uuid('account_id')
    .primaryKey()
    .references(() => account.id),
  must_change_password: boolean('must_change_password').notNull(),
  totp_sealed: text('totp_sealed'),
  totp_pending_sealed: text('totp_pending_sealed'),
  totp_enrolled_at: timestamp('totp_enrolled_at', { withTimezone: true, mode: 'date' }),
  totp_last_step: bigint('totp_last_step', { mode: 'number' }),
  failed_codes: integer('failed_codes').notNull().default(0),
  locked_until: timestamp('locked_until', { withTimezone: true, mode: 'date' }),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'date' }).notNull(),
})

/** Operator-owned CIL ticket. Identity calls OperatorPort; it does not insert this row. */
export const cilTicket = pgTable(
  'cil_ticket',
  {
    id: uuid('id').primaryKey(),
    subject_account_id: uuid('subject_account_id')
      .notNull()
      .references(() => account.id),
    kind: text('kind').notNull(),
    status: text('status').notNull(),
  },
  (table) => [
    check('cil_ticket_kind_check', sql`${table.kind} in ('export', 'erase', 'access')`),
    check(
      'cil_ticket_status_check',
      sql`${table.status} in ('ready', 'scheduled', 'stalled', 'completed')`,
    ),
    uniqueIndex('cil_ticket_open_subject_kind')
      .on(table.subject_account_id, table.kind)
      .where(sql`${table.status} in ('ready', 'scheduled')`),
  ],
)

/** Media-owned profile, chat, or voice object. Serializers never emit `original_key`. */
export const photoAsset = pgTable(
  'photo_asset',
  {
    id: uuid('id').primaryKey(),
    owner_id: uuid('owner_id')
      .notNull()
      .references(() => account.id),
    kind: text('kind').notNull(),
    original_key: text('original_key').notNull(),
    blur_key: text('blur_key'),
    moderation_state: text('moderation_state'),
    is_main: boolean('is_main').notNull().default(false),
  },
  (table) => [
    check(
      'photo_asset_kind_check',
      sql`${table.kind} in ('profile_photo', 'chat_photo', 'voice_note')`,
    ),
    check(
      'photo_asset_moderation_state_check',
      sql`${table.moderation_state} is null or ${table.moderation_state} in ('pending', 'live', 'blocked', 'replaced')`,
    ),
    check(
      'photo_asset_is_main_check',
      sql`not ${table.is_main} or (${table.kind} = 'profile_photo' and ${table.moderation_state} = 'live')`,
    ),
    uniqueIndex('photo_asset_one_main_profile_photo')
      .on(table.owner_id)
      .where(sql`${table.kind} = 'profile_photo' and ${table.moderation_state} = 'live' and ${table.is_main}`),
  ],
)

/** One row per stored size. `size=blur` uses the same object as `photo_asset.blur_key`. */
export const photoDerivative = pgTable(
  'derivative',
  {
    id: uuid('id').primaryKey(),
    photo_asset_id: uuid('photo_asset_id')
      .notNull()
      .references(() => photoAsset.id),
    size: text('size').notNull(),
    object_key: text('object_key').notNull(),
  },
  (table) => [
    check('derivative_size_check', sql`${table.size} in ('xs', 'sm', 'md', 'blur')`),
  ],
)

/** Capability for the media GET gateway. Not a bucket pre-sign. */
export const signedGrant = pgTable('signed_grant', {
  id: uuid('id').primaryKey(),
  photo_asset_id: uuid('photo_asset_id')
    .notNull()
    .references(() => photoAsset.id),
  viewer_id: uuid('viewer_id')
    .notNull()
    .references(() => account.id),
  derivative: text('derivative').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true, mode: 'string' }).notNull(),
  revoked_at: timestamp('revoked_at', { withTimezone: true, mode: 'string' }),
})

/** Trust-owned strike. Photo-floor time is the UUID v7 in `id`. `case_id` has no foreign key until `moderation_case` exists. */
export const strike = pgTable(
  'strike',
  {
    id: uuid('id').primaryKey(),
    account_id: uuid('account_id')
      .notNull()
      .references(() => account.id),
    case_id: uuid('case_id'),
    ladder: text('ladder').notNull(),
    evidence: text('evidence'),
  },
  (table) => [
    index('strike_account_ladder_id').on(table.account_id, table.ladder, table.id),
    uniqueIndex('strike_photo_floor_evidence')
      .on(table.evidence)
      .where(sql`${table.ladder} = 'photo_floor'`),
  ],
)

/** Discovery-owned append-only profile open. Grain is `(account_id, target_id, created_at)`. Not a like. */
export const profileVisit = pgTable(
  'profile_visit',
  {
    account_id: uuid('account_id')
      .notNull()
      .references(() => account.id),
    target_id: uuid('target_id')
      .notNull()
      .references(() => account.id),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.account_id, table.target_id, table.created_at] }),
    index('profile_visit_account_id_created_at').on(table.account_id, table.created_at),
  ],
)

/** Discovery-owned viewer pass. Grain is `(viewer_id, target_id)`. Not a like and not a favourite. */
export const discoveryExclusion = pgTable(
  'discovery_exclusion',
  {
    viewer_id: uuid('viewer_id')
      .notNull()
      .references(() => account.id),
    target_id: uuid('target_id')
      .notNull()
      .references(() => account.id),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.viewer_id, table.target_id] })],
)

/** Discovery-owned private favourite. Grain is `(account_id, target_id)`. Not a pass and not a like. */
export const favourite = pgTable(
  'favourite',
  {
    account_id: uuid('account_id')
      .notNull()
      .references(() => account.id),
    target_id: uuid('target_id')
      .notNull()
      .references(() => account.id),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.account_id, table.target_id] })],
)

/**
 * Invites-owned Invite (Story 4.1). The UUID v7 `id` carries the send instant. `flash_id` arrives with Story 4.3.
 * At most one pending Invite per `(from_id, to_id)`, so a double submit cannot store two.
 */
export const invite = pgTable(
  'invite',
  {
    id: uuid('id').primaryKey(),
    from_id: uuid('from_id')
      .notNull()
      .references(() => account.id),
    to_id: uuid('to_id')
      .notNull()
      .references(() => account.id),
    state: text('state').notNull(),
    sister_accepted_at: timestamp('sister_accepted_at', { withTimezone: true, mode: 'string' }),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' }).notNull(),
  },
  (table) => [
    check('invite_state_check', sql`${table.state} in ('pending', 'accepted', 'declined')`),
    check('invite_not_self_check', sql`${table.from_id} <> ${table.to_id}`),
    uniqueIndex('invite_one_pending_per_pair').on(table.from_id, table.to_id).where(sql`${table.state} = 'pending'`),
    index('invite_to_id_id').on(table.to_id, table.id),
    index('invite_from_id_id').on(table.from_id, table.id),
  ],
)

/**
 * Invites-owned daily Invite count (Story 4.2). Grain `(account_id, civil_day_ouaga)`, the Africa/Ouagadougou
 * civil day. Written only by a successful quota-class send. Billing never writes it.
 */
export const inviteQuota = pgTable(
  'invite_quota',
  {
    account_id: uuid('account_id')
      .notNull()
      .references(() => account.id),
    civil_day_ouaga: date('civil_day_ouaga', { mode: 'string' }).notNull(),
    sent_count: integer('sent_count').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.account_id, table.civil_day_ouaga] }),
    check('invite_quota_sent_count_check', sql`${table.sent_count} >= 0`),
  ],
)

/** Append-only hash chain. Application roles insert and select. A trigger rejects update and delete. */
export const auditEvent = pgTable('audit_event', {
  id: uuid('id').primaryKey(),
  actor_id: uuid('actor_id').references(() => account.id),
  action: text('action').notNull(),
  payload: jsonb('payload').notNull(),
  prev_hash: text('prev_hash').notNull(),
  hash: text('hash').notNull(),
})
