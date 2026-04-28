# Security Notes

## No Secrets in Git
- Do not commit API keys, tokens, or private credentials.
- Use `.env` for local secrets.
- Keep `.env.example` as safe template values only.

## Environment Variables
- Configure local runtime through env files/variables:
  - `DATABASE_URL`
  - `PORT`
  - `EXPO_PUBLIC_API_URL`

## Input Validation
- Backend uses Nest `ValidationPipe` globally.
- Continue adding class-validator decorators to all request DTOs.
- Avoid accepting unvalidated payloads.

## Auth Status
- Auth is JWT-based for the MVP.
- Passwords are hashed with bcrypt before storage.
- Protected write endpoints derive identity from the token instead of trusting request body user IDs.
- Role-based access control is implemented for moderation workflows:
  - `USER` cannot access moderation endpoints
  - `MODERATOR` and `ADMIN` can access moderation endpoints
- Match mutation endpoints are protected:
  - `PATCH /matches/:id` requires JWT + owner/admin/moderator authorization
  - `DELETE /matches/:id` requires JWT + owner/admin/moderator authorization
- Mobile stores access tokens with Expo SecureStore.
- Push token registration/deactivation endpoints are JWT-protected and scoped to the current user.
- Notification listing/read APIs are per-user only; cross-user notification access is blocked.
- Match-level notification preference and chat unread/read APIs are JWT-protected and require match access (creator or participant).

## Future Auth Requirements (TODO)
- Add refresh tokens or session revocation.
- Add stronger production password policy and account recovery.
- Add email verification.
- Expand role model beyond moderation (fine-grained permissions and scoped admin controls).

## Rate Limiting (TODO)
- Add request throttling for login, registration, and write endpoints.
- Add abuse detection around match spam and suspicious behavior.
- Add throttling/abuse controls for push token registration spam and notification-heavy actions.

## Push Notification Security Notes
- In-app `Notification` records remain the source of truth; push is a best-effort delivery layer.
- Push delivery failures must not block core workflows (join, chat, result, trust/safety actions).
- Invalid Expo tokens are deactivated when Expo returns `DeviceNotRegistered`.
- Never expose another user's push tokens from APIs.
- Notification preference changes are JWT-protected under `/me/notification-preferences`.
- Quiet hours and per-match mute only affect push delivery; in-app notification records are still persisted for auditability.

## Payment Security (TODO)
- If payments are added, use PCI-compliant provider.
- Verify webhook signatures.
- Store minimal payment data and avoid sensitive card storage.

## Report Abuse / Moderation
- Abuse reporting and dispute creation are implemented.
- Moderator/admin resolution workflows are implemented for:
  - reports (`REVIEWED` / `DISMISSED`)
  - disputes (`RESOLVED` / `REJECTED`)
  - no-show reviews (`CONFIRM` / `REVERSE`)
- Moderation actions are audited in `ModerationAction` records.
- Dispute score correction actions include audit metadata (original vs corrected score and whether rating correction was applied).
- Rating corrections preserve original `RatingHistory` rows by marking them reverted and appending correction rows.
- Remaining TODO:
  - richer moderation dashboard
  - toxic chat/spam automation
  - Elo rollback and score-correction tooling after dispute resolution

## Related Docs
- [Contributing](./CONTRIBUTING.md)
- [Roadmap](./ROADMAP.md)
