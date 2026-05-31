package com.rammeta.apicars.service;

import com.rammeta.apicars.dto.FieldResult;
import com.rammeta.apicars.dto.GuessRequest;
import com.rammeta.apicars.dto.GuessResponse;
import com.rammeta.apicars.model.Car;
import com.rammeta.apicars.model.DailyChallenge;
import com.rammeta.apicars.repository.CarRepository;
import com.rammeta.apicars.repository.DailyChallengeRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class ClassicGameService {

    private static final String MODE_CLASSIC = "classic";
    private static final ZoneId GAME_ZONE = ZoneId.of("America/Sao_Paulo");

    private final CarRepository carRepository;
    private final DailyChallengeRepository dailyChallengeRepository;
    private final Random random = new Random();

    public ClassicGameService(
            CarRepository carRepository,
            DailyChallengeRepository dailyChallengeRepository
    ) {
        this.carRepository = carRepository;
        this.dailyChallengeRepository = dailyChallengeRepository;
    }

    public GuessResponse guess(GuessRequest request) {
        Car guessedCar = carRepository.findById(request.carId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Carro não encontrado."
                ));

        Car targetCar = getOrCreateDailyCar();

        boolean isCorrect = guessedCar.getId().equals(targetCar.getId());

        Map<String, FieldResult> result = new LinkedHashMap<>();

        result.put("foto", comparePhoto(guessedCar, isCorrect));
        result.put("marca", compareExact(guessedCar.getMarca(), targetCar.getMarca()));

        result.put("nome", isCorrect
                ? FieldResult.correct(guessedCar.getNome())
                : FieldResult.wrong(guessedCar.getNome())
        );

        result.put("periodoLancamento", compareYear(
                guessedCar.getPeriodoLancamento(),
                targetCar.getPeriodoLancamento()
        ));

        result.put("carroceria", compareExact(guessedCar.getCarroceria(), targetCar.getCarroceria()));
        result.put("transmissao", compareExact(guessedCar.getTransmissao(), targetCar.getTransmissao()));
        result.put("tipoMotor", compareEngine(guessedCar.getTipoMotor(), targetCar.getTipoMotor()));
        result.put("categoria", compareCategory(guessedCar.getCategoria(), targetCar.getCategoria()));

        return new GuessResponse(isCorrect, result);
    }

    private Car getOrCreateDailyCar() {
        LocalDate today = LocalDate.now(GAME_ZONE);

        Optional<DailyChallenge> existingChallenge =
                dailyChallengeRepository.findByModeAndDate(MODE_CLASSIC, today);

        if (existingChallenge.isPresent()) {
            String carId = existingChallenge.get().getCarId();

            return carRepository.findById(carId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.INTERNAL_SERVER_ERROR,
                            "O carro do dia existe, mas não foi encontrado no banco."
                    ));
        }

        Car selectedCar = selectRandomCarWithoutRecentRepeat();

        DailyChallenge challenge = new DailyChallenge();
        challenge.setMode(MODE_CLASSIC);
        challenge.setDate(today);
        challenge.setCarId(selectedCar.getId());

        dailyChallengeRepository.save(challenge);

        return selectedCar;
    }

    private Car selectRandomCarWithoutRecentRepeat() {
        List<Car> allCars = carRepository.findAll();

        if (allCars.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "Nenhum carro cadastrado no banco."
            );
        }

        List<DailyChallenge> recentChallenges =
                dailyChallengeRepository.findTop70ByModeOrderByDateDesc(MODE_CLASSIC);

        Set<String> blockedCarIds = recentChallenges.stream()
                .map(DailyChallenge::getCarId)
                .collect(Collectors.toSet());

        List<Car> availableCars = allCars.stream()
                .filter(car -> !blockedCarIds.contains(car.getId()))
                .toList();

        if (availableCars.isEmpty()) {
            availableCars = allCars;
        }

        return availableCars.get(random.nextInt(availableCars.size()));
    }

    private FieldResult comparePhoto(Car guessedCar, boolean isCorrect) {
        String firstPhoto = "";

        if (guessedCar.getFotos() != null && !guessedCar.getFotos().isEmpty()) {
            firstPhoto = guessedCar.getFotos().get(0);
        }

        return isCorrect
                ? FieldResult.correct(firstPhoto)
                : FieldResult.wrong(firstPhoto);
    }

    private FieldResult compareExact(String guessedValue, String targetValue) {
        if (normalize(guessedValue).equals(normalize(targetValue))) {
            return FieldResult.correct(guessedValue);
        }

        return FieldResult.wrong(guessedValue);
    }

    private FieldResult compareYear(Integer guessedYear, Integer targetYear) {
        if (guessedYear == null || targetYear == null) {
            return FieldResult.wrong(guessedYear);
        }

        int difference = Math.abs(guessedYear - targetYear);

        String direction = null;

        if (guessedYear < targetYear) {
            direction = "up";
        } else if (guessedYear > targetYear) {
            direction = "down";
        }

        if (difference == 0) {
            return FieldResult.withDirection(guessedYear, "correct", null);
        }

        if (difference <= 5) {
            return FieldResult.withDirection(guessedYear, "partial", direction);
        }

        return FieldResult.withDirection(guessedYear, "wrong", direction);
    }

    private FieldResult compareEngine(String guessedEngine, String targetEngine) {
        String guessed = normalize(guessedEngine);
        String target = normalize(targetEngine);

        if (guessed.equals(target)) {
            return FieldResult.correct(guessedEngine);
        }

        if (isSimilarEngine(guessed, target)) {
            return FieldResult.partial(guessedEngine);
        }

        return FieldResult.wrong(guessedEngine);
    }

    private boolean isSimilarEngine(String guessed, String target) {
        if ((guessed.contains("hybrid") || guessed.contains("hibrido"))
                && target.contains("electric")) {
            return true;
        }

        if (guessed.contains("electric")
                && (target.contains("hybrid") || target.contains("hibrido"))) {
            return true;
        }

        if (hasSameBaseEngineWithHybridDifference(guessed, target)) {
            return true;
        }

        EngineInfo guessedInfo = extractEngineInfo(guessed);
        EngineInfo targetInfo = extractEngineInfo(target);

        if (guessedInfo == null || targetInfo == null) {
            return false;
        }

        if (!guessedInfo.layout().equals(targetInfo.layout())) {
            return false;
        }

        int cylinderDifference = Math.abs(guessedInfo.cylinders() - targetInfo.cylinders());

        return cylinderDifference <= 2;
    }

    private boolean hasSameBaseEngineWithHybridDifference(String guessed, String target) {
        String guessedWithoutHybrid = guessed
                .replace("hybrid", "")
                .replace("hibrido", "")
                .trim();

        String targetWithoutHybrid = target
                .replace("hybrid", "")
                .replace("hibrido", "")
                .trim();

        return !guessedWithoutHybrid.isBlank()
                && guessedWithoutHybrid.equals(targetWithoutHybrid);
    }

    private EngineInfo extractEngineInfo(String engine) {
        if (engine.contains("v12")) return new EngineInfo("v", 12);
        if (engine.contains("v10")) return new EngineInfo("v", 10);
        if (engine.contains("v8")) return new EngineInfo("v", 8);
        if (engine.contains("v6")) return new EngineInfo("v", 6);

        if (engine.contains("i6") || engine.contains("l6")) return new EngineInfo("i", 6);
        if (engine.contains("i5") || engine.contains("l5")) return new EngineInfo("i", 5);
        if (engine.contains("i4") || engine.contains("l4")) return new EngineInfo("i", 4);
        if (engine.contains("i3") || engine.contains("l3")) return new EngineInfo("i", 3);

        if (engine.contains("flat-6") || engine.contains("flat 6") || engine.contains("f6")) {
            return new EngineInfo("flat", 6);
        }

        if (engine.contains("flat-4") || engine.contains("flat 4") || engine.contains("f4")) {
            return new EngineInfo("flat", 4);
        }

        if (engine.contains("w16")) return new EngineInfo("w", 16);
        if (engine.contains("w12")) return new EngineInfo("w", 12);

        return null;
    }

    private FieldResult compareCategory(String guessedCategory, String targetCategory) {
        String guessed = normalize(guessedCategory);
        String target = normalize(targetCategory);

        if (guessed.equals(target)) {
            return FieldResult.correct(guessedCategory);
        }

        if (isSimilarCategory(guessed, target)) {
            return FieldResult.partial(guessedCategory);
        }

        return FieldResult.wrong(guessedCategory);
    }

    private boolean isSimilarCategory(String guessed, String target) {
        List<Set<String>> categoryGroups = List.of(
                Set.of("supercarro", "hypercarro", "hipercarro"),
                Set.of("esportivo", "supercarro", "coupe", "cupe"),
                Set.of("rally", "corrida", "grupo b", "wrc"),
                Set.of("suv", "off-road", "picape", "pickup"),
                Set.of("hatch", "hatchback", "compacto"),
                Set.of("sedan", "executivo", "luxo"),
                Set.of("formula 1", "f1", "monoposto"),
                Set.of("prototipo", "prototype", "lemans", "le mans", "endurance")
        );

        return categoryGroups.stream()
                .anyMatch(group -> group.contains(guessed) && group.contains(target));
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

    private record EngineInfo(String layout, int cylinders) {
    }
}