# CONNECTLY — MASTER IMPLEMENTATION PROMPT
## Production-Quality Full-Stack Private Chat Application

You are acting as a **senior full-stack software engineer, software architect, and pragmatic technical lead** working inside my existing repository.

Your responsibility is to build **Connectly**, a polished, real-time, private one-to-one messaging application inspired by the usability of WhatsApp and modern messaging platforms.

The application should be a credible portfolio project that demonstrates strong frontend engineering, backend architecture, real-time communication, security, testing, and deployment knowledge.

The code must be readable, maintainable, testable, and architecturally intentional. It must look like code maintained by an experienced engineer—not generic AI-generated code.

---

# 1. CRITICAL: EXISTING REPOSITORY

I have already initialized the repository.

```text
Repository: ~/projects/connectly
Package manager: pnpm
Monorepo: Turborepo
Git: Already initialized
```

The existing generated structure includes:

```text
connectly/
├── apps/
│   ├── docs/
│   └── web/
├── packages/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── ui/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── ...
```

## Repository rules

- Do not create another monorepo.
- Do not run `create-turbo` again.
- Do not delete or replace the existing repository.
- Preserve the existing `apps/web`.
- Preserve the existing `apps/docs`.
- Preserve and reuse `packages/ui` where appropriate.
- Add the backend at `apps/server`.
- Inspect the current repository before making any changes.
- Check the installed framework versions before using version-specific APIs.
- Do not replace working configuration without a clear technical reason.
- Do not install packages that are already available.
- Do not assume the repository is identical to a standard Turborepo starter.

The expected project structure should evolve toward:

```text
connectly/
├── apps/
│   ├── web/                 # Next.js frontend
│   ├── server/              # Express + Socket.IO backend
│   └── docs/                # Existing documentation app
├── packages/
│   ├── ui/                  # Reusable UI components
│   ├── eslint-config/
│   └── typescript-config/
├── docs/
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
└── ...
```

This is a target structure, not permission to blindly restructure the repository. Inspect first and adapt carefully.

---

# 2. PRODUCT VISION

Build a responsive private messaging application named **Connectly**.

The user experience should feel like a polished modern messaging product:

- Clean, premium, minimal interface.
- Light theme.
- Dark theme.
- System theme preference.
- Responsive desktop, tablet, and mobile layouts.
- Private one-to-one conversations.
- Real-time message delivery.
- Online/offline presence.
- Typing indicators.
- Read receipts.
- Message history.
- User search.
- Profile and account settings.
- Image and file sharing.
- Notifications.
- Conversation search.

## Explicitly out of scope for the initial release

Do not implement these unless I approve a future scope change:

- Group conversations.
- Voice calls.
- Video calls.
- Public channels.
- End-to-end encryption.
- Stories or status updates.
- Payments.
- Social feeds.

Do not claim that the application provides end-to-end encryption unless a proper, reviewed cryptographic design is implemented.

---

# 3. TECHNOLOGY STACK

Use the following stack, while checking compatibility with the versions already installed.

## Frontend — `apps/web`

- Next.js App Router
- React
- TypeScript with strict settings
- Tailwind CSS
- shadcn/ui where appropriate
- Lucide React
- Framer Motion for restrained, purposeful animation
- Axios for HTTP communication
- TanStack Query for server-state management where appropriate
- React Hook Form
- Zod
- `@hookform/resolvers`
- `next-themes` for theme management
- `next/image` for optimized images

## Backend — `apps/server`

- Node.js
- Express
- TypeScript
- MongoDB
- Mongoose
- Socket.IO
- Zod for request validation
- JWT-based authentication with a secure refresh/session strategy
- Structured logging
- Centralized error handling

## Testing and quality

Use compatible versions of:

- Jest or Vitest, depending on the existing setup and package compatibility.
- React Testing Library
- Supertest for HTTP integration tests.
- Socket.IO testing utilities where appropriate.
- ESLint.
- TypeScript type checking.

Do not add every possible tool automatically. Choose a consistent setup that fits the repository.

## Infrastructure

- Docker and Docker Compose for local development.
- GitHub Actions for CI.
- Environment-based configuration.
- Vercel for the frontend where appropriate.
- A suitable Node.js hosting platform or AWS for the backend.
- MongoDB Atlas or another suitable managed MongoDB deployment.

Do not assume a free hosting provider supports persistent sockets, long-running processes, or required networking. Verify platform constraints before recommending deployment configuration.

---

