# Frontend-Linking API Reference

> **For frontend devs.** Every endpoint below was built because the existing frontend had a button, modal, or page that called no API. Each section maps **"what the UI does today"** → **"the endpoint(s) you must call to make it work."**

For the dashboard + AI-summary surface see [DASHBOARD_AND_AI_API.md](./DASHBOARD_AND_AI_API.md). This document is for everything else.

---

## Conventions

- All endpoints under `/api/**` are prana-web. They require the `access_token` cookie.
- All endpoints under `/v1/**` are the FastAPI climate-pipeline (no auth, hit via `NEXT_PUBLIC_API_BASE`).
- Standard error envelope:
  ```ts
  type ErrorResponse = {
    success: false;
    message: string;
    errors?: Record<string, string[]>;   // Zod flatten() for 400s
  };
  ```
- All timestamps are ISO-8601 UTC strings.
- Decimal columns (scores, weights, exposure) come back as **plain numbers** in JSON responses because Prisma → JSON serialises `Decimal` to `number`.

---

## 1. Profile page (`/sites/predict/profile`)

File: [src/app/sites/predict/profile/page.tsx](prana-web/src/app/sites/predict/profile/page.tsx)

### What the UI does today

| UI element | Line | Behaviour |
|---|---|---|
| Avatar initials "JD" + "Change Photo" button | ~88-93 | no `onClick`, no upload |
| Avatar initials | 25-34 | only renders `fullName, email, jobTitle, phone, countryRegion` from `getCurrentUser()` |
| Profile form | 14-20, 96-170 | `updateProfile()` sends `fullName, jobTitle, phone, countryRegion` only — drops avatar/role/timeZone/locale |
| "Manage Subscription" button | 224-226 | no `onClick` |
| "Account Summary" card | 189-222 | hard-coded ("Bundle Plan", dates, "9 of 20 assessments") |
| "Company Affirmation" card | 231-254 | hard-coded ("Sustainability Manager" etc.) |
| "View Organization" button | 249-251 | no `onClick` |

### Endpoints to wire

### 1.1 `GET /api/users/me`

**Replaces `getCurrentUser()`** — returns the full payload the page needs.

**Auth:** cookie required.

**Response shape**

```ts
{
  success: true;
  data: {
    user: {
      id: string;                  // UUID
      fullName: string;
      email: string;
      role: "USER" | "ADMIN";
      phone: string | null;
      jobTitle: string | null;
      countryRegion: string | null;
      timezone: string | null;
      locale: string | null;        // not yet a column — always null
      avatarUrl: string | null;
      isEmailVerified: boolean;
      isActive: boolean;
      organization: {
        id: string;
        name: string;
        slug: string | null;
        logoUrl: string | null;
        role: "OWNER" | "ADMIN" | "MEMBER";
        joinedAt: string;           // ISO
      } | null;
    };
  };
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "fullName": "Aadhar Goel",
      "email": "aadhar@example.com",
      "role": "USER",
      "phone": "+91-9876543210",
      "jobTitle": "Sustainability Manager",
      "countryRegion": "India",
      "timezone": "Asia/Kolkata",
      "locale": null,
      "avatarUrl": "https://prana-earth-data.s3.ap-south-1.amazonaws.com/media/avatars/...png",
      "isEmailVerified": true,
      "isActive": true,
      "organization": {
        "id": "a47ac10b-58cc-4372-a567-0e02b2c3d400",
        "name": "Greentech Solutions",
        "slug": "greentech-solutions",
        "logoUrl": "https://prana-earth-data.s3.../media/org-logos/...png",
        "role": "OWNER",
        "joinedAt": "2026-01-12T08:00:00.000Z"
      }
    }
  }
}
```

---

### 1.2 `PATCH /api/users/me`

**Replaces the current `updateProfile()` call** — supports all 7 fields.

**Auth:** cookie required.

**Request body** (all fields optional, only the ones you send are updated)

```ts
{
  fullName?: string;        // min 2 chars
  phone?: string | null;     // max 30
  jobTitle?: string | null;  // max 100
  countryRegion?: string | null;
  timezone?: string | null;  // max 100
  avatarUrl?: string | null;
  locale?: string | null;
}
```

**Sample request**

```json
{
  "fullName": "Aadhar G.",
  "jobTitle": "Sustainability Lead",
  "countryRegion": "India",
  "timezone": "Asia/Kolkata",
  "avatarUrl": "https://prana-earth-data.s3.../media/avatars/...png"
}
```

**Response shape**

```ts
{
  success: true;
  data: {
    user: {
      id: string;
      fullName: string;
      email: string;
      role: "USER" | "ADMIN";
      phone: string | null;
      jobTitle: string | null;
      countryRegion: string | null;
      timezone: string | null;
      avatarUrl: string | null;
      isEmailVerified: boolean;
      isActive: boolean;
    };
  };
}
```

