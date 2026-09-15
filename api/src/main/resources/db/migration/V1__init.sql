-- Schema inicial do core bancario.
-- Dinheiro sempre NUMERIC(15,2). Constraints no DB como rede de seguranca:
-- a regra vale mesmo que a camada de aplicacao deixe passar.

CREATE TABLE cliente (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       VARCHAR(120) NOT NULL,
    cpf        VARCHAR(14)  NOT NULL UNIQUE,
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE conta (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cliente_id BIGINT        NOT NULL REFERENCES cliente(id),
    numero     VARCHAR(20)   NOT NULL UNIQUE,
    saldo      NUMERIC(15,2) NOT NULL DEFAULT 0,     -- pode ser negativo (cheque especial)
    limite     NUMERIC(15,2) NOT NULL DEFAULT 0,     -- limite do cheque especial
    created_at TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_limite_nonneg CHECK (limite >= 0)
);

-- Historico de movimentacoes (extrato). Alimentada a partir da Fase 4.
CREATE TABLE transacao (
    id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    conta_id         BIGINT        NOT NULL REFERENCES conta(id),
    conta_destino_id BIGINT        REFERENCES conta(id),   -- so em TRANSFERENCIA
    tipo             VARCHAR(20)   NOT NULL,               -- DEPOSITO | SAQUE | TRANSFERENCIA
    valor            NUMERIC(15,2) NOT NULL,
    saldo_apos       NUMERIC(15,2) NOT NULL,               -- saldo da conta_id apos a operacao
    created_at       TIMESTAMPTZ   NOT NULL DEFAULT now(),
    CONSTRAINT chk_valor_pos CHECK (valor > 0)
);

CREATE INDEX idx_transacao_conta ON transacao (conta_id, created_at DESC);
