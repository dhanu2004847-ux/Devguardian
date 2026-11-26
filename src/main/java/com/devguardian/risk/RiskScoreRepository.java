// RiskScoreRepository.java
package com.devguardian.risk;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface RiskScoreRepository extends JpaRepository<RiskScore, Long> {
    List<RiskScore> findByRepositoryIdOrderByCalculatedAtDesc(Long repositoryId);
}