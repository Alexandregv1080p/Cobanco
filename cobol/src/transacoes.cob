>>SOURCE FORMAT FREE
*> ============================================================
*> TRANSACOES.COB - Motor de transacoes bancarias
*> Operacoes: DEPOSITO, SAQUE, TRANSFERENCIA
*>
*> Regra de negocio CRITICA, em COBOL de proposito: validacao e
*> calculo de saldo em PACKED-DECIMAL (COMP-3), decimal exato.
*>
*> O programa e STATELESS: nao acessa banco. A API passa os saldos
*> atuais + a operacao; aqui validamos e devolvemos os novos saldos;
*> a API persiste.
*>
*> --- Contrato de I/O ---
*> Entrada (stdin, 1 linha):
*>   OPERACAO;valor;saldo_origem;saldo_destino;limite
*>     OPERACAO = DEPOSITO | SAQUE | TRANSFERENCIA
*>     limite   = cheque especial (quanto o saldo pode ficar negativo)
*>   exemplos:
*>     DEPOSITO;50.00;100.00;0;0
*>     SAQUE;150.00;100.00;0;100.00
*>     TRANSFERENCIA;80.00;200.00;50.00;0
*>
*> Saida (stdout):
*>   DEPOSITO / SAQUE:  OK;novo_saldo
*>   TRANSFERENCIA:     OK;novo_saldo_origem;novo_saldo_destino
*>   Erro:              ERRO;<mensagem>
*>
*> Regra de saldo (SAQUE/TRANSFERENCIA):
*>   novo_saldo_origem >= (-1 * limite)  -> senao saldo insuficiente.
*> ============================================================
IDENTIFICATION DIVISION.
PROGRAM-ID. TRANSACOES.

DATA DIVISION.
WORKING-STORAGE SECTION.

*> --- Entrada crua e campos como texto ---
01 WS-LINHA          PIC X(120).
01 WS-OP-TXT         PIC X(20).
01 WS-VALOR-TXT      PIC X(25).
01 WS-ORIG-TXT       PIC X(25).
01 WS-DEST-TXT       PIC X(25).
01 WS-LIM-TXT        PIC X(25).

*> --- Parametros convertidos (saldos COM SINAL: cheque especial) ---
01 WS-OP             PIC X(15).
01 WS-VALOR          PIC S9(13)V99 COMP-3.
01 WS-SALDO-ORIG     PIC S9(13)V99 COMP-3.
01 WS-SALDO-DEST     PIC S9(13)V99 COMP-3.
01 WS-LIMITE         PIC S9(13)V99 COMP-3.

*> --- Resultados ---
01 WS-NOVO-ORIG      PIC S9(13)V99 COMP-3.
01 WS-NOVO-DEST      PIC S9(13)V99 COMP-3.
01 WS-MIN            PIC S9(13)V99 COMP-3.

*> --- Edicao de saida (sinal flutuante; TRIM remove espacos) ---
01 WS-DIN-A          PIC -(13)9.99.
01 WS-DIN-B          PIC -(13)9.99.
01 WS-SAIDA          PIC X(120).

PROCEDURE DIVISION.

MAIN.
    PERFORM LER-E-VALIDAR
    EVALUATE WS-OP
        WHEN 'DEPOSITO'       PERFORM OP-DEPOSITO
        WHEN 'SAQUE'          PERFORM OP-SAQUE
        WHEN 'TRANSFERENCIA'  PERFORM OP-TRANSFERENCIA
        WHEN OTHER
            DISPLAY 'ERRO;operacao invalida '
                '(use DEPOSITO, SAQUE ou TRANSFERENCIA)'
    END-EVALUATE
    GOBACK.

*> ------------------------------------------------------------
*> Le stdin, quebra pelos ';' e valida o que vale pra todas as
*> operacoes (valor > 0). Campos omitidos viram 0 via NUMVAL.
*> ------------------------------------------------------------
LER-E-VALIDAR.
    ACCEPT WS-LINHA

    UNSTRING WS-LINHA DELIMITED BY ';'
        INTO WS-OP-TXT WS-VALOR-TXT WS-ORIG-TXT WS-DEST-TXT WS-LIM-TXT
    END-UNSTRING

    MOVE FUNCTION UPPER-CASE(FUNCTION TRIM(WS-OP-TXT)) TO WS-OP
    COMPUTE WS-VALOR      = FUNCTION NUMVAL(WS-VALOR-TXT)
    COMPUTE WS-SALDO-ORIG = FUNCTION NUMVAL(WS-ORIG-TXT)
    COMPUTE WS-SALDO-DEST = FUNCTION NUMVAL(WS-DEST-TXT)
    COMPUTE WS-LIMITE     = FUNCTION NUMVAL(WS-LIM-TXT)

    IF WS-VALOR <= 0
        DISPLAY 'ERRO;valor deve ser maior que zero'
        GOBACK
    END-IF.

*> ------------------------------------------------------------
*> DEPOSITO: soma ao saldo da conta. Sem limite.
*> ------------------------------------------------------------
OP-DEPOSITO.
    COMPUTE WS-NOVO-ORIG = WS-SALDO-ORIG + WS-VALOR
    PERFORM ESCREVER-UM-SALDO.

*> ------------------------------------------------------------
*> SAQUE: subtrai; respeita o limite de cheque especial.
*> ------------------------------------------------------------
OP-SAQUE.
    COMPUTE WS-NOVO-ORIG = WS-SALDO-ORIG - WS-VALOR
    COMPUTE WS-MIN = WS-LIMITE * -1
    IF WS-NOVO-ORIG < WS-MIN
        DISPLAY 'ERRO;saldo insuficiente'
        GOBACK
    END-IF
    PERFORM ESCREVER-UM-SALDO.

*> ------------------------------------------------------------
*> TRANSFERENCIA: debita a origem (com limite) e credita o destino.
*> ------------------------------------------------------------
OP-TRANSFERENCIA.
    COMPUTE WS-NOVO-ORIG = WS-SALDO-ORIG - WS-VALOR
    COMPUTE WS-MIN = WS-LIMITE * -1
    IF WS-NOVO-ORIG < WS-MIN
        DISPLAY 'ERRO;saldo insuficiente na origem'
        GOBACK
    END-IF
    COMPUTE WS-NOVO-DEST = WS-SALDO-DEST + WS-VALOR

    MOVE WS-NOVO-ORIG TO WS-DIN-A
    MOVE WS-NOVO-DEST TO WS-DIN-B
    MOVE SPACES TO WS-SAIDA
    STRING 'OK;'                  DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-A) DELIMITED BY SIZE
           ';'                     DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-B) DELIMITED BY SIZE
           INTO WS-SAIDA
    END-STRING
    DISPLAY FUNCTION TRIM(WS-SAIDA).

*> ------------------------------------------------------------
*> Saida de operacao de conta unica (DEPOSITO/SAQUE).
*> ------------------------------------------------------------
ESCREVER-UM-SALDO.
    MOVE WS-NOVO-ORIG TO WS-DIN-A
    MOVE SPACES TO WS-SAIDA
    STRING 'OK;'                  DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-A) DELIMITED BY SIZE
           INTO WS-SAIDA
    END-STRING
    DISPLAY FUNCTION TRIM(WS-SAIDA).
