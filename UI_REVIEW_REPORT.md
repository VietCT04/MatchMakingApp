# UI Review Report

## Current UI Summary

The frontend is an Expo / React Native MVP using Expo Router and plain React Native `StyleSheet` styles. The app has functional core screens, but the UI is still mostly scaffold-level.

Main problems:

- Styling is duplicated across every screen.
- Buttons, cards, labels, badges, inputs, loading states, and error states are implemented repeatedly.
- Visual hierarchy is basic: most screens use the same white card + blue button pattern.
- Loading, empty, success, and error states are text-only and feel unfinished.
- Forms work, but validation and input UX are manual and inconsistent.
- Navigation is stack-only; the app needs a real app shell, likely bottom tabs.
- No icon system, no motion layer, no skeleton loading, no toast/feedback layer.
- `apps/mobile/src/components` exists but appears unused/empty.

The current UI is acceptable for internal MVP validation, but it is not yet polished enough for a strong demo or release.

## Recommended UI Stack

- Styling solution: `NativeWind` + design tokens.
  - Fits because this is React Native / Expo and currently has many duplicated `StyleSheet` objects.
  - Solves repeated spacing, colors, typography, and variant styling.
  - Necessary now if you plan to keep adding screens.
  - MVP complexity is reasonable if introduced gradually.
  - Source: https://www.nativewind.dev/docs

- Component library: app-owned components, optionally borrowing patterns from `gluestack-ui` or React Native Reusables.
  - Fits because the product needs custom sports-specific UI, not a generic Material app.
  - Solves repeated `Button`, `Card`, `Input`, `Badge`, `EmptyState`, and screen layout code.
  - Necessary now to avoid UI drift.
  - Avoid a heavy full UI dependency for MVP unless you need dialogs, sheets, menus, and cross-platform web polish quickly.
  - Source: https://gluestack.io/ui

- Navigation framework: keep `Expo Router`, add grouped routes and bottom tabs.
  - Fits because the project already uses Expo Router.
  - Solves weak navigation flow and makes Discover, Create, Ratings, and Profile easier to access.
  - Necessary now.
  - Low complexity because Expo Router is already installed.
  - Source: https://docs.expo.dev/router/introduction/

- Animation library: `react-native-reanimated`.
  - Fits for screen transitions, card press feedback, skeleton shimmer, bottom sheets, and smoother state changes.
  - Necessary later for polish; only install now if implementing bottom sheets or animated skeletons.
  - Moderate MVP complexity.
  - Source: https://docs.expo.dev/versions/latest/sdk/reanimated/

- Gesture / bottom sheet: `react-native-gesture-handler` + `@gorhom/bottom-sheet`.
  - Fits for mobile filter panels, venue selection, date/time selection, and match actions.
  - Not necessary immediately, but useful after core reusable components exist.
  - Adds complexity because it depends on Reanimated and gesture setup.
  - Source: https://gorhom.dev/react-native-bottom-sheet/

- Icon library: `lucide-react-native`.
  - Fits sports app UI because icons can clarify location, rating, players, time, venue, filters, and status.
  - Necessary now for visual hierarchy.
  - Low complexity.
  - Source: https://lucide.dev/

- Form library: `react-hook-form` + `zod`.
  - Fits login, register, create match, score submission, and future profile editing.
  - Solves manual validation state spread across screens.
  - Necessary soon, especially before adding more forms.
  - Moderate complexity but worthwhile.
  - Sources: https://github.com/react-hook-form/react-hook-form and https://zod.dev/

- Data/loading state library: `@tanstack/react-query`.
  - Fits because the app currently has custom hooks manually tracking `loading`, `error`, `refresh`, and cache behavior.
  - Solves refetching, stale data, retry, mutations, optimistic updates, and screen focus refresh.
  - Necessary soon if backend interactions continue growing.
  - Moderate complexity, but it replaces a lot of hand-written state code.
  - Source: https://tanstack.com/query/v5/docs/framework/react/react-native

- Toast/feedback library: `sonner-native`, `react-native-toast-message`, or Tamagui/Burnt later.
  - Fits join/leave/create/submit/verify flows where inline success text is easy to miss.
  - Necessary before demo.
  - Low to moderate complexity.

## High Priority UI Issues

