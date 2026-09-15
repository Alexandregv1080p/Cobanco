>>SOURCE FORMAT FREE
*> ============================================================
*> INVESTIMENTO.COB - Simulador de aplicacao (CDB / Poupanca)
*>
*> Juros compostos mes a mes (creditados arredondados, como banco),
*> depois Imposto de Renda REGRESSIVO sobre o rendimento (so CDB;
*> poupanca e isenta):
*>   ate 180 dias .... 22,5%
*>   181 a 360 dias .. 20,0%
*>   361 a 720 dias .. 17,5%
*>   acima de 720 .... 15,0%
*> (dias = meses * 30)
*>
*> --- Contrato de I/O ---
*> Entrada (stdin, 1 linha):  TIPO;valor;taxa_mensal;meses
*>   TIPO = CDB | POUPANCA ; taxa_mensal = fracao (0.01 = 1% a.m.)
*> Saida (stdout):
*>   1a linha: RESUMO;valorFinalBruto;rendimentoBruto;aliquotaIR;
*>             ir;rendimentoLiquido;valorFinalLiquido
*>   demais:   mes;saldoBruto;rendimentoAcumulado
*> Erro:       ERRO;<mensagem>
*> ============================================================
IDENTIFICATION DIVISION.
PROGRAM-ID. INVESTIMENTO.

DATA DIVISION.
WORKING-STORAGE SECTION.

01 WS-LINHA          PIC X(100).
01 WS-TIPO-TXT       PIC X(25).
01 WS-VALOR-TXT      PIC X(25).
01 WS-TAXA-TXT       PIC X(25).
01 WS-MESES-TXT      PIC X(25).

01 WS-TIPO           PIC X(8).
01 WS-VALOR          PIC 9(13)V99   COMP-3.
01 WS-TAXA           PIC 9V9(8)     COMP-3.
01 WS-MESES          PIC 9(4)       COMP-3.

01 WS-SALDO          PIC 9(15)V99   COMP-3.
01 WS-DIAS           PIC 9(6)       COMP-3.
01 WS-ALIQ           PIC 9V9(6)     COMP-3.
01 WS-VF-BRUTO       PIC 9(15)V99   COMP-3.
01 WS-REND-BRUTO     PIC 9(15)V99   COMP-3.
01 WS-IR             PIC 9(15)V99   COMP-3.
01 WS-REND-LIQ       PIC 9(15)V99   COMP-3.
01 WS-VF-LIQ         PIC 9(15)V99   COMP-3.
01 WS-K              PIC 9(4)       COMP-3.

01 WS-TAB.
   05 WS-PONTO OCCURS 360 TIMES.
      10 T-SALDO      PIC 9(15)V99 COMP-3.
      10 T-REND       PIC 9(15)V99 COMP-3.

*> --- Edicao ---
01 WS-MES-E          PIC Z(3)9.
01 WS-DIN-1          PIC Z(15)9.99.
01 WS-DIN-2          PIC Z(15)9.99.
01 WS-ALIQ-E         PIC 9.9(6).
01 WS-DIN-VFB        PIC Z(15)9.99.
01 WS-DIN-RB         PIC Z(15)9.99.
01 WS-DIN-IR         PIC Z(15)9.99.
01 WS-DIN-RL         PIC Z(15)9.99.
01 WS-DIN-VFL        PIC Z(15)9.99.
01 WS-SAIDA          PIC X(160).

PROCEDURE DIVISION.

MAIN.
    PERFORM LER-E-VALIDAR
    PERFORM ALIQUOTA-IR
    PERFORM CAPITALIZAR
    PERFORM APLICAR-IR
    PERFORM ESCREVER-RESUMO
    PERFORM ESCREVER-EVOLUCAO
    GOBACK.