---

### 1.3 `POST /api/users/me/avatar` (multipart)

**Wires the "Change Photo" button.**

**Content-Type:** `multipart/form-data; boundary=…`

**Form field**

| Name | Type | Required | Notes |
|---|---|---|---|
| `file` | binary | yes | JPEG / PNG / WEBP, ≤ 5 MB |

**Response shape**

```ts
{
  success: true;
  data: {
    user: {
      id: string;
      fullName: string;
      email: string;
      avatarUrl: string;          // the freshly-uploaded S3 URL
    };
  };
}
```

**Errors**
- `415` — wrong content type
- `400` — missing `file` field, MIME type not allowed, or > 5 MB

---

### 1.4 `DELETE /api/users/me/avatar`

Removes the avatar (deletes the S3 object + nulls the column).

**Auth:** cookie required.

**Response shape**

```ts
{ success: true; message: "Avatar removed" }
```

---

### 1.5 `GET /api/billing/usage`

**Wires the "9 of 20 assessments" / "1 Free Assessment available" tile.**

**Auth:** cookie required (anonymous falls back to "0 of 0").

**Response shape**

```ts
{
  success: true;
  data: {
    used: number;          // assessments completed this calendar month
    limit: number;         // from active plan's `maxAssessments`, or 1 for FREE
    remaining: number;     // max(0, limit - used)
    resetAt: string;       // ISO — first day of next calendar month
    planType: "FREE" | "PREDICT" | "MARKETPLACE" | "BUNDLE";
  };
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "used": 9,
    "limit": 20,
    "remaining": 11,
    "resetAt": "2026-09-01T00:00:00.000Z",
    "planType": "MARKETPLACE"
  }
}
```

---

### 1.6 `GET /api/org/profile/export?format=csv|pdf`

**Wires the "Download" button in Account Summary.**

**Auth:** cookie required.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `format` | `"csv"` \| `"pdf"` | `"csv"` | `pdf` returns a JSON envelope referencing the CSV (stub) |

**Response (CSV)**

`Content-Type: text/csv; charset=utf-8`
`Content-Disposition: attachment; filename="user-profile-YYYY-MM-DD.csv"`

```csv
id,fullName,email,phone,jobTitle,countryRegion,timezone,role,organizationName,joinedAt
f47ac10b-...,Aadhar Goel,aadhar@example.com,+91-...,Sustainability Manager,India,Asia/Kolkata,USER,Greentech Solutions,2026-01-12T08:00:00.000Z
```

---

## 2. Settings page (`/sites/predict/settings`)

File: [src/app/sites/predict/settings/page.tsx](prana-web/src/app/sites/predict/settings/page.tsx)

### What the UI does today

| Tab | Element | Issue | Endpoint |
|---|---|---|---|
| Organization | initial `orgData` (name, industry, about, logoUrl) | hard-coded | `GET /api/org` |
| Organization | "Save Details" / "Save About" | toggles local state only | `PATCH /api/org` |
| Organization | "Change Logo" (file input on line ~115) | no `onChange` | `POST /api/org/logo` |
| Notifications | email toggle + 5 pref checkboxes | local state only | `GET / PUT /api/users/me/notification-prefs` |
| Notifications | "Change Email" button | no `onClick` | `POST /api/users/me/email/change-init` |
| Security | password fields (current/new/confirm) | no `value` / no `onChange` | `POST /api/users/me/password` |
| Billing | invoice list + "Download" | hard-coded | `GET /api/billing/invoices` + `GET /api/billing/invoices/{id}/download` |
| Billing | "Manage Tiers" button | no `onClick` | (UI-decorative, no backend) |

### Endpoints to wire

### 2.1 `GET /api/org`

Returns the current user's primary organization (first membership by `joinedAt`).

**Auth:** cookie required.

**Response shape**

```ts
{
  success: true;
  data: {
    organization: {
      id: string;
      name: string;
      slug: string | null;
      logoUrl: string | null;
      industry: string | null;
      about: string | null;
      website: string | null;
      country: string | null;
      companySize: string | null;
      membersCount: number;
      role: "OWNER" | "ADMIN" | "MEMBER";   // caller's role in this org
      joinedAt: string;
    };
  };
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "organization": {
      "id": "a47ac10b-58cc-4372-a567-0e02b2c3d400",
      "name": "Greentech Solutions",
      "slug": "greentech-solutions",
      "logoUrl": "https://prana-earth-data.s3.../media/org-logos/...png",
      "industry": "Renewable Energy",
      "about": "We help enterprises decarbonise through climate risk analytics.",
      "website": "https://greentech.example",
      "country": "India",
      "companySize": "50-200",
      "membersCount": 6,
      "role": "OWNER",
      "joinedAt": "2026-01-12T08:00:00.000Z"
    }
  }
}
```

---

### 2.2 `PATCH /api/org`

