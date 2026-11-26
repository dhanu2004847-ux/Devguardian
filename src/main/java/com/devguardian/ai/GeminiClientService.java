package com.devguardian.ai;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.core5.util.Timeout;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class GeminiClientService {

    @Value("${devguardian.gemini.api-key}")
    private String apiKey;

    // Tried in order. If one is overloaded, retired or out of quota, the next one is used.
    private static final List<String> MODELS = List.of(
            "gemini-3.5-flash-lite",
            "gemini-2.5-flash"
    );

    private static final String BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final int ATTEMPTS_PER_MODEL = 2;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public GeminiClientService() {
        PoolingHttpClientConnectionManager connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
                .setDefaultConnectionConfig(ConnectionConfig.custom()
                        .setConnectTimeout(Timeout.ofSeconds(10))
                        .setSocketTimeout(Timeout.ofSeconds(45))
                        .build())
                .build();

        CloseableHttpClient httpClient = HttpClients.custom()
                .setConnectionManager(connectionManager)
                .setDefaultRequestConfig(RequestConfig.custom()
                        .setResponseTimeout(Timeout.ofSeconds(45))
                        .build())
                .build();

        this.restTemplate = new RestTemplate(new HttpComponentsClientHttpRequestFactory(httpClient));
    }

    public String callGemini(String prompt) {
        if (apiKey == null || apiKey.isBlank()) {
            return "AI Engine is not configured — GEMINI_API_KEY is missing.";
        }

        Exception lastError = null;
        boolean quotaHit = false;

        for (String model : MODELS) {
            for (int attempt = 1; attempt <= ATTEMPTS_PER_MODEL; attempt++) {
                try {
                    return callModel(model, prompt);

                } catch (HttpClientErrorException.TooManyRequests e) {
                    // Quota is per model: skip to the next model instead of giving up.
                    System.err.println("Gemini [" + model + "] quota exceeded, trying next model.");
                    lastError = e;
                    quotaHit = true;
                    break;

                } catch (HttpClientErrorException.NotFound e) {
                    // Model name retired: skip straight to the next model.
                    System.err.println("Gemini model '" + model + "' not found, trying next model.");
                    lastError = e;
                    break;

                } catch (Exception e) {
                    // 503 overload, timeouts, connection errors: wait and retry.
                    lastError = e;
                    System.err.println("Gemini [" + model + "] attempt " + attempt + " failed: " + e.getMessage());
                    if (attempt < ATTEMPTS_PER_MODEL) {
                        sleep(2000L * attempt);
                    }
                }
            }
        }

        System.err.println("Gemini call failed on all models.");
        if (lastError != null) lastError.printStackTrace();

        if (quotaHit) {
            return "AI Engine daily quota exceeded (free tier limit). Try again later, or upgrade your Gemini API plan.";
        }
        return "AI explanation unavailable right now — the Gemini API call failed after retries.";
    }

    private String callModel(String model, String prompt) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        // Key goes in a header, not the URL, so it never shows up in logs or error messages.
        headers.set("x-goog-api-key", apiKey);

        Map<String, Object> body = Map.of(
                "contents", List.of(Map.of("parts", List.of(Map.of("text", prompt))))
        );

        String url = BASE_URL + model + ":generateContent";
        String raw = restTemplate.exchange(url, HttpMethod.POST, new HttpEntity<>(body, headers), String.class).getBody();

        JsonNode root = objectMapper.readTree(raw);
        return root.path("candidates").path(0)
                .path("content").path("parts").path(0)
                .path("text").asText("(empty response from Gemini)");
    }

    private void sleep(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) { Thread.currentThread().interrupt(); }
    }
}