# 4. SENIOR ENGINEER CODE QUALITY — NON-NEGOTIABLE

## Core principle

All code must be written and reviewed to the standard of an experienced senior software engineer maintaining a real production application.

The code must be:

- Readable.
- Maintainable.
- Testable.
- Secure.
- Consistent.
- Intentional.
- Easy for another engineer to understand.

Avoid generic AI-generated coding patterns, unnecessary abstractions, repetitive boilerplate, oversized files, speculative features, and over-engineering.

Do not claim code is “human-written.” Demonstrate quality through the implementation itself.

## Architecture and repository discipline

- Inspect existing files, scripts, dependencies, conventions, and architecture before changing anything.
- Preserve the existing Turborepo structure.
- Keep frontend and backend responsibilities separate.
- Use feature-oriented organization where it improves discoverability.
- Keep shared packages focused.
- Avoid circular dependencies.
- Do not duplicate utilities, API clients, types, or validation schemas.
- Follow installed framework and library versions.
- Make scoped changes. Do not refactor the entire repository just to apply a coding standard.

## React components

- Keep components focused on one responsibility.
- Extract reusable components when there is a real reuse or readability benefit.
- Separate presentation from business logic and data access.
- Prefer composition over deeply nested conditionals or overly configurable components.
- Avoid giant components containing unrelated state, effects, event handlers, and rendering logic.
- **Do not use more than five `useState` calls in one component.** If state becomes complex, evaluate a custom hook, `useReducer`, an appropriate state store, or component decomposition.
- Do not split components mechanically just to reduce line count.
- Avoid unnecessary prop drilling.
- Use `React.memo`, `useMemo`, and `useCallback` only when there is a meaningful reason.
- Prefer Server Components by default and use Client Components only where interactivity requires them.
- Avoid unnecessary `useEffect`, particularly for derived state.

## Custom hooks

Extract reusable stateful behavior into focused custom hooks.

Examples:

```text
useAuthSession
useChatMessages
useConversationSocket
useTypingIndicator
usePresence
useUnreadMessages
useConversationSearch
```

These are examples, not a requirement to create every hook.

- Each hook must have a clear responsibility.
- Keep its API small and understandable.
- Do not create a hook for trivial logic that is clearer inline.
- Do not create giant hooks that manage an entire feature.
- Keep UI rendering out of hooks unless the hook is explicitly designed for UI composition.

## File organization

Use a consistent, feature-oriented structure where appropriate:

```text
features/
  conversations/
    components/
    hooks/
    services/
    schemas/
    types/
    utils/
    constants/
```

Conventions:

- `components/` — focused UI components.
- `hooks/` — reusable React hooks.
- `services/` — API and external-service interactions.
- `schemas/` — Zod validation schemas.
- `types/` — reusable feature-specific types.
- `constants/` — stable constants and configuration values.
- `utils/` or `helpers/` — pure reusable functions.
- `lib/` — shared infrastructure utilities, not a dumping ground.

Use `PascalCase` for React component names and `camelCase` for functions, variables, hooks, and utility files.

Do not create a file for every tiny expression. Split files when responsibilities differ, not because of an arbitrary line count.

Use barrel exports selectively. Avoid barrels that hide dependencies or cause circular imports.

## Constants, types, and TypeScript

- Avoid scattered magic strings and numbers.
- Define meaningful constants close to the feature that owns them.
- Use `as const` when literal inference is useful.
- Prefer literal unions when they are clearer than enums.
- Use strict TypeScript.
- Avoid `any`.
- Avoid type assertions used only to silence compiler errors.
- Infer types from Zod schemas where practical.
- Avoid duplicate type definitions between frontend and backend.
- Share contracts only through an appropriate package and only when stable.
- Explicitly model API responses, domain entities, errors, and relevant loading states.

## Helpers and business logic

- Keep pure business logic in small, testable functions.
- Keep helpers independent of React whenever possible.
- Avoid hidden side effects.
- Prefer explicit control flow over clever one-liners.
- Use early returns to reduce unnecessary nesting.
- Do not duplicate business rules across routes, services, components, and sockets.
- Put each business rule in a suitable domain or service layer.

## Higher-Order Components

Do not use HOCs by default.

Prefer hooks and composition for ordinary React behavior. Use a Higher-Order Component only when it provides a genuine cross-cutting benefit and is clearer than the alternatives.

## Forms and validation

