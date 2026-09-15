package com.portfolio.banco.transacao;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TransacaoRepository extends JpaRepository<Transacao, Long> {
    List<Transacao> findByContaIdOrderByCreatedAtDesc(Long contaId);
}
