package com.rammeta.apicars.dto;

import jakarta.validation.constraints.NotBlank;

public record GuessRequest(
        @NotBlank(message = "O ID do carro é obrigatório.")
        String carId
) {
}