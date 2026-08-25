# Prana Earth — Frontend → Backend API Gap Audit

> Backend-developer spec. Every entry is a frontend behaviour that has no
> working API behind it (or has a partial one) and needs the corresponding
> endpoint/action implemented or fixed.

**Scope:** 5 parallel audits over the entire `prana-web` frontend —
admin pages, predict org-profile, predict auth + landing, marketplace,
and shared components. Cross-referenced against the existing
`src/app/api/**/route.ts` and `src/actions/*.actions.ts` so we don't
recommend endpoints that already exist.

---

## Legend

- ✅ Already implemented (existing route / action) — cross-reference.
- ❌ Missing — needs to be built.
- 🟡 Partial — exists but is incomplete, mis-wired, or has schema mismatch.
- 🔁 Schema fix — backend validation rejects what the frontend sends.

Priority buckets:
- **CRITICAL** — feature is broken, button does nothing, route 404s,
  or user can lose data.
- **HIGH** — missing core feature, page shows hard-coded data, or
  search/filter is non-functional.
- **MEDIUM** — polish, missing optional handler, or copy-only fix.
- **LOW** — cosmetic / nice-to-have.

---

## CRITICAL — Blocks user flow

### C1. Profile page — Download button does nothing

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/profile/page.tsx](prana-web/src/app/sites/predict/profile/page.tsx) |
| Symptom | A "Download" button is rendered in the Account Summary card but has no `onClick` handler. |
| What UI does | User clicks "Download" → nothing happens. |
| **API needed** | `GET /api/org/profile/export?format=pdf` |
| Request | Query: `format=pdf\|csv` |
| Response | `200 application/pdf` (or `text/csv`) with `Content-Disposition: attachment; filename=…` |
| Notes | The same route can serve `/api/users/me/export` if you prefer user-scoped. Auth required. |

---

### C2. Profile edit modal — pre-fill is incomplete + update drops fields

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/profile/page.tsx](prana-web/src/app/sites/predict/profile/page.tsx) lines 14–20, 96–170 |
| Symptom | `getCurrentUser()` only hydrates `fullName, email, jobTitle, phone, countryRegion`. The form additionally shows avatar, org ID, role, timeZone, locale — none of these are fetched. The `updateProfile()` call sends only `{fullName, jobTitle, phone, countryRegion}`, so the rest are silently dropped. |
| What UI does | Form opens with partial data; user changes a value → save → value not persisted. |
| **API needed** | `GET /api/users/me` (full payload) + `PATCH /api/users/me` (full payload) |
| Request | `PATCH` body: `{ fullName?, jobTitle?, phone?, countryRegion?, avatarUrl?, timeZone?, locale?, orgRole? }` |
| Response | `200 { success, data: { user: { fullName, email, jobTitle, phone, countryRegion, avatarUrl, role, timeZone, locale, orgRole, organizationId } } }` |
| Notes | Confirm `User` Prisma model has `jobTitle`, `countryRegion`, `avatarUrl`, `timeZone`, `locale` columns (or extend). |

---

### C3. Implementation partner — logo upload (admin)

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/implementation-partners/page.tsx](prana-web/src/app/sites/admin/implementation-partners/page.tsx) lines 227–241, 312–326 |
| Symptom | The "Upload Logo" buttons do call the endpoint, but the payload doesn't include the fields shown in the edit modal. Also the admin `Edit Partner` modal captures `taxId`/`registrationId` which the `updateImplementationPartner` action never sends. |
| What UI does | Admin edits partner → logo upload goes through (good), but `taxId` is never persisted. Backend logs a comment "tax ID is stored locally for the form but may not be persisted". |
| **API needed** | Existing: `POST /api/admin/implementation-partners/[id]/logo` ✅ (works). **Missing schema field on the PUT/PATCH body:** `taxId`/`registrationId`. |
| Request | `PATCH /api/admin/implementation-partners/[id]` body should accept `{ name, type, websiteUrl, region, country, capabilities, taxId, logoUrl? }` |
| Response | `200 { success, data: { partner } }` |
| Notes | Add `taxId` to Prisma `ImplementationPartner` model if not present, or store in `metadata` JSON. |

---

### C4. Reply via email with text input (DPR + Express Interest + Contact)

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/leads/page.tsx](prana-web/src/app/sites/admin/leads/page.tsx) line 578–580 (Express Interest); DPR detail modal lines 825–827, 1009–1011 (Contact) |
| Symptom | "Reply via Email" / dismiss / status-change buttons have no `onClick` — admin can't actually reply. Existing `replyToDprRequest`, `replyToExpressInterest`, `replyToContactSubmission` server actions exist but the **UI text-input for the reply message is not wired** (no `value`, no `onChange`, no state). |
| What UI does | Admin clicks Reply → nothing happens, or modal opens but Submit doesn't send. |
| **API needed** | Three existing server actions are correct — the fix is mostly frontend, but confirm these REST mirrors exist or add them: |
| Request | `POST /api/marketplace/dpr/[id]/reply` (✅ already exists) — body `{ message: string, markStatus?: "CONTACTED"\|"IN_PROGRESS"\|"RESOLVED" }` |
| Response | `200 { success, data: { reply } }` |
| Notes | Same shape needed for `/api/admin/express-interest/[id]/reply` and `/api/admin/contact/[id]/reply` if not already present. **Critical:** the admin leads page text input must be wired to a `message` state and posted. |

