import 'dotenv/config';
import { db } from './index';
import { planTable } from './schema';

export const DEFAULT_PLANS = [
  {
    name: 'Free' as const,
    priceInCents: 0,
    tokensLimit: 100_000,
    requestsLimit: 1_000,
  },
  {
    name: 'Pro' as const,
    priceInCents: 2000, // 20 dollars
    tokensLimit: 5_000_000,
    requestsLimit: 50_000,
  },
];

export async function seedPlans() {
  console.log('Seeding default plans...');

  for (const plan of DEFAULT_PLANS) {
    await db
      .insert(planTable)
      .values(plan)
      .onConflictDoUpdate({
        target: planTable.name,
        set: {
          priceInCents: plan.priceInCents,
          tokensLimit: plan.tokensLimit,
          requestsLimit: plan.requestsLimit,
        },
      });
  }

  console.log('✅ Plans seeded successfully!');
}

seedPlans()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error('❌ Error seeding plans:', err);
    process.exit(1);
  });