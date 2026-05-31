package com.rammeta.apicars.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.List;

@Data
@Document(collection = "Cars")
public class Car {

    @Id
    private String id;

    private String marca;
    private String nome;
    private Integer periodoLancamento;
    private String carroceria;
    private String transmissao;
    private String tipoMotor;
    private String categoria;
    private List<String> fotos;
}