**Auth:** `OWNER` or `ADMIN` only — anyone else gets `403`.

**Request body** (all optional)

```ts
{
  name?: string;            // 1-255 chars
  industry?: string | null;
  about?: string | null;
  website?: string | null;  // URL
  country?: string | null;
  companySize?: string | null;
  logoUrl?: string | null;
}
```

**Response shape**

```ts
{
  success: true;
  data: { organization: { /* same shape as GET response */ } };
}
```

---

### 2.3 `POST /api/org/logo`

**Content-Type:** `multipart/form-data`

**Form field**

| Name | Type | Required | Notes |
|---|---|---|---|
| `file` | binary | yes | JPEG / PNG / WEBP / SVG, ≤ 5 MB |

**Response shape**

```ts
{
  success: true;
  data: {
    organization: { id: string; name: string; logoUrl: string };
  };
}
```

**Auth:** `OWNER` or `ADMIN`.

---

### 2.4 `DELETE /api/org/logo`

Removes the org logo from S3 and nulls the column.

---

### 2.5 `GET /api/users/me/notification-prefs`

**Auth:** cookie required.

**Response shape**

```ts
{
  success: true;
  data: {
    emailEnabled: boolean;      // master email toggle
    inAppEnabled: boolean;      // master in-app toggle
    items: Array<{
      key: string;
      email?: boolean;
      inApp?: boolean;
      sms?: boolean;
    }>;
  };
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "emailEnabled": true,
    "inAppEnabled": true,
    "items": []
  }
}
```

(`items` defaults to `[]` until prefs are toggled.)

---

### 2.6 `PUT /api/users/me/notification-prefs`

**Auth:** cookie required.

**Request body** (all optional)

```ts
{
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
  items?: Array<{
    key: string;               // e.g. "ASSESSMENT_STARTED"
    email?: boolean;
    inApp?: boolean;
    sms?: boolean;
  }>;
}
```

**Response:** identical to GET.

---

### 2.7 `POST /api/users/me/email/change-init`

**Auth:** cookie required.

**Request body**

```ts
{ newEmail: string; }
```

**Response shape**

```ts
{
  success: true;
  message: string;
  devToken?: string;          // dev-mode only (NODE_ENV !== "production")
  devVerifyUrl?: string;      // dev-mode only
}
```

The `verify-email` GET handler swaps `User.email` to `newEmail` after the user clicks the link. Production should consume the verification URL inside an outbound transactional email (TODO in source).

---

### 2.8 `POST /api/users/me/password`

**Auth:** cookie required.

**Request body**

```ts
{
  currentPassword: string;     // bcrypt-verified against User.passwordHash
  newPassword: string;         // must satisfy passwordSchema (>= 8 chars, upper, lower, digit, special)
  confirmPassword: string;
}
```

**Sample request**

```json
{
  "currentPassword": "Old1Password!",
  "newPassword": "NewPa55word!",
  "confirmPassword": "NewPa55word!"
}
```

**Response:** `{ success: true, message: "Password updated" }`

**Side effects (server-side):**
- Rotates `passwordHash`
- Invalidates **all other** `Session` rows for the user (keeps the current one — `password` change does NOT log you out)
- Revokes **all** `RefreshToken` rows for the user (forces re-auth on other devices)

**Errors:** `400` if current password is wrong, Zod fails, or Google-only user (no `passwordHash`).

---

### 2.9 `GET /api/billing/invoices`

**Auth:** cookie required.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `page` | int? | `1` | |
| `limit` | int? | `20` | cap at `100` |
| `from` | ISO? | — | `paidAt >= from` |
| `to` | ISO? | — | `paidAt <= to` |

**Response shape**

```ts
{
  success: true;
  data: {
    invoices: Array<{
      id: string;
      date: string;                  // payment.paidAt ?? payment.createdAt
      description: string;           // plan name
      plan: "PREDICT" | "MARKETPLACE" | "BUNDLE" | null;
      amount: number;
      currency: string;              // "INR" etc.
      status: string;                // Payment.status (SUCCESS / PENDING / etc.)
      invoiceUrl: string | null;     // local URL: /api/billing/invoices/{id}/download
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
```

---

### 2.10 `GET /api/billing/invoices/{id}/download`

**Wires the "Download" button in the Billing tab** (already wired in [settings/page.tsx](prana-web/src/app/sites/predict/settings/page.tsx)).

The frontend hits this URL directly via `<a href={invoiceUrl} download>` — the browser downloads the file automatically because the route sets `Content-Disposition: attachment`.

**Auth:** cookie required, scoped to `Payment.userId === user.id`.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `format` | `text` \| `json` \| `pdf` | `text` | See below |

**Three flavours**

**`format=text` (default)** — streams a real plain-text invoice. `Content-Type: text/plain; charset=utf-8`. `Content-Disposition: attachment; filename="INV-XXXXXXXX.txt"`. The browser downloads it directly — no client-side Blob wrapping.

