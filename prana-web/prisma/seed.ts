import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaNeon({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting database seeding...");

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { id: "00000000-0000-0000-0000-000000000001" },
    update: {},
    create: {
      id: "00000000-0000-0000-0000-000000000001",
      name: "Prana Earth Initiative",
      slug: "prana-earth-initiative",
    },
  });
  console.log(`🏢 Organization created: ${org.name}`);

  // 2. Create Projects
  const projectsData = [
    {
      title: "Amazonian Rainforest Reforestation",
      slug: "amazonian-rainforest-reforestation",
      description:
        "Restoring degraded sections of the Amazon basin in Brazil through native species planting, local community agroforestry education, and biodiversity corridor monitoring. This initiative targets 1,200 hectares of degraded land over 3 years.",
      location: "Amazonas State, Brazil",
      country: "Brazil",
      projectType: "Reforestation & Afforestation",
      sector: "Carbon Forestry",
      fundingTarget: 450000.0,
      currency: "USD",
      returnRate: 8.5,
      tenure: 36,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=600&auto=format&fit=crop",
      bannerUrl:
        "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?q=80&w=1200&auto=format&fit=crop",
      tags: ["Carbon Credits", "Amazon", "Agroforestry", "Biodiversity"],
      status: "FUNDING_OPEN" as const,
      visibility: "PUBLIC" as const,
      approvalStatus: "PUBLISHED" as const,
      organizationId: org.id,
      metadata: {
        latitude: -3.4653,
        longitude: -62.2159,
        implementationPartner: "Amazon Conservation Alliance",
        targetSdgs: [
          "13 Climate Action",
          "15 Life on Land",
          "6 Clean Water",
          "8 Decent Work",
        ],
        coreMetrics: [
          { name: "Carbon Sequestered", value: 50000, unit: "tCO2e" },
          { name: "Area Protected", value: 1200, unit: "Hectares" },
        ],
        documents: [
          {
            name: "Concept Note (PDF)",
            url: "https://prana.earth/docs/amazon-reforestation-concept-note.pdf",
          },
        ],
      },
    },
    {
      title: "Sahara Green Canopy Solar Grid",
      slug: "sahara-green-canopy-solar-grid",
      description:
        "Implementing localized smart solar microgrids underneath high-efficiency tracking solar canopy units to reduce desertification and power remote communities. Targeting 4,500+ rural households with clean electricity access.",
      location: "Near Ouarzazate, Morocco",
      country: "Morocco",
      projectType: "Renewable Energy",
      sector: "Solar Utility",
      fundingTarget: 850000.0,
      currency: "USD",
      returnRate: 11.2,
      tenure: 60,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=600&auto=format&fit=crop",
      bannerUrl:
        "https://images.unsplash.com/photo-1509391366360-2e959784a276?q=80&w=1200&auto=format&fit=crop",
      tags: ["Solar Power", "Morocco", "Microgrid", "Clean Energy"],
      status: "FUNDING_OPEN" as const,
      visibility: "PUBLIC" as const,
      approvalStatus: "PUBLISHED" as const,
      organizationId: org.id,
      metadata: {
        latitude: 30.9189,
        longitude: -6.9118,
        implementationPartner: "Atlas Clean Energy Group",
        targetSdgs: [
          "7 Affordable Energy",
          "13 Climate Action",
          "9 Industry & Innovation",
        ],
        coreMetrics: [
          {
            name: "Clean Electricity Generated",
            value: 1800000,
            unit: "kWh/yr",
          },
          { name: "Families Empowered", value: 4500, unit: "Households" },
        ],
        documents: [
          {
            name: "Feasibility Report (PDF)",
            url: "https://prana.earth/docs/sahara-solar-feasibility.pdf",
          },
        ],
      },
    },
    {
      title: "Sundarbans Coastal Mangrove Protection",
      slug: "sundarbans-coastal-mangrove-protection",
      description:
        "Securing delta shorelines against sea-level rise by planting salt-tolerant mangrove species and creating community-led coastal forest guard networks. This blue carbon initiative targets 75,000 mangrove saplings across vulnerable coastal zones.",
      location: "West Bengal, India",
      country: "India",
      projectType: "Coastal Ecosystems",
      sector: "Blue Carbon",
      fundingTarget: 220000.0,
      currency: "USD",
      returnRate: 9.8,
      tenure: 48,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=600&auto=format&fit=crop",
      bannerUrl:
        "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?q=80&w=1200&auto=format&fit=crop",
      tags: ["Blue Carbon", "India", "Mangroves", "Climate Adaptation"],
      status: "UPCOMING" as const,
      visibility: "PUBLIC" as const,
      approvalStatus: "PUBLISHED" as const,
      organizationId: org.id,
      metadata: {
        latitude: 21.9497,
        longitude: 88.8956,
        implementationPartner: "Sundarbans Eco Protection Trust",
        targetSdgs: [
          "14 Life Below Water",
          "13 Climate Action",
          "15 Life on Land",
        ],
        coreMetrics: [
          { name: "Mangroves Planted", value: 75000, unit: "Saplings" },
          { name: "Carbon Equivalency", value: 12000, unit: "tCO2e" },
        ],
        documents: [
          {
            name: "Concept Proposal (PDF)",
            url: "https://prana.earth/docs/sundarbans-mangroves-proposal.pdf",
          },
        ],
      },
    },
    {
      title: "Kenyan Agroforestry Carbon Programme",
      slug: "kenyan-agroforestry-carbon-programme",
      description:
        "Training 2,000 smallholder farmers in sustainable agroforestry techniques — intercropping nitrogen-fixing trees with food crops to simultaneously sequester carbon and improve food security in the East African highlands.",
      location: "Nyeri County, Kenya",
      country: "Kenya",
      projectType: "Agroforestry",
      sector: "Carbon Forestry",
      fundingTarget: 310000.0,
      currency: "USD",
      returnRate: 7.5,
      tenure: 36,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=600&auto=format&fit=crop",
      bannerUrl:
        "https://images.unsplash.com/photo-1500382017468-9049fed747ef?q=80&w=1200&auto=format&fit=crop",
      tags: ["Agroforestry", "Kenya", "Food Security", "Carbon Credits"],
      status: "ACTIVE" as const,
      visibility: "PUBLIC" as const,
      approvalStatus: "PUBLISHED" as const,
      organizationId: org.id,
      metadata: {
        latitude: -0.4246,
        longitude: 36.9589,
        implementationPartner: "Green Belt Movement Kenya",
        targetSdgs: [
          "2 Zero Hunger",
          "13 Climate Action",
          "15 Life on Land",
          "1 No Poverty",
        ],
        coreMetrics: [
          { name: "Farmers Trained", value: 2000, unit: "Farmers" },
          { name: "Trees Planted", value: 250000, unit: "Trees" },
          { name: "Carbon Captured", value: 18000, unit: "tCO2e" },
        ],
        documents: [],
      },
    },
    {
      title: "Baltic Offshore Wind Farm",
      slug: "baltic-offshore-wind-farm",
      description:
        "Deploying next-generation floating offshore wind turbines in the Baltic Sea corridor to provide clean energy for 30,000 households while minimizing seabed disruption and supporting marine biodiversity monitoring programmes.",
      location: "Baltic Sea, Denmark",
      country: "Denmark",
      projectType: "Renewable Energy",
      sector: "Wind Energy",
      fundingTarget: 2500000.0,
      currency: "USD",
      returnRate: 12.0,
      tenure: 84,
      thumbnailUrl:
        "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=600&auto=format&fit=crop",
      bannerUrl:
        "https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?q=80&w=1200&auto=format&fit=crop",
      tags: ["Wind Energy", "Denmark", "Offshore", "Marine Conservation"],
      status: "UPCOMING" as const,
      visibility: "PUBLIC" as const,
      approvalStatus: "PUBLISHED" as const,
      organizationId: org.id,
      metadata: {
        latitude: 55.6761,
        longitude: 12.5683,
        implementationPartner: "Nordic Wind Consortium",
        targetSdgs: [
          "7 Affordable Energy",
          "13 Climate Action",
          "14 Life Below Water",
        ],
        coreMetrics: [
          {
            name: "Clean Electricity Generated",
            value: 95000000,
            unit: "kWh/yr",
          },
          { name: "Households Powered", value: 30000, unit: "Households" },
        ],
        documents: [],
      },
    },
  ];

  for (const project of projectsData) {
    const created = await prisma.project.upsert({
      where: { slug: project.slug },
      update: {},
      create: project,
    });
    console.log(`🚀 Project seeded: ${created.title} (Slug: ${created.slug})`);
  }

  // 3. Create Admin User
  console.log("👤 Seeding admin user...");
  const adminPasswordHash = await bcrypt.hash("admin@2026", 12);
  const adminUser = await prisma.user.upsert({
    where: { email: "admin@pranaearth.com" },
    update: {
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isEmailVerified: true,
      isActive: true,
    },
    create: {
      email: "admin@pranaearth.com",
      fullName: "Prana Earth Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isEmailVerified: true,
      isActive: true,
    },
  });
  console.log(`👤 Admin user seeded: ${adminUser.email}`);

  // 4. Seed Subscription Plans
  console.log("💳 Seeding subscription plans...");

  const subscriptionPlans = [
    {
      id: "00000000-0000-0000-0000-000000000010",
      name: "Free",
      type: "FREE" as const,
      description: "Essential visibility for environmental newcomers.",
      priceMonthly: 15,
      priceYearly: 200,
      features: [
        "High-level market summaries",
        "Limited project visibility",
        "10-page monthly report limit",
      ],
      isActive: true,
      isPubliclyVisible: true,
      applyDiscount: false,
    },
    {
      id: "00000000-0000-0000-0000-000000000011",
      name: "Premium",
      type: "MARKETPLACE" as const,
      description:
        "Complete marketplace intelligence for active investors.",
      priceMonthly: 20,
      priceYearly: 200,
      features: [
        "Full marketplace intelligence",
        "Direct project document access",
        "Exclusive Concept Note downloads",
        "Unlimited report access",
        "Real-time alerts & notifications",
      ],
      isActive: true,
      isPubliclyVisible: true,
      applyDiscount: true,
      discountPercentage: 20.0,
      discountDuration: 3,
    },
    {
      id: "00000000-0000-0000-0000-000000000012",
      name: "Earth Bundle",
      type: "BUNDLE" as const,
      description:
        "Enterprise-grade ecosystem monitoring and MRV for institutions.",
      priceMonthly: 50,
      priceYearly: 500,
      features: [
        "Everything in Premium",
        "Full Predict Platform suite",
        "Advanced MRV integration",
        "Dedicated account strategist",
        "Custom API & Webhook support",
      ],
      isActive: true,
      isPubliclyVisible: true,
      applyDiscount: false,
    },
  ];

  for (const plan of subscriptionPlans) {
    const seededPlan = await prisma.subscriptionPlan.upsert({
      where: { id: plan.id },
      update: {
        name: plan.name,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: plan.features,
        isActive: plan.isActive,
        isPubliclyVisible: plan.isPubliclyVisible,
        applyDiscount: plan.applyDiscount,
        discountPercentage: (plan as any).discountPercentage ?? null,
        discountDuration: (plan as any).discountDuration ?? null,
      },
      create: {
        id: plan.id,
        name: plan.name,
        type: plan.type,
        description: plan.description,
        priceMonthly: plan.priceMonthly,
        priceYearly: plan.priceYearly,
        features: plan.features,
        isActive: plan.isActive,
        isPubliclyVisible: plan.isPubliclyVisible,
        applyDiscount: plan.applyDiscount,
        discountPercentage: (plan as any).discountPercentage ?? null,
        discountDuration: (plan as any).discountDuration ?? null,
      },
    });
    console.log(`💳 Plan seeded: ${seededPlan.name} (${seededPlan.type}) — $${seededPlan.priceMonthly}/mo, $${seededPlan.priceYearly}/yr`);
  }

  console.log("✅ Seeding completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Error while seeding database:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });


