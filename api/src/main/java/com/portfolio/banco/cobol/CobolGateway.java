package com.portfolio.banco.cobol;

import com.portfolio.banco.common.RegraNegocioException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;

/**
 * Adapter API <-> nucleo COBOL. ESTA e a unica classe que conhece o
 * protocolo (linha delimitada por ';' via stdin/stdout). O resto da API
 * fala so em BigDecimal e objetos de dominio.
 *
 * Evolucao futura (sem tocar no resto): trocar o corpo de executar() por
 * uma chamada FFI a uma lib COBOL compartilhada.
 */
@Component
public class CobolGateway {

    private static final String PREFIXO_ERRO = "ERRO;";
    private static final int TIMEOUT_S = 10;

    private final String binDir;
    private final String mode;      // "subprocess" | "ffi"
    private final FfiCobol ffi;

    public CobolGateway(@Value("${cobol.bin-dir}") String binDir,
                        @Value("${cobol.mode:subprocess}") String mode,
                        FfiCobol ffi) {
        this.binDir = binDir;
        this.mode = mode;
        this.ffi = ffi;
    }

    // ---- Emprestimo: tabela de amortizacao (Price/SAC/Americano) + custos ----
    public ResultadoSimulacao amortizar(BigDecimal valor, BigDecimal taxaMensal, int prazo, String sistema) {
        String entrada = String.join(";",
                plain(valor), plain(taxaMensal), String.valueOf(prazo), sistema.toUpperCase());

        List<String> saida = executar("amortizacao", entrada);

        // 1a linha: RESUMO;totalJuros;totalIOF;cetMensal;cetAnual;totalPago
        String[] r = saida.get(0).split(";");
        BigDecimal totalJuros = new BigDecimal(r[1]);
        BigDecimal totalIOF = new BigDecimal(r[2]);
        BigDecimal cetMensal = new BigDecimal(r[3]);
        BigDecimal cetAnual = new BigDecimal(r[4]);
        BigDecimal totalPago = new BigDecimal(r[5]);

        // demais linhas: as parcelas
        List<Parcela> parcelas = new ArrayList<>();
        for (String linha : saida.subList(1, saida.size())) {
            String[] f = linha.split(";");
            parcelas.add(new Parcela(
                    Integer.parseInt(f[0]),
                    new BigDecimal(f[1]), new BigDecimal(f[2]),
                    new BigDecimal(f[3]), new BigDecimal(f[4])));
        }
        return new ResultadoSimulacao(totalJuros, totalIOF, cetMensal, cetAnual, totalPago, parcelas);
    }

    // ---- Investimento: CDB/Poupanca + IR regressivo ----
    public ResultadoInvestimento simularInvestimento(String tipo, BigDecimal valor,
                                                     BigDecimal taxaMensal, int meses) {
        String entrada = String.join(";",
                tipo.toUpperCase(), plain(valor), plain(taxaMensal), String.valueOf(meses));

        List<String> saida = executar("investimento", entrada);

        // 1a linha: RESUMO;vfBruto;rendBruto;aliquotaIR;ir;rendLiquido;vfLiquido
        String[] r = saida.get(0).split(";");
        ResultadoInvestimento res = new ResultadoInvestimento(
                new BigDecimal(r[1]), new BigDecimal(r[2]), new BigDecimal(r[3]),
                new BigDecimal(r[4]), new BigDecimal(r[5]), new BigDecimal(r[6]),
                new ArrayList<>());

        for (String linha : saida.subList(1, saida.size())) {
            String[] f = linha.split(";");
            res.evolucao().add(new PontoInvestimento(
                    Integer.parseInt(f[0]), new BigDecimal(f[1]), new BigDecimal(f[2])));
        }
        return res;
    }

    // ---- Analise de credito: score + decisao ----
    public ResultadoCredito analisarCredito(BigDecimal renda, BigDecimal valor,
                                            int prazo, BigDecimal saldoMedio) {
        String entrada = String.join(";",
                plain(renda), plain(valor), String.valueOf(prazo), plain(saldoMedio));

        List<String> saida = executar("credito", entrada);

        // 1a linha: RESUMO;score;decisao;faixa;taxa;limite;comprom;parcela;capacidade
        String[] r = saida.get(0).split(";");
        List<FatorScore> fatores = new ArrayList<>();
        for (String linha : saida.subList(1, saida.size())) {
            String[] f = linha.split(";");          // FATOR;nome;pontos
            if ("FATOR".equals(f[0])) {
                fatores.add(new FatorScore(f[1], Integer.parseInt(f[2])));
            }
        }
        return new ResultadoCredito(
                Integer.parseInt(r[1]), r[2], r[3],
                new BigDecimal(r[4]), new BigDecimal(r[5]), new BigDecimal(r[6]),
                new BigDecimal(r[7]), new BigDecimal(r[8]), fatores);
    }

