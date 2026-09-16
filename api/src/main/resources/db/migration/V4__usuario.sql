-- Usuários da aplicação (autenticação). Senha sempre com hash (BCrypt),
-- nunca em texto puro. Cada usuário CLIENTE está ligado a um cliente.
CREATE TABLE usuario (
    id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nome       VARCHAR(120) NOT NULL,
    email      VARCHAR(180) NOT NULL UNIQUE,
    senha_hash VARCHAR(100) NOT NULL,
    papel      VARCHAR(20)  NOT NULL DEFAULT 'CLIENTE',   -- ADMIN | CLIENTE
    cliente_id BIGINT       REFERENCES cliente(id),
    created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT chk_papel CHECK (papel IN ('ADMIN', 'CLIENTE'))
);
