# NexusCRM Changelog

## Integration Check Pass — 2026-06-05

### Summary
- **Files created:** 71 (new pages, components, server utilities, styles)
- **Files modified:** ~40 (routes, models, existing pages, CSS)
- **Build status:** ✅ `Compiled successfully.` — zero warnings, zero errors

---

## New Files Created

### Client — UI Foundation
| File | Purpose |
|---|---|
| `client/src/styles/tokens.css` | Brand design tokens — all `--kanan-*` colour variables, spacing, radius, shadow, state palette |
| `client/src/components/ui/Button.jsx` + `.css` | Primary/secondary/ghost/danger button variants |
| `client/src/components/ui/Card.jsx` + `.css` | White card container with hover support |
| `client/src/components/ui/KpiCard.jsx` + `.css` | KPI metric card with trend indicator |
| `client/src/components/ui/StatusPill.jsx` + `.css` | Auto-coloured status badge |
| `client/src/components/ui/SectionHeader.jsx` + `.css` | Page section header with action slot |
| `client/src/components/ui/DataTable.jsx` + `.css` | Striped data table with row-click |
| `client/src/components/ui/EmptyState.jsx` + `.css` | Empty-state illustration placeholder |
| `client/src/components/ui/Toast.jsx` + `.css` | Toast notification component |
| `client/src/components/ui/index.js` | Barrel export for all UI components |

### Client — Layout Shell
| File | Purpose |
|---|---|
| `client/src/components/layout/AppLayout.jsx` + `.css` | Shell: Sidebar + TopBar + `<main>` |
| `client/src/components/layout/Sidebar.jsx` + `.css` | Navy fixed sidebar; role-filtered 18-item nav; user footer |
| `client/src/components/layout/TopBar.jsx` + `.css` | White sticky top bar; bell with unread badge; Quick Add button |

### Client — Pages (New Modules)
| File | Purpose |
|---|---|
| `client/src/pages/Leads.jsx` + `.css` | Lead list with filter pills, search, stats bar, DataTable |
| `client/src/pages/Pipeline.jsx` + `.css` | Kanban board for Opportunities (7 stages) |
| `client/src/pages/Bookings.jsx` + `.css` | Booking list with segment icons and status filters |
| `client/src/pages/Itineraries.jsx` + `.css` | Itinerary grid; links each booking to ItineraryBuilder |
| `client/src/pages/Quotes.jsx` + `.css` | Quote list with download/preview |
| `client/src/pages/Invoices.jsx` + `.css` | Invoice list with payment status |
| `client/src/pages/Communications.jsx` + `.css` | Conversation inbox with send panel |
| `client/src/pages/Settings.jsx` + `.css` | Settings hub: agency, team, pipeline stages, integrations |
| `client/src/pages/Suppliers.css` | New supplier card grid styles |
| `client/src/pages/customers/CustomerDetail.js` | Customer detail with opportunities panel |
| `client/src/pages/opportunities/OpportunitiesBoard.js` | 7-stage opportunity board |
| `client/src/pages/opportunities/OpportunityModal.js` | Create/edit opportunity modal |

### Client — Components
| File | Purpose |
|---|---|
| `client/src/components/bookings/BookingDetailModal.jsx` + `.css` | Booking detail slide-over |
| `client/src/components/leads/LeadDetailDrawer.jsx` + `.css` | Lead quick-view drawer |
| `client/src/components/modals/ConversionModal.js` | Lead→Opportunity conversion modal |
| `client/src/context/ToastContext.jsx` | Toast notification context provider |
| `client/src/utils/generateDocument.js` | Quote/invoice HTML generator |

### Server — Lead & Opportunity Blueprint (Phase 1–3)
| File | Purpose |
|---|---|
| `server/models/Opportunity.js` | 7-stage opportunity model with forecasting fields |
| `server/routes/opportunities.js` | CRUD + stage-gating + conversion endpoints |
| `server/routes/notifications.js` | List/mark-read notification endpoints |
| `server/routes/communications.js` | Message thread endpoints |
| `server/routes/integrations.js` | WhatsApp/payment/GDS integration stubs |
| `server/utils/forecasting.js` | Win-likelihood, sales velocity, forecast buckets |
| `server/utils/integrations/gds.js` | GDS adapter (stub; real creds via env) |
| `server/utils/integrations/payments.js` | Payment adapter (stub; real creds via env) |
| `server/utils/integrations/whatsapp.js` | WhatsApp Business API adapter (stub) |
| `server/scripts/migrateOppStages.js` | One-time migration: old 5 stages → new 7 |
| `server/tests/phase.test.js` | 15 unit tests (node --test); all pass |

---

## Modified Files

### Router — `client/src/App.js`
- Added lazy import for `Itineraries`
- Registered `/itineraries` route → `<Itineraries />`
- Added redirect: `/quotes` → `/finance/quotes`
- Added redirect: `/invoices` → `/finance/invoices`
- Added redirect: `/communications` → `/comms`
- All authenticated routes wrapped in `<AppLayout>`

