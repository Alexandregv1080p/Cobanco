package com.portfolio.banco.simulacao;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

@RestController
@RequestMapping("/simulacoes")
public class SimulacaoController {

    private final SimulacaoService service;

    public SimulacaoController(SimulacaoService service) {
        this.service = service;
    }

    @GetMapping
    public List<SimulacaoItem> minhas() {
        return service.listar().stream().map(SimulacaoItem::de).toList();
    }

    public record SimulacaoItem(
            Long id, String categoria, String subtipo, BigDecimal valor, int prazo,
            BigDecimal taxa, BigDecimal resultado, BigDecimal resultado2, OffsetDateTime data) {
        static SimulacaoItem de(Simulacao s) {
            return new SimulacaoItem(s.getId(), s.getCategoria(), s.getSubtipo(), s.getValor(),
                    s.getPrazo(), s.getTaxa(), s.getResultado(), s.getResultado2(), s.getCreatedAt());
        }
    }
}