---

### C5. Admin dashboard — 30/60/90 days / 1-year filter

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/dashboard/page.tsx](prana-web/src/app/sites/admin/dashboard/page.tsx) (the chart's date-range is hard-coded); also [src/app/sites/admin/leads/page.tsx](prana-web/src/app/sites/admin/leads/page.tsx) Filter/Sort pills (614–622), and the `assessment-management` page (`dateRange` state declared but never set) |
| Symptom | Dashboard's "Last 7 Days" button is the only one rendered. Leads tab "Filter" / "Sort" pills are decorative. `assessment-management` declares `dateRange` state but no setter is called. |
| What UI does | User wants to filter last 30/60/90/365 days → no UI control exists, or the control is wired to nothing. |
| **API needed** | Extend existing admin actions to accept a `range` (or `from`/`to`) parameter. |
| Request | `getRevenueTrends(interval: "7d"\|"30d"\|"60d"\|"90d"\|"1y"\|"monthly"\|"quarterly"\|"yearly")` ✅ — `interval` already supports daily windows in spirit but the dashboard only renders `monthly`. |
| Request | `getAdminLeads({ from?: ISO, to?: ISO, status?, page, pageSize })` |
| Request | New: `getAdminDashboardMetrics({ range?: "7d"\|"30d"\|"60d"\|"90d"\|"1y" })` — when `range` is provided, recompute revenue KPIs, growth deltas, and lead counts for that window. |
| Response | Existing shape, plus optional `range` echoed back for the UI. |
| Notes | Add a 4-button segmented control in the dashboard header: `7D · 30D · 60D · 90D · 1Y` calling `setRange(...)` + `router.refresh()`. Apply the same pattern in leads + assessment-management. |

---

### C6. Marketplace — broken `/login` and `/marketplace/...` links (404s)

| Field | Value |
|---|---|
| Frontend | Multiple — see bullets |
| Symptom | Hard-coded `<Link href="/login">` in `marketplace/about`, `marketplace/pricing` and predict landing. Footer links to `/marketplace`, `/marketplace/projects`, `/marketplace/contact` — all 404. Navbar links to `/our-tech`, `/how-it-works` which don't exist. |
| What UI does | Clicking "Get Started" / "Watch Demo" / "Request Demo" bounces to a 404. |
| **API needed** | None — pure frontend routing fixes (or `next.config.ts` rewrites). Add to your sprint board: |
| Fixes | • `next.config.ts` rewrite: `/login` → `/sites/predict/(auth)/login`; `/marketplace` → `/sites/marketplace`; `/marketplace/projects` → `/sites/marketplace/projects`; `/marketplace/contact` → `/sites/marketplace/contact`.<br>• Or create the missing pages: `/our-tech`, `/how-it-works`, `/get-started`. |

---

### C7. Saved page → DPR link 404

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/saved/page.tsx](prana-web/src/app/sites/marketplace/saved/page.tsx) line 235 |
| Symptom | Link `href="/saved/${project.slug || project.id}/request-dpr"` — that route doesn't exist (only `/saved/express-interest/...` does). |
| What UI does | "Invest in Project" on the saved page 404s. |
| **API needed** | None — change link to `/projects/${slug}/express-interest` (the supported equivalent) or create `/saved/[slug]/request-dpr` route. |

---

### C8. Project details — sidebar DPR link uses `id` not `slug`

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/projects/[slug]/page.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/page.tsx) line 746 |
| Symptom | Sidebar link `href="/projects/${project.id}/request-dpr"` — but the route param is `[slug]`, so non-UUID ids break. |
| **API needed** | None — change to `project.slug`. |

---

### C9. DPR success page — hard-coded reference number

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/projects/[slug]/request-dpr/success/page.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/request-dpr/success/page.tsx) line 38 |
| Symptom | Shows literal `PE-DPR-2024-8921` instead of the real `request.id` returned by `submitDprInquiry`. |
| **API needed** | None — frontend fix: pass `?ref=${res.data.request.id}` on the success redirect and read it from search params. |

---

### C10. DPR / Express Interest — schema rejects empty optional fields

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/projects/[slug]/express-interest/page.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/express-interest/page.tsx) lines 30–36, 99–108 |
| Symptom | Form sends `phone: formData.phone \|\| null` and `company: formData.company \|\| null`. `ExpressInterestSubmissionSchema` requires `company: z.string().min(1)` (not nullable) — every submission **fails Zod validation**. |
| **API needed** | 🔁 Schema fix — relax `ExpressInterestSubmissionSchema` in [src/core/validation/express-interest.schemas.ts](prana-web/src/core/validation/express-interest.schemas.ts) so `phone` and `company` are `.optional().nullable()` OR coerce empty strings to `null` server-side. Same applies to **DPR** schema — `DprSubmissionSchema.projectId` is `z.string().uuid()` but route param is `slug` (never a UUID). |
| Request | `POST /api/marketplace/dpr` body `{ projectId: string, … }` — backend must accept slug or id and look up by either. |

