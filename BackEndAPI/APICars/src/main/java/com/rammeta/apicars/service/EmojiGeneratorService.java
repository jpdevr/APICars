package com.rammeta.apicars.service;

import com.rammeta.apicars.model.Car;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class EmojiGeneratorService {

    private static final int EMOJI_COUNT = 6;

    private static final Set<String> FORBIDDEN_EMOJIS = Set.of(
            "🚗", "🚙", "🚘", "🚖", "🚕", "🏎️", "🛻", "🚓", "🚔", "🚐", "🚌"
    );

    public List<String> generateEmojisForCar(Car car) {
        List<String> emojis = new ArrayList<>();

        String marca = safe(car.getMarca()).toLowerCase();
        String nome = safe(car.getNome()).toLowerCase();
        String categoria = safe(car.getCategoria()).toLowerCase();
        String motor = safe(car.getTipoMotor()).toLowerCase();
        String carroceria = safe(car.getCarroceria()).toLowerCase();

        String fullText = String.join(" ", marca, nome, categoria, motor, carroceria);

        addBrandOrCountryEmoji(emojis, marca);
        addCategoryEmoji(emojis, fullText);
        addMotorEmoji(emojis, motor);
        addSpecificModelEmoji(emojis, fullText);
        addGenericPerformanceEmoji(emojis, fullText);

        fillUntilSix(emojis);

        return emojis.stream()
                .filter(emoji -> !FORBIDDEN_EMOJIS.contains(emoji))
                .distinct()
                .limit(EMOJI_COUNT)
                .toList();
    }

    private void addBrandOrCountryEmoji(List<String> emojis, String marca) {
        if (marca.contains("ferrari") || marca.contains("lamborghini") || marca.contains("pagani")
                || marca.contains("maserati") || marca.contains("alfa romeo") || marca.contains("fiat")) {
            add(emojis, "🇮🇹");
        } else if (marca.contains("audi") || marca.contains("bmw") || marca.contains("mercedes")
                || marca.contains("porsche") || marca.contains("volkswagen")) {
            add(emojis, "🇩🇪");
        } else if (marca.contains("honda") || marca.contains("toyota") || marca.contains("nissan")
                || marca.contains("mazda") || marca.contains("mitsubishi") || marca.contains("subaru")) {
            add(emojis, "🇯🇵");
        } else if (marca.contains("ford") || marca.contains("chevrolet") || marca.contains("dodge")
                || marca.contains("tesla") || marca.contains("cadillac")) {
            add(emojis, "🇺🇸");
        } else if (marca.contains("peugeot") || marca.contains("citroen") || marca.contains("renault")
                || marca.contains("bugatti")) {
            add(emojis, "🇫🇷");
        } else if (marca.contains("mclaren") || marca.contains("aston") || marca.contains("lotus")
                || marca.contains("jaguar") || marca.contains("mini")) {
            add(emojis, "🇬🇧");
        }
    }

    private void addCategoryEmoji(List<String> emojis, String text) {
        if (text.contains("rally")) {
            add(emojis, "🏁");
            add(emojis, "🌧️");
            add(emojis, "⛰️");
        }

        if (text.contains("formula") || text.contains("f1")) {
            add(emojis, "🏁");
            add(emojis, "🏆");
            add(emojis, "⚡");
        }

        if (text.contains("supercarro") || text.contains("hypercarro") || text.contains("supercar")
                || text.contains("hypercar")) {
            add(emojis, "🔥");
            add(emojis, "💨");
            add(emojis, "👑");
        }

        if (text.contains("muscle")) {
            add(emojis, "💪");
            add(emojis, "🇺🇸");
            add(emojis, "🔥");
        }

        if (text.contains("suv")) {
            add(emojis, "⛰️");
            add(emojis, "🧳");
        }

        if (text.contains("elétrico") || text.contains("eletrico") || text.contains("electric")) {
            add(emojis, "⚡");
            add(emojis, "🔋");
        }
    }

    private void addMotorEmoji(List<String> emojis, String motor) {
        if (motor.contains("v12")) {
            add(emojis, "1️⃣2️⃣");
            add(emojis, "🎻");
        } else if (motor.contains("v10")) {
            add(emojis, "🔟");
            add(emojis, "🔥");
        } else if (motor.contains("v8")) {
            add(emojis, "8️⃣");
            add(emojis, "💪");
        } else if (motor.contains("w16")) {
            add(emojis, "🧬");
            add(emojis, "💎");
        } else if (motor.contains("turbo")) {
            add(emojis, "🌪️");
        } else if (motor.contains("híbrido") || motor.contains("hibrido") || motor.contains("hybrid")) {
            add(emojis, "🔋");
            add(emojis, "🌱");
        }
    }

    private void addSpecificModelEmoji(List<String> emojis, String text) {
        if (text.contains("enzo")) {
            add(emojis, "🐎");
            add(emojis, "👑");
            add(emojis, "🔴");
        }

        if (text.contains("quattro")) {
            add(emojis, "4️⃣");
            add(emojis, "🌧️");
            add(emojis, "⛰️");
        }

        if (text.contains("gtr") || text.contains("gt-r") || text.contains("skyline")) {
            add(emojis, "🌃");
            add(emojis, "🐉");
            add(emojis, "🇯🇵");
        }

        if (text.contains("mustang")) {
            add(emojis, "🐎");
            add(emojis, "🇺🇸");
        }

        if (text.contains("corvette")) {
            add(emojis, "🏁");
            add(emojis, "🇺🇸");
        }

        if (text.contains("911")) {
            add(emojis, "9️⃣");
            add(emojis, "1️⃣");
            add(emojis, "🇩🇪");
        }

        if (text.contains("beetle") || text.contains("fusca")) {
            add(emojis, "🐞");
        }

        if (text.contains("red bull")) {
            add(emojis, "🐂");
            add(emojis, "🏁");
        }

        if (text.contains("golf")) {
            add(emojis, "⛳");
        }
    }

    private void addGenericPerformanceEmoji(List<String> emojis, String text) {
        if (text.contains("race") || text.contains("corrida") || text.contains("gt") || text.contains("rs")) {
            add(emojis, "🏁");
        }

        if (text.contains("sport") || text.contains("esportivo")) {
            add(emojis, "🎯");
        }

        if (text.contains("luxo") || text.contains("luxury")) {
            add(emojis, "💎");
        }

        if (text.contains("clássico") || text.contains("classico") || text.contains("classic")) {
            add(emojis, "⭐");
        }
    }

    private void fillUntilSix(List<String> emojis) {
        List<String> fallback = List.of(
                "🏁", "🔥", "💨", "⚡", "👑", "💎", "🎯", "⭐", "🌪️", "🧬"
        );

        for (String emoji : fallback) {
            if (emojis.size() >= EMOJI_COUNT) {
                break;
            }

            add(emojis, emoji);
        }
    }

    private void add(List<String> emojis, String emoji) {
        if (!FORBIDDEN_EMOJIS.contains(emoji) && !emojis.contains(emoji)) {
            emojis.add(emoji);
        }
    }

    private String safe(String value) {
        return value == null ? "" : value;
    }
}