- File path: `apps/mobile/app/_layout.tsx`
- Screen/component name: Root layout / navigation shell
- Problem: The app uses only a stack layout. Core authenticated screens are linked from Home instead of living in a persistent app shell.
- Why it matters: Common actions require extra navigation effort and the app feels like a set of pages instead of a mobile product.
- Recommended fix: Create an authenticated tab group with Discover, Create, Ratings, and Profile. Keep Login/Register outside the tab group.
- Example improved UI structure if useful:

```tsx
app/
  (auth)/
    login.tsx
    register.tsx
  (tabs)/
    _layout.tsx
    discover.tsx
    create-match.tsx
    ratings.tsx
    profile.tsx
  match/[id].tsx
```

- File path: `apps/mobile/app/discover.tsx`
- Screen/component name: DiscoverScreen
- Problem: Match cards are dense and mostly text rows. Filters are inline chips, location controls are separate, and loading/empty states are plain text.
- Why it matters: Discovery is the main product surface. It needs to feel fast, scannable, and modern.
- Recommended fix: Extract `MatchCard`, `SportFilter`, `RadiusFilter`, `LoadingState`, `EmptyState`, and `ErrorState`. Use icons for sport, venue, time, distance, players, and rating. Replace text loading with skeleton cards.
- Example improved UI structure if useful:

```tsx
<Screen>
  <ScreenHeader title="Best matches" action={<FilterButton />} />
  <SportFilter value={sportId} options={sports} />
  <MatchList
    loading={loading}
    error={error}
    emptyMessage="No open matches nearby"
    data={matches}
    renderItem={(match) => <MatchCard match={match} />}
  />
</Screen>
```

- File path: `apps/mobile/app/create-match.tsx`
- Screen/component name: CreateMatchScreen
- Problem: Complex form is fully manual, uses raw ISO datetime input, plain text errors, and repeated option-chip logic.
- Why it matters: Match creation is a conversion-critical flow. ISO datetime input is not acceptable for normal users.
- Recommended fix: Use `react-hook-form` + `zod`, introduce `FormField`, `Input`, `SegmentedControl`, `SelectField`, and date/time picker UI. Use bottom sheets for sport/venue selection if lists grow.
- Example improved UI structure if useful:

```tsx
<CreateMatchForm>
  <FormSection title="Match basics">
    <SportSelect />
    <FormatSegmentedControl />
    <VenueSelect />
  </FormSection>
  <FormSection title="Schedule">
    <DateTimeField />
  </FormSection>
  <Button loading={isSubmitting}>Create match</Button>
</CreateMatchForm>
```

- File path: `apps/mobile/app/match/[id].tsx`
- Screen/component name: MatchDetailScreen
- Problem: Match details, participants, actions, and results are shown as stacked text cards with weak hierarchy.
- Why it matters: This screen handles joining, leaving, submitting results, and verifying results. The current UI does not clearly guide the next action.
- Recommended fix: Add a prominent match summary card, participant team cards, a sticky action area, status timeline, and toast feedback for actions.
- Example improved UI structure if useful:

```tsx
<MatchHeroCard />
<StatusTimeline status={match.status} result={match.result} />
<TeamRoster team="A" />
<TeamRoster team="B" />
<StickyActionBar primaryAction={nextBestAction} />
```

- File path: `apps/mobile/app/login.tsx` and `apps/mobile/app/register.tsx`
- Screen/component name: Auth screens
- Problem: Login and register duplicate form layout, validation, button styles, error handling, and card styling.
- Why it matters: Auth is the first impression. Duplicate code will drift quickly.
- Recommended fix: Extract `AuthCard`, `FormInput`, `PasswordInput`, `Button`, and shared validation schemas.

## Medium Priority UI Issues

- File path: `apps/mobile/app/index.tsx`
- Screen/component name: HomeScreen
- Problem: Home is a navigation list plus "How It Works" content. It is not useful after authentication if tabs exist.
- Why it matters: It adds an unnecessary step and creates unclear navigation hierarchy.
- Recommended fix: Make `/discover` the authenticated landing screen. Keep Home as unauthenticated marketing/onboarding only, or remove it from the main flow.

- File path: `apps/mobile/app/ratings.tsx`
- Screen/component name: RatingsScreen
- Problem: Ratings are presented as plain cards and text rows. Rating deltas are visible but not visually meaningful.
- Why it matters: Ratings are a major retention hook. The screen should make progress feel tangible.
- Recommended fix: Create `RatingCard`, `RatingBadge`, and `RatingHistoryItem`. Use color-coded deltas, compact stat rows, sport icons, and small trend indicators.

