package com.rammeta.apicars.dto;

import java.util.List;

public record EmojiChallengeResponse(
        String challengeId,
        List<String> emojis
) {
}