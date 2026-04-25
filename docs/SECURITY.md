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
- Mobile stores access tokens with Expo SecureStore.

## Future Auth Requirements (TODO)
- Add refresh tokens or session revocation.
- Add stronger production password policy and account recovery.
- Add email verification.
- Add role/permission model for organizers/admins.

## Rate Limiting (TODO)
- Add request throttling for login, registration, and write endpoints.
- Add abuse detection around match spam and suspicious behavior.

## Payment Security (TODO)
- If payments are added, use PCI-compliant provider.
- Verify webhook signatures.
- Store minimal payment data and avoid sensitive card storage.

## Report Abuse / Moderation (TODO)
- Add abuse reporting flow.
- Add moderation actions for toxic chat/spam/fraud.
- Add dispute tooling for match results.

## Related Docs
- [Contributing](./CONTRIBUTING.md)
- [Roadmap](./ROADMAP.md)
