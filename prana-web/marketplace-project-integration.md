# Prana Earth - Marketplace Projects Integration Guide

This guide is for the frontend team to integrate the Marketplace Projects module into both the **Admin Panel** (CRUD) and the **Marketplace** (read-only carousel/listing views).

---

## Architecture Overview

```
Frontend Component
    ↓
Server Actions (@/actions/project.actions)    ← Preferred (type-safe)
    OR
REST API (/api/marketplace/projects/...)      ← Alternative (Postman/fetch)
    ↓
Service Layer (projectService)
    ↓
Repository Layer (projectRepository)
    ↓
Prisma ORM → Neon PostgreSQL
```

---

## Option 1: Server Actions (Recommended)

### Import Path

```typescript
import {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from "@/actions/project.actions";
```

### 1. List Projects (Carousel / Listing Page)

```typescript
const response = await getProjects({
  status: "FUNDING_OPEN",            // Optional filter
  visibility: "PUBLIC",              // Optional filter
  approvalStatus: "PUBLISHED",       // Optional filter
  search: "solar",                   // Optional text search
  projectType: "Renewable Energy",   // Optional filter
  sector: "Solar Utility",           // Optional filter
  limit: 10,                         // Pagination (default: 10)
  offset: 0,                         // Pagination (default: 0)
});

// Response:
// {
//   success: true,
//   message: "Projects retrieved successfully.",
//   data: {
//     total: 5,
//     items: [
//       {
//         id: "uuid",
//         title: "Amazonian Rainforest Reforestation",
//         slug: "amazonian-rainforest-reforestation",
//         description: "...",
//         thumbnailUrl: "https://...",
//         fundingTarget: 450000,
//         returnRate: 8.50,
//         tenure: 36,
//         tags: ["Carbon Credits", "Amazon"],
//         status: "FUNDING_OPEN",
//         metadata: { targetSdgs: [...], coreMetrics: [...] }
//       }
//     ]
//   }
// }
```

### 2. Get Single Project (Detail Page)

```typescript
// By UUID
const response = await getProject("uuid-here");

// By Slug (also works)
const response = await getProject("amazonian-rainforest-reforestation");

// Response:
// {
//   success: true,
//   message: "Project retrieved successfully.",
//   data: {
//     project: {
//       id: "uuid",
//       title: "Amazonian Rainforest Reforestation",
//       slug: "amazonian-rainforest-reforestation",
//       description: "...",
//       location: "Amazonas State, Brazil",
//       country: "Brazil",
//       projectType: "Reforestation & Afforestation",
//       sector: "Carbon Forestry",
//       fundingTarget: 450000,
//       currency: "USD",
//       returnRate: 8.50,
//       tenure: 36,
//       thumbnailUrl: "https://...",
//       bannerUrl: "https://...",
//       tags: [...],
//       status: "FUNDING_OPEN",
//       visibility: "PUBLIC",
//       approvalStatus: "PUBLISHED",
//       metadata: {
//         latitude: -3.4653,
//         longitude: -62.2159,
//         implementationPartner: "Amazon Conservation Alliance",
//         targetSdgs: ["13 Climate Action", "15 Life on Land", ...],
//         coreMetrics: [
//           { name: "Carbon Sequestered", value: 50000, unit: "tCO2e" },
//           { name: "Area Protected", value: 1200, unit: "Hectares" }
//         ],
//         documents: [
//           { name: "Concept Note (PDF)", url: "https://..." }
//         ]
//       },
//       createdAt: "2026-07-01T...",
//       updatedAt: "2026-07-01T..."
//     }
//   }
// }
```

### 3. Create Project (Admin Panel)

```typescript
const response = await createProject({
  title: "New Solar Farm Initiative",                // Required (min 3 chars)
  description: "A detailed description of the project...",  // Optional (min 10 chars)
  location: "Rajasthan, India",                       // Optional
  country: "India",                                   // Optional
  projectType: "Renewable Energy",                    // Optional
  sector: "Solar Utility",                            // Optional
  fundingTarget: 550000,                              // Optional (positive number)
  currency: "USD",                                    // Optional (default: USD)
  returnRate: 10.5,                                   // Optional (0-100)
  tenure: 48,                                         // Optional (months, positive int)
  thumbnailUrl: "https://example.com/thumb.jpg",      // Optional (valid URL)
  bannerUrl: "https://example.com/banner.jpg",        // Optional (valid URL)
  tags: ["Solar", "India", "Clean Energy"],            // Optional (default: [])
  status: "FUNDING_OPEN",                             // Optional (default: UPCOMING)
  visibility: "PUBLIC",                               // Optional (default: PUBLIC)
  approvalStatus: "DRAFT",                            // Optional (default: DRAFT)
  organizationId: "uuid-of-org",                      // Optional
  metadata: {                                          // Optional
    latitude: 26.9124,
    longitude: 70.9016,
    implementationPartner: "Thar Solar Alliance",
    targetSdgs: ["7 Affordable Energy", "13 Climate Action"],
    coreMetrics: [
      { name: "Clean Energy Output", value: 2500000, unit: "kWh/yr" },
      { name: "Households Powered", value: 5000, unit: "Households" }
    ],
    documents: [
      { name: "Project Brief", url: "https://example.com/brief.pdf" }
    ]
  }
});
```

### 4. Update Project (Admin Panel)

```typescript
// Only send the fields you want to update (partial update)
const response = await updateProject("project-uuid", {
  title: "Updated Project Title",
  status: "ACTIVE",
  fundingTarget: 600000,
});
```

### 5. Delete Project (Admin Panel — Soft Delete)

```typescript
const response = await deleteProject("project-uuid");
// { success: true, message: "Project deleted successfully." }
```

---

## Option 2: REST API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/marketplace/projects` | List all projects (with optional query params) |
| `GET` | `/api/marketplace/projects?status=FUNDING_OPEN&search=solar` | Filtered list |
| `POST` | `/api/marketplace/projects` | Create a new project |
| `GET` | `/api/marketplace/projects/:id` | Get project by UUID or slug |
| `PATCH` | `/api/marketplace/projects/:id` | Update project (partial) |
| `DELETE` | `/api/marketplace/projects/:id` | Soft delete project |

### Query Parameters for GET `/api/marketplace/projects`

| Param | Type | Options | Default |
| :--- | :--- | :--- | :--- |
| `status` | string | `ACTIVE`, `ONGOING`, `COMPLETED`, `FUNDING_OPEN`, `UPCOMING` | — |
| `visibility` | string | `PUBLIC`, `SUBSCRIBER_ONLY` | — |
| `approvalStatus` | string | `DRAFT`, `REVIEW`, `PUBLISHED`, `ARCHIVED` | — |
| `search` | string | Free text (searches title, description, location, country) | — |
| `projectType` | string | e.g. `Renewable Energy`, `Reforestation & Afforestation` | — |
| `sector` | string | e.g. `Carbon Forestry`, `Solar Utility` | — |
| `limit` | number | 1–100 | 10 |
| `offset` | number | 0+ | 0 |

---

## Postman Collection

Import the Postman collection from:
```
postman/marketplace-projects.postman_collection.json
```

Set the `baseUrl` variable to `http://localhost:3000`.

---

## Seeded Data

Run the seed command to populate 5 demo projects:

```bash
npm run db:seed
```

| # | Title | Status | Sector | Country |
| :--- | :--- | :--- | :--- | :--- |
| 1 | Amazonian Rainforest Reforestation | FUNDING_OPEN | Carbon Forestry | Brazil |
| 2 | Sahara Green Canopy Solar Grid | FUNDING_OPEN | Solar Utility | Morocco |
| 3 | Sundarbans Coastal Mangrove Protection | UPCOMING | Blue Carbon | India |
| 4 | Kenyan Agroforestry Carbon Programme | ACTIVE | Carbon Forestry | Kenya |
| 5 | Baltic Offshore Wind Farm | UPCOMING | Wind Energy | Denmark |

---

## Enums Reference

### ProjectStatus
`ACTIVE` | `ONGOING` | `COMPLETED` | `FUNDING_OPEN` | `UPCOMING`

### ProjectVisibility
`PUBLIC` | `SUBSCRIBER_ONLY`

### ProjectApprovalStatus
`DRAFT` | `REVIEW` | `PUBLISHED` | `ARCHIVED`

---

## Response Formats

### Success Response
```json
{
  "success": true,
  "message": "Projects retrieved successfully.",
  "data": { ... }
}
```

### Error Response (Validation)
```json
{
  "success": false,
  "message": "Validation failed.",
  "errors": [
    { "field": "title", "message": "Title must be at least 3 characters" }
  ]
}
```

### Error Response (Not Found)
```json
{
  "success": false,
  "message": "Project not found"
}
```
