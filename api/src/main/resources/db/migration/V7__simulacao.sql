-- Histórico de simulações (empréstimo e investimento) por usuário.
CREATE TABLE simulacao (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id BIGINT        NOT NULL REFERENCES usuario(id),
    categoria  VARCHAR(20)   NOT NULL,   -- EMPRESTIMO | INVESTIMENTO
    subtipo    VARCHAR(20)   NOT NULL,   -- PRICE/SAC/AMERICANO | CDB/POUPANCA
    valor      NUMERIC(15,2) NOT NULL,
    prazo      INT           NOT NULL,   -- meses
    taxa       NUMERIC(12,8) NOT NULL,
    resultado  NUMERIC(15,2) NOT NULL,   -- total pago | valor final líquido
    resultado2 NUMERIC(12,8),            -- CET mensal | alíquota IR
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_simulacao_usuario ON simulacao (usuario_id, created_at DESC);