**`format=json`** — JSON envelope (no file). Useful for callers that want to render the invoice programmatically.

**`format=pdf`** — placeholder. Returns a JSON envelope with `downloadUrl` pointing at the `text` endpoint until a real PDF generator is wired.

**Response (default, `format=text`)**

`Content-Type: text/plain; charset=utf-8`
`Content-Disposition: attachment; filename="INV-F47AC10B.txt"`

```
==========================================================================
  PRANA EARTH — INVOICE
==========================================================================

Invoice #:      INV-F47AC10B
Issued:         Sat, 01 Aug 2026 10:00:00 GMT
Status:         PAID

Bill to:
  Aadhar Goel
  aadhar@example.com

Item:
  Premium Marketplace (MARKETPLACE)

Amount:         INR 1500.50
Provider:       Razorpay
Provider ID:    pay_RZP_12345

Internal ref:   f47ac10b-58cc-4372-a567-0e02b2c3d4a0

==========================================================================
  Generated by Prana Earth API
==========================================================================
```

**Response (`format=json`)**

```ts
{
  success: true;
  data: {
    invoiceId: string;
    number: string;                  // "INV-F47AC10B"
    amount: number;                  // 1500.50
    currency: string;                // "INR"
    issuedAt: string;                // ISO
    plan: { name: string; type: "PREDICT" | "MARKETPLACE" | "BUNDLE" } | null;
    user: { id: string; fullName: string; email: string };
    provider: string | null;
    providerPaymentId: string | null;
  };
}
```

**Response (`format=pdf`, placeholder)**

```ts
{
  success: true;
  data: {
    invoiceId: string;            // same fields as format=json above …
    number: string;
    amount: number;
    // …
    downloadUrl: `/api/billing/invoices/{id}/download?format=text`;
    note: "PDF generation not yet wired — falling back to plain-text.";
  };
}
```

**Errors**

| Status | Meaning |
|---|---|
| `401` | not signed in |
| `404` | payment not found / not owned by the caller |
| `409` | `payment.status !== "SUCCESS"` (no FAILED / PENDING downloads) |

**How the Billing tab uses it**

1. Fetch the list via `GET /api/billing/invoices` — every row has `invoiceUrl: "/api/billing/invoices/{id}/download"` (server-rendered absolute path).
2. Drop that URL into `<a href={invoiceUrl} download>`. The browser downloads `INV-XXXXXXXX.txt` directly.
3. To fetch the JSON envelope instead (for a custom UI), call the same URL with `?format=json`.

> Note: the `<a download>` attribute is honored on same-origin URLs. Set it on an `<a>` rendered inside the React tree — see [src/app/sites/predict/settings/page.tsx](prana-web/src/app/sites/predict/settings/page.tsx) BillingTab.

---

## 3. Reassessment page (`/sites/predict/organization-profile/reassessment`)

File: [src/app/sites/predict/organization-profile/reassessment/page.tsx](prana-web/src/app/sites/predict/organization-profile/reassessment/page.tsx)

### What the UI does today

| Element | Issue | Endpoint |
|---|---|---|
| `assets[]` (Top 30 asset list) | hard-coded 5 entries | `GET /api/org/assets?page=&type=&q=` |
| Search input (line 72) | no `value` / `onChange` | same as above, with `q` query |
| "All Asset Types" dropdown | no menu / `onClick` | same |
| Pagination (line 138) | no `onClick` | same, with `page` query |
| Right-side "Asset Mini Hero Info" panel | hard-coded | `GET /api/org/assets/{id}/summary` |
| "View Last Report" (line 187) | no `onClick` | `GET /api/org/reports?assetId={id}&latest=true` |
| "View All History" | no `onClick` | `GET /api/org/assets/{id}/assessment-history` |
| "Start Assessment" / "Cancel" | no `onClick` | `POST /api/org/assets/{id}/reassess` |
| "Learn more about reassessment" | dead link | — |

### Endpoints to wire

### 3.1 `GET /api/org/assets`

**Auth:** org member.

**Query parameters**

| Name | Type | Notes |
|---|---|---|
| `q` | string? | free-text search across `name` and `city` |
| `type` | string? | filter by `AssetType` enum |
| `page` | int? | default `1` |
| `limit` | int? | default `10` |

**Response shape**

```ts
{
  success: true;
  data: {
    rows: Array<{
      id: string;                    // asset UUID
      name: string;
      type: "DATA_CENTER" | "MANUFACTURING_UNIT" | ... | null;
      city: string | null;
      country: string | null;
      lastAssessmentDate: string | null;   // ISO of latest COMPLETED assessment
      lastScore: number | null;           // latest composite risk
    }>;
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
```

---

### 3.2 `GET /api/org/assets/{id}/summary`

Returns the four fields the "Asset Mini Hero Info" panel needs.

**Response**

