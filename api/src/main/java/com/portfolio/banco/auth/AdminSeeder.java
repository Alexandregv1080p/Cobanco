package com.portfolio.banco.auth;

import com.portfolio.banco.usuario.Usuario;
import com.portfolio.banco.usuario.UsuarioRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Cria um usuário ADMIN no primeiro start, se ainda não existir. Configurável por ambiente. */
@Component
public class AdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);

    private final UsuarioRepository repo;
    private final PasswordEncoder encoder;
    private final String email;
    private final String senha;

    public AdminSeeder(UsuarioRepository repo, PasswordEncoder encoder,
                       @Value("${admin.email:admin@banco.com}") String email,
                       @Value("${admin.senha:admin123}") String senha) {
        this.repo = repo;
        this.encoder = encoder;
        this.email = email;
        this.senha = senha;
    }

    @Override
    public void run(String... args) {
        if (repo.existsByEmail(email)) return;
        Usuario admin = new Usuario();
        admin.setNome("Administrador");
        admin.setEmail(email);
        admin.setSenhaHash(encoder.encode(senha));
        admin.setPapel("ADMIN");   // sem cliente vinculado
        repo.save(admin);
        log.info("Usuario ADMIN criado: {}", email);
    }
}
