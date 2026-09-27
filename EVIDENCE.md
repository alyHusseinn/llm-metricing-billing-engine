# Proof that double-counting cannot happen

### Method 
POST http://localhost:3000/llm/generate

### Headers
idemptoency-key: saahsszssjjszsjjzjjzjsjzsssssd322ss3

### Response: 
```json
{
  "answer": "AI answer",
  "cached": false,
  "usage": {
    "inputTokens": 1000,
    "outputTokens": 2500,
    "reasoningTokens": 1000,
    "cachedTokens": 500,
    "totalTokens": 5000,
    "remainingTokens": 195000
  }
}
```

- Same Request again with the same idempotency-key
### Headers
idempotency-key: saahsszssjjszsjjzjjzjsjzsssssd322ss3

### Response 
```json
{
  "answer": "AI answer (cached)",
  "cached": true,
  "usage": {
    "inputTokens": 0,
    "outputTokens": 0,
    "totalTokens": 0
  }
}
```

# Pricing 

```json
[
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
```