package com.portfolio.banco.cliente;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "cliente")
@Getter
@Setter
public class Cliente {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    /** FISICA (nome + CPF) ou JURIDICA (razão social + CNPJ). */
    @Column(nullable = false)
    private String tipo = "FISICA";

    /** Documento: CPF ou CNPJ (único). */
    @Column(nullable = false, unique = true)
    private String cpf;

    @Column
    private String telefone;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
