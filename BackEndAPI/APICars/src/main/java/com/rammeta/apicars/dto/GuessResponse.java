package com.rammeta.apicars.dto;

import java.util.Map;

public record GuessResponse(
        boolean correct,
        Map<String, FieldResult> guess
) {
}