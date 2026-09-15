package com.portfolio.banco.common;

/** Regra de negocio violada (ex.: saldo insuficiente reportado pelo COBOL). Vira HTTP 422. */
public class RegraNegocioException extends RuntimeException {
    public RegraNegocioException(String message) {
        super(message);
    }
}