- File path: `apps/mobile/app/profile.tsx`
- Screen/component name: ProfileScreen
- Problem: Profile information is static, sparse, and mostly plain text. No avatar, player identity block, sport preferences, or edit affordance.
- Why it matters: Sports matchmaking depends on trust and identity.
- Recommended fix: Add `Avatar`, `ProfileHeader`, `StatCard`, and `PreferenceList`. Add an edit profile path later.

- File path: `apps/mobile/src/hooks/useMatches.ts`, `apps/mobile/src/hooks/useMatchDetail.ts`, `apps/mobile/src/hooks/useUserRatings.ts`, `apps/mobile/src/hooks/useSports.ts`, `apps/mobile/src/hooks/useVenues.ts`
- Screen/component name: Data hooks
- Problem: Every hook manually implements loading/error/refresh state.
- Why it matters: This makes consistent loading, retry, caching, stale data, and mutation feedback harder.
- Recommended fix: Move to TanStack Query with shared query keys and mutation hooks.

- File path: `apps/mobile/app/discover.tsx` and `apps/mobile/app/create-match.tsx`
- Screen/component name: Filter chips / option selectors
- Problem: Filter and option chip styles are duplicated.
- Why it matters: Chip behavior and spacing will drift across screens.
- Recommended fix: Extract `Chip`, `ChipGroup`, `SegmentedControl`, and `FilterBar`.

- File path: `apps/mobile/app/_layout.tsx`
- Screen/component name: AuthGate loading
- Problem: Initial session loading is a centered spinner on white.
- Why it matters: The first app load feels generic and unfinished.
- Recommended fix: Use branded splash/loading state with app name, primary color, and maybe a subtle animated loader.

## Low Priority UI Issues

- File path: `apps/mobile/app/profile.tsx`
- Screen/component name: Ratings Summary
- Problem: Rating summary uses plain text lines.
- Why it matters: It is readable but not memorable.
- Recommended fix: Use mini rating cards with sport, format, rating, and games played.

- File path: `apps/mobile/app/ratings.tsx`
- Screen/component name: Rating History
- Problem: History cards do not show sport/format or outcome context.
- Why it matters: Users may not understand why rating changed.
- Recommended fix: Add match metadata, opponent/team context later if backend supports it.

- File path: `apps/mobile/app/discover.tsx`
- Screen/component name: Location controls
- Problem: Radius controls remain visible even when location is not enabled.
- Why it matters: Users may not understand whether radius filtering is active.
- Recommended fix: Disable or visually mute radius chips until location is enabled.

- File path: `apps/mobile/app/match/[id].tsx`
- Screen/component name: Participant labels
- Problem: Unknown players are shown as truncated IDs.
- Why it matters: It feels technical and lowers trust.
- Recommended fix: Show user display names or avatars when available.

- File path: `apps/mobile/app/register.tsx`
- Screen/component name: RegisterScreen
- Problem: There is no link back to login.
- Why it matters: Users who already have accounts can get stuck.
- Recommended fix: Add a secondary link: "Already have an account? Log in."

## Reusable Components to Create

- Component name: `Screen`
- Purpose: Shared safe-area-aware page wrapper with background, padding, and scroll behavior.
- Where it is used: All screens.
- Suggested props: `children`, `scroll`, `padded`, `background`, `contentClassName`.
- Example usage:

```tsx
<Screen scroll>
  <ScreenHeader title="Discover" subtitle="Find nearby matches" />
</Screen>
```

- Component name: `ScreenHeader`
- Purpose: Consistent title, subtitle, and optional right action.
- Where it is used: Discover, Create Match, Match Detail, Ratings, Profile.
- Suggested props: `title`, `subtitle`, `action`, `backButton`.
- Example usage:

```tsx
<ScreenHeader title="Best matches" subtitle="Ranked by fit for your profile" action={<FilterButton />} />
```

- Component name: `Button`
- Purpose: Shared pressable CTA with variants and loading state.
- Where it is used: Auth, Create Match, Match Detail, retry actions, logout.
- Suggested props: `variant`, `size`, `loading`, `disabled`, `leftIcon`, `rightIcon`, `children`, `onPress`.
- Example usage:

```tsx
<Button variant="primary" loading={submitting}>Create match</Button>
```

