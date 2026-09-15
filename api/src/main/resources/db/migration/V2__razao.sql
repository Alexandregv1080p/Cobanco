-- Razao contabil de partidas dobradas (double-entry ledger).
-- Cada evento financeiro gera um LOTE de lancamentos balanceados
-- (soma dos debitos = soma dos creditos). Contas de cliente sao
-- passivo do banco; a conta interna CAIXA fecha a contrapartida.

CREATE SEQUENCE lancamento_lote_seq;

CREATE TABLE lancamento (
    id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    lote          BIGINT       NOT NULL,                 -- agrupa o par balanceado
    conta_id      BIGINT       REFERENCES conta(id),     -- conta de cliente...
    conta_interna VARCHAR(20),                           -- ...ou conta interna (CAIXA, RECEITA_JUROS)
    natureza      VARCHAR(1)   NOT NULL,                 -- 'D' debito | 'C' credito
    valor         NUMERIC(15,2) NOT NULL,
    historico     VARCHAR(120) NOT NULL,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_natureza CHECK (natureza IN ('D', 'C')),
    CONSTRAINT chk_valor_pos_lanc CHECK (valor > 0),
    -- exatamente uma das duas: conta de cliente OU conta interna
    CONSTRAINT chk_uma_conta CHECK ((conta_id IS NOT NULL) <> (conta_interna IS NOT NULL))
);

CREATE INDEX idx_lancamento_conta ON lancamento (conta_id, created_at DESC);
CREATE INDEX idx_lancamento_lote  ON lancamento (lote);
