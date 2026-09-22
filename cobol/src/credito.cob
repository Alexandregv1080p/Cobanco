>>SOURCE FORMAT FREE
*> ============================================================
*> CREDITO.COB - Motor de analise de credito (score + decisao)
*>
*> Recebe um pedido de emprestimo e devolve um SCORE (0..1000),
*> a DECISAO (APROVADO|REVISAR|NEGADO), a faixa de risco, a taxa
*> sugerida por faixa e o limite sugerido (capacidade de credito).
*>
*> Score = base 500 +/- 4 fatores:
*>   - Comprometimento da renda (parcela estimada / renda)
*>   - Reserva financeira        (saldo medio / valor pedido)
*>   - Renda mensal absoluta
*>   - Prazo solicitado
*> Motor de regras classico: entrada -> pontuacao -> decisao.
*>
*> --- Contrato de I/O ---
*> Entrada (stdin, 1 linha): renda;valor;prazo;saldoMedio
*> Saida (stdout):
*>   1a linha: RESUMO;score;decisao;faixa;taxa;limite;comprom;parcela;capacidade
*>   demais:   FATOR;<nome>;<pontos>
*> Erro:       ERRO;<mensagem>
*> ============================================================
IDENTIFICATION DIVISION.
PROGRAM-ID. CREDITO.

DATA DIVISION.
WORKING-STORAGE SECTION.
01 WS-LINHA           PIC X(120).
01 WS-RENDA-TXT       PIC X(25).
01 WS-VALOR-TXT       PIC X(25).
01 WS-PRAZO-TXT       PIC X(25).
01 WS-SALDO-TXT       PIC X(25).

01 WS-RENDA           PIC 9(13)V99   COMP-3.
01 WS-VALOR           PIC 9(13)V99   COMP-3.
01 WS-PRAZO           PIC 9(4)       COMP-3.
01 WS-SALDO           PIC 9(13)V99   COMP-3.

01 WS-TAXA-BASE       PIC 9V9(6)     COMP-3 VALUE 0.0189.
01 WS-FATOR           PIC 9(10)V9(10) COMP-3.
01 WS-PARCELA         PIC 9(13)V99   COMP-3.
01 WS-COMPROM         PIC 9(3)V9(4)  COMP-3.
01 WS-RESERVA         PIC 9(3)V9(4)  COMP-3.

01 WS-SCORE           PIC S9(5)      COMP-3.
01 WS-PTS             PIC S9(4)      COMP-3.

01 WS-DECISAO         PIC X(10).
01 WS-FAIXA           PIC X(1).
01 WS-TAXA-SUG        PIC 9V9(4)     COMP-3.
01 WS-MAX-PARCELA     PIC 9(13)V99   COMP-3.
01 WS-CAPACIDADE      PIC 9(13)V99   COMP-3.
01 WS-LIMITE          PIC 9(13)V99   COMP-3.

*> Campos editados p/ saida
01 WS-SCORE-E         PIC -(4)9.
01 WS-PTS-E           PIC -(3)9.
01 WS-TAXA-E          PIC 9.9(4).
01 WS-COMPROM-E       PIC 9(3).9(4).
01 WS-DIN-LIM         PIC -(13)9.99.
01 WS-DIN-PAR         PIC -(13)9.99.
01 WS-DIN-CAP         PIC -(13)9.99.
01 WS-FATOR-NOME      PIC X(30).
01 WS-SAIDA           PIC X(200).

PROCEDURE DIVISION.
INICIO.
    ACCEPT WS-LINHA FROM CONSOLE
    PERFORM LER-ENTRADA
    PERFORM VALIDAR
    PERFORM ESTIMAR-PARCELA
    PERFORM PONTUAR
    PERFORM DECIDIR
    PERFORM CAPACIDADE
    PERFORM ESCREVER-RESUMO
    PERFORM ESCREVER-FATORES
    STOP RUN.

LER-ENTRADA.
    UNSTRING WS-LINHA DELIMITED BY ';'
        INTO WS-RENDA-TXT WS-VALOR-TXT WS-PRAZO-TXT WS-SALDO-TXT
    END-UNSTRING
    COMPUTE WS-RENDA = FUNCTION NUMVAL(WS-RENDA-TXT)
    COMPUTE WS-VALOR = FUNCTION NUMVAL(WS-VALOR-TXT)
    COMPUTE WS-PRAZO = FUNCTION NUMVAL(WS-PRAZO-TXT)
    COMPUTE WS-SALDO = FUNCTION NUMVAL(WS-SALDO-TXT).

