package com.portfolio.banco.simulacao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Uma simulação registrada no histórico do usuário. */
@Entity
@Table(name = "simulacao")
@Getter
@Setter
public class Simulacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "usuario_id", nullable = false)
    private Long usuarioId;

    @Column(nullable = false)
    private String categoria;   // EMPRESTIMO | INVESTIMENTO

    @Column(nullable = false)
    private String subtipo;

    @Column(nullable = false)
    private BigDecimal valor;

    @Column(nullable = false)
    private int prazo;

    @Column(nullable = false)
    private BigDecimal taxa;

    @Column(nullable = false)
    private BigDecimal resultado;

    @Column
    private BigDecimal resultado2;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