---

### C11. Assessment management page — entirely dead UI

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/assessment-management/page.tsx](prana-web/src/app/sites/admin/assessment-management/page.tsx) (entire file) |
| Symptom | `initialAssessments` and `topOrganizations` arrays are hard-coded. The file imports nothing from `actions/`. No API call anywhere. |
| **API needed** | `getAssessments({ search, assetType, status, dateRange, page, limit })` server action returning `{ rows, total, page, pageSize }` |
| Request | Query params: `?q=&assetType=&status=&from=&to=&page=&limit=` |
| Response | `200 { success, data: { rows: [{ id, assetName, assetType, location, organization, status, startedAt, completedAt, riskScore, processingTimeSeconds, failureReason }], total, page, pageSize } }` |
| Notes | Also: `getTopOrganizations({ range })`, `exportAssessmentActivityCsv(filters)`, `retryFailedAssessment(id)`, `getAssessment(id)`. Buttons "View Details", "Fix & Retry", "Export Activity" all need the matching endpoints. |

---

### C12. Implementation partner — public list + admin HTTP routes

| Field | Value |
|---|---|
| Frontend | [src/components/marketplace/implementation-partners.tsx](prana-web/src/components/marketplace/implementation-partners.tsx) (public carousel) + admin actions exist but no HTTP routes |
| Symptom | Public carousel uses 5 hard-coded mock partners. Admin can CRUD via actions but the **HTTP routes don't exist** under `src/app/api/marketplace/implementation-partners/`. |
| **API needed** | `GET /api/marketplace/implementation-partners` (public, `?status=ACTIVE` only) → returns active partners for the public carousel. |
| Request | `POST /api/marketplace/implementation-partners` (admin) — body `{ name, type, websiteUrl, region, country, capabilities, taxId }` |
| Request | `PATCH /api/marketplace/implementation-partners/[id]` (admin) — body same as above, partial |
| Request | `DELETE /api/marketplace/implementation-partners/[id]` (admin) |
| Response | `200 { success, data: { partner } }` or `{ partners: [...] }` |
| Notes | The admin actions already do this; just need the HTTP shells. |

---

### C13. Concept-note download is a stub

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/projects/[slug]/concept-note/page.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/concept-note/page.tsx) line 10–21, 44–48 |
| Symptom | "Download PDF" button generates a hard-coded placeholder text file with the literal string `"This is a placeholder for the actual 54-page PDF content."` |
| What UI does | User pays for a concept note, clicks Download → gets a dummy text file. |
| **API needed** | `GET /api/marketplace/projects/[id]/concept-note` |
| Request | URL param `id` (or slug) |
| Response | `200 application/pdf` with `Content-Disposition: attachment; filename="<project-slug>-concept-note.pdf"`. Auth: requires `isMarketplaceAccess` (same guard as the layout). |
| Notes | The page also hard-codes the project title and section labels — extend the response to include `{ title, sections: [{ heading, content }] }` and render the structured content too. |

---

### C14. User "Download" button on billing invoices

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/settings/page.tsx](prana-web/src/app/sites/predict/settings/page.tsx) line 345 (Billing tab) |
| Symptom | `invoices` array + "Download" button are hard-coded. |
| What UI does | User sees a list of fake invoices, clicks Download → nothing happens. |
| **API needed** | `GET /api/billing/invoices` |
| Request | Query: `?page=&limit=&from=&to=` |
| Response | `200 { success, data: { invoices: [{ id, date, description, plan, amount, currency, status, invoiceUrl }], total } }` |
| Request | `GET /api/billing/invoices/[id]/download` (or `invoiceUrl` directly if pre-signed S3) |
| Response | `200 application/pdf` (stream) or `302` redirect to pre-signed URL |
| Notes | Existing admin route `GET /api/admin/billing/transactions/[id]/invoice` can be adapted for the user side. |

---

## HIGH — Missing core features / data hard-coded

### H1. Dashboard stats + tables — entirely hard-coded

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/organization-profile/dashboard/page.tsx](prana-web/src/app/sites/predict/organization-profile/dashboard/page.tsx) lines 45–220 |
| **APIs needed** | |
| `GET /api/org/dashboard/stats` | `?scenario=&horizon=` → `{ overallRiskScore, overallRiskClass, totalAssets, totalAssessments, assetsUnderHighRisk, recentAssessmentCount, uniqueLocations, lastUpdated, assessmentId }` |
| `GET /api/org/dashboard/top-risk-assets` | `?limit=3&scenario=&horizon=` → `[{ assetId, assetName, assetType, location, overallRisk, mainHazard, mainHazardScore }]` |
| `GET /api/org/dashboard/recent-assessments` | `?limit=5` → `[{ id, assetId, assetName, assetType, location, startedAt, scenario, horizon, compositeRisk, riskClass, status, assessmentId }]` |
| `GET /api/org/dashboard/asset-points` | `?scenario=&horizon=` → GeoJSON FeatureCollection of asset markers (`{ assetId, lat, lon, riskScore, mainHazard }`) |
| `GET /api/org/dashboard/export` | `?scenario=&horizon=&format=pdf\|csv` → file response |
| Notes | Currently the page renders `Risk Score 72 / 100`, `Total Assets 84`, `Top 3 Assets Under High Risk 18`, `Last 5 Asset Assessments 5`, etc. with literal numbers. |