- Use React Hook Form for forms.
- Use Zod for validation.
- Integrate them using the appropriate resolver.
- Keep schemas reusable and close to the feature they validate.
- Infer form types from schemas where practical.
- Provide accessible labels and useful field-level error messages.
- Validate client-side for usability and server-side for security.
- Handle submission, server errors, duplicate submissions, and success states.
- Do not manually duplicate form state with `useState` when React Hook Form already manages it.

## Next.js conventions

- Follow the installed Next.js version and App Router conventions.
- Use Server Components by default.
- Keep server-only code out of client bundles.
- Use the current request interception convention supported by the installed version. For versions supporting it, use `proxy.ts`; do not blindly introduce an outdated `middleware.ts` pattern.
- Proxy-level checks are not a replacement for authorization inside server routes, actions, or API handlers.
- Use `next/image` appropriately.
- Configure remote image hosts explicitly.
- Use correct image sizes, aspect ratios, and responsive behavior.
- Use dynamic imports or lazy loading for expensive features when they materially improve performance.
- Avoid loading large libraries into the initial bundle unnecessarily.
- Use route-level loading, error, and not-found boundaries where appropriate.
- Never expose secrets or server-only environment variables to the browser.

## API and security

- Use a centralized Axios client.
- Organize endpoint definitions and request/response types.
- Use consistent error handling.
- Validate request bodies, parameters, and query strings.
- Enforce authentication and authorization on the server.
- Verify conversation membership for every protected conversation and message operation.
- Never treat a conversation ID as proof of authorization.
- Never trust client-provided user IDs, roles, permissions, or membership.
- Avoid leaking tokens, credentials, stack traces, or sensitive information.
- Use secure cookie and token handling appropriate to the authentication design.
- Apply the same authorization rules to Socket.IO events and HTTP endpoints.
- Add rate limiting and appropriate security headers.
- Validate uploads and enforce file-size and content-type limits.

## Performance

- Avoid unnecessary rerenders and expensive computations.
- Paginate or cursor-load message history.
- Do not fetch all users, conversations, or messages at once.
- Load older messages without blocking the initial conversation view.
- Optimize image uploads and image rendering.
- Lazy-load non-critical features when appropriate.
- Avoid premature optimization.
- Keep dependencies intentional.

## Comments and documentation

- Comments should explain why a non-obvious decision exists.
- Do not narrate obvious code.
- Document important architectural decisions, security-sensitive flows, and edge cases.
- Keep setup instructions accurate.
- Do not leave placeholder implementations, fake data, unexplained TODOs, or unused code in completed phases.

## Testing

- Test meaningful business logic, validation, authorization, and critical UI behavior.
- Test edge cases and failure paths.
- Use the repository's established test tools.
- Run relevant lint, type-check, and test scripts after implementation.
- Fix issues introduced by the phase before declaring it complete.
- Never weaken or remove tests simply to make a build pass.
- Avoid tests that depend unnecessarily on internal implementation details.

## Code review checklist

Before completing a phase, confirm:

- Components have clear responsibilities.
- Complex state is extracted into focused hooks or modules.
- No component has more than five `useState` calls without a clear, justified exception.
- Types, schemas, constants, and helpers are organized consistently.
- No unnecessary HOCs or abstractions were introduced.
- Forms use React Hook Form and Zod where appropriate.
- Next.js conventions match the installed version.
- Images and expensive features are optimized appropriately.
- Authorization is enforced server-side.
- Loading, empty, error, and success states are handled.
- Lint, type checking, and relevant tests pass.
- The diff contains only intentional changes.

**Quality over quantity. A smaller, well-designed implementation is better than a large implementation full of repetitive code and unnecessary complexity.**

---

# 5. UI AND UX EXPECTATIONS

Connectly should look like a real messaging application, not a generic admin dashboard.

## Main application layout

Desktop:

```text
┌──────────────────────────────────────────────────────────────┐
│ Sidebar / Conversations │ Active Conversation                │
│                         │                                    │
│ Profile                 │ Conversation header                │
│ Search                  │                                    │
│ Conversation list       │ Message history                    │
│                         │                                    │
│                         │ Message composer                   │
└──────────────────────────────────────────────────────────────┘
```

Mobile:

- Use a conversation-list screen.
- Open a conversation as a dedicated screen.
- Provide intuitive back navigation.
- Do not force the desktop split layout onto small screens.

## UI details

