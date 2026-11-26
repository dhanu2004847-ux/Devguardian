package com.devguardian.scanner;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Table(name = "findings")
@Data
public class Finding {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String title;
    private String severity;

    // Where the problem is, and what the code looked like at scan time.
    @Column(length = 500)
    private String filePath;

    private Integer startLine;

    @Column(columnDefinition = "TEXT")
    private String message;

    @Column(columnDefinition = "TEXT")
    private String codeSnippet;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "scan_result_id", nullable = false)
    private ScanResult scanResult;
}