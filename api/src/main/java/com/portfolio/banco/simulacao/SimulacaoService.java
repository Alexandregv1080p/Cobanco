package com.portfolio.banco.simulacao;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.usuario.UsuarioRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Registra e lista as simulações do usuário logado. Se não houver usuário no
 * contexto (chamada sem auth, ex.: testes), apenas ignora o registro — a
 * simulação em si não depende disso.
 */
@Service
public class SimulacaoService {

    private final SimulacaoRepository repo;
    private final UsuarioRepository usuarioRepo;
    private final Autorizacao autz;

    public SimulacaoService(SimulacaoRepository repo, UsuarioRepository usuarioRepo, Autorizacao autz) {
        this.repo = repo;
        this.usuarioRepo = usuarioRepo;
        this.autz = autz;
    }

    @Transactional
    public void registrar(String categoria, String subtipo, BigDecimal valor, int prazo,
                          BigDecimal taxa, BigDecimal resultado, BigDecimal resultado2) {
        usuarioRepo.findByEmail(autz.emailAtual()).ifPresent(u -> {
            Simulacao s = new Simulacao();
            s.setUsuarioId(u.getId());
            s.setCategoria(categoria);
            s.setSubtipo(subtipo);
            s.setValor(valor);
            s.setPrazo(prazo);
            s.setTaxa(taxa);
            s.setResultado(resultado);
            s.setResultado2(resultado2);
            repo.save(s);
        });
    }

    @Transactional(readOnly = true)
    public List<Simulacao> listar() {
        return usuarioRepo.findByEmail(autz.emailAtual())
                .map(u -> repo.findTop30ByUsuarioIdOrderByCreatedAtDesc(u.getId()))
                .orElseGet(List::of);
    }
}
