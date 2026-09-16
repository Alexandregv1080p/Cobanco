>>SOURCE FORMAT FREE
*> ============================================================
*> TRANSACOES.COB - Entrada por subprocesso (stdin/stdout)
*>
*> Wrapper fino: le a linha do stdin, delega a regra ao nucleo
*> chamavel TRANSACAOCORE (mesma logica usada pela via FFI) e
*> escreve o resultado no stdout. A regra de negocio vive uma
*> unica vez, em transacaocore.cob.
*>
*> Contrato de I/O (inalterado):
*>   Entrada: OPERACAO;valor;saldo_origem;saldo_destino;limite
*>   Saida:   OK;...  |  ERRO;<mensagem>
*> ============================================================
IDENTIFICATION DIVISION.
PROGRAM-ID. TRANSACOES.

DATA DIVISION.
WORKING-STORAGE SECTION.
01 WS-ENTRADA        PIC X(120).
01 WS-SAIDA          PIC X(120).

PROCEDURE DIVISION.

MAIN.
    MOVE SPACES TO WS-ENTRADA
    ACCEPT WS-ENTRADA
    CALL 'TRANSACAOCORE' USING WS-ENTRADA WS-SAIDA
    DISPLAY FUNCTION TRIM(WS-SAIDA)
    GOBACK.
