package com.portfolio.banco.common;

/** Lancada quando um recurso (cliente, conta) nao existe. Vira HTTP 404. */
public class NotFoundException extends RuntimeException {
    public NotFoundException(String message) {
        super(message);
    }
}