---

### H2. Reports page — list, stats, trend, download all hard-coded

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/organization-profile/reports/page.tsx](prana-web/src/app/sites/predict/organization-profile/reports/page.tsx) lines 29–290 |
| **APIs needed** | |
| `GET /api/org/reports` | `?q=&status=&page=&limit=` → `{ rows: [{ id, name, type, assetName, scenario, horizon, reportVersion, status, generatedAt, generatedBy, downloadCount, fileUrl }], total, page, pageSize }` |
| `GET /api/org/reports/stats` | → `{ totalReports, completed, inProgress, failed, totalDownloads }` |
| `GET /api/org/reports/trend` | `?months=6` → `[{ month, generated, completed, failed }]` |
| `GET /api/org/reports/export` | `?format=csv&status=&q=` → file response |
| `GET /api/org/reports/[id]/download` | → file response (or 302 to pre-signed URL) |
| Notes | Search input has no `value`/`onChange` — wire it to `q` query. Pagination buttons + per-row download also need handlers. |

---

### H3. Project details — AI insights, milestones, related, forecast all hard-coded

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/projects/[slug]/page.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/page.tsx) lines 347–980 |
| **APIs needed** | |
| ✅ `GET /api/marketplace/projects/ai-context/[id]` (exists, never called) | Wire it. Response carries `{ impactScore, gainPct, successProbability, summary, recommendations, forecast: { twelveMonth: { value, label } } }` |
| New `GET /api/marketplace/projects/[id]/milestones` | → `[{ id, title, status, date, description }]` |
| New `GET /api/marketplace/projects/related?excludeId=&sector=&limit=4` | → `[{ id, slug, title, sector, location, imageUrl }]` |
| Notes | Also need Prisma `Project` fields: `milestones`, `relatedProjects`, `conceptNoteUrl`, `recommendations`, `forecast` — or accept via `metadata` JSON. |

---

### H4. Reassessment page — assets list, summary, history, start-assessment all dead

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/organization-profile/reassessment/page.tsx](prana-web/src/app/sites/predict/organization-profile/reassessment/page.tsx) (entire file) |
| **APIs needed** | |
| `GET /api/org/assets` | `?q=&type=&page=&limit=` → `[{ id, name, type, location, lastAssessmentDate, lastScore, variant }]` |
| `GET /api/org/assets/[id]/summary` | → `{ name, type, location, lastAssessmentDate, lastScore }` |
| `GET /api/org/assets/[id]/assessment-history` | `?limit=3` → `[{ date, status, score, variant }]` |
| `POST /api/org/assets/[id]/reassess` | body `{ scenario, horizon }` → `{ assessmentId, status: "QUEUED" }` |
| `GET /api/org/reports?assetId=&latest=true` | → latest report metadata for "View Last Report" |
| Notes | Search, asset-type filter, pagination, "View Last Report", "View All History", "Start Assessment" buttons all need handlers. |

---

### H5. Settings — organization, notifications, security, billing

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/settings/page.tsx](prana-web/src/app/sites/predict/settings/page.tsx) lines 52–354 |
| **APIs needed** | |
| `GET /api/org` / `PATCH /api/org` | body `{ name?, industry?, about?, logoUrl? }` |
| `POST /api/org/logo` | multipart `file` → `{ logoUrl }` |
| `GET /api/users/me/notification-prefs` | → `{ emailEnabled, items: [{ key, email, inApp, sms }] }` |
| `PUT /api/users/me/notification-prefs` | body same as above |
| `POST /api/users/me/email/change-init` | body `{ newEmail }` → sends verification |
| `POST /api/users/me/password` | body `{ oldPassword, newPassword }` |
| Notes | Currently: Save Details/About only toggle local state. Logo upload `<input>` has no `onChange`. Password fields have no `value`/`onChange`. Change Email button no `onClick`. Email displayed is hard-coded. |

---

### H6. Marketplace — projects list, filters, pagination, search

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/projects/page.tsx](prana-web/src/app/sites/marketplace/projects/page.tsx) |
| Symptom | `FILTER_TYPES` only sends `sector`; backend supports `status`, `visibility`, `approvalStatus`, `projectType`, `sdg` but UI has no controls. Pagination never sends `limit`/`offset` — only 10 results show but count says 47. |
| **API needed** | No new endpoint — extend `ProjectFilters` with `country?: string` and pass the existing supported query params from the UI. |
| Request | `GET /api/marketplace/projects?sector=&status=&projectType=&sdg=&country=&q=&page=&limit=` |
| Notes | Add a `<StatusFilter>`, `<ProjectTypeFilter>`, `<SDGFilter>`, `<CountryFilter>` to the page, and pagination controls at the bottom. |