```json
{
  "success": true,
  "data": {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
    "name": "GreenTech DC-01",
    "type": "DATA_CENTER",
    "location": { "city": "Hyderabad", "country": "India" },
    "lastAssessmentDate": "2026-08-23T10:15:00.000Z",
    "lastScore": 78.2
  }
}
```

---

### 3.3 `GET /api/org/assets/{id}/assessment-history`

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `limit` | int? | `3` | for the inline history list |

**Response**

```json
{
  "success": true,
  "data": {
    "rows": [
      {
        "id": "...",
        "date": "2026-05-31T10:30:00.000Z",
        "status": "COMPLETED",
        "score": 72,
        "variant": "completed" | "in-progress" | "failed"
      }
    ],
    "total": 12,
    "limit": 3
  }
}
```

---

### 3.4 `GET /api/org/reports?assetId={id}&latest=true`

Already exists for the Reports page. Returns the latest `Report` row(s) for the asset. See [DASHBOARD_AND_AI_API.md §A.6 / §B.6](./DASHBOARD_AND_AI_API.md).

---

### 3.5 `POST /api/org/assets/{id}/reassess`

Wires the **"Start Assessment" button**.

**Request body**

```json
{ "scenario": "ssp245", "horizon": 2050, "assetType": "data_center" }
```

**Response** — `{ success: true, data: { assessmentId, assetId, climateRiskScores: 6, indicatorScores: 30, status: "COMPLETED" } }`

> The full sample response + shape is in [DASHBOARD_AND_AI_API.md §B.7](./DASHBOARD_AND_AI_API.md).

---

## 4. Help & Support page (`/sites/predict/organization-profile/help-support`)

File: [src/app/sites/predict/organization-profile/help-support/page.tsx](prana-web/src/app/sites/predict/organization-profile/help-support/page.tsx)

### What the UI does today

| Element | Issue | Endpoint |
|---|---|---|
| "Knowledge Base" card (line 55) | clickable, no `onClick` | `GET /api/help/articles/popular?limit=5` |
| "FAQs" card (line 83) | clickable, no `onClick` | `GET /api/help/faqs` |
| "View all articles" link (line 104) | no `onClick` | (navigate to `/help/articles` — no API needed) |
| 5× `<ArticleRow>` (lines 108-112) | hard-coded | `GET /api/help/articles/popular?limit=5` |
| "Email Support" / "Call Us" / "Visit Us" rows | clickable, no `mailto:` / `tel:` | static links (frontend fix only) |
| Bug-report `<textarea>` | no `value` / `onChange` | included in `POST /api/help/tickets` body |
| "Attach File" button (line 174) | no `<input type="file">` | multipart part of `POST /api/help/tickets` |
| "Submit" button (line 177) | no `onClick` | `POST /api/help/tickets` |

### Endpoints to wire

### 4.1 `GET /api/help/articles/popular?limit=5`

**Auth:** public.

**Response shape**

```ts
{
  success: true;
  data: {
    articles: Array<{
      id: string;                            // UUID
      slug: string;                           // URL slug
      title: string;
      excerpt: string | null;
      category: string | null;
      readTime: number | null;                // minutes
      viewCount: number;
    }>;
  };
}
```

> Returns `[]` until the `help_articles` table is seeded. The endpoint is live; the data isn't.

---

### 4.2 `GET /api/help/faqs`

**Auth:** public.

**Response shape**

```ts
{
  success: true;
  data: {
    faqs: Array<{
      id: string;
      question: string;
      answer: string;
      category: {
        id: string;
        name: string;
        slug: string;
      } | null;
    }>;
    categories: Array<{ id: string; name: string; slug: string }>;
  };
}
```

> Returns `[]` until FAQs are seeded.

---

### 4.3 `POST /api/help/tickets`

Wires the **bug-report submit** form. Two content-type flavours.

**Flavour 1: `application/json`** (no attachments)

```json
{
  "subject": "Dashboard chart doesn't render in Firefox",
  "description": "Steps to reproduce: ...",
  "priority": "MEDIUM"
}
```

**Flavour 2: `multipart/form-data`** (with attachments)

Form fields:
- `subject` (string, required)
- `description` (string, required)
- `priority` (string, one of `"LOW" | "MEDIUM" | "HIGH" | "URGENT"`, defaults to `MEDIUM`)
- `attachments` (file, repeatable, ≤ 10 MB each)

**Response**

```ts
{
  success: true;
  data: { ticket: { id: string; subject: string; status: "OPEN"; priority: string; createdAt: string } };
}
```

> Backend-side notification/email is a TODO (`// TODO: send notification/email to support@pranaearth.com when wired.`).

---

## 5. Admin dashboard (`/sites/admin/dashboard`)

File: [src/app/sites/admin/dashboard/page.tsx](prana-web/src/app/sites/admin/dashboard/page.tsx)

### What the UI does today

