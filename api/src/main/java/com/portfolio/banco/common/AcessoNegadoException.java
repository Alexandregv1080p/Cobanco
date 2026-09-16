package com.portfolio.banco.common;

/** Usuário autenticado, mas sem permissão para o recurso. Vira HTTP 403. */
public class AcessoNegadoException extends RuntimeException {
    public AcessoNegadoException(String message) {
        super(message);
    }
}