---

### H7. Marketplace — profile page (hard-coded account summary + dead buttons)

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/profile/page.tsx](prana-web/src/app/sites/marketplace/profile/page.tsx) lines 91–249 |
| **APIs needed** | |
| `PATCH /api/marketplace/profile/avatar` | body `{ avatarUrl }` (or multipart) |
| `GET /api/marketplace/profile/subscription` | → plan, dates, status, assessments used/limit, users in org (reuse existing `getUserSubscription` + `checkAssessmentLimits`) |
| `GET /api/marketplace/profile/organization` | → `{ orgName, role, joinedAt }` |
| Notes | "Change Photo", "Manage Subscription", "View Organization" buttons have no `onClick`. Account Summary card is fully hard-coded. |

---

### H8. Marketplace — "Reply via email" / messaging (user → project owner)

| Field | Value |
|---|---|
| Frontend | Premium modal advertises "Direct Developer Communication" (line 54–62) but no endpoint exists. The admin side has `/api/marketplace/dpr/[id]/reply` but it's admin-only. |
| **API needed** | |
| `GET /api/marketplace/messages?threadId=` | → `[{ id, from, message, createdAt }]` |
| `POST /api/marketplace/messages` | body `{ threadId, message }` |
| `POST /api/marketplace/dpr/[id]/messages` | body `{ message }` (let the user continue the conversation) |
| Notes | Will require a new `Message` / `Thread` Prisma model. |

---

### H9. Risk-assessment page — drops form fields + no geocode

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/organization-profile/risk-assessment/page.tsx](prana-web/src/app/sites/predict/organization-profile/risk-assessment/page.tsx) lines 90–309 |
| Symptom | Captures `assetName, addressLine1, addressLine2, assetSize` but the `POST /v1/assess` body doesn't include them. "Auto-fill The Location" button has no `onClick`. |
| **API needed** | |
| `GET /v1/geocode?address=` | → `{ lat, lon, formattedAddress }` |
| Update `POST /v1/assess` body | add `{ name, addressLine1, addressLine2, assetSize }` |
| `POST /v1/assets` (or `/api/org/assets`) | persist the new asset from the form so reassessment can list it later |
| Notes | The Location Preview map also hard-codes a San Francisco static-map URL. |

---

### H10. Marketplace — premium modal has no upgrade flow

| Field | Value |
|---|---|
| Frontend | [src/components/marketplace/premium-modal.tsx](prana-web/src/components/marketplace/premium-modal.tsx) line 79 |
| Symptom | "View Premium Plans" only navigates to `/pricing` — modal itself doesn't initiate checkout. Also `PremiumModal` is instantiated with `isOpen` state that's never set to `true` on the project details page (dead component). |
| **API needed** | `POST /api/marketplace/subscription/checkout` |
| Request | body `{ planId, billingCycle }` |
| Response | `200 { orderId, amount, currency, keyId }` (Razorpay-compatible) |
| Notes | Or: call existing `initiatePayment` server action from inside the modal. |

---

### H11. Admin — sustainability impact hard-coded

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/dashboard/page.tsx](prana-web/src/app/sites/admin/dashboard/page.tsx) lines 506–533 |
| **API needed** | `GET /api/admin/dashboard/sustainability-impact` |
| Response | `200 { success, data: { carbonSavedTons, waterConservedTons, unitsUpdatedAt } }` |
| Notes | Currently shows `4.2M Carbon Saved`, `1.8M Water Conserved` as literal JSX. |

---

### H12. Admin — implementation partner status filter, export CSV, "Manage Tiers"

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/implementation-partners/page.tsx](prana-web/src/app/sites/admin/implementation-partners/page.tsx) lines 398–446 |
| **APIs needed** | |
| `exportImplementationPartnersCsv(filters)` | server action → CSV blob |
| `getImplementationPartners({status})` | ✅ already supported — UI just needs the filter UI |
| `GET /api/admin/subscriptions/tiers` | → list of plan tier objects for the "Manage Tiers" drawer |

---

### H13. Admin — leads "Convert to Lead" button (Contact → Express Interest)

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/leads/page.tsx](prana-web/src/app/sites/admin/leads/page.tsx) lines 1063–1065 |
| **API needed** | `POST /api/admin/contact/[id]/convert` |
| Request | body `{ targetType: "express-interest" \| "dpr", projectId? }` |
| Response | `200 { success, data: { newId, type } }` |
| Notes | Migrates a ContactUs submission into an Express Interest lead. |

---

### H14. Admin — DPR Filter/Sort pills

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/leads/page.tsx](prana-web/src/app/sites/admin/leads/page.tsx) lines 614–622 |
| Symptom | Decorative. Need actual filter dropdown. |
| **API needed** | Extend `getDprRequests({ status, sortBy, page, pageSize })` — most params already supported on the route. Just add the UI. |

---

### H15. Predict — help-support: bug-report, attach file, email/call links