VALIDAR.
    IF WS-RENDA <= 0
        DISPLAY 'ERRO;renda deve ser maior que zero'
        STOP RUN
    END-IF
    IF WS-VALOR <= 0
        DISPLAY 'ERRO;valor solicitado deve ser maior que zero'
        STOP RUN
    END-IF
    IF WS-PRAZO < 1
        DISPLAY 'ERRO;prazo deve ser de ao menos 1 mes'
        STOP RUN
    END-IF.

*> Parcela estimada pela Tabela Price a uma taxa de referencia,
*> so para medir o comprometimento da renda.
ESTIMAR-PARCELA.
    COMPUTE WS-FATOR ROUNDED = (1 + WS-TAXA-BASE) ** WS-PRAZO
    COMPUTE WS-PARCELA ROUNDED =
        WS-VALOR * WS-TAXA-BASE * WS-FATOR / (WS-FATOR - 1)
    COMPUTE WS-COMPROM ROUNDED = WS-PARCELA / WS-RENDA
    COMPUTE WS-RESERVA ROUNDED = WS-SALDO / WS-VALOR.

*> Base 500; cada fator soma/subtrai. Guarda os pontos p/ o detalhe.
PONTUAR.
    MOVE 500 TO WS-SCORE

    *> Fator 1 - comprometimento da renda
    EVALUATE TRUE
        WHEN WS-COMPROM <= 0.30   MOVE  200 TO WS-PTS
        WHEN WS-COMPROM <= 0.50   MOVE   40 TO WS-PTS
        WHEN OTHER                MOVE -220 TO WS-PTS
    END-EVALUATE
    ADD WS-PTS TO WS-SCORE

    *> Fator 2 - reserva financeira (saldo medio / valor)
    EVALUATE TRUE
        WHEN WS-RESERVA >= 0.50   MOVE  150 TO WS-PTS
        WHEN WS-RESERVA >= 0.20   MOVE   80 TO WS-PTS
        WHEN WS-RESERVA >= 0.05   MOVE   20 TO WS-PTS
        WHEN OTHER                MOVE  -30 TO WS-PTS
    END-EVALUATE
    ADD WS-PTS TO WS-SCORE

    *> Fator 3 - renda mensal
    EVALUATE TRUE
        WHEN WS-RENDA >= 10000    MOVE  100 TO WS-PTS
        WHEN WS-RENDA >= 5000     MOVE   60 TO WS-PTS
        WHEN WS-RENDA >= 2000     MOVE   10 TO WS-PTS
        WHEN OTHER                MOVE  -60 TO WS-PTS
    END-EVALUATE
    ADD WS-PTS TO WS-SCORE

    *> Fator 4 - prazo
    EVALUATE TRUE
        WHEN WS-PRAZO <= 12       MOVE   30 TO WS-PTS
        WHEN WS-PRAZO <= 36       MOVE    0 TO WS-PTS
        WHEN OTHER                MOVE  -40 TO WS-PTS
    END-EVALUATE
    ADD WS-PTS TO WS-SCORE

    *> Clamp 0..1000
    IF WS-SCORE < 0     MOVE 0    TO WS-SCORE END-IF
    IF WS-SCORE > 1000  MOVE 1000 TO WS-SCORE END-IF.

*> Decisao e taxa por faixa de risco.
DECIDIR.
    EVALUATE TRUE
        WHEN WS-SCORE >= 720
            MOVE 'APROVADO' TO WS-DECISAO
            MOVE 'A' TO WS-FAIXA
            MOVE 0.0149 TO WS-TAXA-SUG
        WHEN WS-SCORE >= 600
            MOVE 'APROVADO' TO WS-DECISAO
            MOVE 'B' TO WS-FAIXA
            MOVE 0.0199 TO WS-TAXA-SUG
        WHEN WS-SCORE >= 480
            MOVE 'REVISAR' TO WS-DECISAO
            MOVE 'C' TO WS-FAIXA
            MOVE 0.0289 TO WS-TAXA-SUG
        WHEN OTHER
            MOVE 'NEGADO' TO WS-DECISAO
            MOVE 'D' TO WS-FAIXA
            MOVE 0 TO WS-TAXA-SUG
    END-EVALUATE.

