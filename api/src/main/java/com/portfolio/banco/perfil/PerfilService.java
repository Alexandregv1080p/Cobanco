package com.portfolio.banco.perfil;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.auth.AuthService;
import com.portfolio.banco.auth.JwtService;
import com.portfolio.banco.cliente.Cliente;
import com.portfolio.banco.common.NaoAutorizadoException;
import com.portfolio.banco.common.RegraNegocioException;
import com.portfolio.banco.usuario.Usuario;
import com.portfolio.banco.usuario.UsuarioRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PerfilService {

    private final UsuarioRepository usuarioRepo;
    private final PasswordEncoder encoder;
    private final JwtService jwt;
    private final Autorizacao autz;

    public PerfilService(UsuarioRepository usuarioRepo, PasswordEncoder encoder,
                         JwtService jwt, Autorizacao autz) {
        this.usuarioRepo = usuarioRepo;
        this.encoder = encoder;
        this.jwt = jwt;
        this.autz = autz;
    }

    @Transactional(readOnly = true)
    public PerfilResponse meuPerfil() {
        Usuario u = atual();
        Cliente c = u.getCliente();
        return new PerfilResponse(u.getNome(), u.getEmail(), u.getPapel(),
                c != null ? c.getTipo() : null,
                c != null ? c.getCpf() : null,
                c != null ? c.getTelefone() : null,
                c != null ? c.getId() : null);
    }

    /** Atualiza nome/e-mail/telefone e devolve um token novo (o subject pode ter mudado). */
    @Transactional
    public AuthService.AuthResponse atualizar(String nome, String email, String telefone) {
        Usuario u = atual();
        if (!email.equalsIgnoreCase(u.getEmail()) && usuarioRepo.existsByEmail(email)) {
            throw new RegraNegocioException("email ja cadastrado");
        }
        u.setNome(nome);
        u.setEmail(email);
        Cliente c = u.getCliente();
        if (c != null) {
            c.setNome(nome);
            c.setTelefone(telefone);
        }
        return new AuthService.AuthResponse(jwt.gerar(u), u.getNome(), u.getEmail(),
                u.getPapel(), c != null ? c.getId() : null);
    }

    @Transactional
    public void trocarSenha(String senhaAtual, String novaSenha) {
        Usuario u = atual();
        if (!encoder.matches(senhaAtual, u.getSenhaHash())) {
            throw new NaoAutorizadoException("senha atual incorreta");
        }
        u.setSenhaHash(encoder.encode(novaSenha));
    }

    private Usuario atual() {
        return usuarioRepo.findByEmail(autz.emailAtual())
                .orElseThrow(() -> new NaoAutorizadoException("sessao invalida"));
    }

    public record PerfilResponse(String nome, String email, String papel,
                                 String tipo, String documento, String telefone, Long clienteId) {}
}
