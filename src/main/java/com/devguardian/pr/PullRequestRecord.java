package com.devguardian.pr;

import jakarta.persistence.*;
import lombok.Data;
import java.time.Instant;

@Entity
@Table(name = "pull_requests")
@Data
public class PullRequestRecord {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long findingId;
    private Long repoId;

    @Column(columnDefinition = "TEXT")
    private String diffContent;

    @Enumerated(EnumType.STRING)
    private PRStatus status;

    private String githubPrUrl;
    private Instant createdAt;
    private Instant approvedAt;
}