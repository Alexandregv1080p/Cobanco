package com.portfolio.banco.auth;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

/** Valida que o documento é um CPF (FISICA) ou CNPJ (JURIDICA) válido. */
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
@Constraint(validatedBy = DocumentoConsistenteValidator.class)
public @interface DocumentoConsistente {
    String message() default "documento invalido";
    Class<?>[] groups() default {};
    Class<? extends Payload>[] payload() default {};
}
