package com.rammeta.apicars.repository;

import com.rammeta.apicars.model.Car;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface CarRepository extends MongoRepository<Car, String> {

    List<Car> findTop10ByMarcaContainingIgnoreCaseOrNomeContainingIgnoreCase(
            String marca,
            String nome
    );
}