- Component name: `Input`
- Purpose: Shared text input with label, helper text, and error.
- Where it is used: Login, Register, Create Match, Result submission.
- Suggested props: `label`, `value`, `onChangeText`, `placeholder`, `error`, `helperText`, `keyboardType`, `secureTextEntry`.
- Example usage:

```tsx
<Input label="Email" error={errors.email?.message} placeholder="you@example.com" />
```

- Component name: `Card`
- Purpose: Shared elevated/bordered content container.
- Where it is used: Match cards, profile sections, ratings, form sections.
- Suggested props: `variant`, `pressable`, `children`, `onPress`.
- Example usage:

```tsx
<Card variant="interactive" onPress={openMatch}>
  <Text>Saturday Doubles</Text>
</Card>
```

- Component name: `Badge`
- Purpose: Small status/category label.
- Where it is used: Match status, fit score, distance, rating range, result status.
- Suggested props: `tone`, `children`, `icon`.
- Example usage:

```tsx
<Badge tone="success">92% fit</Badge>
```

- Component name: `Avatar`
- Purpose: Player identity display.
- Where it is used: Profile, participants, match cards later.
- Suggested props: `name`, `imageUrl`, `size`.
- Example usage:

```tsx
<Avatar name={user.displayName} size="lg" />
```

- Component name: `MatchCard`
- Purpose: Scannable match preview.
- Where it is used: Discover.
- Suggested props: `match`, `onPress`, `showFitScore`, `showDistance`.
- Example usage:

```tsx
<MatchCard match={match} onPress={() => openMatch(match.id)} />
```

- Component name: `PlayerCard`
- Purpose: Participant/player row with avatar, name, team, rating.
- Where it is used: Match Detail team rosters.
- Suggested props: `player`, `team`, `isCurrentUser`, `rating`.
- Example usage:

```tsx
<PlayerCard player={participant.user} team="A" isCurrentUser />
```

- Component name: `RatingBadge`
- Purpose: Consistent rating/ELO display.
- Where it is used: Discover, Ratings, Profile, Match Detail.
- Suggested props: `rating`, `delta`, `uncertainty`, `size`.
- Example usage:

```tsx
<RatingBadge rating={1420} delta={+18} />
```

- Component name: `SportFilter`
- Purpose: Reusable sport chip selector.
- Where it is used: Discover and Create Match.
- Suggested props: `sports`, `value`, `onChange`, `includeAll`.
- Example usage:

```tsx
<SportFilter sports={sports} value={sportId} onChange={setSportId} includeAll />
```

- Component name: `EmptyState`
- Purpose: Branded empty state with icon, title, body, optional action.
- Where it is used: Discover, Ratings, Profile.
- Suggested props: `icon`, `title`, `message`, `actionLabel`, `onAction`.
- Example usage:

```tsx
<EmptyState title="No matches nearby" actionLabel="Create one" onAction={goCreateMatch} />
```

- Component name: `LoadingState`
- Purpose: Shared spinner/skeleton state.
- Where it is used: All async screens.
- Suggested props: `variant`, `rows`, `message`.
- Example usage:

```tsx
<LoadingState variant="match-list" rows={3} />
```

- Component name: `ErrorState`
- Purpose: Consistent error display with retry.
- Where it is used: All async screens.
- Suggested props: `title`, `message`, `onRetry`.
- Example usage:

```tsx
<ErrorState message={error} onRetry={refresh} />
```

- Component name: `BottomTabBar`
- Purpose: Main authenticated navigation.
- Where it is used: App tab layout.
- Suggested props: likely Expo Router tab config rather than a custom component initially.
- Example usage:

```tsx
<Tabs.Screen name="discover" options={{ title: 'Discover' }} />
```

## Design System Proposal

- Colors:
  - `background`: `#F6F8FC`
  - `surface`: `#FFFFFF`
  - `surfaceMuted`: `#EEF3F8`
  - `primary`: `#0B5FFF`
  - `primaryDark`: `#123A7A`
  - `ink`: `#122033`
  - `muted`: `#607089`
  - `border`: `#D7E0EC`
  - `success`: `#087A4B`
  - `warning`: `#B7791F`
  - `danger`: `#C2410C`
  - `info`: `#2563EB`
  - Sports accent: use controlled accents such as badminton green, tennis lime, pickleball orange, but keep primary app blue.