- Consistent spacing and typography.
- Clean visual hierarchy.
- Thoughtful empty states.
- Skeleton loading states.
- Useful error states.
- Responsive dialogs and menus.
- Accessible keyboard interaction.
- Clear focus indicators.
- Subtle animation, not excessive motion.
- Consistent light and dark themes.
- Reusable design tokens.
- Avoid unnecessary gradients, excessive glassmorphism, and decorative elements that reduce usability.

Use shadcn/ui and shared UI components where appropriate. Do not rebuild every common control from scratch.

---

# 6. APPLICATION FEATURES

## Authentication

- Registration.
- Login.
- Logout.
- Session persistence.
- Refresh/session renewal according to the chosen auth design.
- Protected application routes.
- Profile setup.
- Password hashing.
- Authentication validation.
- Authorization checks.
- Secure cookie handling.

## User discovery

- Search users by name or username.
- Avoid exposing private user information.
- Start a private conversation.
- Prevent duplicate one-to-one conversations between the same two users.

## Private conversations

- One-to-one conversations only.
- Conversation list.
- Last-message preview.
- Unread message count.
- Last-message timestamp.
- Conversation history.
- Pagination or cursor-based history loading.
- Empty and loading states.

## Messaging

- Send and receive text messages.
- Persist messages.
- Real-time message delivery.
- Optimistic UI where appropriate.
- Reconcile optimistic messages with server-confirmed messages.
- Handle reconnects and duplicate delivery safely.
- Message timestamps.
- Read receipts.
- Typing indicators.
- Online/offline presence.
- Message notifications.

## Attachments

- Image uploads.
- File uploads.
- File type and size validation.
- Upload progress where practical.
- Secure access to uploaded files.
- Image previews.
- Appropriate image optimization.
- Avoid trusting file extensions alone.

## Profile and settings

- Display name.
- Username.
- Profile image.
- Status or short bio.
- Theme preference.
- Notification preference.
- Account settings.

## Search

- Search conversations and messages as appropriate.
- Debounce search input where useful.
- Avoid fetching on every keystroke without a strategy.
- Validate and limit search parameters.

---

# 7. PHASED IMPLEMENTATION PLAN

**Implement exactly one phase at a time. Do not begin the next phase without my explicit confirmation.**

## Phase 00 — Repository Audit and Architecture

Tasks:

- Inspect the existing repository.
- Inspect `package.json`, workspace configuration, Turbo configuration, TypeScript configuration, ESLint configuration, and current app structure.
- Identify installed versions and existing conventions.
- Review current `apps/web` and `packages/ui`.
- Identify missing dependencies and configuration.
- Propose the target architecture.
- Define frontend/backend responsibilities.
- Define environment variable strategy.
- Identify important technical risks.
- Create or update architecture documentation only when appropriate.

Do not implement application features in this phase.

Deliver:

- Repository audit.
- Proposed architecture.
- Planned folder structure.
- Dependencies to add, with reasons.
- Phase-by-phase implementation plan.
- Risks and assumptions.

Stop and wait for my approval.

## Phase 01 — Monorepo Foundation

Tasks:

- Add the backend application at `apps/server`.
- Configure workspace dependencies correctly.
- Configure TypeScript consistently.
- Configure linting and formatting consistently.
- Configure environment validation.
- Add health-check endpoints.
- Establish frontend/backend development scripts.
- Establish a shared contract strategy.
- Configure local development.
- Ensure the existing docs and UI packages remain intact.

Deliver:

- Working frontend development command.
- Working backend development command.
- Working health check.
- Successful type checking and linting.
- Updated setup documentation.

Stop and wait for my approval.

## Phase 02 — Database and Domain Foundation

Tasks:

- Configure MongoDB connection.
- Add connection lifecycle handling.
- Define initial domain models and schemas.
- Add User, Conversation, Message, and relevant attachment models.
- Define indexes.
- Define relationships and constraints.
- Prevent duplicate private conversations.
- Establish migration/seed strategy where appropriate.
- Keep database access separate from HTTP and Socket.IO handlers.

Deliver:

- Database models.
- Index strategy.
- Database connection implementation.
- Safe development seed strategy.
- Tests for important domain constraints.

Stop and wait for my approval.

## Phase 03 — Authentication and Authorization

Tasks:

- Registration.
- Login.
- Logout.
- Secure password hashing.
- Authentication/session design.
- Refresh/session renewal where appropriate.
- Protected routes.
- Authentication middleware.
- Server-side authorization.
- Frontend auth integration.
- Login and registration forms using React Hook Form and Zod.
- Secure handling of credentials and tokens.

