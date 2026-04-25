# Product Requirements

## Product Vision
Create a reliable sports matchmaking platform for racket sports where players can find balanced matches quickly and build trust through transparent ratings and participation history.

## Target Users
- Casual players who want regular games nearby.
- Competitive players looking for similarly skilled opponents.
- Community organizers and club hosts coordinating sessions.

## Main Sports
- Badminton
- Pickleball
- Tennis
- Other racket sports (expandable catalog)

## MVP User Stories
- As a player, I can create an account/profile with email/password JWT auth.
- As a player, I can set my profile details and preferred sports.
- As a player, I can discover open matches.
- As a player, I can create a match with basic constraints.
- As a player, I can join an open match.
- As a player, I can view basic rating information.
- As a player, I can see match details and participants.

## Core Flows
- Onboarding
  - User signs up/logs in with email/password.
- Profile setup
  - User sets display name, bio, location text.
- Discover matches
  - User browses open matches and rating/format constraints.
- Create match
  - User sets sport, format, schedule, capacity.
- Join match
  - User joins as participant with status/team state.
- Submit result
  - TODO: add endpoint and data workflow.
- Verify result
  - TODO: add verification workflow.
- Update rating
  - TODO: apply and persist Elo updates after verified results.

## Non Goals for MVP
- Production-grade payments.
- Full realtime chat implementation.
- Advanced AI matchmaking.
- Full moderation/admin control panel.
- Complete social graph features.

## Future Features
- Full authentication and account security.
- Location-aware search and map UI.
- Realtime chat per match.
- Push notifications for invites/reminders.
- Payments/deposits for venue cost sharing.
- Club/organizer dashboards and tooling.
- Advanced rating systems (Glicko-2, TrueSkill).

## Success Metrics
- Weekly active players.
- Match creation to fill-rate.
- Match completion rate.
- Time-to-find-match.
- Return rate after first 3 matches.
- Dispute rate on submitted match results.
