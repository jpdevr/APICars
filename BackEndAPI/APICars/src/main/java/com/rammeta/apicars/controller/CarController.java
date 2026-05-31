package com.rammeta.apicars.controller;

import com.rammeta.apicars.model.Car;
import com.rammeta.apicars.repository.CarRepository;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/cars")
@CrossOrigin(origins = "http://localhost:5173")
public class CarController {

    private final CarRepository carRepository;

    public CarController(CarRepository carRepository) {
        this.carRepository = carRepository;
    }

    @GetMapping("/search")
    public List<Car> searchCars(@RequestParam String query) {
        return carRepository
                .findTop10ByMarcaContainingIgnoreCaseOrNomeContainingIgnoreCase(query, query);
    }
}