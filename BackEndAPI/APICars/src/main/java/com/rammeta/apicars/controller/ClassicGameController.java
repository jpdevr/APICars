package com.rammeta.apicars.controller;

import com.rammeta.apicars.dto.GuessRequest;
import com.rammeta.apicars.dto.GuessResponse;
import com.rammeta.apicars.service.ClassicGameService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/game/classic")
public class ClassicGameController {

    private final ClassicGameService classicGameService;

    public ClassicGameController(ClassicGameService classicGameService) {
        this.classicGameService = classicGameService;
    }

    @PostMapping("/guess")
    public GuessResponse guess(@Valid @RequestBody GuessRequest request) {
        return classicGameService.guess(request);
    }
}