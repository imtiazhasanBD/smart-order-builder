# Smart Order Builder

Smart Order Builder is a frontend technical assessment application designed to demonstrate data-driven configuration validation, shared ingredient-based inventory reservations, deterministic financial calculations, and an AI-powered sales assistant.

---

## 5.1 Project Overview

- **Project Name**: Smart Order Builder
- **Description**: A modular frontend system allowing customers to customize breakfast orders under cross-group rules and real-time inventory limits, alongside a conversational sales analytics assistant for staff.
- **Assessment Purpose**: Evaluate frontend architecture, pure logic engine design, shared stock race condition handling, financial arithmetic accuracy, and LLM tool integration.
- **Main Technical Objectives**:
  - Pure, data-driven validation engine enforcing group bounds and cross-group constraints.
  - Ingredient-level shared inventory tracking with atomic reservations and net-difference editing.
  - Exact financial calculations using integer poisha to eliminate floating-point rounding errors.
  - Idempotent cart and checkout lifecycles synchronized with a simulated server clock.
  - Conversational analytics powered by Gemini Function Calling without delegating calculations to the model.
- **Current Implementation Status**: Step 00 (Project Foundation) is currently in progress. Assessment features (Parts A–G) are planned for subsequent milestones.

---

## 5.2 Technology Stack

### Currently Installed & Configured (Step 00)
- **Framework & Runtime**: React 18 (`react`, `react-dom`)
- **Language**: TypeScript with strict mode enabled
- **Bundler & Tooling**: Vite (`@vitejs/plugin-react`)
- **Styling**: Tailwind CSS, PostCSS, Autoprefixer
- **UI Primitives**: shadcn/ui foundation (`clsx`, `tailwind-merge`, `class-variance-authority`, `components.json`)
- **Icons**: Lucide React (`lucide-react`)
- **Server State Management**: TanStack Query (`@tanstack/react-query`) with shared QueryClient and provider
- **Test Runner & Environment**: Vitest, JSDOM (`jsdom`)
- **Component Testing**: React Testing Library (`@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`)
- **API Simulation**: Mock Service Worker (MSW) (`msw`) configured for browser worker and Node test server

### Planned Technologies (Future Steps)
- **Conversational Assistant**: Google Gemini API via function calling — *Planned for Step 09*

---

## 5.3 Getting Started

### Prerequisites
- Node.js 18+ or 20+ (Node v22 recommended)
- npm 9+ or 10+ (npm only — do not use pnpm or yarn)

### Installation
```bash
npm install
```

### Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```
Add your Gemini API key if testing the assistant locally:
```env
VITE_GEMINI_API_KEY=your_key_here
```
*(Note: `.env.local` is ignored by Git. No real API keys should ever be committed.)*

### Development Server
```bash
npm run dev
```

### Running Tests
```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run
```

### Production Build
```bash
npm run build
```

---

## 5.4 Project Architecture

The codebase is organized into modular boundaries separating pure domain logic, UI features, and data management:

```
src/
├── app/                  # Application root, routing, and global providers
├── components/           # Shared, domain-agnostic UI primitives (shadcn/ui)
├── features/             # Feature-specific components and UI logic
│   ├── menu/             # Menu presentation
│   ├── configurator/     # Interactive item customization
│   ├── cart/             # Shopping cart and active reservations
│   ├── checkout/         # Order placement and payment selection
│   └── assistant/        # Conversational staff assistant interface
├── engines/              # Pure domain logic (completely decoupled from React)
│   ├── validation/       # Rules and constraint validation
│   ├── inventory/        # Ingredient stock calculations and net difference
│   ├── pricing/          # Financial calculations, promotions, and taxes
│   └── analytics/        # Deterministic statistical tools for assistant
├── mocks/                # API simulation layer
│   ├── data/             # Static fixtures and seed datasets
│   └── handlers/         # MSW request interceptors
├── services/             # API client functions and transport layer
├── types/                # Domain models, schema definitions, and contracts
├── lib/                  # Shared utilities (e.g., cn styling helper)
└── test/                 # Test harness, custom matchers, and smoke tests
```