- Typography:
  - Display: 32 / 38, weight 800.
  - Screen title: 28 / 34, weight 800.
  - Section title: 18 / 24, weight 700.
  - Card title: 16 / 22, weight 700.
  - Body: 15 / 22, weight 400.
  - Label: 13 / 18, weight 600.
  - Caption: 12 / 16, weight 500.

- Spacing:
  - `xs`: 4
  - `sm`: 8
  - `md`: 12
  - `lg`: 16
  - `xl`: 20
  - `2xl`: 24
  - `3xl`: 32

- Radius:
  - Input/chip: 10
  - Button: 12
  - Card: 16
  - Sheet/modal: 24
  - Pill: 999

- Shadows/elevation:
  - MVP default: border-based cards.
  - Featured card: subtle shadow/elevation only on match cards and profile header.
  - Avoid heavy shadows everywhere.

- Button styles:
  - Primary: solid blue, white text.
  - Secondary: white/transparent with blue border.
  - Ghost: no border, muted text.
  - Danger: red text or red solid only for destructive actions.
  - Disabled: lower opacity plus no press feedback.
  - Loading: spinner or inline progress indicator, not just text change.

- Card styles:
  - Default: white, border, radius 16, padding 16.
  - Interactive: default plus pressed scale/opacity.
  - Featured: soft blue/green gradient or accent border for best-fit matches.
  - Dense: smaller padding for list rows.

- Status styles:
  - Open: green badge.
  - Full: amber badge.
  - Completed: slate badge.
  - Cancelled: red badge.
  - Pending verification: blue/amber badge.
  - Verified: green badge.

- Rating/ELO display style:
  - Show rating as a strong numeric pill: `1420`.
  - Show delta beside it: `+18` green, `-12` red.
  - Show uncertainty as secondary text, not equal weight.
  - Use labels like `Beginner`, `Intermediate`, `Advanced` only if thresholds are defined.

## Screen-by-Screen Improvement Plan

- HomeScreen: `apps/mobile/app/index.tsx`
  - Current problems: acts as a manual navigation menu; weak visual role after login; links look like cards but behave like navigation buttons.
  - Suggested improvements: use only for unauthenticated onboarding or remove from authenticated flow; route logged-in users directly to Discover.
  - Recommended components/libraries: `Screen`, `Button`, `Card`, Expo Router route groups.
  - Priority level: Medium.

- LoginScreen: `apps/mobile/app/login.tsx`
  - Current problems: duplicated auth form code; no password visibility toggle; no branded visual treatment; submit feedback is text-only.
  - Suggested improvements: shared auth layout, `PasswordInput`, better keyboard handling, toast for success/failure, `react-hook-form`.
  - Recommended components/libraries: React Hook Form, Zod, `Input`, `Button`, `AuthCard`, Lucide icons.
  - Priority level: High.

- RegisterScreen: `apps/mobile/app/register.tsx`
  - Current problems: duplicated with login; missing login link; manual validation.
  - Suggested improvements: shared form primitives, password requirements helper, route back to login.
  - Recommended components/libraries: React Hook Form, Zod, `Input`, `Button`.
  - Priority level: High.

- DiscoverScreen: `apps/mobile/app/discover.tsx`
  - Current problems: main screen is dense; filters consume vertical space; cards are mostly text; loading/empty states are weak.
  - Suggested improvements: better card hierarchy, sport/radius filter components, bottom sheet filters, skeleton list, icon metadata rows.
  - Recommended components/libraries: NativeWind, Lucide, Reanimated, TanStack Query, optional Gorhom Bottom Sheet.
  - Priority level: High.

- CreateMatchScreen: `apps/mobile/app/create-match.tsx`
  - Current problems: ISO datetime input; large manual form; plain error/success states; repeated chip code.
  - Suggested improvements: sectioned form with controlled components, date/time picker, venue picker, sticky submit button, toast on create.
  - Recommended components/libraries: React Hook Form, Zod, NativeWind, optional Bottom Sheet.
  - Priority level: High.

- MatchDetailScreen: `apps/mobile/app/match/[id].tsx`
  - Current problems: lots of text cards; weak next-action guidance; participant groups feel technical; success/error messages are inline and easy to miss.
  - Suggested improvements: hero summary, team roster cards, action bar, result workflow timeline, toasts for actions.
  - Recommended components/libraries: Lucide, Reanimated, toast library, `MatchHeroCard`, `PlayerCard`, `StatusTimeline`.
  - Priority level: High.

