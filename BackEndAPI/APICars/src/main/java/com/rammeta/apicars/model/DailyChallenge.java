package com.rammeta.apicars.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "daily_challenges")
@CompoundIndex(name = "date_mode_unique", def = "{'date': 1, 'mode': 1}", unique = true)
public class DailyChallenge {

    @Id
    private String id;

    private LocalDate date;

    private String mode;

    private String carId;

    private List<String> emojis = new ArrayList<>();

    private LocalDateTime createdAt;
}