*Note: In Step 00, domain feature folders contain structure markers (`.gitkeep`). Implementations will be added in their respective milestones.*

---

## 5.5 Business Logic Engines

*Status: Planned (Not implemented in Step 00)*

### 1. Validation / Rules Engine (`src/engines/validation/`)
- **Status**: Implemented (`src/engines/validation/rules.ts`)
- **Signature**: `validate(config: SelectedOptions, groups: Group[], rules: CrossGroupRule[]): Violation[]`
- **Behavior**: Pure, data-driven function evaluating:
  - Group limits: `min`, `max`, `step` (e.g. eggs in multiples of 2), `maxDistinct` (e.g. sauce max 2 distinct options), and `maxPerOption` (e.g. sauce max 1 per option).
  - Cross-group rules: `requires` (e.g. Hollandaise requires Scrambled or Omelette), `excludes` (e.g. Tofu excludes Sausage & Bacon; Chili excludes Hollandaise), and `overrideLimit` (e.g. Croissant forces Extras max to 2, overriding the base limit of 4).
  - Collects and returns all violations with their identifier and human-readable explanation without early exit.
- **Test Coverage**: Tested in `src/test/rulesEngine.test.ts` covering TC-01 through TC-04, empty configurations, and group constraint edge cases.

### 2. Inventory / Stock Engine (`src/engines/inventory/`)
- **Status**: Planned for Step 03
- **Purpose**: Tracks physical ingredient availability pooled across all cart items and active builders. Computes remaining limits, supports net-difference editing, and reports itemized shortages.

### 3. Pricing Engine (`src/engines/pricing/`)
- **Status**: Planned for Step 04
- **Purpose**: Executes pure financial calculations exclusively in integer Bangladeshi Poisha ($1\text{ BDT} = 100\text{ poisha}$) to avoid floating-point errors. Evaluates multi-tier promotions, time-sensitive coupons, and 5% VAT with half-up rounding.

---

## 5.6 Data and API Architecture

- **Mock API (MSW)**: Configured with interceptors in `src/mocks/handlers/menu.ts` serving `/api/menu` and `/api/time`.
- **Data Fixtures**: Complete Appendix A fixture in `src/mocks/data/menu.ts` and Appendix B seed orders in `src/mocks/data/orders.seed.json`.
- **Server Clock Simulation**: `MockServerStore` maintains simulated server time running 90 seconds ahead of client time (`SERVER_OFFSET_MS = 90000`).
- **Data-Driven Contracts**: Strict TypeScript interfaces in `src/types/index.ts` guarantee no hardcoded option IDs, limits, or pricing in client code.
- **Client Transport**: Typed fetch service in `src/services/api.ts` providing `fetchMenu()` and `fetchServerTime()`.
- **Planned Endpoints**: Interactive price calculation (`/api/price`), atomic stock reservation (`/api/cart/reserve`), and checkout (`/api/orders`) planned for Steps 04–07.

---

## 5.7 Cart, Reservation and Checkout

*Status: Planned (Not implemented in Step 00)*

- **Atomic Reservations**: Ingredient stock held for 5 minutes per cart item.
- **Clock Synchronization**: Timer offsets computed against simulated server time running 90 seconds ahead of client.
- **Idempotency**: Add-to-cart and Pay operations protected by client-generated idempotency keys.
- **Order Persistence**: Completed orders saved to browser storage and exportable via `orders.json`.

---

## 5.8 Assistant / Chatbot Architecture

*Status: Planned (Not implemented in Step 00)*

- **Integration**: Google Gemini Flash model utilizing strict Function Calling.
- **Deterministic Math**: The model is prohibited from calculating totals directly; all numbers are computed by pure analytical functions (`src/engines/analytics/`).
- **Data Guardrails**: Inquiries regarding untracked attributes (such as customer identity) trigger factual refusals rather than hallucinated responses.

---

## 5.9 Testing

