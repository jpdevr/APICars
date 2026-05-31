package com.rammeta.apicars.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rammeta.apicars.model.Car;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Service
public class EmojiGeneratorService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${ai.api-key}")
    private String apiKey;

    @Value("${ai.model}")
    private String model;

    @Value("${ai.url}")
    private String aiUrl;

    public EmojiGeneratorService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    public List<String> generateEmojisForCar(Car car) {
        return generateWithOpenAI(car);
    }

    private List<String> generateWithOpenAI(Car car) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.setBearerAuth(apiKey);

            Map<String, Object> body = new LinkedHashMap<>();
            body.put("model", model);
            body.put("temperature", 0.9);
            body.put("response_format", Map.of("type", "json_object"));
            body.put("messages", List.of(
                    Map.of(
                            "role", "system",
                            "content", getSystemPrompt()
                    ),
                    Map.of(
                            "role", "user",
                            "content", buildUserPrompt(car)
                    )
            ));

            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(body, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                    aiUrl,
                    HttpMethod.POST,
                    entity,
                    String.class
            );

            if (!response.getStatusCode().is2xxSuccessful() || response.getBody() == null) {
                throw new IllegalStateException("Erro ao chamar LLM.");
            }

            JsonNode root = objectMapper.readTree(response.getBody());

            String content = root
                    .path("choices")
                    .path(0)
                    .path("message")
                    .path("content")
                    .asText();

            if (content == null || content.isBlank()) {
                throw new IllegalStateException("Resposta vazia da LLM.");
            }

            JsonNode contentJson = objectMapper.readTree(content);
            JsonNode emojisNode = contentJson.path("emojis");

            if (!emojisNode.isArray()) {
                throw new IllegalStateException("A resposta da LLM não contém array de emojis.");
            }

            List<String> emojis = new ArrayList<>();

            for (JsonNode emojiNode : emojisNode) {
                emojis.add(emojiNode.asText());
            }

            return emojis;
        } catch (Exception exception) {
            throw new IllegalStateException("Erro ao gerar emojis com a LLM.", exception);
        }
    }

    private String getSystemPrompt() {
        return """
                Você gera pistas em emojis para um jogo de adivinhar carros.

                Regras obrigatórias:
                - Responda somente em JSON válido.
                - O JSON deve ter exatamente este formato: {"emojis":["emoji1","emoji2","emoji3","emoji4","emoji5","emoji6"]}
                - Gere exatamente 6 emojis.
                - Não use texto explicativo.
                - Não revele o nome do carro.
                - Evite emojis óbvios demais como roda, pneu ou volante.
                - Use pistas sobre país, marca, história, motor, apelido, competição, cor icônica, cultura, desempenho ou característica marcante.
                - Não use emojis genéricos.
                - Seja específico com aquele carro e seus conceitos.
                - Referencie como ele é cultuado pela comunidade, inclusive piadas ou memes.
                - Absolutamente Não coloque algo que possa referenciar eletricidade em carros que não são híbridos e/ou elétricos.
                - Absolutamente de forma nenhuma repita mais de 1 emoji que referencie a origem do país/região carro.
                - Absolutamente não coloque refêrencias a clima ou terreno.
                """;
    }

    private String buildUserPrompt(Car car) {
        return """
                Gere 6 emojis para representar este carro no jogo.

                Dados disponíveis:
                Marca: %s
                Nome/modelo: %s
                Ano/período de lançamento: %s
                Carroceria: %s
                Transmissão: %s
                Tipo de motor: %s
                Categoria: %s

                Lembre-se:
                - Não use emoji de carro.
                - Não escreva explicação.
                - Responda somente com JSON.
                """.formatted(
                safe(car.getMarca()),
                safe(car.getNome()),
                car.getPeriodoLancamento() == null ? "" : car.getPeriodoLancamento().toString(),
                safe(car.getCarroceria()),
                safe(car.getTransmissao()),
                safe(car.getTipoMotor()),
                safe(car.getCategoria())
        );
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}