| Field | Value |
|---|---|
| Frontend | [src/app/sites/predict/organization-profile/help-support/page.tsx](prana-web/src/app/sites/predict/organization-profile/help-support/page.tsx) lines 55–179 |
| **APIs needed** | |
| `GET /api/help/articles/popular?limit=5` | → `[{ id, title, category, readTime }]` |
| `GET /api/help/faqs` | → `[{ id, question, answer }]` |
| `POST /api/help/tickets` | multipart `{ description, attachments[] }` |
| Notes | "Email Support" / "Call Us" rows are clickable but have no `mailto:`/`tel:` links. Bug-report textarea has no `value`/`onChange`. "Attach File" button has no hidden input. "Submit" button has no `onClick`. Knowledge Base / FAQs cards have no `Link` or `onClick`. |

---

### H16. Predict — sidebar: free-assessment count hard-coded

| Field | Value |
|---|---|
| Frontend | [src/components/predict/sidebar.tsx](prana-web/src/components/predict/sidebar.tsx) lines 53–69 |
| **API needed** | Reuse `GET /api/billing/usage` (alias of `checkAssessmentLimits` server action) |
| Response | `200 { success, data: { used, limit, remaining, resetAt } }` |
| Notes | Currently shows "1 Free Assessment available" hard-coded. |

---

### H17. Predict — navbar/profile refresh on update

| Field | Value |
|---|---|
| Frontend | [src/components/predict/navbar.tsx](prana-web/src/components/predict/navbar.tsx) lines 27–44 |
| Symptom | After `updateProfile` succeeds, navbar doesn't refresh — user sees stale name/email until full reload. |
| **API needed** | None — frontend fix: call `router.refresh()` after profile update. Backend should also confirm `GET /api/auth/me` returns the freshly-saved values (no caching). |

---

### H18. Predict — email verification link is GET

| Field | Value |
|---|---|
| Frontend | email verification emails contain GET links |
| **API needed** | `GET /api/auth/[action]` should accept `verify-email` and `resend-verification` as actions (currently only `set-tokens` and `clear-tokens` are GET-handled). |

---

## MEDIUM — Polish / partial fixes

### M1. Express Interest action — empty `null` payload

The fix is **frontend** (send `""` instead of `null`), but the schema should also be relaxed to `.nullable().optional()`. See C10.

### M2. Project create / bulk upload — image & document uploads are stubs

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/marketplace-projects/create/page.tsx](prana-web/src/app/sites/admin/marketplace-projects/create/page.tsx) lines 44–58; [bulk-upload/page.tsx](prana-web/src/app/sites/admin/marketplace-projects/bulk-upload/page.tsx) lines 407–429 |
| Symptom | `handleImageUpload` and `handleDocUpload` are no-op stubs. `getS3UploadUrlAction` is imported but never called. The route `GET /api/marketplace/projects/upload-url` exists. |
| **API needed** | ✅ Already exists: `GET /api/marketplace/projects/upload-url`. Just wire the frontend. |

### M3. Project create — partner list is hard-coded

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/marketplace-projects/create/page.tsx](prana-web/src/app/sites/admin/marketplace-projects/create/page.tsx) line 351–355 |
| **API needed** | `getImplementationPartnersLite({limit: 100, status: "ACTIVE"})` server action. ✅ `getImplementationPartners` already exists — wrap with a "lite" variant that omits heavy fields. |

### M4. Project create — Generate Insights / AI narrative is hard-coded

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/marketplace-projects/create/page.tsx](prana-web/src/app/sites/admin/marketplace-projects/create/page.tsx) line 593–606; [bulk-upload/page.tsx](prana-web/src/app/sites/admin/marketplace-projects/bulk-upload/page.tsx) line 106–118 |
| **API needed** | ✅ `GET /api/marketplace/projects/ai-context/[id]` exists, but needs a sibling `POST` that **generates** the narrative (calls OpenAI). |
| Request | `POST /api/marketplace/projects/ai-context/generate` body `{ projectId? \| { title, projectType, sector, location, about, ...formFields } }` |
| Response | `200 { success, data: { narrative, impactScore, successProbability, recommendations, forecast } }` |

### M5. Project list — handleStatusToggle is commented out

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/marketplace-projects/page.tsx](prana-web/src/app/sites/admin/marketplace-projects/page.tsx) line 48–60 |
| **API needed** | ✅ `PATCH /api/marketplace/projects/[id]` exists — just uncomment the call. Also accept `status` in the PATCH body (currently only updates metadata + content fields). |

### M6. Project list — pagination hard-coded counts

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/marketplace-projects/page.tsx](prana-web/src/app/sites/admin/marketplace-projects/page.tsx) line 319–340 |
| Symptom | "Showing 1 to 5 of 24" hard-coded. Buttons have no `onClick`. |
| **API needed** | None — use the `total` from `GET /api/marketplace/projects` and add `page`/`pageSize` to the call. |

### M7. Platform content (predict) — Save Changes is a comment

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/platform-content/predict-platform/page.tsx](prana-web/src/app/sites/admin/platform-content/predict-platform/page.tsx) line 38–45 |
| Symptom | `handleSave` body contains `// API call placeholder` — button does nothing. |
| **API needed** | ✅ `getPlatformContent` + `updatePlatformContent` exist. Just import them and wire (same pattern as `marketplace/page.tsx`). |