- RatingsScreen: `apps/mobile/app/ratings.tsx`
  - Current problems: ratings and history are readable but visually flat.
  - Suggested improvements: `RatingCard`, stat grid, delta chips, trend/history timeline.
  - Recommended components/libraries: Lucide, `RatingBadge`, `Card`.
  - Priority level: Medium.

- ProfileScreen: `apps/mobile/app/profile.tsx`
  - Current problems: no avatar/profile header; no edit affordance; ratings summary is plain text.
  - Suggested improvements: player header, avatar initials, sport/rating stat cards, future profile edit.
  - Recommended components/libraries: `Avatar`, `StatCard`, `RatingBadge`.
  - Priority level: Medium.

## Recommended Implementation Plan

1. Add design tokens first: colors, spacing, radius, typography, status colors.
2. Create `Screen`, `ScreenHeader`, `Button`, `Input`, `Card`, `Badge`, `EmptyState`, `LoadingState`, and `ErrorState`.
3. Add Expo Router authenticated tab layout.
4. Refactor Login/Register to shared form components.
5. Refactor Discover with `MatchCard`, `SportFilter`, skeleton loading, and proper empty/error states.
6. Refactor Create Match with React Hook Form + Zod and replace ISO datetime input.
7. Refactor Match Detail with hero card, team roster, status timeline, and action feedback.
8. Add Lucide icons across metadata, tabs, buttons, and empty states.
9. Introduce TanStack Query for data fetching and mutations.
10. Add Reanimated and bottom sheets only after the component layer is stable.

## Top 10 UI Improvements to Do First

1. Add authenticated bottom tabs using Expo Router.
2. Create shared `Button`, `Input`, `Card`, `Badge`, and `Screen` primitives.
3. Replace text-only loading states with skeletons.
4. Redesign Discover match cards for scanability.
5. Replace raw ISO datetime input in Create Match.
6. Add React Hook Form + Zod for Login, Register, and Create Match.
7. Add consistent empty/error/success states.
8. Add Lucide icons for tabs, metadata, filters, status, and empty states.
9. Add a sticky/clear action area on Match Detail.
10. Move API state to TanStack Query for consistent refresh, retry, and mutation feedback.

## MVP Suitability

The current UI is acceptable for an internal MVP because the main flows exist and are understandable. It is not yet strong enough for a polished demo or public release.

Must improve before demo/release:

- Bottom-tab navigation.
- Reusable UI primitives.
- Discover card quality.
- Create Match form UX.
- Match Detail action clarity.
- Loading, empty, error, and success states.
- Basic iconography and consistent design tokens.

The best immediate path is not to adopt a heavy all-in-one UI kit. Use NativeWind or a tokenized styling layer, build a small app-owned component system, then add targeted libraries only where they solve clear product problems.

## Implementation Update (2026-04-26)

This section tracks what has been implemented from this review, and what is still pending.

### Done

- [x] Added Expo Router route groups for clearer app shell structure:
  - `app/(auth)/login.tsx`
  - `app/(auth)/register.tsx`
  - `app/(tabs)/_layout.tsx`
  - `app/(tabs)/discover.tsx`
  - `app/(tabs)/create-match.tsx`
  - `app/(tabs)/ratings.tsx`
  - `app/(tabs)/profile.tsx`
- [x] Added authenticated bottom-tab navigation (`Discover`, `Create`, `Ratings`, `Profile`).
- [x] Updated auth gating in `app/_layout.tsx` for grouped routes and direct authenticated landing to `/discover`.
- [x] Created reusable UI primitives:
  - `src/components/Screen.tsx`
  - `src/components/ScreenHeader.tsx`
  - `src/components/ui/AppButton.tsx`
  - `src/components/ui/AppInput.tsx`
  - `src/components/ui/AppCard.tsx`
  - `src/components/ui/Badge.tsx`
  - `src/components/ui/Chip.tsx`
  - `src/components/ui/tokens.ts`
- [x] Created reusable state components:
  - `src/components/states/LoadingState.tsx`
  - `src/components/states/ErrorState.tsx`
  - `src/components/states/EmptyState.tsx`
