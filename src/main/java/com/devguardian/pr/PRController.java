package com.devguardian.pr;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/pr")
public class PRController {
    private final PRService prService;
    public PRController(PRService prService) { this.prService = prService; }

    @PostMapping("/propose/{findingId}")
    public ResponseEntity<PullRequestRecord> propose(@PathVariable Long findingId) {
        return ResponseEntity.ok(prService.proposeFix(findingId));
    }

    @PostMapping("/{prRecordId}/approve")
    public ResponseEntity<PullRequestRecord> approve(@PathVariable Long prRecordId) {
        return ResponseEntity.ok(prService.approveFix(prRecordId));
    }

    @PostMapping("/{prRecordId}/reject")
    public ResponseEntity<PullRequestRecord> reject(@PathVariable Long prRecordId) {
        return ResponseEntity.ok(prService.rejectFix(prRecordId));
    }

    @GetMapping("/{repoId}")
    public ResponseEntity<List<PullRequestRecord>> listPRs(@PathVariable Long repoId) {
        return ResponseEntity.ok(prService.listPRs(repoId));
    }
}