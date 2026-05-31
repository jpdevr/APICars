package com.rammeta.apicars.dto;

import java.util.List;

public record EmojiGuessResponse(
        boolean correct,
        List<String> emojis
) {
}