    // ---- Transacoes (caminho quente: subprocesso OU FFI in-process) ----
    public BigDecimal deposito(BigDecimal saldo, BigDecimal valor) {
        return saldoDe(processarTransacao(
                linha("DEPOSITO", valor, saldo, BigDecimal.ZERO, BigDecimal.ZERO)));
    }

    public BigDecimal saque(BigDecimal saldo, BigDecimal valor, BigDecimal limite) {
        return saldoDe(processarTransacao(
                linha("SAQUE", valor, saldo, BigDecimal.ZERO, limite)));
    }

    public ResultadoTransferencia transferencia(BigDecimal saldoOrigem, BigDecimal saldoDestino,
                                                BigDecimal valor, BigDecimal limite) {
        String[] f = processarTransacao(
                linha("TRANSFERENCIA", valor, saldoOrigem, saldoDestino, limite)).split(";");
        return new ResultadoTransferencia(new BigDecimal(f[1]), new BigDecimal(f[2]));
    }

    /**
     * Executa uma transacao pelo modo configurado. A regra de negocio e o
     * mesmo nucleo COBOL nos dois caminhos; muda so COMO ele e invocado.
     */
    private String processarTransacao(String entrada) {
        String saida = "ffi".equalsIgnoreCase(mode)
                ? ffi.executar(entrada)
                : executar("transacoes", entrada).get(0);
        if (saida.startsWith(PREFIXO_ERRO)) {
            throw new RegraNegocioException(saida.substring(PREFIXO_ERRO.length()).trim());
        }
        return saida;
    }

    private BigDecimal saldoDe(String linha) {
        return new BigDecimal(linha.split(";")[1]);
    }

    // ---- Batch de fechamento (le N contas, uma por linha) ----
    public ResultadoFechamento fechamento(List<String> contas) {
        // Uma linha por conta: conta_id;saldo;taxa;saldo_razao
        List<String> saida = executar("fechamento", String.join("\n", contas));

        List<LinhaFechamento> linhas = new ArrayList<>();
        int qtd = 0;
        BigDecimal totalJuros = BigDecimal.ZERO;
        int divergencias = 0;

        for (String linha : saida) {
            String[] f = linha.split(";");
            if ("TOTAL".equals(f[0])) {                 // trailer
                qtd = Integer.parseInt(f[1]);
                totalJuros = new BigDecimal(f[2]);
                divergencias = Integer.parseInt(f[3]);
            } else {                                     // conta_id;juros;novo_saldo;recon
                linhas.add(new LinhaFechamento(
                        Long.parseLong(f[0]), new BigDecimal(f[1]),
                        new BigDecimal(f[2]), f[3]));
            }
        }
        return new ResultadoFechamento(qtd, totalJuros, divergencias, linhas);
    }

    // ---- Infra ----

    private String linha(String op, BigDecimal valor, BigDecimal orig, BigDecimal dest, BigDecimal limite) {
        return String.join(";", op, plain(valor), plain(orig), plain(dest), plain(limite));
    }

    private String plain(BigDecimal b) {
        return b == null ? "0" : b.toPlainString();
    }

    /**
     * Roda um executavel COBOL: escreve a entrada no stdin, le o stdout.
     * Lanca RegraNegocioException quando o COBOL responde "ERRO;...".
     */
    private List<String> executar(String bin, String entrada) {
        try {
            Process p = new ProcessBuilder(binDir + File.separator + bin)
                    .redirectErrorStream(true)
                    .start();

            try (OutputStream os = p.getOutputStream()) {
                os.write((entrada + "\n").getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            List<String> linhas;
            try (BufferedReader br = new BufferedReader(
                    new InputStreamReader(p.getInputStream(), StandardCharsets.UTF_8))) {
                linhas = br.lines().map(String::trim)
                        .filter(s -> !s.isEmpty())
                        .collect(Collectors.toList());
            }

            if (!p.waitFor(TIMEOUT_S, TimeUnit.SECONDS)) {
                p.destroyForcibly();
                throw new IllegalStateException("timeout no nucleo COBOL (" + bin + ")");
            }
            if (p.exitValue() != 0) {
                throw new IllegalStateException("nucleo COBOL '" + bin + "' retornou codigo " + p.exitValue());
            }
            if (linhas.isEmpty()) {
                throw new IllegalStateException("nucleo COBOL '" + bin + "' nao produziu saida");
            }
            if (linhas.get(0).startsWith(PREFIXO_ERRO)) {
                throw new RegraNegocioException(linhas.get(0).substring(PREFIXO_ERRO.length()).trim());
            }
            return linhas;

        } catch (IOException e) {
            throw new IllegalStateException("falha ao executar o nucleo COBOL '" + bin + "'", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("execucao do nucleo COBOL '" + bin + "' interrompida", e);
        }
    }
}
