package com.devguardian.pr;

import com.devguardian.repository.Repository;
import com.devguardian.repository.RepositoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.io.FileWriter;
import java.nio.file.Path;
import java.util.Map;

@Service
public class GitHubPRClient {

    // Shared token for now — a real multi-user deployment would store a per-user
    // GitHub token instead, since every push happens under one identity here.
    @Value("${devguardian.github.token:}")
    private String githubToken;

    private final RepositoryRepository repositoryRepository;
    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GitHubPRClient(RepositoryRepository repositoryRepository) {
        this.repositoryRepository = repositoryRepository;
    }

    public String createPR(PullRequestRecord record) {
        if (githubToken == null || githubToken.isBlank()) {
            throw new IllegalStateException("GITHUB_TOKEN is not configured — cannot push or open a PR.");
        }

        Repository repo = repositoryRepository.findById(record.getRepoId())
                .orElseThrow(() -> new IllegalArgumentException("Repository not found: " + record.getRepoId()));

        String ownerRepo = extractOwnerRepo(repo.getUrl());
        String localPath = "C:\\devguardian-scans\\repo-" + repo.getId();
        String branchName = "devguardian-fix-" + record.getFindingId() + "-" + System.currentTimeMillis();

        try {
            runGit(localPath, "checkout", "-b", branchName);

            Path fixFile = Path.of(localPath, "DEVGUARDIAN_FIX_" + record.getFindingId() + ".md");
            try (FileWriter writer = new FileWriter(fixFile.toFile())) {
                writer.write("# DevGuardian AI-suggested fix\n\n");
                writer.write("Finding ID: " + record.getFindingId() + "\n\n");
                writer.write(record.getDiffContent() != null ? record.getDiffContent() : "(no suggestion text)");
            }

            runGit(localPath, "add", fixFile.getFileName().toString());
            runGit(localPath, "commit", "-m", "DevGuardian: AI-suggested fix for finding " + record.getFindingId());

            // Push using the token embedded in the remote URL for this one push.
            String authenticatedUrl = repo.getUrl().replace("https://", "https://" + githubToken + "@");
            runGit(localPath, "push", authenticatedUrl, branchName);

            return openPullRequest(ownerRepo, branchName, repo.getUrl());

        } catch (Exception e) {
            throw new RuntimeException("Failed to create PR: " + e.getMessage(), e);
        }
    }

    private String openPullRequest(String ownerRepo, String branchName, String repoUrl) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.set("Authorization", "Bearer " + githubToken);
        headers.set("Accept", "application/vnd.github+json");

        Map<String, Object> body = Map.of(
                "title", "DevGuardian: automated fix suggestion",
                "head", branchName,
                "base", "main",
                "body", "This PR was proposed by DevGuardian's AI engine and approved by a developer before creation."
        );

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(body, headers);
        String url = "https://api.github.com/repos/" + ownerRepo + "/pulls";

        String response = restTemplate.exchange(url, HttpMethod.POST, request, String.class).getBody();
        JsonNode root = objectMapper.readTree(response);
        return root.path("html_url").asText();
    }

    private void runGit(String workingDir, String... args) throws Exception {
        String[] command = new String[args.length + 1];
        command[0] = "git";
        System.arraycopy(args, 0, command, 1, args.length);

        ProcessBuilder pb = new ProcessBuilder(command);
        pb.directory(new java.io.File(workingDir));
        pb.redirectErrorStream(true);
        Process process = pb.start();

        try (var reader = new java.io.BufferedReader(new java.io.InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                System.out.println("[git] " + line);
            }
        }

        boolean finished = process.waitFor(30, java.util.concurrent.TimeUnit.SECONDS);
        if (!finished) {
            process.destroyForcibly();
            throw new RuntimeException("Git command timed out: " + String.join(" ", args));
        }
    }

    private String extractOwnerRepo(String url) {
        return url.replace("https://github.com/", "").replace(".git", "");
    }
}