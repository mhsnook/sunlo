# Sunlo GDPR Compliance Plan

## Current State Summary

Sunlo is a language-learning app built on Supabase (PostgreSQL + Auth + Storage) with a React frontend. The app currently:

- **Collects** user emails, usernames, avatar images, learning progress, chat messages, friend connections, user-generated content (phrases, translations, playlists, comments), and client-side error logs
- **Has no** account deletion, data export, cookie consent, or formal consent mechanisms
- **Explicitly blocks** EU users in the privacy policy rather than supporting GDPR compliance
- **Has no** third-party analytics or tracking (a positive starting point)
- **Has strong** Row Level Security (RLS) on all user data tables

The privacy policy (last updated June 2024) states: _"We have not yet implemented GDPR-compliance features like the 'forget me' feature, so if you are in the European Union please do not use our service."_

---

## Data Inventory

### Personal Data Collected

| Data Category          | Table(s)                                                                               | Fields                                                                             | Lawful Basis (proposed)        |
| ---------------------- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| Account credentials    | `auth.users` (Supabase-managed)                                                        | email, password hash, JWT tokens                                                   | Contract (Art. 6(1)(b))        |
| Profile information    | `user_profile`                                                                         | username, avatar_path, languages_known, font_preference                            | Contract                       |
| Learning data          | `user_deck`, `user_card`, `user_card_review`, `user_deck_review_state`                 | language, learning goal, card scores, review history, difficulty/stability metrics | Contract                       |
| Social/messaging       | `chat_message`                                                                         | sender_uid, recipient_uid, message content (JSONB), read_at                        | Contract                       |
| Friend connections     | `friend_request_action`                                                                | uid_by, uid_for, action_type                                                       | Contract                       |
| User-generated content | `phrase`, `phrase_translation`, `phrase_playlist`, `phrase_request`, `request_comment` | content, added_by/requester_uid/uid                                                | Contract + Legitimate interest |
| Upvotes/interactions   | `comment_upvote`, `phrase_request_upvote`, `phrase_playlist_upvote`                    | uid, target_id                                                                     | Contract                       |
| Error telemetry        | `user_client_event`                                                                    | uid (optional), error message, stack trace, URL, context (JSONB)                   | Legitimate interest            |
| Avatar files           | Supabase Storage (`avatars` bucket)                                                    | uploaded image files                                                               | Contract                       |

### Data Processors

| Processor            | Data Processed        | Purpose                                                                |
| -------------------- | --------------------- | ---------------------------------------------------------------------- |
| Supabase (hosted)    | All data listed above | Database hosting, authentication, file storage, realtime subscriptions |
| Email provider (TBD) | User email addresses  | Transactional emails (confirmation, password reset)                    |

---

## Compliance Work Packages

### Phase 1: Legal Foundation

These items don't require code changes but are prerequisites for everything else.

#### 1.1 — Establish Lawful Bases for Processing

Document the lawful basis for each processing activity under Art. 6 GDPR:

- **Contract performance** (Art. 6(1)(b)): Account data, profile, learning data, social features — all necessary to deliver the service the user signed up for
- **Legitimate interest** (Art. 6(1)(f)): Error telemetry (for service reliability), content attribution (showing who created a phrase) — document the balancing test
- **Consent** (Art. 6(1)(a)): Any future marketing emails or optional analytics

Deliverable: Internal "Record of Processing Activities" (ROPA) document.

#### 1.2 — Data Processing Agreement with Supabase

