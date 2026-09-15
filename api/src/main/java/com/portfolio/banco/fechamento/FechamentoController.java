package com.portfolio.banco.fechamento;

import com.portfolio.banco.cobol.ResultadoFechamento;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Dispara o fechamento diário sob demanda (o agendado roda à meia-noite). */
@RestController
@RequestMapping("/batch")
public class FechamentoController {

    private final FechamentoService service;

    public FechamentoController(FechamentoService service) {
        this.service = service;
    }

    @PostMapping("/fechamento-diario")
    public ResultadoFechamento rodar() {
        return service.executar();
    }
}
