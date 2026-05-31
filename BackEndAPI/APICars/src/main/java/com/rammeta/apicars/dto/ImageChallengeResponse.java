package com.rammeta.apicars.dto;

import java.util.List;

public record ImageChallengeResponse(
        String challengeId,
        List<String> images
) {
}