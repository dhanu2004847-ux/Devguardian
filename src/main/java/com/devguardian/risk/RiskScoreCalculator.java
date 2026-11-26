// RiskScoreCalculator.java
package com.devguardian.risk;

import com.devguardian.scanner.Finding;
import org.springframework.stereotype.Component;
import java.util.List;
import java.util.Map;

@Component
public class RiskScoreCalculator {

    // Inspectable, tweakable weights — not a black box.
    private static final Map<String, Integer> WEIGHTS = Map.of(
            "CRITICAL", 25,
            "HIGH", 12,
            "MEDIUM", 5,
            "LOW", 1
    );

    public int calculate(List<Finding> findings) {
        int deduction = findings.stream()
                .mapToInt(f -> WEIGHTS.getOrDefault(f.getSeverity().toUpperCase(), 0))
                .sum();
        return Math.max(0, 100 - deduction);
    }

    public int countBySeverity(List<Finding> findings, String severity) {
        return (int) findings.stream()
                .filter(f -> severity.equalsIgnoreCase(f.getSeverity()))
                .count();
    }
}