package com.rammeta.apicars.controller;

import com.rammeta.apicars.dto.EmojiChallengeResponse;
import com.rammeta.apicars.dto.EmojiGuessRequest;
import com.rammeta.apicars.dto.EmojiGuessResponse;
import com.rammeta.apicars.service.EmojiGameService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/game/emoji")
public class EmojiGameController {

    private final EmojiGameService emojiGameService;

    public EmojiGameController(EmojiGameService emojiGameService) {
        this.emojiGameService = emojiGameService;
    }

    @GetMapping("/today")
    public ResponseEntity<EmojiChallengeResponse> getTodayChallenge() {
        return ResponseEntity.ok(emojiGameService.getTodayChallenge());
    }

    @PostMapping("/guess")
    public ResponseEntity<EmojiGuessResponse> guess(@RequestBody EmojiGuessRequest request) {
        return ResponseEntity.ok(emojiGameService.guess(request));
    }
}