>>SOURCE FORMAT FREE
*> ============================================================
*> FECHAMENTO.COB - Batch de fechamento diario (rotina noturna)
*>
*> Le VARIAS contas (uma por linha, ate EOF) e para cada uma:
*>   1. Cobranca de juros de cheque especial: se o saldo < 0,
*>      juros = |saldo| * taxa; novo saldo = saldo - juros.
*>   2. Reconciliacao: confere o saldo contra o saldo do razao.
*> Acumula totais e emite um TRAILER no fim -- padrao classico de
*> processamento batch (arquivo sequencial + control totals).
*>
*> --- Contrato de I/O ---
*> Entrada (stdin, N linhas):  conta_id;saldo;taxa_mensal;saldo_razao
*> Saida (stdout):
*>   por conta:  conta_id;juros;novo_saldo;RECON_OK|RECON_DIVERGENTE
*>   trailer:    TOTAL;qtd_contas;total_juros;qtd_divergencias
*> ============================================================
IDENTIFICATION DIVISION.
PROGRAM-ID. FECHAMENTO.

ENVIRONMENT DIVISION.
INPUT-OUTPUT SECTION.
FILE-CONTROL.
    SELECT ARQ-ENTRADA ASSIGN TO "/dev/stdin"
        ORGANIZATION IS LINE SEQUENTIAL
        FILE STATUS IS WS-STATUS.

DATA DIVISION.
FILE SECTION.
FD ARQ-ENTRADA.
01 REG-ENTRADA        PIC X(120).

WORKING-STORAGE SECTION.
01 WS-STATUS          PIC XX.
01 WS-FIM             PIC X VALUE 'N'.
   88 FIM-ARQUIVO     VALUE 'S'.

*> Campos da linha corrente
01 WS-ID-TXT          PIC X(20).
01 WS-SALDO-TXT       PIC X(25).
01 WS-TAXA-TXT        PIC X(25).
01 WS-RAZAO-TXT       PIC X(25).

01 WS-ID              PIC 9(12)      COMP-3.
01 WS-SALDO           PIC S9(13)V99  COMP-3.
01 WS-TAXA            PIC 9V9(8)      COMP-3.
01 WS-SALDO-RAZAO     PIC S9(13)V99  COMP-3.

01 WS-JUROS           PIC 9(13)V99   COMP-3.
01 WS-NOVO-SALDO      PIC S9(13)V99  COMP-3.
01 WS-RECON           PIC X(16).

*> Acumuladores (control totals)
01 WS-QTD             PIC 9(9)       COMP-3 VALUE 0.
01 WS-TOTAL-JUROS     PIC 9(15)V99   COMP-3 VALUE 0.
01 WS-QTD-DIVERG      PIC 9(9)       COMP-3 VALUE 0.

*> Edicao
01 WS-JUROS-E         PIC Z(13)9.99.
01 WS-SALDO-E         PIC -(13)9.99.
01 WS-TJ-E            PIC Z(15)9.99.
01 WS-QTD-E           PIC Z(9)9.
01 WS-QD-E            PIC Z(9)9.
01 WS-SAIDA           PIC X(160).

PROCEDURE DIVISION.

MAIN.
    OPEN INPUT ARQ-ENTRADA
    PERFORM UNTIL FIM-ARQUIVO
        READ ARQ-ENTRADA
            AT END SET FIM-ARQUIVO TO TRUE
            NOT AT END PERFORM PROCESSAR-CONTA
        END-READ
    END-PERFORM
    CLOSE ARQ-ENTRADA
    PERFORM ESCREVER-TRAILER
    GOBACK.

PROCESSAR-CONTA.
    IF FUNCTION TRIM(REG-ENTRADA) = SPACES
        EXIT PARAGRAPH
    END-IF

    UNSTRING REG-ENTRADA DELIMITED BY ';'
        INTO WS-ID-TXT WS-SALDO-TXT WS-TAXA-TXT WS-RAZAO-TXT
    END-UNSTRING
    COMPUTE WS-ID          = FUNCTION NUMVAL(WS-ID-TXT)
    COMPUTE WS-SALDO       = FUNCTION NUMVAL(WS-SALDO-TXT)
    COMPUTE WS-TAXA        = FUNCTION NUMVAL(WS-TAXA-TXT)
    COMPUTE WS-SALDO-RAZAO = FUNCTION NUMVAL(WS-RAZAO-TXT)

    *> 1. Juros de cheque especial (so em saldo negativo)
    IF WS-SALDO < 0
        COMPUTE WS-JUROS ROUNDED = (WS-SALDO * -1) * WS-TAXA
    ELSE
        MOVE 0 TO WS-JUROS
    END-IF
    COMPUTE WS-NOVO-SALDO = WS-SALDO - WS-JUROS

    *> 2. Reconciliacao saldo x razao
    IF WS-SALDO = WS-SALDO-RAZAO
        MOVE 'RECON_OK' TO WS-RECON
    ELSE
        MOVE 'RECON_DIVERGENTE' TO WS-RECON
        ADD 1 TO WS-QTD-DIVERG
    END-IF

    ADD 1 TO WS-QTD
    ADD WS-JUROS TO WS-TOTAL-JUROS

    MOVE WS-JUROS      TO WS-JUROS-E
    MOVE WS-NOVO-SALDO TO WS-SALDO-E
    MOVE SPACES TO WS-SAIDA
    STRING FUNCTION TRIM(WS-ID-TXT)   DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-JUROS-E)  DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-SALDO-E)  DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-RECON)    DELIMITED BY SIZE
           INTO WS-SAIDA
    END-STRING
    DISPLAY FUNCTION TRIM(WS-SAIDA).

ESCREVER-TRAILER.
    MOVE WS-TOTAL-JUROS TO WS-TJ-E
    MOVE WS-QTD         TO WS-QTD-E
    MOVE WS-QTD-DIVERG  TO WS-QD-E
    MOVE SPACES TO WS-SAIDA
    STRING 'TOTAL;'                 DELIMITED BY SIZE
           FUNCTION TRIM(WS-QTD-E)  DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-TJ-E)   DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-QD-E)   DELIMITED BY SIZE
           INTO WS-SAIDA
    END-STRING
    DISPLAY FUNCTION TRIM(WS-SAIDA).
