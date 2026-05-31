package com.rammeta.apicars.dto;

import java.util.List;

public record EmojiGuessResponse(
        String status,
        List<String> emojis
) {
}