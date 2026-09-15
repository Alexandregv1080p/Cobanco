package com.portfolio.banco.razao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Uma linha do livro razão (partidas dobradas). Débito ou crédito de um lote balanceado. */
@Entity
@Table(name = "lancamento")
@Getter
@Setter
public class Lancamento {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long lote;

    /** Conta de cliente (ou null quando é conta interna). */
    @Column(name = "conta_id")
    private Long contaId;

    /** Conta interna: CAIXA, RECEITA_JUROS... (ou null quando é conta de cliente). */
    @Column(name = "conta_interna")
    private String contaInterna;

    @Column(nullable = false, length = 1)
    private String natureza;   // "D" | "C"

    @Column(nullable = false)
    private BigDecimal valor;

    @Column(nullable = false)
    private String historico;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
