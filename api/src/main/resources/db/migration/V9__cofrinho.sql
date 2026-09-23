-- Cofrinhos (caixinhas): poupança interna por conta, com meta opcional.
CREATE TABLE cofrinho (
    id         BIGSERIAL PRIMARY KEY,
    conta_id   BIGINT       NOT NULL REFERENCES conta(id),
    nome       VARCHAR(60)  NOT NULL,
    meta       NUMERIC(15,2) NOT NULL DEFAULT 0,
    saldo      NUMERIC(15,2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_cofrinho_meta  CHECK (meta  >= 0),
    CONSTRAINT chk_cofrinho_saldo CHECK (saldo >= 0)
);

CREATE INDEX idx_cofrinho_conta ON cofrinho(conta_id);
