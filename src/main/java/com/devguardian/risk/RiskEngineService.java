// RiskEngineService.java
package com.devguardian.risk;

import com.devguardian.repository.Repository;
import com.devguardian.repository.RepositoryRepository;
import com.devguardian.scanner.Finding;
import com.devguardian.scanner.FindingRepository;
import com.devguardian.scanner.ScanResult;
import com.devguardian.scanner.ScanResultRepository;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
public class RiskEngineService {
    private final RiskScoreRepository riskScoreRepository;
    private final RiskScoreCalculator calculator;
    private final ScanResultRepository scanResultRepository;
    private final FindingRepository findingRepository;
    private final RepositoryRepository repositoryRepository;

    public RiskEngineService(RiskScoreRepository riskScoreRepository, RiskScoreCalculator calculator,
                             ScanResultRepository scanResultRepository, FindingRepository findingRepository,
                             RepositoryRepository repositoryRepository) {
        this.riskScoreRepository = riskScoreRepository;
        this.calculator = calculator;
        this.scanResultRepository = scanResultRepository;
        this.findingRepository = findingRepository;
        this.repositoryRepository = repositoryRepository;
    }

    public RiskScore recalculate(Long repoId) {
        List<ScanResult> scans = scanResultRepository.findByRepoId(repoId);
        if (scans.isEmpty()) {
            throw new IllegalStateException("No scans found for repository " + repoId + " — run a scan first.");
        }
        ScanResult latestScan = scans.get(scans.size() - 1);
        List<Finding> findings = findingRepository.findByScanResultId(latestScan.getId());

        Repository repo = repositoryRepository.findById(repoId)
                .orElseThrow(() -> new IllegalArgumentException("Repository not found: " + repoId));

        RiskScore riskScore = new RiskScore();
        riskScore.setRepository(repo);
        riskScore.setScore(calculator.calculate(findings));
        riskScore.setCriticalCount(calculator.countBySeverity(findings, "CRITICAL"));
        riskScore.setHighCount(calculator.countBySeverity(findings, "HIGH"));
        riskScore.setMediumCount(calculator.countBySeverity(findings, "MEDIUM"));
        riskScore.setLowCount(calculator.countBySeverity(findings, "LOW"));
        riskScore.setCalculatedAt(Instant.now());

        return riskScoreRepository.save(riskScore);
    }

    public RiskScore getLatest(Long repoId) {
        List<RiskScore> scores = riskScoreRepository.findByRepositoryIdOrderByCalculatedAtDesc(repoId);
        if (scores.isEmpty()) {
            throw new IllegalStateException("No risk score calculated yet for repository " + repoId);
        }
        return scores.get(0);
    }

    public List<RiskScore> getHistory(Long repoId) {
        return riskScoreRepository.findByRepositoryIdOrderByCalculatedAtDesc(repoId);
    }
}