### M8. Contact form (marketplace) — missing phone field, no source

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/contact/page.tsx](prana-web/src/app/sites/marketplace/contact/page.tsx) lines 23–60 |
| **API needed** | None — add a `phone` input, send `source: "marketplace-contact"`, disable submit during `isSubmitting`. Schema already supports both. |

### M9. Pricing page — PREDICT plan is double-filtered

| Field | Value |
|---|---|
| Frontend | [src/app/sites/marketplace/pricing/page.tsx](prana-web/src/app/sites/marketplace/pricing/page.tsx) line 302–305 vs 327 |
| Symptom | `dbPlans.filter(p => p.type !== "PREDICT")` excludes PREDICT, but the page still tries to render a "Most Popular" badge for it on line 327. |
| **API needed** | None — frontend fix. Either remove the PREDICT filter or remove the PREDICT-only badges. |

### M10. `signInAction` is broken

| Field | Value |
|---|---|
| Frontend | [src/actions/shared/auth/sign-in.action.ts](prana-web/src/actions/shared/auth/sign-in.action.ts) |
| Symptom | Calls `authService.signIn` which doesn't set cookies — any caller of `signInAction` is silently unauthenticated. |
| **API needed** | None — fix the action to invoke `authService.login` end-to-end so cookies get set. |

### M11. RegisterSchema drops extra fields

| Field | Value |
|---|---|
| Frontend | [src/core/validation/auth.schemas.ts](prana-web/src/core/validation/auth.schemas.ts) lines 25–35 |
| Symptom | Form sends `phone, company, jobTitle, country, agreed` but schema only validates `fullName, email, password, confirmPassword` — extras get stripped. |
| **API needed** | None — extend `RegisterSchema` to accept and persist the additional fields (User model may need new columns). |

### M12. Express interest + DPR — isProjectSaved N+1

| Field | Value |
|---|---|
| Frontend | All three project pages re-fetch the whole `getSavedProjects` list to derive saved status. |
| **API needed** | None — call existing `isProjectSaved(projectId)` server action per card. |

### M13. Predict / Marketplace — inconsistent route prefixes

`/organization-profile/...`, `/profile`, `/settings`, `/reports`, `/our-tech`, `/how-it-works`, `/login` — all 404 because the apps are mounted at `/sites/predict/...` and `/sites/marketplace/...`.

- Add to `next.config.ts` rewrites, OR change all `<Link>` hrefs in `components/predict/sidebar.tsx`, `navbar-client.tsx`, etc.
- OR add a `BASE_PATH` constant.

### M14. `console.log` left in production sidebar

[src/components/predict/sidebar.tsx](prana-web/src/components/predict/sidebar.tsx) line 26.

### M15. Hero / Ready CTA / Three-Steps — analytics events

| Field | Value |
|---|---|
| Frontend | [src/components/predict/hero.tsx](prana-web/src/components/predict/hero.tsx), [ready-cta.tsx](prana-web/src/components/predict/ready-cta.tsx), [three-steps-to-impact.tsx](prana-web/src/components/predict/three-steps-to-impact.tsx) |
| **API needed** | ✅ `POST /api/events/track` exists — fire on CTA click with `{ eventName: "CTA_CLICK", payload: { cta: "hero.get_started" } }` |

---

## LOW — Cosmetic / nice-to-have

### L1. Sustainability card on admin dashboard — pull from API
See H11. Low until H11 lands.

### L2. Subscription cards — `activeSubscribers` field

| Field | Value |
|---|---|
| Frontend | [src/app/sites/admin/subscriptions/page.tsx](prana-web/src/app/sites/admin/subscriptions/page.tsx) line 412–413 |
| Symptom | Plan card displays `activeSubscribers` but `handleSave` doesn't include it. |
| **API needed** | Add `activeSubscribers` to the plan update payload if you want it editable. |

### L3. "MoreVertical" / `Calendar` / `X` icon buttons in leads detail

[src/app/sites/admin/leads/page.tsx](prana-web/src/app/sites/admin/leads/page.tsx) lines 758–761, 825–827, 1009–1011 — decorative. Wire to delete-draft, dismiss, more-actions as desired.

### L4. Market engagement — `mockTransactions` declared but unused

Safe to remove. Same for `recentLeads` constant in admin dashboard.

### L5. DPR form — "Save as Draft" button

[src/app/sites/marketplace/projects/[slug]/request-dpr/page.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/request-dpr/page.tsx) line 512 — no `onClick`. Add `POST /api/marketplace/dpr/drafts` body `{ formData, projectId }` if you want this feature.

### L6. "View Full Scan Data" / "View Well Data" buttons in concept-note

[src/app/sites/marketplace/projects/[slug]/concept-note/page.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/concept-note/page.tsx) lines 118, 126 — no `onClick`. Link to the relevant audit dataset (or remove).

### L7. Predict — `permissions.ts` Role enum unused

[src/core/auth/permissions.ts](prana-web/src/core/auth/permissions.ts) line 1–6 — defined but no consumer.