Use the correct Next.js request interception convention for the installed version, including `proxy.ts` where supported. Do not rely on proxy checks alone for authorization.

Deliver:

- Working authentication flow.
- Secure session handling.
- Validation and error handling.
- Tests for authentication and authorization.
- Clear documentation of the auth design.

Stop and wait for my approval.

## Phase 04 — Frontend Foundation and Chat UI

Tasks:

- Establish design tokens and theme setup.
- Build responsive application shell.
- Build conversation sidebar.
- Build conversation list.
- Build active conversation view.
- Build message bubbles.
- Build message composer.
- Build loading, empty, and error states.
- Build mobile navigation.
- Add light, dark, and system themes.
- Use reusable UI components.
- Keep components focused.
- Use realistic local mock data only where backend integration is not yet available.

Do not create giant page components. Use feature folders, custom hooks, and reusable components when appropriate.

Deliver:

- Polished responsive UI.
- Theme support.
- Accessible interactions.
- Component structure.
- Basic UI tests.

Stop and wait for my approval.

## Phase 05 — User Search and Private Conversations

Tasks:

- User search API.
- User search UI.
- Start private conversation.
- Prevent duplicate conversations.
- Conversation list API.
- Conversation list integration.
- Last-message preview.
- Unread count structure.
- Correct authorization and validation.

Deliver:

- Working user discovery.
- Working private conversation creation.
- Integrated conversation list.
- Relevant API and integration tests.

Stop and wait for my approval.

## Phase 06 — Message Persistence and HTTP API

Tasks:

- Message creation API.
- Message history API.
- Cursor-based pagination.
- Message validation.
- Conversation membership checks.
- Message persistence.
- Optimistic UI and reconciliation.
- Error handling.
- Loading states.
- Duplicate submission handling where relevant.

Deliver:

- Persistent private messaging through HTTP.
- Paginated history.
- Correct authorization.
- Tests for message access and persistence.

Stop and wait for my approval.

## Phase 07 — Socket.IO Real-Time Messaging

Tasks:

- Configure Socket.IO server.
- Authenticate socket connections.
- Authorize conversation membership.
- Define event names and payload contracts.
- Join and leave conversation rooms safely.
- Send and receive messages in real time.
- Handle reconnects.
- Handle duplicate events.
- Reconcile optimistic messages.
- Keep HTTP and socket authorization consistent.

Do not duplicate business rules inside socket handlers. Reuse appropriate service-layer logic.

Deliver:

- Real-time one-to-one messaging.
- Reliable reconnect behavior.
- Documented socket event contracts.
- Relevant tests.

Stop and wait for my approval.

## Phase 08 — Presence, Typing, Read Receipts, and Notifications

Tasks:

- Online/offline presence.
- Last-seen handling where appropriate.
- Typing indicators.
- Read receipts.
- Unread message tracking.
- Notification behavior.
- Avoid broadcasting private information to unauthorized users.
- Handle multiple sessions/devices appropriately where supported.

Deliver:

- Working presence.
- Typing indicators.
- Read receipts.
- Notification behavior.
- Tests for important privacy and event cases.

Stop and wait for my approval.

## Phase 09 — Image and File Sharing

Tasks:

- Secure upload flow.
- Upload validation.
- File-size limits.
- File-type validation.
- Secure file access.
- Image previews.
- Upload progress where practical.
- Message attachment persistence.
- Optimized image rendering.
- Error and retry behavior.

Do not trust the file extension alone. Do not expose private uploads publicly without an explicit access strategy.

Deliver:

- Working image/file sharing.
- Secure upload handling.
- Tests for invalid uploads and access control.

Stop and wait for my approval.

## Phase 10 — Search, Profile, and Settings

Tasks:

- Profile editing.
- Profile image update.
- Theme preference persistence.
- Notification settings.
- Conversation search.
- Message search where appropriate.
- Search pagination and validation.
- Empty and error states.

Deliver:

- Working profile and settings.
- Search integration.
- Tests for important behavior.

Stop and wait for my approval.

## Phase 11 — Testing and Quality Review

Tasks:

- Review existing tests.
- Add missing unit tests.
- Add API integration tests.
- Add authentication and authorization tests.
- Add critical UI tests.
- Add Socket.IO tests where practical.
- Review loading, empty, error, and success states.
- Review responsive behavior.
- Run lint.
- Run type checking.
- Run tests.
- Fix regressions.
- Review security and performance concerns.

Do not weaken tests to make the build pass.

Deliver:

