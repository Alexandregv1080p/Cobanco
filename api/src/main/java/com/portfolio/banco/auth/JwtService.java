package com.portfolio.banco.auth;

import com.portfolio.banco.usuario.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

/** Gera e valida tokens JWT (HS256). */
@Service
public class JwtService {

    private final SecretKey key;
    private final long expiracaoMs;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.expiration-minutes}") long minutos) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expiracaoMs = minutos * 60_000;
    }

    public String gerar(Usuario u) {
        Instant agora = Instant.now();
        return Jwts.builder()
                .subject(u.getEmail())
                .claim("papel", u.getPapel())
                .claim("uid", u.getId())
                .claim("clienteId", u.getCliente() != null ? u.getCliente().getId() : null)
                .issuedAt(Date.from(agora))
                .expiration(Date.from(agora.plusMillis(expiracaoMs)))
                .signWith(key)
                .compact();
    }

    public Claims validar(String token) {
        return Jwts.parser().verifyWith(key).build()
                .parseSignedClaims(token).getPayload();
    }
}
