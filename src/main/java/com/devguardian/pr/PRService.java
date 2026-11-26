package com.devguardian.pr;

import com.devguardian.ai.AIResponseDTO;
import com.devguardian.ai.FixSuggestionService;
import com.devguardian.scanner.Finding;
import com.devguardian.scanner.FindingRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
public class PRService {
    private final PRRepository prRepository;
    private final GitHubPRClient gitHubPRClient;
    private final FixApprovalService approvalService;
    private final FindingRepository findingRepository;
    private final FixSuggestionService fixSuggestionService;

    public PRService(PRRepository prRepository, GitHubPRClient gitHubPRClient, FixApprovalService approvalService,
                     FindingRepository findingRepository, FixSuggestionService fixSuggestionService) {
        this.prRepository = prRepository;
        this.gitHubPRClient = gitHubPRClient;
        this.approvalService = approvalService;
        this.findingRepository = findingRepository;
        this.fixSuggestionService = fixSuggestionService;
    }

    @Transactional
    public PullRequestRecord proposeFix(Long findingId) {
        Finding finding = findingRepository.findById(findingId)
                .orElseThrow(() -> new IllegalArgumentException("Finding not found: " + findingId));

        // Already has a pending proposal: return it instead of calling Gemini again.
        Optional<PullRequestRecord> existing =
                prRepository.findFirstByFindingIdAndStatus(findingId, PRStatus.PROPOSED);
        if (existing.isPresent()) {
            return existing.get();
        }

        // A pull request was already opened for this finding.
        if (prRepository.existsByFindingIdAndStatus(findingId, PRStatus.APPROVED)) {
            throw new IllegalStateException("A pull request was already created for this finding.");
        }

        AIResponseDTO suggestion = fixSuggestionService.suggestFix(findingId);

        // Refuse to stage an error message as if it were a real fix.
        String text = suggestion.getResponse();
        if (text == null
                || text.startsWith("AI explanation unavailable")
                || text.startsWith("AI Engine")) {
            throw new IllegalStateException(
                    "AI could not generate a fix right now. Please try again later.");
        }

        PullRequestRecord record = new PullRequestRecord();
        record.setFindingId(findingId);
        record.setRepoId(finding.getScanResult().getRepoId());
        record.setDiffContent(text);
        record.setStatus(PRStatus.PROPOSED);
        record.setCreatedAt(Instant.now());

        return prRepository.save(record);
    }

    @Transactional
    public PullRequestRecord approveFix(Long prRecordId) {
        PullRequestRecord record = prRepository.findById(prRecordId)
                .orElseThrow(() -> new IllegalArgumentException("PR record not found: " + prRecordId));

        approvalService.assertCanApprove(record);

        String prUrl = gitHubPRClient.createPR(record);

        record.setStatus(PRStatus.APPROVED);
        record.setGithubPrUrl(prUrl);
        record.setApprovedAt(Instant.now());

        return prRepository.save(record);
    }

    @Transactional
    public PullRequestRecord rejectFix(Long prRecordId) {
        PullRequestRecord record = prRepository.findById(prRecordId)
                .orElseThrow(() -> new IllegalArgumentException("PR record not found: " + prRecordId));

        approvalService.assertCanReject(record);

        record.setStatus(PRStatus.REJECTED);
        return prRepository.save(record);
    }

    public List<PullRequestRecord> listPRs(Long repoId) {
        return prRepository.findByRepoId(repoId);
    }
}