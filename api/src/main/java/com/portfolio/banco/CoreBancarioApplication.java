package com.portfolio.banco;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CoreBancarioApplication {
    public static void main(String[] args) {
        SpringApplication.run(CoreBancarioApplication.class, args);
    }
}
