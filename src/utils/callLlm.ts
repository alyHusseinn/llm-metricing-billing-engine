const callLlm = async () => {
    // Implementation for calling LLM
    const inputTokens = 1000;
    const outputTokens = 2500;
    const reasoningTokens = 1000;
    const  cachedTokens = 500;
    const totalTokens = inputTokens + outputTokens + reasoningTokens + cachedTokens;
    const generatedAnswer = "AI answer";

    return {
        inputTokens,
        outputTokens,
        reasoningTokens,
        cachedTokens,
        totalTokens,
        generatedAnswer
    };
};

export default callLlm;