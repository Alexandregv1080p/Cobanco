package com.portfolio.banco.transacao;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Linha do historico/extrato. Uma por movimentacao em cada conta. */
@Entity
@Table(name = "transacao")
@Getter
@Setter
public class Transacao {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "conta_id", nullable = false)
    private Long contaId;

    /** Preenchido so em TRANSFERENCIA (a outra ponta). */
    @Column(name = "conta_destino_id")
    private Long contaDestinoId;

    @Column(nullable = false)
    private String tipo;   // DEPOSITO | SAQUE | TRANSFERENCIA

    @Column(nullable = false)
    private BigDecimal valor;

    @Column(name = "saldo_apos", nullable = false)
    private BigDecimal saldoApos;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
