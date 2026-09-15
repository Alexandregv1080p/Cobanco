package com.portfolio.banco.fechamento;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** Roda o fechamento diário automaticamente à meia-noite (rotina noturna). */
@Component
public class FechamentoScheduler {

    private static final Logger log = LoggerFactory.getLogger(FechamentoScheduler.class);

    private final FechamentoService service;

    public FechamentoScheduler(FechamentoService service) {
        this.service = service;
    }

    @Scheduled(cron = "0 0 0 * * *")
    public void noturno() {
        var r = service.executar();
        log.info("Fechamento noturno: {} contas, juros total {}, {} divergencias",
                r.contasProcessadas(), r.totalJuros(), r.divergencias());
    }
}
