package com.portfolio.banco.usuario;

import com.portfolio.banco.cliente.Cliente;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "usuario")
@Getter
@Setter
public class Usuario {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String nome;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "senha_hash", nullable = false)
    private String senhaHash;   // BCrypt; nunca texto puro

    @Column(nullable = false)
    private String papel = "CLIENTE";   // ADMIN | CLIENTE

    @ManyToOne
    @JoinColumn(name = "cliente_id")
    private Cliente cliente;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;
}