LER-E-VALIDAR.
    ACCEPT WS-LINHA
    UNSTRING WS-LINHA DELIMITED BY ';'
        INTO WS-TIPO-TXT WS-VALOR-TXT WS-TAXA-TXT WS-MESES-TXT
    END-UNSTRING

    MOVE FUNCTION UPPER-CASE(FUNCTION TRIM(WS-TIPO-TXT)) TO WS-TIPO
    COMPUTE WS-VALOR = FUNCTION NUMVAL(WS-VALOR-TXT)
    COMPUTE WS-TAXA  = FUNCTION NUMVAL(WS-TAXA-TXT)
    COMPUTE WS-MESES = FUNCTION NUMVAL(WS-MESES-TXT)

    IF WS-VALOR <= 0
        DISPLAY 'ERRO;valor deve ser maior que zero'
        GOBACK
    END-IF
    IF WS-MESES < 1 OR WS-MESES > 360
        DISPLAY 'ERRO;prazo deve estar entre 1 e 360 meses'
        GOBACK
    END-IF
    IF WS-TIPO NOT = 'CDB' AND WS-TIPO NOT = 'POUPANCA'
        DISPLAY 'ERRO;tipo deve ser CDB ou POUPANCA'
        GOBACK
    END-IF.

*> Poupanca e isenta; CDB usa a tabela regressiva por dias.
ALIQUOTA-IR.
    IF WS-TIPO = 'POUPANCA'
        MOVE 0 TO WS-ALIQ
    ELSE
        COMPUTE WS-DIAS = WS-MESES * 30
        EVALUATE TRUE
            WHEN WS-DIAS <= 180  MOVE 0.225 TO WS-ALIQ
            WHEN WS-DIAS <= 360  MOVE 0.200 TO WS-ALIQ
            WHEN WS-DIAS <= 720  MOVE 0.175 TO WS-ALIQ
            WHEN OTHER           MOVE 0.150 TO WS-ALIQ
        END-EVALUATE
    END-IF.

*> Juros compostos, credito mensal arredondado a 2 casas.
CAPITALIZAR.
    MOVE WS-VALOR TO WS-SALDO
    PERFORM VARYING WS-K FROM 1 BY 1 UNTIL WS-K > WS-MESES
        COMPUTE WS-SALDO ROUNDED = WS-SALDO * (1 + WS-TAXA)
        MOVE WS-SALDO TO T-SALDO(WS-K)
        COMPUTE T-REND(WS-K) = WS-SALDO - WS-VALOR
    END-PERFORM
    MOVE WS-SALDO TO WS-VF-BRUTO
    COMPUTE WS-REND-BRUTO = WS-VF-BRUTO - WS-VALOR.

APLICAR-IR.
    COMPUTE WS-IR ROUNDED = WS-REND-BRUTO * WS-ALIQ
    COMPUTE WS-REND-LIQ = WS-REND-BRUTO - WS-IR
    COMPUTE WS-VF-LIQ = WS-VALOR + WS-REND-LIQ.

ESCREVER-RESUMO.
    MOVE WS-VF-BRUTO   TO WS-DIN-VFB
    MOVE WS-REND-BRUTO TO WS-DIN-RB
    MOVE WS-ALIQ       TO WS-ALIQ-E
    MOVE WS-IR         TO WS-DIN-IR
    MOVE WS-REND-LIQ   TO WS-DIN-RL
    MOVE WS-VF-LIQ     TO WS-DIN-VFL
    MOVE SPACES TO WS-SAIDA
    STRING 'RESUMO;'                 DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-VFB) DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-RB)  DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-ALIQ-E)  DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-IR)  DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-RL)  DELIMITED BY SIZE ';' DELIMITED BY SIZE
           FUNCTION TRIM(WS-DIN-VFL) DELIMITED BY SIZE
           INTO WS-SAIDA
    END-STRING
    DISPLAY FUNCTION TRIM(WS-SAIDA).

ESCREVER-EVOLUCAO.
    PERFORM VARYING WS-K FROM 1 BY 1 UNTIL WS-K > WS-MESES
        MOVE WS-K          TO WS-MES-E
        MOVE T-SALDO(WS-K) TO WS-DIN-1
        MOVE T-REND(WS-K)  TO WS-DIN-2
        MOVE SPACES TO WS-SAIDA
        STRING FUNCTION TRIM(WS-MES-E) DELIMITED BY SIZE ';' DELIMITED BY SIZE
               FUNCTION TRIM(WS-DIN-1) DELIMITED BY SIZE ';' DELIMITED BY SIZE
               FUNCTION TRIM(WS-DIN-2) DELIMITED BY SIZE
               INTO WS-SAIDA
        END-STRING
        DISPLAY FUNCTION TRIM(WS-SAIDA)
    END-PERFORM.
