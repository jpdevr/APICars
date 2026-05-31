package com.rammeta.apicars.repository;

import com.rammeta.apicars.model.DailyChallenge;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyChallengeRepository extends MongoRepository<DailyChallenge, String> {

    Optional<DailyChallenge> findByModeAndDate(String mode, LocalDate date);

    List<DailyChallenge> findTop70ByModeOrderByDateDesc(String mode);

    List<DailyChallenge> findByDate(LocalDate date);
}