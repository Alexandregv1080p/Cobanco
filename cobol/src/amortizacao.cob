>>SOURCE FORMAT FREE
*> ============================================================
*> AMORTIZACAO.COB - Motor de calculo de emprestimo
*> Sistemas: PRICE (parcela fixa), SAC (amortizacao fixa),
*>           AMERICANO (so juros; principal no fim)
*>
*> Alem da tabela, calcula os CUSTOS REGULATORIOS (Brasil):
*>   - IOF: adicional 0,38% + diario 0,0082%/dia (dias <= 365)
*>   - CET (Custo Efetivo Total): taxa que iguala o valor liquido
*>     recebido ao fluxo de parcelas -> resolvida por BISSECAO aqui
*>     no COBOL (calculo numerico iterativo, decimal exato).
*>
*> Modelo: IOF e descontado do valor liberado (valorLiquido =
*> valor - IOF); o CET reflete isso, ficando acima da taxa nominal.
*> Dias por mes = 30 (sem data de inicio). [ponytail: 30d/mes fixo,
*> trocar por calendario real se precisar de precisao de data]
*>
*> --- Contrato de I/O ---
*> Entrada (stdin, 1 linha):  valor;taxa_mensal;prazo;SISTEMA
*>   taxa_mensal = fracao (0.015 = 1,5% a.m.); SISTEMA=PRICE|SAC|AMERICANO
*> Saida (stdout):
*>   1a linha: RESUMO;totalJuros;totalIOF;cetMensal;cetAnual;totalPago
*>   demais:   numero;parcela;juros;amortizacao;saldo_devedor
*> Erro:       ERRO;<mensagem>
*> ============================================================
IDENTIFICATION DIVISION.
PROGRAM-ID. AMORTIZACAO.

DATA DIVISION.
WORKING-STORAGE SECTION.

*> --- Entrada crua e campos texto ---
01 WS-LINHA            PIC X(100).
01 WS-VALOR-TXT        PIC X(25).
01 WS-TAXA-TXT         PIC X(25).
01 WS-PRAZO-TXT        PIC X(25).
01 WS-SISTEMA-TXT      PIC X(25).

*> --- Parametros convertidos ---
01 WS-VALOR            PIC 9(13)V99    COMP-3.
01 WS-TAXA             PIC 9V9(8)      COMP-3.
01 WS-PRAZO            PIC 9(4)        COMP-3.
01 WS-SISTEMA          PIC X(9).

*> --- Calculo da tabela ---
01 WS-SALDO            PIC 9(13)V99    COMP-3.
01 WS-PARCELA          PIC 9(13)V99    COMP-3.
01 WS-JUROS            PIC 9(13)V99    COMP-3.
01 WS-AMORT            PIC 9(13)V99    COMP-3.
01 WS-PMT              PIC 9(13)V99    COMP-3.
01 WS-AMORT-BASE       PIC 9(13)V99    COMP-3.
01 WS-FATOR            PIC 9(10)V9(10) COMP-3.
01 WS-K                PIC 9(4)        COMP-3.

*> --- Tabela de parcelas (guardada p/ imprimir apos o RESUMO e
*>     p/ o calculo do CET) ---
01 WS-TAB.
   05 WS-LINHA-TAB OCCURS 360 TIMES.
      10 T-PARCELA     PIC 9(13)V99 COMP-3.
      10 T-JUROS       PIC 9(13)V99 COMP-3.
      10 T-AMORT       PIC 9(13)V99 COMP-3.
      10 T-SALDO       PIC 9(13)V99 COMP-3.

*> --- Totais e custos regulatorios ---
01 WS-TOTAL-JUROS      PIC 9(15)V99    COMP-3.
01 WS-TOTAL-PAGO       PIC 9(15)V99    COMP-3.
01 WS-DIAS             PIC 9(5)        COMP-3.
01 WS-IOF-DIARIO       PIC 9(13)V9(6)  COMP-3.
01 WS-IOF-ADIC         PIC 9(13)V99    COMP-3.
01 WS-IOF-TOTAL        PIC 9(13)V99    COMP-3.
01 WS-VALOR-LIQ        PIC 9(13)V99    COMP-3.

*> --- CET por bissecao ---
01 WS-LO               PIC 9V9(9)      COMP-3.
01 WS-HI               PIC 9V9(9)      COMP-3.
01 WS-MID              PIC 9V9(9)      COMP-3.
01 WS-PV               PIC S9(15)V9(6) COMP-3.
01 WS-CET-MES          PIC 9V9(9)      COMP-3.
01 WS-CET-ANO          PIC 9(4)V9(9)   COMP-3.
01 WS-I                PIC 9(4)        COMP-3.

