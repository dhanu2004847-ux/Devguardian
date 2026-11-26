package com.devguardian.scanner;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;

@Component
public class SemgrepRunner implements ScannerAdapter {

    private static final int CONTEXT_LINES = 3;
    private static final int MAX_SNIPPET_LINES = 40;
    private static final int MAX_SNIPPET_CHARS = 3000;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public List<Finding> scan(Long repoId, ScanResult scanResult) {
        List<Finding> findings = new ArrayList<>();

        String repoPath = "C:\\devguardian-scans\\repo-" + repoId;

        ProcessBuilder pb = new ProcessBuilder(
                "docker", "run", "--rm",
                "-v", repoPath + ":/src",
                "semgrep/semgrep",
                "semgrep",
                "--config=p/javascript",
                "--config=p/nodejs",
                "--config=p/owasp-top-ten",
                "--config=p/secrets",
                "--json", "/src"
        );

        File errFile = null;
        try {
            errFile = File.createTempFile("semgrep-err-", ".txt");
            pb.redirectError(errFile);

            Process process = pb.start();

            CompletableFuture<String> stdout = CompletableFuture.supplyAsync(() -> {
                try {
                    return new String(process.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
                } catch (Exception e) {
                    return "";
                }
            });

            boolean finished = process.waitFor(180, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                throw new IllegalStateException("Semgrep scan timed out for repo " + repoId);
            }

            String json = stdout.get(5, TimeUnit.SECONDS).trim();
            String err = Files.readString(errFile.toPath()).trim();

            if (process.exitValue() != 0 || json.isEmpty()) {
                String detail = err.isEmpty() ? "exit code " + process.exitValue() : tail(err, 400);
                throw new IllegalStateException(
                        "Semgrep/Docker failed. Is Docker Desktop running? Details: " + detail);
            }

            JsonNode root = objectMapper.readTree(json);
            JsonNode results = root.path("results");

            Set<String> seen = new HashSet<>();

            for (JsonNode result : results) {
                String ruleId = result.path("check_id").asText("Unknown rule");
                String rawPath = result.path("path").asText("");
                String relPath = rawPath.startsWith("/src/") ? rawPath.substring(5) : rawPath;
                int startLine = result.path("start").path("line").asInt(0);
                int endLine = result.path("end").path("line").asInt(startLine);

                if (!seen.add(ruleId + "|" + relPath + "|" + startLine)) continue;

                Finding finding = new Finding();
                finding.setTitle(ruleId);
                finding.setSeverity(mapSeverity(result.path("extra").path("severity").asText("INFO")));
                finding.setFilePath(relPath);
                finding.setStartLine(startLine > 0 ? startLine : null);
                finding.setMessage(result.path("extra").path("message").asText(null));
                finding.setCodeSnippet(readSnippet(repoPath, relPath, startLine, endLine));
                finding.setScanResult(scanResult);
                findings.add(finding);
            }

        } catch (IllegalStateException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Semgrep execution failed for repo " + repoId + ": " + e.getMessage());
        } finally {
            if (errFile != null) errFile.delete();
        }

        return findings;
    }

    /** Reads the flagged lines (plus a little context) from the cloned file, with line numbers. */
    private String readSnippet(String repoPath, String relPath, int startLine, int endLine) {
        if (startLine <= 0 || relPath.isBlank()) return null;
        try {
            Path root = Paths.get(repoPath).normalize();
            Path file = root.resolve(relPath).normalize();
            if (!file.startsWith(root) || !Files.isRegularFile(file)) return null;

            List<String> lines = Files.readAllLines(file, StandardCharsets.UTF_8);
            int from = Math.max(1, startLine - CONTEXT_LINES);
            int to = Math.min(lines.size(), Math.max(endLine, startLine) + CONTEXT_LINES);
            if (to - from + 1 > MAX_SNIPPET_LINES) to = from + MAX_SNIPPET_LINES - 1;

            StringBuilder sb = new StringBuilder();
            for (int i = from; i <= to; i++) {
                String marker = (i >= startLine && i <= Math.max(endLine, startLine)) ? ">" : " ";
                sb.append(marker).append(' ').append(i).append(" | ").append(lines.get(i - 1)).append('\n');
            }
            String snippet = sb.toString();
            return snippet.length() > MAX_SNIPPET_CHARS ? snippet.substring(0, MAX_SNIPPET_CHARS) : snippet;
        } catch (Exception e) {
            return null; // e.g. non-UTF-8 file; the finding is still saved without a snippet
        }
    }

    private String tail(String s, int max) {
        return s.length() <= max ? s : "..." + s.substring(s.length() - max);
    }

    private String mapSeverity(String semgrepSeverity) {
        return switch (semgrepSeverity.toUpperCase()) {
            case "ERROR" -> "HIGH";
            case "WARNING" -> "MEDIUM";
            default -> "LOW";
        };
    }
}