- Supabase provides a standard DPA at [supabase.com/legal/dpa](https://supabase.com/legal/dpa)
- Execute this DPA and keep it on file
- Verify Supabase's data hosting region and ensure adequate safeguards for EU data transfers (Standard Contractual Clauses)

#### 1.3 — Appoint a Data Protection Contact

- Designate a contact person/email for data protection inquiries (currently `sunlo.app@gmail.com`)
- If processing is large-scale or involves special categories, consider appointing a formal DPO (likely not required for Sunlo's scale)

#### 1.4 — Data Retention Policy

Define concrete retention periods:

| Data                 | Proposed Retention                    | Rationale                                |
| -------------------- | ------------------------------------- | ---------------------------------------- |
| Active account data  | Duration of account                   | Service delivery                         |
| Learning progress    | Duration of account                   | Core feature                             |
| Chat messages        | Duration of account (both parties)    | Social feature                           |
| Error telemetry      | 90 days                               | Debugging; no need for long-term storage |
| Deleted account data | 30-day grace period, then hard delete | Allow account recovery                   |
| Avatar files         | Deleted with account                  | Profile data                             |

---

### Phase 2: User Rights Implementation (Code Changes)

These are the core technical features needed.

#### 2.1 — Account Deletion (Right to Erasure, Art. 17)

**Priority: Critical**

Create a database function and UI for full account deletion.

**Database function** (`supabase/migrations/`):

```sql
create or replace function public.delete_user_account () returns void language plpgsql security definer as $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  -- Delete user-specific data in dependency order
  DELETE FROM public.user_card_review WHERE uid = _uid;
  DELETE FROM public.user_deck_review_state WHERE uid = _uid;
  DELETE FROM public.user_card WHERE uid = _uid;
  DELETE FROM public.user_deck WHERE uid = _uid;
  DELETE FROM public.chat_message WHERE sender_uid = _uid OR recipient_uid = _uid;
  DELETE FROM public.friend_request_action WHERE uid_by = _uid OR uid_for = _uid;
  DELETE FROM public.comment_upvote WHERE uid = _uid;
  DELETE FROM public.phrase_request_upvote WHERE uid = _uid;
  DELETE FROM public.phrase_playlist_upvote WHERE uid = _uid;
  DELETE FROM public.request_comment WHERE uid = _uid;
  DELETE FROM public.user_client_event WHERE uid = _uid;

  -- For user-generated content (phrases, translations, playlists):
  -- Anonymize rather than delete to preserve community content
  UPDATE public.phrase SET added_by = NULL WHERE added_by = _uid;
  UPDATE public.phrase_translation SET added_by = NULL WHERE added_by = _uid;
  UPDATE public.phrase_request SET requester_uid = NULL WHERE requester_uid = _uid;
  UPDATE public.phrase_playlist SET uid = NULL WHERE uid = _uid;

  -- Delete avatar from storage
  DELETE FROM storage.objects
  WHERE bucket_id = 'avatars'
  AND owner = _uid;

  -- Delete profile
  DELETE FROM public.user_profile WHERE uid = _uid;

  -- Delete auth user (Supabase admin API required, or use auth.users delete)
  -- This must be handled via Supabase Edge Function or admin API call
END;
$$;
```

**UI component**: Add a "Delete Account" section to the user profile/settings page with:

- Clear explanation of what will be deleted vs. anonymized
- Require password re-entry or confirmation dialog
- Show a summary of data that will be removed
- Irreversible action warning

**Route**: Add to `src/routes/_user/profile/` or create `src/routes/_user/settings/`

**Edge Function** (for Supabase auth.users deletion):

- Supabase doesn't allow users to delete themselves from `auth.users` via client SDK
- Create a Supabase Edge Function that calls the admin API to delete the auth user after the RPC runs

#### 2.2 — Data Export (Right to Portability, Art. 20)

**Priority: Critical**

Create an RPC and UI to export all user data as JSON.

**Database function**:

```sql
create or replace function public.export_user_data () returns jsonb language plpgsql security definer as $$
DECLARE
  _uid uuid := auth.uid();
  result jsonb;
BEGIN
  SELECT jsonb_build_object(
    'profile', (SELECT row_to_json(p) FROM public.user_profile p WHERE p.uid = _uid),
    'decks', (SELECT coalesce(jsonb_agg(row_to_json(d)), '[]'::jsonb) FROM public.user_deck d WHERE d.uid = _uid),
    'cards', (SELECT coalesce(jsonb_agg(row_to_json(c)), '[]'::jsonb) FROM public.user_card c WHERE c.uid = _uid),
    'reviews', (SELECT coalesce(jsonb_agg(row_to_json(r)), '[]'::jsonb) FROM public.user_card_review r WHERE r.uid = _uid),
    'chat_messages', (SELECT coalesce(jsonb_agg(row_to_json(m)), '[]'::jsonb) FROM public.chat_message m WHERE m.sender_uid = _uid),
    'friend_actions', (SELECT coalesce(jsonb_agg(row_to_json(f)), '[]'::jsonb) FROM public.friend_request_action f WHERE f.uid_by = _uid),
    'phrases_created', (SELECT coalesce(jsonb_agg(row_to_json(ph)), '[]'::jsonb) FROM public.phrase ph WHERE ph.added_by = _uid),
    'translations_created', (SELECT coalesce(jsonb_agg(row_to_json(t)), '[]'::jsonb) FROM public.phrase_translation t WHERE t.added_by = _uid),
    'playlists', (SELECT coalesce(jsonb_agg(row_to_json(pl)), '[]'::jsonb) FROM public.phrase_playlist pl WHERE pl.uid = _uid),
    'comments', (SELECT coalesce(jsonb_agg(row_to_json(rc)), '[]'::jsonb) FROM public.request_comment rc WHERE rc.uid = _uid),
    'upvotes', jsonb_build_object(
      'comment_upvotes', (SELECT coalesce(jsonb_agg(row_to_json(cu)), '[]'::jsonb) FROM public.comment_upvote cu WHERE cu.uid = _uid),
      'request_upvotes', (SELECT coalesce(jsonb_agg(row_to_json(ru)), '[]'::jsonb) FROM public.phrase_request_upvote ru WHERE ru.uid = _uid),
      'playlist_upvotes', (SELECT coalesce(jsonb_agg(row_to_json(pu)), '[]'::jsonb) FROM public.phrase_playlist_upvote pu WHERE pu.uid = _uid)
    ),
    'exported_at', now()
  ) INTO result;

  RETURN result;
END;
$$;
```

**UI**: Button on profile/settings page: "Download My Data" → triggers RPC → downloads JSON file.

#### 2.3 — Right to Rectification (Art. 16)

**Existing**: Users can already edit their profile (username, avatar, languages_known, font_preference).

**Gaps**:

- Users cannot edit their email address through the app UI (Supabase supports this via `updateUser`)
- Add email change functionality to the profile/settings page
- Consider allowing users to edit or delete their own comments and phrase requests

#### 2.4 — Right to Restrict Processing (Art. 18)

For Sunlo's scale, account deletion (2.1) and data export (2.2) are sufficient. Full processing restriction (freezing an account without deleting it) is a lower priority but could be implemented as:

- An `account_frozen` boolean on `user_profile`
- Middleware that blocks writes when frozen
- This is optional for Phase 2; revisit if user demand arises

---

### Phase 3: Consent & Transparency

#### 3.1 — Update Privacy Policy

**Priority: High**

Rewrite `src/routes/privacy-policy.lazy.tsx` to include:

- [ ] Remove the EU exclusion disclaimer
- [ ] Specific list of all data collected (use the data inventory above)
- [ ] Lawful basis for each processing activity
- [ ] Data retention periods
- [ ] Third-party processors (Supabase) and their DPA status
- [ ] User rights: access, rectification, erasure, portability, objection, restriction
- [ ] How to exercise each right (link to settings page + contact email)
- [ ] Data transfer safeguards (Supabase SCCs)
- [ ] Right to lodge a complaint with a supervisory authority
- [ ] Contact details for data protection inquiries
- [ ] Cookie/storage explanation (JWT session tokens)
- [ ] Children's data policy (maintain existing under-13 restriction)
- [ ] Date of last update

#### 3.2 — Terms of Service

**Priority: High**

Create a Terms of Service page (`src/routes/terms-of-service.lazy.tsx`) covering:

- Acceptable use
- User-generated content licensing (phrases, translations shared with community)
- Account termination
- Liability limitations
- Link to privacy policy

#### 3.3 — Consent at Signup

**Priority: Medium**

Modify the signup flow to include:

- Checkbox: "I agree to the [Terms of Service] and [Privacy Policy]" (required)
- Store the consent timestamp in `user_profile` or a new `user_consent` table
- Schema addition:

```sql
create table public.user_consent (
	id uuid default gen_random_uuid() primary key,
	uid uuid not null references auth.users (id) on delete cascade,
	consent_type text not null, -- 'terms_and_privacy', 'marketing_email', etc.
	granted boolean not null default true,
	ip_address inet,
	user_agent text,
	created_at timestamptz default now() not null
);
```

#### 3.4 — Cookie/Storage Notice

**Priority: Low**

Sunlo only uses essential session cookies (Supabase JWT tokens) — no analytics or advertising cookies. Under GDPR, strictly necessary cookies don't require consent, but transparency is still required.

- Add a brief, non-blocking notice on first visit: "We use essential cookies for authentication. See our [Privacy Policy]."
- No opt-in/opt-out needed since there are no non-essential cookies
- If analytics are added in the future, a full cookie consent banner will be required

---

### Phase 4: Technical Hardening

#### 4.1 — Error Telemetry Consent & Data Minimization

**File**: `src/components/errors.tsx`

Current behavior: Client errors are automatically logged to `user_client_event` with stack traces, URLs, and error context — without explicit consent.

Changes needed:

- **Minimize data**: Strip or hash any potentially identifying information from error context before logging
- **Redact URLs**: Remove query parameters that might contain sensitive data
- **Lawful basis**: Document this under legitimate interest with a balancing test (reliability vs. privacy)
- **Retention**: Add a scheduled job (pg_cron or Supabase Edge Function cron) to delete records older than 90 days:

```sql
-- Run daily via pg_cron
delete from public.user_client_event
where
	created_at < now() - interval '90 days';
```

#### 4.2 — Cascade Deletes

Review foreign key constraints to ensure `ON DELETE CASCADE` or `ON DELETE SET NULL` is properly set for all user-related tables. Currently, some tables may not cascade correctly when a user is deleted.

Check and update:

- `user_card` → `ON DELETE CASCADE` from `user_deck`
- `user_card_review` → `ON DELETE CASCADE` from `user_card`
- `chat_message` → `ON DELETE CASCADE` from `auth.users` (both sender and recipient)
- `friend_request_action` → `ON DELETE CASCADE`
- All upvote tables → `ON DELETE CASCADE`

#### 4.3 — Audit Logging (Optional)

For larger-scale compliance, consider adding an audit log for data access and modifications:

- Track when user data is exported
- Track when accounts are deleted
- Track consent changes
- This is optional for Sunlo's current scale but good practice

#### 4.4 — Data Breach Notification Process

Document a process for the 72-hour notification requirement (Art. 33):

1. Detect breach (Supabase monitoring + application monitoring)
2. Assess scope and severity
3. Notify supervisory authority within 72 hours if risk to individuals
4. Notify affected users without undue delay if high risk
5. Document the breach, effects, and remedial actions

This is a process document, not a code change.

---

### Phase 5: Ongoing Compliance

#### 5.1 — Privacy by Design Review Process

For each new feature:

- Assess what personal data is collected
- Confirm lawful basis
- Apply data minimization
- Update privacy policy if new data categories are introduced
- Update ROPA

#### 5.2 — Annual Review

- Review and update privacy policy
- Verify data retention enforcement
- Review third-party processor agreements
- Test account deletion and data export flows
- Review RLS policies for any gaps

#### 5.3 — User Communication

When launching GDPR features:

- Email existing users about the updated privacy policy
- Remove the EU exclusion from the privacy policy
- Provide clear links to the new data management features

---

## Implementation Priority & Sequencing

| Priority | Item                                    | Phase | Depends On |
| -------- | --------------------------------------- | ----- | ---------- |
| **P0**   | Data Processing Agreement with Supabase | 1.2   | —          |
| **P0**   | Account Deletion (RPC + UI)             | 2.1   | —          |
| **P0**   | Data Export (RPC + UI)                  | 2.2   | —          |
| **P0**   | Updated Privacy Policy                  | 3.1   | 1.1, 1.4   |
| **P1**   | Lawful Bases Documentation (ROPA)       | 1.1   | —          |
| **P1**   | Data Retention Policy                   | 1.4   | —          |
| **P1**   | Terms of Service                        | 3.2   | —          |
| **P1**   | Consent at Signup                       | 3.3   | 3.1, 3.2   |
| **P1**   | Error Telemetry Minimization            | 4.1   | —          |
| **P1**   | Cascade Delete Audit                    | 4.2   | 2.1        |
| **P2**   | Email Change in UI                      | 2.3   | —          |
| **P2**   | Cookie/Storage Notice                   | 3.4   | 3.1        |
| **P2**   | Telemetry Retention Cron Job            | 4.1   | —          |
| **P2**   | Data Breach Process Document            | 4.4   | —          |
| **P3**   | Processing Restriction                  | 2.4   | —          |
| **P3**   | Audit Logging                           | 4.3   | —          |
| **P3**   | Annual Review Checklist                 | 5.2   | All above  |

---

## Key Decisions Needed

1. **User-generated content on deletion**: This plan proposes anonymizing (setting `added_by = NULL`) rather than deleting phrases, translations, and playlists created by a user, since they form part of the community knowledge base. Deleting them would harm other users. This needs to be clearly communicated to users in the deletion flow.

2. **Chat message deletion scope**: When a user deletes their account, should their chat messages be deleted entirely (removing them from the recipient's view too) or anonymized? This plan proposes full deletion since messages are private, but this could break conversation context for the other party.

3. **Grace period**: Should account deletion be immediate or have a 30-day cooling-off period? This plan proposes 30 days to allow recovery from accidental deletion, with immediate anonymization of the account (no login, no public profile).

4. **Supabase hosting region**: Verify whether the production Supabase instance is hosted in the EU or has adequate transfer safeguards. If hosted outside the EU, Standard Contractual Clauses (provided by Supabase's DPA) are required.

5. **Data Protection Officer**: At Sunlo's current scale, a formal DPO is likely not required (Art. 37 thresholds). Revisit if the user base grows significantly or if special category data is processed.
