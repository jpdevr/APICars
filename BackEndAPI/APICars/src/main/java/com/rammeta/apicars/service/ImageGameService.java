package com.rammeta.apicars.service;

import com.rammeta.apicars.dto.ImageChallengeResponse;
import com.rammeta.apicars.dto.ImageGuessRequest;
import com.rammeta.apicars.dto.ImageGuessResponse;
import com.rammeta.apicars.model.Car;
import com.rammeta.apicars.model.DailyChallenge;
import com.rammeta.apicars.repository.CarRepository;
import com.rammeta.apicars.repository.DailyChallengeRepository;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Random;
import java.util.Set;

@Service
public class ImageGameService {

    private static final String IMAGE_MODE = "imageGuess";

    private final DailyChallengeRepository dailyChallengeRepository;
    private final CarRepository carRepository;

    public ImageGameService(
            DailyChallengeRepository dailyChallengeRepository,
            CarRepository carRepository
    ) {
        this.dailyChallengeRepository = dailyChallengeRepository;
        this.carRepository = carRepository;
    }

    public ImageChallengeResponse getDailyImageChallenge() {
        LocalDate today = LocalDate.now();

        DailyChallenge challenge = dailyChallengeRepository
                .findByModeAndDate(IMAGE_MODE, today)
                .orElseGet(() -> createDailyImageChallenge(today));

        Car car = carRepository.findById(challenge.getCarId())
                .orElseThrow(() -> new RuntimeException("Carro do desafio não encontrado."));

        return new ImageChallengeResponse(
                challenge.getId(),
                car.getFotos()
        );
    }

    public ImageGuessResponse guess(ImageGuessRequest request) {
        LocalDate today = LocalDate.now();

        DailyChallenge challenge = dailyChallengeRepository
                .findByModeAndDate(IMAGE_MODE, today)
                .orElseGet(() -> createDailyImageChallenge(today));

        Car correctCar = carRepository.findById(challenge.getCarId())
                .orElseThrow(() -> new RuntimeException("Carro correto não encontrado."));

        Car guessedCar = carRepository.findById(request.carId())
                .orElseThrow(() -> new RuntimeException("Carro chutado não encontrado."));

        if (correctCar.getId().equals(guessedCar.getId())) {
            return new ImageGuessResponse("true");
        }

        if (correctCar.getMarca() != null
                && guessedCar.getMarca() != null
                && correctCar.getMarca().equalsIgnoreCase(guessedCar.getMarca())) {
            return new ImageGuessResponse("partial");
        }

        return new ImageGuessResponse("false");
    }

    private DailyChallenge createDailyImageChallenge(LocalDate today) {
        List<DailyChallenge> last70ImageChallenges =
                dailyChallengeRepository.findTop70ByModeOrderByDateDesc(IMAGE_MODE);

        List<DailyChallenge> todayChallenges =
                dailyChallengeRepository.findByDate(today);

        Set<String> blockedCarIds = new HashSet<>();

        for (DailyChallenge challenge : last70ImageChallenges) {
            blockedCarIds.add(challenge.getCarId());
        }

        for (DailyChallenge challenge : todayChallenges) {
            blockedCarIds.add(challenge.getCarId());
        }

        List<Car> availableCars = carRepository.findAll()
                .stream()
                .filter(car -> !blockedCarIds.contains(car.getId()))
                .filter(car -> car.getFotos() != null && !car.getFotos().isEmpty())
                .toList();

        if (availableCars.isEmpty()) {
            throw new RuntimeException("Nenhum carro disponível para o image game.");
        }

        Car selectedCar = availableCars.get(new Random().nextInt(availableCars.size()));

        DailyChallenge challenge = new DailyChallenge();
        challenge.setMode(IMAGE_MODE);
        challenge.setDate(today);
        challenge.setCarId(selectedCar.getId());

        return dailyChallengeRepository.save(challenge);
    }
}