| Element | Issue | Endpoint |
|---|---|---|
| "Last 30 Days" button (line 231) | styled button, no `onClick` | extend `getAdminDashboardMetrics` (server action) to accept a `range` arg, then back it with `GET /api/admin/dashboard/metrics?range=...` |
| "Sustainability Impact" card (lines 506-533) | hard-coded `4.2M Carbon Saved`, `1.8M Water Conserved` | `GET /api/admin/dashboard/sustainability-impact` |

### Endpoints to wire

### 5.1 `GET /api/admin/dashboard/metrics?range=7d|30d|60d|90d|1y`

> Backend is wired; the server action `getAdminDashboardMetrics` needs to accept a `range` parameter and forward it.

**Auth:** admin only.

**Query parameters**

| Name | Type | Default | Notes |
|---|---|---|---|
| `range` | string? | `"30d"` | `"7d" \| "30d" \| "60d" \| "90d" \| "1y"` |

**Response shape**

Reuses the existing KPIs from `getAdminDashboardMetrics()` but recomputed against the requested window. Same envelope as before. The action signature update is one line.

---

### 5.2 `GET /api/admin/dashboard/sustainability-impact`

**Auth:** admin only.

**Response shape**

```ts
{
  success: true;
  data: {
    carbonSavedTons: number;       // sum from `SustainabilityImpact` table (scope = "global")
    waterConservedTons: number;
    hectaresRestored: number;
    beneficiaries: number;
    asOf: string | null;           // ISO
  };
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "carbonSavedTons": 0,
    "waterConservedTons": 0,
    "hectaresRestored": 0,
    "beneficiaries": 0,
    "asOf": null
  }
}
```

> The endpoint auto-creates a zero-row on first call. Update it via Prisma Studio (or wire a new `PUT /api/admin/dashboard/sustainability-impact`) when there's real data to display.

---

## 6. Admin leads (`/sites/admin/leads`)

File: [src/app/sites/admin/leads/page.tsx](prana-web/src/app/sites/admin/leads/page.tsx)

### What the UI does today

| Element | Issue | Endpoint |
|---|---|---|
| Express Interest "Reply via Email" button (line 578) | no `onClick` | `POST /api/admin/express-interest/[id]/reply` (or call existing server action with a `message` state) |
| Contact "Convert to Lead" (line 1063) | no `onClick` | `POST /api/admin/contact/[id]/convert` |
| DPR filter/sort pills (line 614) | decorative | extend `getDprRequests` to accept `status/sortBy` |
| DPR detail "X" dismiss (line 825) | no `onClick` | `POST /api/admin/dpr/[id]/status` (existing) with `FAILED`/`ARCHIVED` |
| Contact "more options" (line 1009) | decorative | (no-op) |

### Endpoints to wire

### 6.1 `POST /api/admin/express-interest/[id]/reply` *(mirror of existing `/api/marketplace/dpr/[id]/reply`)*

**Auth:** admin only.

**Request body**

```json
{
  "replyMessage": "Thanks for your interest — let's schedule a call this week.",
  "status": "CONTACTED"
}
```

**Response**: `{ success: true, data: { interest: {...} } }`

The existing `replyToExpressInterest` server action ([src/actions/express-interest.actions.ts](prana-web/src/actions/express-interest.actions.ts)) accepts the same shape. The HTTP route is the missing piece; mirror it after `/api/marketplace/dpr/[id]/reply`.

---

### 6.2 `POST /api/admin/contact/[id]/convert`

**Auth:** admin only.

**Request body**

```ts
{
  targetType: "express-interest" | "dpr";   // default "express-interest"
  projectId?: string;                       // UUID or slug — optional. Falls back to a best-effort match by contact.subject.
  message?: string;                         // optional overrides of the contact body
}
```

**Response shape**

```ts
{
  success: true;
  data: {
    newId: string;                          // the new ExpressInterest or DPR id
    type: "express-interest" | "dpr";
    sourceContactId: string;
  };
}
```

**Errors:** `400` if no `projectId` provided and no project can be matched.

---

## 7. Marketplace pages

### 7.1 Concept-note download
File: [src/app/sites/marketplace/projects/[slug]/concept-note/page.tsx](prana-web/src/app/sites/marketplace/projects/[slug]/concept-note/page.tsx)

| Element | Issue | Endpoint |
|---|---|---|
| "Download PDF" handleDownload (line 10-21) | writes a hard-coded placeholder string | `GET /api/marketplace/projects/[id]/concept-note` |
| "View Full Scan Data" / "View Well Data" | no `onClick` | backend has no static asset to link — display "coming soon" |

#### 7.1.1 `GET /api/marketplace/projects/[id]/concept-note`

**Auth:** requires active `MARKETPLACE` or `BUNDLE` subscription (matches the layout guard). Otherwise `403`.

**Where `id` accepts either the project UUID or its slug.**

