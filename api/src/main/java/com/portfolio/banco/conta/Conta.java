package com.portfolio.banco.conta;

import com.portfolio.banco.cliente.Cliente;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "conta")
@Getter
@Setter
public class Conta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ManyToOne e EAGER por padrao: sempre mostramos o dono da conta.
    @ManyToOne(optional = false)
    @JoinColumn(name = "cliente_id", nullable = false)
    private Cliente cliente;

    @Column(nullable = false, unique = true)
    private String numero;

    @Column(nullable = false)
    private BigDecimal saldo = BigDecimal.ZERO;

    @Column(nullable = false)
    private BigDecimal limite = BigDecimal.ZERO;

    /** Taxa mensal do cheque especial, cobrada no fechamento diário sobre saldo negativo. */
    @Column(name = "taxa_cheque_especial", nullable = false)
    private BigDecimal taxaChequeEspecial = new BigDecimal("0.08");

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
