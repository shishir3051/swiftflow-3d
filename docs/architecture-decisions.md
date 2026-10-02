# Architectural Decision Record (ADR)
## SwiftFlow 3D: Architecture, Islands Pattern & 3D WebGL Strategy

**Status**: Accepted  
**Date**: October 2026  
**Context**: High-performance FinTech interactive portfolio demonstrating real-time SWIFT payment telemetry and ISO 20022 MX migration.

---

### 1. Context & Design Challenges

Building an interactive 3D WebGL application inside a traditional Single Page Application (SPA) like Next.js or Create React App introduces fundamental trade-offs:
1. **Lighthouse & First Contentful Paint (FCP) Penalty**: Bundling `three`, `@react-three/fiber`, `@react-three/drei`, and animation libraries into a single client bundle typically exceeds 400KB - 800KB of initial JavaScript. This severely penalizes mobile Lighthouse scores, increasing Time to Interactive (TTI) and First Input Delay (FID).
2. **Main Thread Contention**: If UI layout, typography, navigation, and scroll storytelling share the React reconciliation loop with high-frequency 60 FPS WebGL renders, frame drops and scroll jank occur.
3. **API Key Security**: Communicating with frontier LLM providers (Anthropic Claude) requires strict server-side encapsulation so that credentials are never exposed via client bundle inspection or network inspection.

---

### 2. Decision 1: Astro Framework & Islands Architecture (`client:visible`)

#### **Chosen Approach**
We chose **Astro 4** with React Islands (`@astrojs/react`) in `server` / hybrid mode.

#### **Rationale**
- **Zero-JS Static Baseline**: By default, Astro compiles UI components (`Navbar.astro`, `HeroOverlay.astro`, `ScrollStory.astro`, `DisclaimerBanner.astro`, `Footer.astro`) to pure HTML and CSS at build time. Zero JavaScript is shipped for these sections.
- **Selective & Lazy Hydration**: The 3D globe scene is isolated inside a single interactive island:
  ```astro
  <GlobeScene client:visible />
  ```
  The browser downloads and executes Three.js **only when the canvas viewport is about to become visible**. If a search engine crawler or a user on a low-bandwidth connection accesses the page, the initial DOM renders instantly, yielding **Lighthouse 90+** scores on performance.
- **Independent React Trees**: The `ConverterPanel` and `GlobeScene` operate as separate islands. State synchronization is achieved cleanly using lightweight native DOM events (`CustomEvent('swiftflow:load-converter')`), eliminating heavy global state managers (like Redux or Zustand) from the initial bundle.

---

### 3. Decision 2: React Three Fiber (R3F) + Drei over Raw Three.js

#### **Chosen Approach**
Three.js wrapped in `@react-three/fiber` and `@react-three/drei`.

#### **Rationale**
- **Declarative Scene Graph**: Instead of managing imperative WebGL disposal, scene hierarchies, and render loop subscriptions manually, R3F provides declarative components (`<EarthSphere />`, `<BankHubNodes />`, `<PaymentArcStream />`).
- **Automatic Asset & Geometry Cleanup**: Unmounting the 3D scene cleanly disposes of Three.js buffer geometries, materials, and canvas contexts, preventing the notorious WebGL context loss errors on mobile browsers.
- **High-Performance Fiber Loop**: R3F runs outside of React's DOM reconciliation, ticking at native 60–120 FPS via `useFrame` without triggering React DOM re-renders.

---

### 4. Decision 3: GSAP for Scroll-Driven Camera Waypoints

#### **Chosen Approach**
GSAP (`gsap`) for camera transitions tied to story milestones.

#### **Rationale**
- Smooth cubic Bezier interpolation (`power2.inOut`) decouples camera motion from frame-rate fluctuations.
- When the user scrolls through the 3 narrative chapters (The Problem of Legacy MT, The Global ISO 20022 Mandate, and The SwiftFlow Solution), the camera smoothly glides to highlight the relevant financial corridors (Atlantic Corridor, Eurasian corridor, and global overview).
- Adheres strictly to `(prefers-reduced-motion: reduce)` by bypassing camera fly-throughs for users with vestibular sensitivities.

---

### 5. Decision 4: Resilient Server-Sent Events (SSE) AI Streaming & Offline Fallback

#### **Chosen Approach**
Astro Server Endpoint (`src/pages/api/convert.ts`) with SSE streaming, Zod schema validation, sliding-window rate limiting, and an offline deterministic fallback engine.

```
Client (Browser)
   │
   ├─► POST /api/convert (with MT103 payload)
   │
   ▼
Astro Server Route
   ├── 1. Rate Limiting Check (10 req/min per IP)
   ├── 2. Zod Payload Validation (10 - 10,000 chars)
   ├── 3. Anthropic API Call (Streaming Claude 3.5 Sonnet)
   │      └── Fallback: Local Deterministic Parser & Generator
   │
   ▼
Streamed SSE Chunks (text/event-stream)
   ├── event: meta    (parsed fields, sender, receiver, UETR)
   ├── event: token   (token-by-token explanation & pacs.008 XML)
   └── event: done    (XML well-formedness verification)
```

#### **Rationale**
- **Secret Isolation**: `ANTHROPIC_API_KEY` is loaded exclusively in server runtime and never sent to the browser.
- **Instant Demo Resiliency**: If no API key is configured (such as during quick local CV reviews or GitHub Actions builds), the endpoint seamlessly falls back to SwiftFlow's local TypeScript AST engine (`mtParser.ts` + `mxGenerator.ts`). The reviewer experiences full token-by-token streaming with zero errors.

---

### 6. Decision 5: Accessible 2D Vector Fallback

#### **Chosen Approach**
`StaticGlobeFallback.tsx` high-contrast SVG vector map.

#### **Rationale**
- If WebGL 1.0/2.0 is disabled, blocked by corporate proxies, or fails on low-end hardware, the application automatically mounts the accessible SVG corridor map.
- Keyboard users can navigate the interbank network with standard `Tab` and `Enter` keystrokes, fulfilling WCAG 2.1 AA accessibility guidelines.
