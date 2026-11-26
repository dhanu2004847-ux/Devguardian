package com.devguardian.ai;

import com.devguardian.scanner.Finding;

final class FindingPromptContext {

    private FindingPromptContext() {}

    /** Builds the "what we know about this finding" block for a Gemini prompt. */
    static String describe(Finding f) {
        StringBuilder sb = new StringBuilder();
        sb.append("Rule ID: ").append(f.getTitle()).append('\n');
        sb.append("Severity: ").append(f.getSeverity()).append('\n');

        if (f.getFilePath() != null) {
            sb.append("File: ").append(f.getFilePath());
            if (f.getStartLine() != null) sb.append(" (line ").append(f.getStartLine()).append(")");
            sb.append('\n');
        }
        if (f.getMessage() != null && !f.getMessage().isBlank()) {
            sb.append("Scanner message: ").append(f.getMessage()).append('\n');
        }
        if (f.getCodeSnippet() != null && !f.getCodeSnippet().isBlank()) {
            sb.append("\nCode (lines marked with > are the flagged ones):\n```\n")
                    .append(f.getCodeSnippet())
                    .append("```\n");
        }
        return sb.toString();
    }

    static boolean hasCode(Finding f) {
        return f.getCodeSnippet() != null && !f.getCodeSnippet().isBlank();
    }
}