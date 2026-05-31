package com.rammeta.apicars.controller;

import com.rammeta.apicars.dto.ImageChallengeResponse;
import com.rammeta.apicars.dto.ImageGuessRequest;
import com.rammeta.apicars.dto.ImageGuessResponse;
import com.rammeta.apicars.service.ImageGameService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/game/image-game")
public class ImageGameController {

    private final ImageGameService imageGameService;

    public ImageGameController(ImageGameService imageGameService) {
        this.imageGameService = imageGameService;
    }

    @GetMapping
    public ImageChallengeResponse getDailyImageChallenge() {
        return imageGameService.getDailyImageChallenge();
    }

    @PostMapping("/guess")
    public ImageGuessResponse guess(@RequestBody ImageGuessRequest request) {
        return imageGameService.guess(request);
    }
}