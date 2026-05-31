package com.rammeta.apicars.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;

@Data
@Document(collection = "daily_challenges")
public class DailyChallenge {

    @Id
    private String id;

    private String mode;
    private LocalDate date;
    private String carId;
}