### Design Tokens — `client/src/styles/tokens.css`
- Added `--kanan-white`, `--kanan-ink`, `--kanan-mute` brand primitives
- Added state palette: `--state-error-bg/text/border`, `--state-info-bg/text`, `--state-success-bg/text`, `--state-warn-bg/text`

### CSS Colour Fixes (hardcoded hex → `var(--kanan-*)`)
| File | Fixes |
|---|---|
| `client/src/pages/Dashboard.css` | `#fff` → `var(--kanan-white)` (×2) |
| `client/src/pages/Pipeline.css` | `#fff`, `#fde8e8`, `#fef3e0`, `#e6f9ef` → state tokens |
| `client/src/pages/Leads.css` | `#fff` → `var(--kanan-white)` (×3) |
| `client/src/pages/LeadDetail.css` | Badge-status hex colours → state tokens; `#10B981` → `var(--kanan-green)` |
| `client/src/pages/Bookings.css` | `#fff`, `#D1D5DB`, `#DC2626`, `#FEF2F2`, `#CBD5E1` → tokens |
| `client/src/pages/Suppliers.css` | `#DC2626`, `#FEF2F2`, `#fff` → tokens |
| `client/src/pages/Communications.css` | `#fff`, `#007a38`, `#9CA3AF` → tokens |
| `client/src/pages/Invoices.css` | `#fff` → `var(--kanan-white)` (×2) |
| `client/src/pages/Quotes.css` | `#fff` → `var(--kanan-white)` (×3) |
| `client/src/pages/Reports.css` | `#fff` → `var(--kanan-white)` (×2) |
| `client/src/pages/Settings.css` | `#fff` → `var(--kanan-white)` (×5) |

### JSX Inline Style Fixes
| File | Fixes |
|---|---|
| `client/src/pages/Login.js` | Error banner hex → `var(--state-error-bg/text)` |
| `client/src/components/modals/AddLeadModal.js` | Error + info banner hex → state tokens |
| `client/src/components/modals/ConversionModal.js` | Error banner hex → state tokens |
| `client/src/components/modals/CustomerModal.js` | Error + info banner hex → state tokens |
| `client/src/pages/opportunities/OpportunityModal.js` | Error banner hex → state tokens |
| `client/src/pages/voyage/pipeline/EnquiryModal.js` | Error banner hex → state tokens |
| `client/src/pages/voyage/pipeline/StageModal.js` | Error banner hex → state tokens |

### ESLint Warning Fixes
| File | Fix |
|---|---|
| `client/src/components/leads/LeadDetailDrawer.jsx` | Removed unused `FiActivity`, `FiEdit2` imports |
| `client/src/components/modals/CustomerModal.js` | Removed unused `FiInfo`, `FiCalendar` imports |
| `client/src/context/LeadContext.js` | Removed unused `BOOKING_STATUSES` constant |
| `client/src/pages/Quotes.jsx` | Removed unused `FiEye`, `FiSend` imports |
| `client/src/pages/Reports.js` | Removed unused icon imports; memoized `leads`/`suppliers`/`bookings` |
| `client/src/components/leads/LeadDetailDrawer.jsx` | `eslint-disable-line` for intentional dep array |

---

## Route Coverage Verification

| Required Path | Status | Notes |
|---|---|---|
| `/dashboard` | ✅ | Direct route |
| `/leads` | ✅ | Direct route |
| `/pipeline` | ✅ | Direct route |
| `/bookings` | ✅ | Direct route |
| `/itineraries` | ✅ | **Added this session** — grid of bookings with ItineraryBuilder links |
| `/quotes` | ✅ | Redirect → `/finance/quotes` (added this session) |
| `/invoices` | ✅ | Redirect → `/finance/invoices` (added this session) |
| `/suppliers` | ✅ | Direct route (level 3) |
| `/communications` | ✅ | Redirect → `/comms` (added this session) |
| `/reports` | ✅ | Direct route |
| `/settings` | ✅ | Direct route (level 3) |

---

## Remaining TODOs / Known Gaps

### Server-side API endpoints still needed
| Endpoint | Module | Priority |
|---|---|---|
| `GET /api/dashboard/kpis` | Dashboard KPI grid | Medium |
| `GET /api/dashboard/sources` | Lead sources pie chart | Low |
| Real credentials for `WHATSAPP_*`, `PAYMENT_*`, `GDS_*` env vars | Integrations | Low |

### Hardcoded hex still remaining (lower-priority files)
These files still contain some hardcoded hex values in inline styles. They are either legacy voyage/ pages, UI-primitive colours (white/grey not in brand palette), or ApexCharts configs that cannot accept CSS vars:
- `client/src/pages/voyage/` — all voyage sub-pages (legacy, not in primary nav)
- `client/src/pages/Dashboard.js` — `NOTIF_META`/`STAGE_COLORS` constants (required by ApexCharts API; documented exception)
- `client/src/pages/LeadDetail.js` — priority colour dots (`#94A3B8`)
- `client/src/pages/Customers.js` — badge inline styles
- `client/src/components/common/Receipt.js` — print receipt styles

### Google Fonts
✅ Poppins (400/500/600/700) + Montserrat (500/600/700) loaded via `<link>` in `public/index.html`.
