package com.rammeta.apicars.dto;

public record FieldResult(
        Object value,
        String status,
        String direction
) {
    public static FieldResult correct(Object value) {
        return new FieldResult(value, "correct", null);
    }

    public static FieldResult partial(Object value) {
        return new FieldResult(value, "partial", null);
    }

    public static FieldResult wrong(Object value) {
        return new FieldResult(value, "wrong", null);
    }

    public static FieldResult withDirection(Object value, String status, String direction) {
        return new FieldResult(value, status, direction);
    }
}