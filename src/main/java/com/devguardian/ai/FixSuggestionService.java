package com.devguardian.ai;

import com.devguardian.scanner.Finding;
import com.devguardian.scanner.FindingRepository;
import org.springframework.stereotype.Service;

@Service
public class FixSuggestionService {
    private final GeminiClientService geminiClient;
    private final FindingRepository findingRepository;

    public FixSuggestionService(GeminiClientService geminiClient, FindingRepository findingRepository) {
        this.geminiClient = geminiClient;
        this.findingRepository = findingRepository;
    }

    public AIResponseDTO suggestFix(Long findingId) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("Finding not found: " + findingId));

        boolean hasCode = FindingPromptContext.hasCode(finding);

        String codeRule = hasCode
                ? """
                  Base your answer on the actual code above. In "Suggested fix", show the REAL flagged
                  code as "Before" and a corrected version of that same code as "After". Keep the same
                  variable names and framework. Do not invent other files or lines.
                  """
                : """
                  No source code is available, so show a short generic before/after example in the most
                  likely language (infer it from the rule ID) and say it is a generic example.
                  Do not invent file names or line numbers.
                  """;

        String prompt = """
            You are a senior security engineer reviewing a static-analysis finding.

            %s

            Write a fix suggestion for a developer, in this exact structure:

            ## Problem
            One or two sentences on what is wrong in this code.

            ## Why it matters
            One or two sentences on the real-world risk.

            ## Suggested fix
            A before/after code example.

            ## Notes
            Any caveats, such as cases where the fix needs more context from the codebase.

            %s

            Be concise and practical.
            """.formatted(FindingPromptContext.describe(finding), codeRule);

        return new AIResponseDTO(geminiClient.callGemini(prompt));
    }
}