**Response shape**

```ts
{
  success: true;
  data: {
    project: {
      id: string;
      slug: string;
      title: string;
      conceptNoteUrl: string | null;     // pre-signed download URL when present
      milestones: Array<unknown> | null;
      recommendations: Array<unknown> | null;
      forecast: unknown | null;
    };
  };
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "project": {
      "id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "slug": "mangrove-restoration-maharashtra",
      "title": "Mangrove Restoration — Maharashtra",
      "conceptNoteUrl": "https://prana-earth-data.s3.ap-south-1.amazonaws.com/media/concept-notes/mangrove-restoration.pdf",
      "milestones": [
        { "phase": "Site assessment", "quarter": "Q2 2026" },
        { "phase": "Community training", "quarter": "Q3 2026" }
      ],
      "recommendations": [
        "Allocate 60% of funding to planting in Q1",
        "Hire 3 local stewards before monsoon"
      ],
      "forecast": { "12_month_return_pct": 4.2 }
    }
  }
}
```

When `conceptNoteUrl` is null, render the milestones + recommendations + forecast as a styled preview instead of triggering a download.

---

### 7.2 Marketplace profile (`/sites/marketplace/profile`)

File: [src/app/sites/marketplace/profile/page.tsx](prana-web/src/app/sites/marketplace/profile/page.tsx)

| Element | Issue | Endpoint |
|---|---|---|
| "Change Photo" button (line 91) | no upload | `POST /api/marketplace/profile/avatar` (mirrors `POST /api/users/me/avatar`) |
| Account Summary card (lines 194-222) | hard-coded | reuse `GET /api/billing/usage` + `GET /api/users/me` |
| "Manage Subscription" (line 224-227) | no `onClick` | `<Link href="/pricing">` (frontend) |
| "View Organization" (line 249) | no `onClick` | `<Link href="/sites/predict/organization-profile/dashboard">` (frontend) |

#### 7.2.1 `POST /api/marketplace/profile/avatar`

**Content-Type:** `multipart/form-data`

| Field | Type | Required | Notes |
|---|---|---|---|
| `file` | binary | yes | JPEG / PNG / WEBP, ≤ 5 MB |

**Response**

```json
{
  "success": true,
  "data": {
    "user": { "id": "...", "fullName": "...", "email": "...", "avatarUrl": "https://..." }
  }
}
```

---

### 7.3 Other marketplace items (existing routes already wired)

| Element | Endpoint |
|---|---|
| Project-list filters | `GET /api/marketplace/projects?sector=&status=&projectType=&sdg=&country=&q=&page=&limit=` (extend `ProjectFilters` with `country` first) |
| Express-interest + DPR forms | already call the server actions; the new `/api/marketplace/dpr/[id]/reply` mirror the admin routes above |

---

## 8. Admin implementation partners (`/sites/admin/implementation-partners`)

File: [src/app/sites/admin/implementation-partners/page.tsx](prana-web/src/app/sites/admin/implementation-partners/page.tsx)

| Element | Issue | Endpoint |
|---|---|---|
| Edit-modal `editTaxId` (line 1011-1013) | captured locally, never sent | include in `PATCH` body — `ImplementationPartner.taxId` is now a real column |
| Status filter (line 425-435) | commented out | re-enable and use `?status=ACTIVE|UNDER_REVIEW|INACTIVE` |

The existing `updateImplementationPartner` server action ([src/actions/implementation-partners.actions.ts](prana-web/src/actions/implementation-partners.actions.ts)) already accepts the new `taxId` field; just include it in the form payload. The HTTP routes under `/api/admin/implementation-partners[/[id]]` and `/api/marketplace/implementation-partners[/[id]]` are full CRUD.

---

## 9. Risk-Assessment form (`/sites/predict/organization-profile/risk-assessment`)

File: [src/app/sites/predict/organization-profile/risk-assessment/page.tsx](prana-web/src/app/sites/predict/organization-profile/risk-assessment/page.tsx)

| Element | Issue | Endpoint |
|---|---|---|
| "Auto-fill The Location" button (line 306-309) | no `onClick` | `GET /v1/geocode?address=...` |
| form captures `name, addressLine1, addressLine2, assetSize` (lines 58-61) | dropped from `POST /v1/assess` body | add those 4 fields to the assessment payload (backend already persists via `/api/org/assets/[id]/reassess` — wire same payload upstream) |
| "Save draft" / no equivalent | no `onClick` | no endpoint (out of scope) |

### 9.1 `GET /v1/geocode?address=...`

**Auth:** open. Goes to the climate pipeline (FastAPI).

**Query parameters**

| Name | Type | Required | Notes |
|---|---|---|---|
| `address` | string | yes | free-form; forward-geocoded |

**Response shape**

```ts
{
  success: true;
  data: {
    lat: number;
    lon: number;
    formattedAddress: string;
    provider: "google" | "nominatim";
  };
}
```

