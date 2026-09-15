>>SOURCE FORMAT FREE
*> ============================================================
*> AMORTIZACAO.COB - Motor de calculo de emprestimo
*> Sistemas: PRICE (parcela fixa) e SAC (amortizacao fixa)
*>
*> Esta e a LOGICA DE NEGOCIO CRITICA. Fica em COBOL de proposito:
*> o dinheiro e tratado em PACKED-DECIMAL (COMP-3), aritmetica
*> decimal exata -- nunca float/double.
*>
*> --- Contrato de I/O (a fronteira com a API vive aqui) ---
*> Entrada (stdin, 1 linha):   valor;taxa_mensal;prazo;SISTEMA
*>   exemplo:                  100000.00;0.015;12;PRICE
*>     taxa_mensal = fracao decimal (0.015 = 1,5% ao mes)
*>     SISTEMA     = PRICE | SAC
*>
*> Saida (stdout, 1 linha por parcela):
*>   numero;parcela;juros;amortizacao;saldo_devedor
*>
*> Erro de validacao (stdout, 1 linha):
*>   ERRO;<mensagem>
*> ============================================================
IDENTIFICATION DIVISION.
PROGRAM-ID. AMORTIZACAO.

DATA DIVISION.
WORKING-STORAGE SECTION.

*> --- Entrada crua e os 4 campos ainda como texto ---
01 WS-LINHA            PIC X(100).
01 WS-VALOR-TXT        PIC X(25).
01 WS-TAXA-TXT         PIC X(25).
01 WS-PRAZO-TXT        PIC X(25).
01 WS-SISTEMA-TXT      PIC X(25).

*> --- Parametros ja convertidos para numerico ---
01 WS-VALOR            PIC 9(13)V99    COMP-3.
01 WS-TAXA             PIC 9V9(8)      COMP-3.
01 WS-PRAZO            PIC 9(4)        COMP-3.
01 WS-SISTEMA          PIC X(5).

*> --- Campos de calculo (dinheiro: 2 casas, decimal exato) ---
01 WS-SALDO            PIC 9(13)V99    COMP-3.
01 WS-PARCELA          PIC 9(13)V99    COMP-3.
01 WS-JUROS            PIC 9(13)V99    COMP-3.
01 WS-AMORT            PIC 9(13)V99    COMP-3.
01 WS-PMT              PIC 9(13)V99    COMP-3.
01 WS-AMORT-BASE       PIC 9(13)V99    COMP-3.
*> Fator (1+i)^n: precisa de muitas casas, nao e dinheiro exibido
01 WS-FATOR            PIC 9(10)V9(10) COMP-3.

01 WS-K                PIC 9(4)        COMP-3.

*> --- Edicao para a saida ---
*> Z suprime zero a esquerda (vira espaco); TRIM remove os espacos.
01 WS-NUM-E            PIC Z(3)9.
01 WS-DIN-P            PIC Z(13)9.99.
01 WS-DIN-J            PIC Z(13)9.99.
01 WS-DIN-A            PIC Z(13)9.99.
01 WS-DIN-S            PIC Z(13)9.99.
01 WS-SAIDA            PIC X(120).

PROCEDURE DIVISION.

MAIN.
    PERFORM LER-E-VALIDAR
    PERFORM CALCULAR-PMT
    PERFORM GERAR-CRONOGRAMA
    GOBACK.

*> ------------------------------------------------------------
*> Le a linha de stdin, quebra pelos ';' e valida as regras.
*> ------------------------------------------------------------
LER-E-VALIDAR.
    ACCEPT WS-LINHA

    UNSTRING WS-LINHA DELIMITED BY ';'
        INTO WS-VALOR-TXT WS-TAXA-TXT WS-PRAZO-TXT WS-SISTEMA-TXT
    END-UNSTRING

    *> NUMVAL converte o texto "100000.00" respeitando o ponto decimal
    COMPUTE WS-VALOR = FUNCTION NUMVAL(WS-VALOR-TXT)
    COMPUTE WS-TAXA  = FUNCTION NUMVAL(WS-TAXA-TXT)
    COMPUTE WS-PRAZO = FUNCTION NUMVAL(WS-PRAZO-TXT)
    MOVE FUNCTION UPPER-CASE(FUNCTION TRIM(WS-SISTEMA-TXT))
        TO WS-SISTEMA

    IF WS-VALOR <= 0
        DISPLAY 'ERRO;valor deve ser maior que zero'
        GOBACK
    END-IF
    IF WS-PRAZO < 1
        DISPLAY 'ERRO;prazo deve ser ao menos 1 mes'
        GOBACK
    END-IF
    IF WS-SISTEMA NOT = 'PRICE' AND WS-SISTEMA NOT = 'SAC'
        DISPLAY 'ERRO;sistema deve ser PRICE ou SAC'
        GOBACK
    END-IF.

