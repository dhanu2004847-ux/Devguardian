// RiskController.java
package com.devguardian.risk;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/risk")
public class RiskController {
    private final RiskEngineService riskEngineService;
    public RiskController(RiskEngineService riskEngineService) { this.riskEngineService = riskEngineService; }

    @GetMapping("/{repoId}")
    public ResponseEntity<RiskScore> getLatest(@PathVariable Long repoId) {
        return ResponseEntity.ok(riskEngineService.getLatest(repoId));
    }

    @GetMapping("/{repoId}/history")
    public ResponseEntity<List<RiskScore>> getHistory(@PathVariable Long repoId) {
        return ResponseEntity.ok(riskEngineService.getHistory(repoId));
    }

    @PostMapping("/{repoId}/recalculate")
    public ResponseEntity<RiskScore> recalculate(@PathVariable Long repoId) {
        return ResponseEntity.ok(riskEngineService.recalculate(repoId));
    }
}