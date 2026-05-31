package com.rammeta.apicars.dto;

import com.rammeta.apicars.model.Car;

import java.util.List;

public record CarSearchResponse(
        String id,
        String label,
        String marca,
        String nome,
        List<String> fotos
) {
    public static CarSearchResponse from(Car car) {
        return new CarSearchResponse(
                car.getId(),
                car.getMarca() + " " + car.getNome(),
                car.getMarca(),
                car.getNome(),
                car.getFotos()
        );
    }
}