package com.devguardian.ai;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
public class AIController {
    private final AIExplanationService explanationService;
    private final FixSuggestionService fixSuggestionService;
    private final FindingChatService chatService;

    public AIController(AIExplanationService explanationService,
                        FixSuggestionService fixSuggestionService,
                        FindingChatService chatService) {
        this.explanationService = explanationService;
        this.fixSuggestionService = fixSuggestionService;
        this.chatService = chatService;
    }

    @PostMapping("/explain/{findingId}")
    public ResponseEntity<AIResponseDTO> explain(@PathVariable Long findingId) {
        return ok(explanationService.explainFinding(findingId));
    }

    @PostMapping("/suggest-fix/{findingId}")
    public ResponseEntity<AIResponseDTO> suggestFix(@PathVariable Long findingId) {
        return ok(fixSuggestionService.suggestFix(findingId));
    }

    @PostMapping("/ask/{findingId}")
    public ResponseEntity<AIResponseDTO> ask(@PathVariable Long findingId, @RequestBody AIQuestionDTO body) {
        return ok(chatService.ask(findingId, body.getQuestion()));
    }

    /** Gemini failures come back as plain text; turn them into a real error response. */
    private ResponseEntity<AIResponseDTO> ok(AIResponseDTO dto) {
        String text = dto.getResponse();
        if (text == null
                || text.startsWith("AI explanation unavailable")
                || text.startsWith("AI Engine")) {
            throw new IllegalStateException(text != null ? text : "AI could not respond right now.");
        }
        return ResponseEntity.ok(dto);
    }
}