*> --- Edicao de saida ---
01 WS-NUM-E            PIC Z(3)9.
01 WS-DIN-P            PIC Z(13)9.99.
01 WS-DIN-J            PIC Z(13)9.99.
01 WS-DIN-A            PIC Z(13)9.99.
01 WS-DIN-S            PIC Z(13)9.99.
01 WS-DIN-TJ           PIC Z(15)9.99.
01 WS-DIN-IOF          PIC Z(13)9.99.
01 WS-DIN-TP           PIC Z(15)9.99.
01 WS-CET-ME           PIC Z(3)9.9(6).
01 WS-CET-AE           PIC Z(3)9.9(6).
01 WS-SAIDA            PIC X(160).

PROCEDURE DIVISION.

MAIN.
    PERFORM LER-E-VALIDAR
    PERFORM CALCULAR-PMT
    PERFORM GERAR-CRONOGRAMA
    PERFORM CALCULAR-IOF
    PERFORM CALCULAR-CET
    PERFORM ESCREVER-RESUMO
    PERFORM ESCREVER-PARCELAS
    GOBACK.

*> ------------------------------------------------------------
LER-E-VALIDAR.
    ACCEPT WS-LINHA
    UNSTRING WS-LINHA DELIMITED BY ';'
        INTO WS-VALOR-TXT WS-TAXA-TXT WS-PRAZO-TXT WS-SISTEMA-TXT
    END-UNSTRING

    COMPUTE WS-VALOR = FUNCTION NUMVAL(WS-VALOR-TXT)
    COMPUTE WS-TAXA  = FUNCTION NUMVAL(WS-TAXA-TXT)
    COMPUTE WS-PRAZO = FUNCTION NUMVAL(WS-PRAZO-TXT)
    MOVE FUNCTION UPPER-CASE(FUNCTION TRIM(WS-SISTEMA-TXT)) TO WS-SISTEMA

    IF WS-VALOR <= 0
        DISPLAY 'ERRO;valor deve ser maior que zero'
        GOBACK
    END-IF
    IF WS-PRAZO < 1 OR WS-PRAZO > 360
        DISPLAY 'ERRO;prazo deve estar entre 1 e 360 meses'
        GOBACK
    END-IF
    IF WS-SISTEMA NOT = 'PRICE' AND WS-SISTEMA NOT = 'SAC'
                                AND WS-SISTEMA NOT = 'AMERICANO'
        DISPLAY 'ERRO;sistema deve ser PRICE, SAC ou AMERICANO'
        GOBACK
    END-IF.

*> ------------------------------------------------------------
*> PRICE: PMT fixo. SAC: amortizacao fixa. AMERICANO: nada a
*> pre-calcular (juros sobre o principal cheio todo mes).
*> ------------------------------------------------------------
CALCULAR-PMT.
    EVALUATE WS-SISTEMA
        WHEN 'PRICE'
            IF WS-TAXA = 0
                COMPUTE WS-PMT ROUNDED = WS-VALOR / WS-PRAZO
            ELSE
                COMPUTE WS-FATOR ROUNDED = (1 + WS-TAXA) ** WS-PRAZO
                COMPUTE WS-PMT ROUNDED =
                    WS-VALOR * WS-TAXA * WS-FATOR / (WS-FATOR - 1)
            END-IF
        WHEN 'SAC'
            COMPUTE WS-AMORT-BASE ROUNDED = WS-VALOR / WS-PRAZO
    END-EVALUATE.

*> ------------------------------------------------------------
*> Gera a tabela e acumula totais. Guarda cada parcela em WS-TAB
*> (para o CET e para imprimir depois do RESUMO).
*> ------------------------------------------------------------
GERAR-CRONOGRAMA.
    MOVE WS-VALOR TO WS-SALDO
    MOVE 0 TO WS-TOTAL-JUROS
    MOVE 0 TO WS-TOTAL-PAGO

    PERFORM VARYING WS-K FROM 1 BY 1 UNTIL WS-K > WS-PRAZO
        COMPUTE WS-JUROS ROUNDED = WS-SALDO * WS-TAXA

        EVALUATE WS-SISTEMA
            WHEN 'PRICE'
                IF WS-K = WS-PRAZO
                    MOVE WS-SALDO TO WS-AMORT
                    COMPUTE WS-PARCELA = WS-JUROS + WS-AMORT
                ELSE
                    MOVE WS-PMT TO WS-PARCELA
                    COMPUTE WS-AMORT = WS-PARCELA - WS-JUROS
                END-IF
            WHEN 'SAC'
                IF WS-K = WS-PRAZO
                    MOVE WS-SALDO TO WS-AMORT
                ELSE
                    MOVE WS-AMORT-BASE TO WS-AMORT
                END-IF
                COMPUTE WS-PARCELA = WS-AMORT + WS-JUROS
            WHEN 'AMERICANO'
                IF WS-K = WS-PRAZO
                    MOVE WS-SALDO TO WS-AMORT
                ELSE
                    MOVE 0 TO WS-AMORT
                END-IF
                COMPUTE WS-PARCELA = WS-AMORT + WS-JUROS
        END-EVALUATE

        COMPUTE WS-SALDO = WS-SALDO - WS-AMORT

        MOVE WS-PARCELA TO T-PARCELA(WS-K)
        MOVE WS-JUROS   TO T-JUROS(WS-K)
        MOVE WS-AMORT   TO T-AMORT(WS-K)
        MOVE WS-SALDO   TO T-SALDO(WS-K)
        ADD WS-JUROS    TO WS-TOTAL-JUROS
        ADD WS-PARCELA  TO WS-TOTAL-PAGO
    END-PERFORM.

