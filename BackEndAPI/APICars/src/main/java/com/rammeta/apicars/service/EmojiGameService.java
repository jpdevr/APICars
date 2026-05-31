package com.rammeta.apicars.service;

import com.rammeta.apicars.dto.EmojiChallengeResponse;
import com.rammeta.apicars.dto.EmojiGuessRequest;
import com.rammeta.apicars.dto.EmojiGuessResponse;
import com.rammeta.apicars.model.Car;
import com.rammeta.apicars.model.DailyChallenge;
import com.rammeta.apicars.repository.CarRepository;
import com.rammeta.apicars.repository.DailyChallengeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;
import java.util.stream.Collectors;

@Service
public class EmojiGameService {

    private static final String MODE_CLASSIC = "classic";
    private static final String MODE_EMOJI = "emoji";

    private static final ZoneId GAME_ZONE = ZoneId.of("America/Sao_Paulo");

    private final DailyChallengeRepository dailyChallengeRepository;
    private final CarRepository carRepository;
    private final EmojiGeneratorService emojiGeneratorService;

    public EmojiGameService(
            DailyChallengeRepository dailyChallengeRepository,
            CarRepository carRepository,
            EmojiGeneratorService emojiGeneratorService
    ) {
        this.dailyChallengeRepository = dailyChallengeRepository;
        this.carRepository = carRepository;
        this.emojiGeneratorService = emojiGeneratorService;
    }

    public EmojiChallengeResponse getTodayChallenge() {
        LocalDate today = LocalDate.now(GAME_ZONE);

        DailyChallenge challenge = getOrCreateTodayEmojiChallenge(today);

        return new EmojiChallengeResponse(
                challenge.getId(),
                challenge.getEmojis()
        );
    }

    public EmojiGuessResponse guess(EmojiGuessRequest request) {
        if (request == null || request.carId() == null || request.carId().isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "carId é obrigatório."
            );
        }

        LocalDate today = LocalDate.now(GAME_ZONE);

        DailyChallenge challenge = getOrCreateTodayEmojiChallenge(today);

        Car guessedCar = carRepository.findById(request.carId().trim())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Carro não encontrado."
                ));

        Car targetCar = carRepository.findById(challenge.getCarId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.INTERNAL_SERVER_ERROR,
                        "O carro do desafio emoji existe, mas não foi encontrado no banco."
                ));

        String status = compareEmojiGuess(guessedCar, targetCar);

        return new EmojiGuessResponse(
                status,
                challenge.getEmojis()
        );
    }

    private DailyChallenge getOrCreateTodayEmojiChallenge(LocalDate today) {
        return dailyChallengeRepository.findByModeAndDate(MODE_EMOJI, today)
                .orElseGet(() -> createTodayEmojiChallenge(today));
    }

    private DailyChallenge createTodayEmojiChallenge(LocalDate today) {
        Optional<DailyChallenge> classicChallenge =
                dailyChallengeRepository.findByModeAndDate(MODE_CLASSIC, today);

        String classicCarId = classicChallenge
                .map(DailyChallenge::getCarId)
                .orElse(null);

        Set<String> blockedCarIds = new HashSet<>();

        if (classicCarId != null) {
            blockedCarIds.add(classicCarId);
        }

        dailyChallengeRepository.findTop70ByModeOrderByDateDesc(MODE_CLASSIC)
                .stream()
                .map(DailyChallenge::getCarId)
                .filter(Objects::nonNull)
                .forEach(blockedCarIds::add);

        dailyChallengeRepository.findTop70ByModeOrderByDateDesc(MODE_EMOJI)
                .stream()
                .map(DailyChallenge::getCarId)
                .filter(Objects::nonNull)
                .forEach(blockedCarIds::add);

        List<Car> allCars = carRepository.findAll();

        if (allCars.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Nenhum carro cadastrado no banco."
            );
        }

        List<Car> availableCars = allCars.stream()
                .filter(car -> car.getId() != null)
                .filter(car -> !blockedCarIds.contains(car.getId()))
                .collect(Collectors.toCollection(ArrayList::new));

        if (availableCars.isEmpty()) {
            availableCars = allCars.stream()
                    .filter(car -> car.getId() != null)
                    .filter(car -> classicCarId == null || !classicCarId.equals(car.getId()))
                    .collect(Collectors.toCollection(ArrayList::new));
        }

        if (availableCars.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não há carros disponíveis para criar o desafio emoji."
            );
        }

        Car selectedCar = availableCars.get(
                ThreadLocalRandom.current().nextInt(availableCars.size())
        );

        List<String> emojis = emojiGeneratorService.generateEmojisForCar(selectedCar);

        DailyChallenge challenge = new DailyChallenge();
        challenge.setDate(today);
        challenge.setMode(MODE_EMOJI);
        challenge.setCarId(selectedCar.getId());
        challenge.setEmojis(emojis);
        challenge.setCreatedAt(LocalDateTime.now(GAME_ZONE));

        return dailyChallengeRepository.save(challenge);
    }
    private String compareEmojiGuess(Car guessedCar, Car targetCar) {
        if (guessedCar.getId().equals(targetCar.getId())) {
            return "true";
        }

        if (normalize(guessedCar.getMarca()).equals(normalize(targetCar.getMarca()))) {
            return "partial";
        }

        return "false";
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value
                .toLowerCase()
                .trim()
                .replace("á", "a")
                .replace("à", "a")
                .replace("ã", "a")
                .replace("â", "a")
                .replace("é", "e")
                .replace("ê", "e")
                .replace("í", "i")
                .replace("ó", "o")
                .replace("ô", "o")
                .replace("õ", "o")
                .replace("ú", "u")
                .replace("ç", "c");
    }
}