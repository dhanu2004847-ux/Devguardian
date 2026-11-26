// RiskScore.java
package com.devguardian.risk;

import com.devguardian.repository.Repository;
import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

@Entity
@Table(name = "risk_scores")
@Data
public class RiskScore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    private int score;
    private int criticalCount;
    private int highCount;
    private int mediumCount;
    private int lowCount;
    private Instant calculatedAt;
}