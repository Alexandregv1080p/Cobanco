package com.portfolio.banco.fechamento;

import com.portfolio.banco.cobol.CobolGateway;
import com.portfolio.banco.cobol.LinhaFechamento;
import com.portfolio.banco.cobol.ResultadoFechamento;
import com.portfolio.banco.conta.Conta;
import com.portfolio.banco.conta.ContaRepository;
import com.portfolio.banco.razao.LancamentoRepository;
import com.portfolio.banco.razao.RazaoService;
import com.portfolio.banco.transacao.Transacao;
import com.portfolio.banco.transacao.TransacaoRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Fechamento diário: monta o lote de contas (com o saldo do razão), delega
 * ao batch COBOL o cálculo dos juros de cheque especial e a reconciliação,
 * e aplica os resultados (posta os juros no razão + atualiza saldo).
 *
 * ponytail: batch roda sem travar as contas (janela noturna, sem movimento
 * concorrente); adicionar lock por conta se rodar junto com transações.
 */
@Service
public class FechamentoService {

    private final ContaRepository contaRepo;
    private final LancamentoRepository lancamentoRepo;
    private final TransacaoRepository txRepo;
    private final RazaoService razao;
    private final CobolGateway cobol;

    public FechamentoService(ContaRepository contaRepo, LancamentoRepository lancamentoRepo,
                             TransacaoRepository txRepo, RazaoService razao, CobolGateway cobol) {
        this.contaRepo = contaRepo;
        this.lancamentoRepo = lancamentoRepo;
        this.txRepo = txRepo;
        this.razao = razao;
        this.cobol = cobol;
    }

    @Transactional
    public ResultadoFechamento executar() {
        List<Conta> contas = contaRepo.findAll();
        Map<Long, Conta> porId = contas.stream()
                .collect(Collectors.toMap(Conta::getId, Function.identity()));

        // Uma linha por conta: id;saldo;taxa;saldo_razao
        List<String> entrada = contas.stream().map(c -> String.join(";",
                c.getId().toString(),
                c.getSaldo().toPlainString(),
                c.getTaxaChequeEspecial().toPlainString(),
                lancamentoRepo.saldoRazao(c.getId()).toPlainString())).toList();

        ResultadoFechamento resultado = cobol.fechamento(entrada);

        for (LinhaFechamento l : resultado.linhas()) {
            if (l.juros().signum() > 0) {
                Conta c = porId.get(l.contaId());
                c.setSaldo(l.novoSaldo());          // novo saldo calculado pelo COBOL
                razao.juros(c.getId(), l.juros());  // partidas dobradas
                registrarJuros(c.getId(), l.juros(), l.novoSaldo());
            }
        }
        return resultado;
    }

    private void registrarJuros(Long contaId, java.math.BigDecimal juros, java.math.BigDecimal saldoApos) {
        Transacao t = new Transacao();
        t.setContaId(contaId);
        t.setTipo("JUROS_CE");
        t.setValor(juros);
        t.setSaldoApos(saldoApos);
        txRepo.save(t);
    }
}
