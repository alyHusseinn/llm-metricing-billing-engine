import 'dotenv/config';
import { db } from './index';
import { planTable } from './schema';
import planPricing from "../config/pricing"

export async function seedPlans() {
  console.log('Seeding default plans...');

  for (const plan of planPricing) {
    await db
      .insert(planTable)
      .values({ name: plan.name, tokensLimit: plan.inputTokens + plan.outputTokens, priceInCents: plan.priceInCents, requestsLimit: plan.requestsLimit })
      .onConflictDoUpdate({
        target: planTable.name,
        set: {
          priceInCents: plan.priceInCents,
          tokensLimit: plan.inputTokens + plan.outputTokens,
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