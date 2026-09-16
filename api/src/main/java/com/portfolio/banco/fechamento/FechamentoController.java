package com.portfolio.banco.fechamento;

import com.portfolio.banco.auth.Autorizacao;
import com.portfolio.banco.cobol.ResultadoFechamento;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Dispara o fechamento diário sob demanda (o agendado roda à meia-noite). Só admin. */
@RestController
@RequestMapping("/batch")
public class FechamentoController {

    private final FechamentoService service;
    private final Autorizacao autz;

    public FechamentoController(FechamentoService service, Autorizacao autz) {
        this.service = service;
        this.autz = autz;
    }

    @PostMapping("/fechamento-diario")
    public ResultadoFechamento rodar() {
        autz.exigirAdmin();
        return service.executar();
    }
}