### L8. Logout duplicate

`logoutAction` defined twice in [src/actions/auth.actions.ts](prana-web/src/actions/auth.actions.ts) lines 18 and 148.

### L9. `getStaticFeatures(plan.type)` computed but never used

[src/app/sites/marketplace/pricing/page.tsx](prana-web/src/app/sites/marketplace/pricing/page.tsx) line 308, 371–383 — dead code path.

### L10. `subsData?.planType !== "MARKETPLACE"` guard too narrow

[src/app/sites/marketplace/projects/[slug]/concept-note/layout.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/concept-note/layout.tsx) line 22 — should also include `BUNDLE`.

---

## Summary — what to build, in priority order

1. **Profile**: `GET /api/users/me` (full payload) + `PATCH /api/users/me` (avatar, role, timeZone, locale, orgRole) + `GET /api/org/profile/export` (C1, C2)
2. **Implementation Partners**: HTTP routes for `POST/PATCH/DELETE /api/marketplace/implementation-partners[/[id]]` + public `GET` + add `taxId` to PATCH body (C3, C12)
3. **Admin leads reply**: wire existing reply actions to the text input, ensure `POST /api/admin/express-interest/[id]/reply` and `POST /api/admin/contact/[id]/reply` exist (C4)
4. **Admin dashboard date filter**: extend `getAdminDashboardMetrics` + `getAdminLeads` + assessment management to accept `range` (C5)
5. **Routing fixes**: `next.config.ts` rewrites for `/login`, `/marketplace`, `/our-tech`, `/how-it-works` (C6, C7, C8, M13)
6. **Schema relaxations**: express interest + DPR accept nullable phone/company, projectId accepts slug (C10, M1)
7. **Assessment management**: new `getAssessments`, `getTopOrganizations`, `exportAssessmentActivityCsv`, `retryFailedAssessment` actions (C11)
8. **Dashboard data**: `getOrgDashboardStats`, `getOrgDashboardTopRiskAssets`, `getOrgDashboardRecentAssessments`, `getOrgDashboardAssetPoints`, `getOrgDashboardExport` (H1)
9. **Reports data**: `getOrgReports` + stats + trend + download (H2)
10. **Project details AI**: wire existing `/ai-context/[id]`, add `/milestones`, `/related` (H3)
11. **Reassessment**: `getOrgAssets`, `getOrgAssetSummary`, `getOrgAssetHistory`, `reassessAsset` (H4)
12. **Settings**: `GET/PATCH /api/org`, `POST /api/org/logo`, `GET/PUT /api/users/me/notification-prefs`, `POST /api/users/me/email/change-init`, `POST /api/users/me/password`, `GET /api/billing/invoices[/[id]/download]` (H5, C14)
13. **Marketplace projects list**: extend `ProjectFilters` with `country` and add UI for existing supported filters + pagination (H6)
14. **Marketplace profile**: `PATCH /api/marketplace/profile/avatar`, reuse `getUserSubscription` + `checkAssessmentLimits` (H7)
15. **Marketplace messaging**: new `Message`/`Thread` model + `GET/POST /api/marketplace/messages` + `POST /api/marketplace/dpr/[id]/messages` (H8)
16. **Geocode**: `GET /v1/geocode?address=` + add `name, addressLine1, addressLine2, assetSize` to `/v1/assess` body (H9)
17. **Premium modal checkout**: `POST /api/marketplace/subscription/checkout` or wire `initiatePayment` action (H10)
18. **Admin sustainability impact**: `GET /api/admin/dashboard/sustainability-impact` (H11)
19. **Admin partner export + status filter**: `exportImplementationPartnersCsv`, `getImplementationPartners({status})` UI, `GET /api/admin/subscriptions/tiers` (H12)
20. **Admin convert contact → lead**: `POST /api/admin/contact/[id]/convert` (H13)
21. **Admin leads filter pills**: extend `getDprRequests` with `status, sortBy` (H14)
22. **Help & support**: `GET /api/help/articles/popular`, `GET /api/help/faqs`, `POST /api/help/tickets` (H15)
23. **Sidebar free-assessment count**: alias `GET /api/billing/usage` (H16)
24. **Navbar refresh-on-update**: call `router.refresh()` after profile update (H17)
25. **Email verification GET**: add `verify-email` and `resend-verification` to `GET /api/auth/[action]` (H18)
26. **Project create/bulk**: wire S3 presigned URL uploads + Generate Insights (M2, M3, M4)
27. **Project list status toggle**: uncomment `updateProject` call + accept `status` in PATCH (M5)
28. **Platform content (predict) Save**: wire `updatePlatformContent` (M7)
29. **Contact form**: add `phone` + `source: "marketplace-contact"` (M8)
30. **Pricing PREDICT filter bug**: remove filter or remove badges (M9)
31. **signInAction / RegisterSchema**: fix broken sign-in action + extend register schema (M10, M11)
32. **Misc hygiene**: stale `mockTransactions`, `recentLeads`, `console.log`, duplicate `logoutAction`, unused `getStaticFeatures`, `Role` enum, concept-note button (L1–L10)
