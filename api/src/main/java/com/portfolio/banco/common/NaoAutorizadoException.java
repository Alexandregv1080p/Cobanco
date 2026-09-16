package com.portfolio.banco.common;

/** Credenciais inválidas / não autenticado. Vira HTTP 401. */
public class NaoAutorizadoException extends RuntimeException {
    public NaoAutorizadoException(String message) {
        super(message);
    }
}
