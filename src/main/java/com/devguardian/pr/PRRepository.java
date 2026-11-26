package com.devguardian.pr;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PRRepository extends JpaRepository<PullRequestRecord, Long> {
    List<PullRequestRecord> findByRepoId(Long repoId);

    Optional<PullRequestRecord> findFirstByFindingIdAndStatus(Long findingId, PRStatus status);

    boolean existsByFindingIdAndStatus(Long findingId, PRStatus status);
}