*> Capacidade de credito: quanto a renda comporta com no maximo 30%
*> comprometida, na taxa da faixa. limite = min(valor pedido, capacidade).
CAPACIDADE.
    IF WS-DECISAO = 'NEGADO'
        MOVE 0 TO WS-LIMITE
        MOVE 0 TO WS-CAPACIDADE
    ELSE
        COMPUTE WS-MAX-PARCELA ROUNDED = WS-RENDA * 0.30
        COMPUTE WS-FATOR ROUNDED = (1 + WS-TAXA-SUG) ** WS-PRAZO
        COMPUTE WS-CAPACIDADE ROUNDED =
            WS-MAX-PARCELA * (1 - (1 / WS-FATOR)) / WS-TAXA-SUG
        IF WS-VALOR <= WS-CAPACIDADE
            MOVE WS-VALOR TO WS-LIMITE
        ELSE
            MOVE WS-CAPACIDADE TO WS-LIMITE
        END-IF
    END-IF.

ESCREVER-RESUMO.
    MOVE WS-SCORE    TO WS-SCORE-E
    MOVE WS-TAXA-SUG TO WS-TAXA-E
    MOVE WS-COMPROM  TO WS-COMPROM-E
    MOVE WS-LIMITE   TO WS-DIN-LIM
    MOVE WS-PARCELA  TO WS-DIN-PAR
    MOVE WS-CAPACIDADE TO WS-DIN-CAP
    MOVE SPACES TO WS-SAIDA
    STRING 'RESUMO;'                    DELIMITED BY SIZE
           FUNCTION TRIM(WS-SCORE-E)    DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DECISAO)    DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-FAIXA)      DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-TAXA-E)     DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-LIM)    DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-COMPROM-E)  DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-PAR)    DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-CAP)    DELIMITED BY SIZE
           INTO WS-SAIDA
    END-STRING
    DISPLAY FUNCTION TRIM(WS-SAIDA).

*> Recalcula os pontos de cada fator so para o detalhamento na saida.
ESCREVER-FATORES.
    EVALUATE TRUE
        WHEN WS-COMPROM <= 0.30   MOVE  200 TO WS-PTS
        WHEN WS-COMPROM <= 0.50   MOVE   40 TO WS-PTS
        WHEN OTHER                MOVE -220 TO WS-PTS
    END-EVALUATE
    MOVE 'Comprometimento de renda' TO WS-FATOR-NOME
    PERFORM ESCREVER-UM-FATOR

    EVALUATE TRUE
        WHEN WS-RESERVA >= 0.50   MOVE  150 TO WS-PTS
        WHEN WS-RESERVA >= 0.20   MOVE   80 TO WS-PTS
        WHEN WS-RESERVA >= 0.05   MOVE   20 TO WS-PTS
        WHEN OTHER                MOVE  -30 TO WS-PTS
    END-EVALUATE
    MOVE 'Reserva financeira' TO WS-FATOR-NOME
    PERFORM ESCREVER-UM-FATOR

    EVALUATE TRUE
        WHEN WS-RENDA >= 10000    MOVE  100 TO WS-PTS
        WHEN WS-RENDA >= 5000     MOVE   60 TO WS-PTS
        WHEN WS-RENDA >= 2000     MOVE   10 TO WS-PTS
        WHEN OTHER                MOVE  -60 TO WS-PTS
    END-EVALUATE
    MOVE 'Renda mensal' TO WS-FATOR-NOME
    PERFORM ESCREVER-UM-FATOR

    EVALUATE TRUE
        WHEN WS-PRAZO <= 12       MOVE   30 TO WS-PTS
        WHEN WS-PRAZO <= 36       MOVE    0 TO WS-PTS
        WHEN OTHER                MOVE  -40 TO WS-PTS
    END-EVALUATE
    MOVE 'Prazo solicitado' TO WS-FATOR-NOME
    PERFORM ESCREVER-UM-FATOR.

ESCREVER-UM-FATOR.
    MOVE WS-PTS TO WS-PTS-E
    MOVE SPACES TO WS-SAIDA
    STRING 'FATOR;'                     DELIMITED BY SIZE
           FUNCTION TRIM(WS-FATOR-NOME) DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-PTS-E)      DELIMITED BY SIZE
           INTO WS-SAIDA
    END-STRING
    DISPLAY FUNCTION TRIM(WS-SAIDA).
