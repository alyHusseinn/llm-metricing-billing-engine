
type PlanQouta = {
    name: "Free" | "Pro",
    inputTokens: number,
    outputTokens: number,
    requestsLimit: number,
    priceInCents: number
}
const planPricing: PlanQouta[] = [
    {
        name: "Free",
        inputTokens: 100_000,
        outputTokens: 100_000,
        requestsLimit: 1_000,
        priceInCents: 0
    },
    {
        name: "Pro",
        inputTokens: 2500_000,
        outputTokens: 2500_000,
        requestsLimit: 50_000,
        priceInCents: 20_00
    }
] 

export default planPricing;