- [x] Refactored Discover screen to use shared components and clearer state handling.
- [x] Implemented low-priority discover fix: radius chips are disabled when location is not enabled.
- [x] Refactored Create Match screen to use shared components and reduced duplicated chip/input/button code.
- [x] Refactored Login/Register to use shared primitives and removed duplicated raw styling patterns.
- [x] Implemented low-priority register fix: added "Already have an account? Log in." link.
- [x] Added participant identity improvements on Match Detail by showing participant display names and reliability score badges (instead of technical ID-heavy display).
- [x] Added trust/safety action UI on Match Detail using existing primitives:
  - creator-only no-show action after match start
  - dispute submitted result action for participants
  - report participant action (excluding current user)
- [x] Completed Match Detail redesign with reusable match components:
  - `MatchHeroCard`
  - `MatchStatusTimeline`
  - `TeamRosterCard`
  - `ParticipantRow`
  - `MatchResultCard`
  - `MatchActionPanel`
  - `TrustSafetyPanel`
- [x] Result workflow UX now has clearer states (no result, pending verification, verified, disputed) and improved action visibility rules.
- [x] Added match chat MVP route and integration:
  - `app/match-chat/[id].tsx`
  - match detail entry button for creator/participants
  - REST polling refresh pattern (manual + interval while focused)
  - aligned sender/current-user message bubbles with shared primitives
- [x] Added in-app Notifications tab MVP using shared primitives:
  - unread count header + mark all as read
  - read/unread list state
  - focus refresh + manual refresh
  - tap-to-open notification with match deep-link support
- [x] Added mobile Notification settings screen (`/notification-settings`) with save-based toggle UX:
  - fetch current backend preferences
  - edit `matchUpdates`, `chatMessages`, `results`, `trustSafety`, `ratingUpdates`
  - loading/error/retry and save success/error feedback
  - entry point from Notifications tab
- [x] Added map discovery screen (`/map`) using `react-native-maps`:
  - current-location permission flow
  - ranked nearby fetch using `latitude`, `longitude`, `radiusKm`, `ranked=true`
  - marker-based match browsing with selected-match preview + deep-link to match detail
  - Discover integration through a `Map view` action
- [x] Added reliability summary card on Profile screen.
- [x] Extended Discover cards to surface reliability from ranked breakdown when available.

### Not Done Yet

- [ ] NativeWind adoption and full token-driven styling migration.
- [ ] Lucide icon system integration.
- [ ] React Hook Form + Zod migration for auth/create/result forms.
- [ ] TanStack Query migration for data hooks and mutations.
- [ ] Reanimated skeleton loading and motion polish.
- [ ] Bottom-sheet filter/selector UX (`@gorhom/bottom-sheet`).
- [ ] Match Detail sticky action bar refinement (current redesign does not use sticky action positioning).
- [ ] Ratings/Profile deeper componentization (`RatingCard`, `Avatar`, `StatCard`, trend indicators).
- [ ] Toast layer for action feedback.
- [ ] Full componentization pass for all existing screens (some screens are still mixed with local styles).
- [ ] Advanced notification controls (per-match mute and quiet hours).
- [ ] Push receipt analytics visibility in UI.

## Update - Implemented: Profile and Preferences
- Added editable profile UX in mobile Profile screen (display name, bio, home location text + save feedback).
- Added dedicated Player Preferences screen with sections for sports/formats, preferred venues, and weekly availability.
- Added Discover card signal for Preference fit when ranked response includes itBreakdown.preferenceScore.
- Not yet done in this slice: avatar upload/file picker UX, advanced availability editor, and calendar integration.

## Update - Auto Matchmaking MVP UI
- Added Find match screen for creating matchmaking tickets and triggering search.
- Added Matchmaking proposals screen for accept/decline and confirmed match navigation.
- Added Discover entry CTA: Find match automatically.
- UI uses existing app primitives and keeps flow simple for demo/use testing.


## Update - Matchmaking proposal negotiation UI
- Added proposal detail route with: proposal status, participant list, chat, location proposals, accept/decline actions, and cancel proposal action.
- Updated proposal list cards to open detail screen and show latest location proposal status.
- Added helper text for manual Google Maps link + lat/lng input workflow.


## Update - Negotiation room polish
- Proposal detail screen now shows clearer sections, participant display names, reliability hints, status badges, and action error feedback.
- Chat section now supports periodic REST polling while focused plus manual refresh and post-send refresh.
- Location section now highlights latest proposal state and participant response statuses with clearer required-field guidance.

