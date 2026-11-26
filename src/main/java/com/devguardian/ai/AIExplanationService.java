package com.devguardian.ai;

import com.devguardian.scanner.Finding;
import com.devguardian.scanner.FindingRepository;
import org.springframework.stereotype.Service;

@Service
public class AIExplanationService {
    private final GeminiClientService geminiClient;
    private final FindingRepository findingRepository;

    public AIExplanationService(GeminiClientService geminiClient, FindingRepository findingRepository) {
        this.geminiClient = geminiClient;
        this.findingRepository = findingRepository;
    }

    public AIResponseDTO explainFinding(Long findingId) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("Finding not found: " + findingId));

        String grounding = FindingPromptContext.hasCode(finding)
                ? "Refer to the actual code shown below, not to a generic example."
                : "No source code is available, so keep the explanation general.";

        String prompt = """
            You are a security code reviewer. Explain the following static-analysis finding
            in plain language for a developer who is not a security expert.

            %s

            %s

            Explain in 3-4 sentences:
            1. What this rule is checking for, and how it applies to this code
            2. Why it matters / what could go wrong if ignored
            3. A general direction for how to fix it

            Keep it concise and practical, not academic.
            """.formatted(FindingPromptContext.describe(finding), grounding);

        String explanation = geminiClient.callGemini(prompt);
        return new AIResponseDTO(explanation);
    }
}