*> ------------------------------------------------------------
*> PRICE: parcela fixa. Precisa calcular o PMT uma vez.
*>   PMT = VP * i * (1+i)^n / ((1+i)^n - 1)
*>   Com i = 0 a formula degenera -> PMT = VP / n.
*> SAC: amortizacao fixa = VP / n (o PMT nao se aplica).
*> ------------------------------------------------------------
CALCULAR-PMT.
    IF WS-SISTEMA = 'PRICE'
        IF WS-TAXA = 0
            COMPUTE WS-PMT ROUNDED = WS-VALOR / WS-PRAZO
        ELSE
            COMPUTE WS-FATOR ROUNDED = (1 + WS-TAXA) ** WS-PRAZO
            COMPUTE WS-PMT ROUNDED =
                WS-VALOR * WS-TAXA * WS-FATOR / (WS-FATOR - 1)
        END-IF
    ELSE
        COMPUTE WS-AMORT-BASE ROUNDED = WS-VALOR / WS-PRAZO
    END-IF.

*> ------------------------------------------------------------
*> Gera o cronograma mes a mes.
*> Regra de fechamento (pratica bancaria real): na ULTIMA parcela
*> a amortizacao = saldo devedor restante, zerando o saldo em
*> 0.00 exato e absorvendo qualquer residuo de arredondamento.
*> ------------------------------------------------------------
GERAR-CRONOGRAMA.
    MOVE WS-VALOR TO WS-SALDO

    PERFORM VARYING WS-K FROM 1 BY 1 UNTIL WS-K > WS-PRAZO
        COMPUTE WS-JUROS ROUNDED = WS-SALDO * WS-TAXA

        IF WS-SISTEMA = 'PRICE'
            IF WS-K = WS-PRAZO
                MOVE WS-SALDO TO WS-AMORT
                COMPUTE WS-PARCELA = WS-JUROS + WS-AMORT
            ELSE
                MOVE WS-PMT TO WS-PARCELA
                COMPUTE WS-AMORT = WS-PARCELA - WS-JUROS
            END-IF
        ELSE
            IF WS-K = WS-PRAZO
                MOVE WS-SALDO TO WS-AMORT
            ELSE
                MOVE WS-AMORT-BASE TO WS-AMORT
            END-IF
            COMPUTE WS-PARCELA = WS-AMORT + WS-JUROS
        END-IF

        COMPUTE WS-SALDO = WS-SALDO - WS-AMORT
        PERFORM ESCREVER-LINHA
    END-PERFORM.

*> ------------------------------------------------------------
*> Monta a linha delimitada e escreve no stdout.
*> ------------------------------------------------------------
ESCREVER-LINHA.
    MOVE WS-K       TO WS-NUM-E
    MOVE WS-PARCELA TO WS-DIN-P
    MOVE WS-JUROS   TO WS-DIN-J
    MOVE WS-AMORT   TO WS-DIN-A
    MOVE WS-SALDO   TO WS-DIN-S

    MOVE SPACES TO WS-SAIDA
    STRING
        FUNCTION TRIM(WS-NUM-E) DELIMITED BY SIZE
        ';'                     DELIMITED BY SIZE
        FUNCTION TRIM(WS-DIN-P) DELIMITED BY SIZE
        ';'                     DELIMITED BY SIZE
        FUNCTION TRIM(WS-DIN-J) DELIMITED BY SIZE
        ';'                     DELIMITED BY SIZE
        FUNCTION TRIM(WS-DIN-A) DELIMITED BY SIZE
        ';'                     DELIMITED BY SIZE
        FUNCTION TRIM(WS-DIN-S) DELIMITED BY SIZE
        INTO WS-SAIDA
    END-STRING

    DISPLAY FUNCTION TRIM(WS-SAIDA).
