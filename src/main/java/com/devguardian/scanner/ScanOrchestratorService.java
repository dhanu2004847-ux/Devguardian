package com.devguardian.scanner;

import com.devguardian.repository.Repository;
import com.devguardian.repository.RepositoryRepository;
import org.springframework.stereotype.Service;

import java.io.File;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
public class ScanOrchestratorService {
    private final List<ScannerAdapter> scanners;
    private final ScanResultRepository scanResultRepository;
    private final FindingRepository findingRepository;
    private final RepositoryRepository repositoryRepository;

    public ScanOrchestratorService(List<ScannerAdapter> scanners, ScanResultRepository scanResultRepository,
                                   FindingRepository findingRepository, RepositoryRepository repositoryRepository) {
        this.scanners = scanners;
        this.scanResultRepository = scanResultRepository;
        this.findingRepository = findingRepository;
        this.repositoryRepository = repositoryRepository;
    }

    public ScanResult runScans(Long repoId) {
        Repository repo = repositoryRepository.findById(repoId)
                .orElseThrow(() -> new IllegalArgumentException("Repository not found: " + repoId));

        // Throws IllegalStateException if git fails, BEFORE any scan row is created.
        cloneOrUpdateRepository(repo);

        ScanResult result = new ScanResult();
        result.setRepoId(repoId);
        scanResultRepository.save(result);

        for (ScannerAdapter scanner : scanners) {
            List<Finding> findings = scanner.scan(repoId, result);
            findings.forEach(f -> f.setScanResult(result));
            findingRepository.saveAll(findings);
        }
        return result;
    }

    private void cloneOrUpdateRepository(Repository repo) {
        String localPath = "C:\\devguardian-scans\\repo-" + repo.getId();
        File dir = new File(localPath);
        File gitDir = new File(dir, ".git");

        if (dir.exists() && gitDir.exists()) {
            // Make the local copy match GitHub exactly (discards any local changes in this cache folder).
            runGit(60, "-C", localPath, "fetch", "--all", "--prune");
            runGit(60, "-C", localPath, "reset", "--hard", "origin/HEAD");
            runGit(60, "-C", localPath, "clean", "-fd");
        } else {
            if (dir.exists()) {
                throw new IllegalStateException("Scan folder " + localPath
                        + " exists but is not a git clone. Delete it and run the scan again.");
            }
            dir.getParentFile().mkdirs();
            runGit(120, "clone", repo.getUrl(), localPath);
        }
    }

    /** Runs a git command; throws IllegalStateException with git's own output if it fails. */
    private void runGit(int timeoutSeconds, String... args) {
        List<String> cmd = new ArrayList<>();
        cmd.add("git");
        for (String a : args) cmd.add(a);

        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // Read output on this thread's behalf via a helper so the process can't block on a full pipe.
            java.util.concurrent.CompletableFuture<String> output = java.util.concurrent.CompletableFuture
                    .supplyAsync(() -> {
                        try {
                            return new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                        } catch (IOException e) {
                            return "";
                        }
                    });

            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException("Git timed out: git " + String.join(" ", args));
            }

            String out = output.get(5, TimeUnit.SECONDS).trim();
            if (process.exitValue() != 0) {
                throw new IllegalStateException("Git failed (" + args[args.length > 1 ? 0 : 0] + "...): "
                        + (out.isEmpty() ? "exit code " + process.exitValue() : out));
            }
        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Could not run git. Is Git installed and on PATH? " + e.getMessage());
        }
    }

    public ScanResult getScanResult(Long scanId) {
        return scanResultRepository.findById(scanId).orElseThrow();
    }

    public List<Finding> getFindings(Long scanId) {
        return findingRepository.findByScanResultId(scanId);
    }

    public List<ScanResult> getScanHistory(Long repoId) {
        return scanResultRepository.findByRepoId(repoId);
    }
}