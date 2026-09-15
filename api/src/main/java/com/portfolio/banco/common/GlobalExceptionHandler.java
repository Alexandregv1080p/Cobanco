package com.portfolio.banco.common;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

/** Converte excecoes em respostas JSON consistentes para o front. */
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<Map<String, Object>> notFound(NotFoundException ex) {
        return body(HttpStatus.NOT_FOUND, ex.getMessage());
    }

    /** Violacao de regra de negocio (ex.: saldo insuficiente vindo do COBOL). */
    @ExceptionHandler(RegraNegocioException.class)
    public ResponseEntity<Map<String, Object>> regra(RegraNegocioException ex) {
        return body(HttpStatus.UNPROCESSABLE_ENTITY, ex.getMessage());
    }

    /** CPF ou numero de conta duplicado (UNIQUE no banco). */
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, Object>> conflito(DataIntegrityViolationException ex) {
        return body(HttpStatus.CONFLICT, "registro ja existe ou viola uma restricao do banco");
    }

    /** Erros de validacao de entrada (@Valid). Detalha campo a campo. */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> invalido(MethodArgumentNotValidException ex) {
        Map<String, Object> resp = base(HttpStatus.BAD_REQUEST, "erro de validacao");
        resp.put("campos", ex.getBindingResult().getFieldErrors().stream()
                .collect(Collectors.toMap(
                        f -> f.getField(),
                        f -> f.getDefaultMessage() == null ? "invalido" : f.getDefaultMessage(),
                        (a, b) -> a)));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(resp);
    }

    private ResponseEntity<Map<String, Object>> body(HttpStatus status, String msg) {
        return ResponseEntity.status(status).body(base(status, msg));
    }

    private Map<String, Object> base(HttpStatus status, String msg) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("timestamp", OffsetDateTime.now().toString());
        m.put("status", status.value());
        m.put("error", status.getReasonPhrase());
        m.put("message", msg);
        return m;
    }
}
