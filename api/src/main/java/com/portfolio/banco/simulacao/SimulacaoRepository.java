package com.portfolio.banco.simulacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SimulacaoRepository extends JpaRepository<Simulacao, Long> {
    List<Simulacao> findTop30ByUsuarioIdOrderByCreatedAtDesc(Long usuarioId);
}