*> ------------------------------------------------------------
*> IOF = adicional (0,38% do valor) + diario (0,0082%/dia sobre a
*> amortizacao de cada parcela, com dias limitados a 365).
*> ------------------------------------------------------------
CALCULAR-IOF.
    MOVE 0 TO WS-IOF-DIARIO
    PERFORM VARYING WS-K FROM 1 BY 1 UNTIL WS-K > WS-PRAZO
        COMPUTE WS-DIAS = 30 * WS-K
        IF WS-DIAS > 365
            MOVE 365 TO WS-DIAS
        END-IF
        COMPUTE WS-IOF-DIARIO =
            WS-IOF-DIARIO + (T-AMORT(WS-K) * 0.000082 * WS-DIAS)
    END-PERFORM
    COMPUTE WS-IOF-ADIC ROUNDED = WS-VALOR * 0.0038
    COMPUTE WS-IOF-TOTAL ROUNDED = WS-IOF-DIARIO + WS-IOF-ADIC
    COMPUTE WS-VALOR-LIQ = WS-VALOR - WS-IOF-TOTAL.

*> ------------------------------------------------------------
*> CET por BISSECAO: acha i tal que
*>   valorLiquido = SOMA( parcela_k / (1+i)^k )
*> O valor presente decresce com i, entao a busca e monotona.
*> ------------------------------------------------------------
CALCULAR-CET.
    MOVE 0 TO WS-LO
    MOVE 1 TO WS-HI
    PERFORM 60 TIMES
        COMPUTE WS-MID = (WS-LO + WS-HI) / 2
        MOVE 0 TO WS-PV
        PERFORM VARYING WS-K FROM 1 BY 1 UNTIL WS-K > WS-PRAZO
            COMPUTE WS-PV =
                WS-PV + (T-PARCELA(WS-K) / ((1 + WS-MID) ** WS-K))
        END-PERFORM
        IF WS-PV > WS-VALOR-LIQ
            MOVE WS-MID TO WS-LO
        ELSE
            MOVE WS-MID TO WS-HI
        END-IF
    END-PERFORM
    COMPUTE WS-CET-MES = (WS-LO + WS-HI) / 2
    COMPUTE WS-CET-ANO = ((1 + WS-CET-MES) ** 12) - 1.

*> ------------------------------------------------------------
ESCREVER-RESUMO.
    MOVE WS-TOTAL-JUROS TO WS-DIN-TJ
    MOVE WS-IOF-TOTAL   TO WS-DIN-IOF
    MOVE WS-TOTAL-PAGO  TO WS-DIN-TP
    MOVE WS-CET-MES     TO WS-CET-ME
    MOVE WS-CET-ANO     TO WS-CET-AE
    MOVE SPACES TO WS-SAIDA
    STRING 'RESUMO;'                DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-TJ) DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-IOF) DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-CET-ME) DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-CET-AE) DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-TP) DELIMITED BY SIZE
           INTO WS-SAIDA
    END-STRING
    DISPLAY FUNCTION TRIM(WS-SAIDA).

*> ------------------------------------------------------------
ESCREVER-PARCELAS.
    PERFORM VARYING WS-K FROM 1 BY 1 UNTIL WS-K > WS-PRAZO
        MOVE WS-K            TO WS-NUM-E
        MOVE T-PARCELA(WS-K) TO WS-DIN-P
        MOVE T-JUROS(WS-K)   TO WS-DIN-J
        MOVE T-AMORT(WS-K)   TO WS-DIN-A
        MOVE T-SALDO(WS-K)   TO WS-DIN-S
        MOVE SPACES TO WS-SAIDA
        STRING FUNCTION TRIM(WS-NUM-E) DELIMITED BY SIZE ';' DELIMITED BY SIZE
               FUNCTION TRIM(WS-DIN-P) DELIMITED BY SIZE ';' DELIMITED BY SIZE
               FUNCTION TRIM(WS-DIN-J) DELIMITED BY SIZE ';' DELIMITED BY SIZE
               FUNCTION TRIM(WS-DIN-A) DELIMITED BY SIZE ';' DELIMITED BY SIZE
               FUNCTION TRIM(WS-DIN-S) DELIMITED BY SIZE
               INTO WS-SAIDA
        END-STRING
        DISPLAY FUNCTION TRIM(WS-SAIDA)
    END-PERFORM.