**Sample response**

```json
{
  "success": true,
  "data": {
    "lat": 19.076,
    "lon": 72.8777,
    "formattedAddress": "Mumbai, Maharashtra, India",
    "provider": "nominatim"
  }
}
```

> Backend uses Google Maps (`GOOGLE_MAPS_API_KEY`) when present, falls back to OpenStreetMap Nominatim otherwise. Wire both — the response surfaces which one answered.

---

## 10. Misc / not yet built

These remain as open tickets per [docs/API_GAP_AUDIT.md](./API_GAP_AUDIT.md):

| Endpoint | Status | Notes |
|---|---|---|
| `POST /api/marketplace/subscription/checkout` | not built | `premium-modal.tsx` only navigates to `/pricing` — wired through the existing `initiatePayment` server action instead. |
| `POST /api/marketplace/messages` + `/api/marketplace/messages/[threadId]` | not built | requires new `Message` / `MessageThread` / `MessageParticipant` models + moderation flows. Out of scope today. |
| `POST /api/marketplace/projects/[id]/ai-context/generate` | not built | backend already serves the pre-built `/api/marketplace/projects/ai-context/[id]` — wire frontend to read it instead of generating live. |
| `POST /api/org/assets/[id]/reassess` polling/redirect | not built | today the endpoint is synchronous and returns the result. A polling endpoint is a "nice to have" for >5s pipelines. |

---

## Appendix — full endpoint catalogue

### prana-web (`/api/**`)

| Method | Path | Auth | Section |
|---|---|---|---|
| GET | `/api/users/me` | cookie | §1.1 |
| PATCH | `/api/users/me` | cookie | §1.2 |
| POST | `/api/users/me/avatar` | cookie | §1.3 |
| DELETE | `/api/users/me/avatar` | cookie | §1.4 |
| POST | `/api/users/me/notification-prefs` | — | _none_ (uses PUT) |
| GET | `/api/users/me/notification-prefs` | cookie | §2.5 |
| PUT | `/api/users/me/notification-prefs` | cookie | §2.6 |
| POST | `/api/users/me/email/change-init` | cookie | §2.7 |
| POST | `/api/users/me/password` | cookie | §2.8 |
| GET | `/api/org` | cookie | §2.1 |
| PATCH | `/api/org` | OWNER/ADMIN | §2.2 |
| POST | `/api/org/logo` | OWNER/ADMIN | §2.3 |
| DELETE | `/api/org/logo` | OWNER/ADMIN | §2.4 |
| GET | `/api/billing/usage` | cookie | §1.5 |
| GET | `/api/billing/invoices` | cookie | §2.9 |
| GET | `/api/billing/invoices/{id}/download` | cookie | §2.10 |
| GET | `/api/org/profile/export?format=csv|pdf` | cookie | §1.6 |
| GET | `/api/org/assets?q=&type=&page=&limit=` | cookie | §3.1 |
| GET | `/api/org/assets/{id}/summary` | cookie | §3.2 |
| GET | `/api/org/assets/{id}/assessment-history?limit=` | cookie | §3.3 |
| POST | `/api/org/assets/{id}/reassess` | cookie | §3.5 (full shape in `DASHBOARD_AND_AI_API.md` §B.7) |
| GET | `/api/help/articles/popular?limit=5` | public | §4.1 |
| GET | `/api/help/faqs` | public | §4.2 |
| POST | `/api/help/tickets` | cookie | §4.3 |
| GET | `/api/admin/dashboard/metrics?range=7d\|30d\|60d\|90d\|1y` | admin | §5.1 |
| GET | `/api/admin/dashboard/sustainability-impact` | admin | §5.2 |
| POST | `/api/admin/contact/{id}/convert` | admin | §6.2 |
| GET | `/api/marketplace/projects/{id}/concept-note` | MARKETPLACE/BUNDLE plan | §7.1 |
| POST | `/api/marketplace/profile/avatar` | cookie | §7.2 |
| GET | `/api/admin/implementation-partners[/[id]]` | admin | §8 |
| GET | `/api/admin/implementation-partners/export` | admin | §8 |

### climate-pipeline (`/v1/**`)

| Method | Path | Auth | Section |
|---|---|---|---|
| GET | `/v1/geocode?address=` | public | §9.1 |
| POST | `/v1/assess` | public | used by `reassess` (see `DASHBOARD_AND_AI_API.md` §C.12) |
| POST | `/v1/dashboard` | public | `DASHBOARD_AND_AI_API.md` §C.8 |
| POST | `/v1/dashboard/compare` | public | `DASHBOARD_AND_AI_API.md` §C.10 |
| POST | `/v1/summary` | public | `DASHBOARD_AND_AI_API.md` §C.9 |
| GET | `/v1/dashboard/catalog` | public | `DASHBOARD_AND_AI_API.md` §C.11 |
