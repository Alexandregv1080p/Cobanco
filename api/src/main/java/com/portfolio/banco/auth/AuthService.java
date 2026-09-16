package com.portfolio.banco.auth;

import com.portfolio.banco.cliente.Cliente;
import com.portfolio.banco.cliente.ClienteRepository;
import com.portfolio.banco.common.NaoAutorizadoException;
import com.portfolio.banco.common.RegraNegocioException;
import com.portfolio.banco.usuario.Usuario;
import com.portfolio.banco.usuario.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Registro e login. Cria o cliente junto no registro; senha com BCrypt. */
@Service
public class AuthService {

    private final UsuarioRepository usuarioRepo;
    private final ClienteRepository clienteRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(UsuarioRepository usuarioRepo, ClienteRepository clienteRepo,
                       PasswordEncoder encoder, JwtService jwt) {
        this.usuarioRepo = usuarioRepo;
        this.clienteRepo = clienteRepo;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    @Transactional
    public AuthResponse registrar(String tipo, String nome, String documento,
                                  String telefone, String email, String senha) {
        if (usuarioRepo.existsByEmail(email)) {
            throw new RegraNegocioException("email ja cadastrado");
        }
        Cliente cliente = new Cliente();
        cliente.setTipo(tipo);
        cliente.setNome(nome);
        cliente.setCpf(documento);   // CPF ou CNPJ
        cliente.setTelefone(telefone);
        clienteRepo.save(cliente);

        Usuario u = new Usuario();
        u.setNome(nome);
        u.setEmail(email);
        u.setSenhaHash(encoder.encode(senha));
        u.setPapel("CLIENTE");
        u.setCliente(cliente);
        usuarioRepo.save(u);

        return resposta(u);
    }

    @Transactional(readOnly = true)
    public AuthResponse login(String email, String senha) {
        Usuario u = usuarioRepo.findByEmail(email)
                .orElseThrow(() -> new NaoAutorizadoException("credenciais invalidas"));
        if (!encoder.matches(senha, u.getSenhaHash())) {
            throw new NaoAutorizadoException("credenciais invalidas");
        }
        return resposta(u);
    }

    private AuthResponse resposta(Usuario u) {
        return new AuthResponse(
                jwt.gerar(u), u.getNome(), u.getEmail(), u.getPapel(),
                u.getCliente() != null ? u.getCliente().getId() : null);
    }

    public record AuthResponse(String token, String nome, String email, String papel, Long clienteId) {}
}