- Test summary.
- Quality-check results.
- Known limitations.
- Security and performance review.
- Prioritized remaining issues.

Stop and wait for my approval.

## Phase 12 — Docker and CI

Tasks:

- Dockerize frontend and backend as appropriate.
- Add local development Docker Compose configuration.
- Configure environment variables.
- Add GitHub Actions workflow.
- Run lint, type checking, and tests in CI.
- Build applications in CI.
- Handle secrets safely.
- Keep CI steps maintainable and understandable.

Deliver:

- Working Docker development setup.
- CI workflow.
- Documented local setup.
- CI validation results.

Stop and wait for my approval.

## Phase 13 — Deployment and Documentation

Tasks:

- Prepare frontend deployment.
- Prepare backend deployment.
- Configure production environment variables.
- Configure MongoDB deployment.
- Configure CORS and allowed origins.
- Configure Socket.IO production behavior.
- Configure domain and HTTPS requirements.
- Document deployment and rollback considerations.
- Document environment setup.
- Document architecture and key flows.
- Document API and socket contracts.
- Add screenshots to the README when the UI is ready.
- Add project setup and contribution instructions.

Do not claim deployment is successful unless it has actually been performed and verified.

Deliver:

- Deployment guide.
- Production configuration guidance.
- Updated README.
- Architecture documentation.
- Final project status and known limitations.

Stop and wait for my approval.

---

# 8. DATA AND DOMAIN DESIGN EXPECTATIONS

Design the domain model deliberately. Do not create schemas without considering access patterns and constraints.

The initial domain should cover:

- User
- Conversation
- Message
- Attachment, if a separate model is justified
- Session or refresh-token representation, depending on the auth design

Consider:

- User identity and uniqueness.
- Conversation membership.
- Private conversation uniqueness.
- Message ordering.
- Pagination indexes.
- Read receipt representation.
- Attachment ownership and access.
- Soft deletion only when there is a real product requirement.
- Data retention and cleanup behavior.

Avoid unnecessary models and fields. Explain important trade-offs.

---

# 9. API AND SOCKET CONTRACTS

Use consistent naming and explicit contracts.

- Keep HTTP endpoint definitions organized.
- Validate all input.
- Return consistent success and error shapes.
- Keep status codes meaningful.
- Avoid leaking internal exceptions.
- Define socket event names and payload types centrally where practical.
- Validate socket payloads.
- Authorize every private event.
- Document important contracts.

Do not place database queries directly inside React components, route handlers, or socket event handlers when a service layer is warranted.

---

# 10. AGENT WORKFLOW — STRICT RULES

For every phase:

1. Inspect the relevant existing files and dependencies.
2. Identify architectural impact and possible regressions.
3. Present a concise implementation plan.
4. Implement only the current phase.
5. Refactor duplicated or poorly structured code introduced by the current phase.
6. Run relevant checks and tests.
7. Review the diff for unnecessary changes, security issues, unused code, and poor abstractions.
8. Report files changed, important decisions, checks performed, and remaining limitations.
9. Stop and wait for my explicit confirmation before starting the next phase.

Do not implement future phases early.

Do not skip phases.

Do not silently change the agreed architecture.

If a requirement is unclear, ask one focused question rather than making a large irreversible assumption.

If a technical issue blocks the current phase, explain the issue and propose a practical solution before proceeding.

Do not claim that a command, test, deployment, or integration succeeded unless it was actually executed and verified.

Do not overwrite my work. Inspect Git status and existing changes before making modifications.

---

# 11. REQUIRED PHASE COMPLETION REPORT

At the end of every phase, provide:

```text
PHASE:
STATUS:

IMPLEMENTED:
- ...

FILES CREATED:
- ...

FILES MODIFIED:
- ...

ARCHITECTURAL DECISIONS:
- ...

VALIDATION:
- Lint:
- Type check:
- Tests:
- Build:

KNOWN LIMITATIONS:
- ...

NEXT PHASE:
- ...

WAITING FOR MY CONFIRMATION.
```

Be honest about checks that could not be run.

---

# 12. START INSTRUCTION

**Start with Phase 00 only.**

Inspect my existing `~/projects/connectly` repository and report the current structure, installed versions, architecture, configuration, and implementation plan.

Do not create application features yet.

Do not start Phase 01 until I explicitly confirm Phase 00.

Remember: the goal is not to generate the most code. The goal is to build Connectly as a clean, secure, maintainable, production-minded application that demonstrates senior-level engineering judgment.