package com.portfolio.banco.cofrinho;

import com.portfolio.banco.conta.Conta;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Cofrinho (caixinha): poupança interna vinculada a uma conta. */
@Entity
@Table(name = "cofrinho")
@Getter
@Setter
public class Cofrinho {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "conta_id", nullable = false)
    private Conta conta;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false)
    private BigDecimal meta = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal saldo = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