### Current Testing Setup (Step 02)
- **Harness**: Vitest with `jsdom` environment.
- **Setup File**: `src/test/setup.ts` with `@testing-library/jest-dom` extensions and MSW test server lifecycle (`server.listen()`, `server.resetHandlers()`, `server.close()`).
- **Test Suites**:
  - `src/test/smoke.test.tsx` (1 test): Application mount and render smoke test.
  - `src/test/menuApi.test.ts` (2 tests): `/api/menu` Appendix A fixture verification and 90-second server time offset.
  - `src/test/rulesEngine.test.ts` (9 tests): Acceptance criteria TC-01 to TC-04, override precedence, distinct/per-option limits, and edge cases.
- **Test Count**: 12 passed tests across 3 test suites.

### Planned Testing Coverage
- Pure engine unit tests covering TC-01 through TC-11.
- Async race condition, timer, and retry tests covering TC-12 through TC-16.
- End-to-end user journeys and assistant tests covering TC-17 through TC-20.

---

## 5.10 Technical Trade-offs and Decisions

Architectural decisions and trade-offs are logged in [DECISIONS.md](file:///run/media/imtiazbd/Development/HTML/New_Devolop/Smart-Order-Builder/DECISIONS.md):
- **C1**: Integer Poisha vs. JavaScript floating point
- **C2**: Chatbot query surface and deterministic tool contracts
- **D1**: Concurrent stock depletion handling
- **D2**: Promotional price lock timing
- **D3**: Reservation expiry during active modification
- **D4**: Canonical order ID and timestamp ownership
- **D5**: Customer data limitations and anti-hallucination guardrails
- **D6**: Order JSON schema and coupon auditing (Decided in Step 01)

*(Decisions C1, C2, and D1–D5 remain marked Pending until their respective implementation milestones.)*

---

## 5.11 Unfinished Work and Limitations

### Status Checklist
- [x] Step 00: Project foundation, toolchain, styling, and documentation
- [x] Step 01: Mock API, menu fixtures, and data contracts
- [x] Step 02: Validation / Rules engine
- [ ] Step 03: Inventory / Stock engine
- [ ] Step 04: Pricing engine
- [ ] Step 05: Order builder interface
- [ ] Step 06: Cart and reservation lifecycle
- [ ] Step 07: Checkout, order storage, and JSON export
- [ ] Step 08: Sales analytics engine
- [ ] Step 09: Gemini assistant integration
- [ ] Step 10: Full acceptance test suite (TC-01 to TC-20)
- [ ] Step 11: Multi-tab sync and draft recovery bonus features

### Known Limitations (Step 00)
- No user-facing domain features or API endpoints are active yet.
- Mock server handlers and menu fixtures are not yet loaded.

---

## 5.12 Time Spent — Actual Development Hours

| Milestone | Work performed | Actual time |
|---|---|---|
| Step 00 | Project setup and foundation | 10 Mins |
| Step 01 | Mock API and menu fixtures | 40 Mins |
| Step 02 | Validation engine | 15 Mins |
| Step 03 | Inventory engine | Pending |
| Step 04 | Pricing engine | Pending |
| Step 05 | Order builder UI | Pending |
| Step 06 | Reservations and cart | Pending |
| Step 07 | Checkout and order persistence | Pending |
| Step 08 | Sales analytics | Pending |
| Step 09 | Gemini assistant | Pending |
| Step 10 | Acceptance tests and documentation | Pending |
| Step 11 | Bonus requirements | Pending |
| **Total** | | **Pending** |

---

## 5.13 Assessment Answers

Calculations for questions Q1 through Q8 are tracked in [ANSWERS.md](file:///run/media/imtiazbd/Development/HTML/New_Devolop/Smart-Order-Builder/ANSWERS.md). All answers remain marked `Pending verification` until engines and fixtures are implemented.

---

## 5.14 Project Status

- **Latest Completed Milestone**: Step 01 (Mock API and Menu Fixtures)
- **Current Milestone**: Step 02 (Validation / Rules Engine) — Ready for Review
- **Next Milestone**: Step 03 (Inventory / Stock Engine)
