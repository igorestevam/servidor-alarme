-- =====================================================================
-- Sistema de Seguranca - Banco de dados (Supabase / PostgreSQL)
-- Rodar este arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

-- ---------- Tabelas ----------

CREATE TABLE sensores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    codigo TEXT UNIQUE NOT NULL,
    nome TEXT NOT NULL,
    local TEXT NOT NULL,
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE eventos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    sensor_codigo TEXT NOT NULL REFERENCES sensores(codigo),
    tipo TEXT NOT NULL DEFAULT 'movimento',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- O site sempre busca "ultimos eventos", entao indexamos por data.
CREATE INDEX eventos_created_at_idx ON eventos (created_at DESC);

-- ---------- Sensores iniciais ----------

INSERT INTO sensores (codigo, nome, local)
VALUES
    ('quarto-1', 'Sensor Quarto 1', 'Quarto 1'),
    ('quarto-2', 'Sensor Quarto 2', 'Quarto 2');

-- ---------- Seguranca (Row Level Security) ----------
-- O site usa a chave publica (anon/publishable), que fica visivel no
-- JavaScript. Por isso o site so pode LER. Quem grava eventos e a
-- Edge Function, que usa a service role e ignora o RLS.

ALTER TABLE sensores ENABLE ROW LEVEL SECURITY;
ALTER TABLE eventos  ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site pode ler sensores"
    ON sensores FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY "site pode ler eventos"
    ON eventos FOR SELECT
    TO anon, authenticated
    USING (true);

-- Nenhuma policy de INSERT/UPDATE/DELETE: a chave publica nao consegue
-- escrever nada. So a API (service role) insere eventos.
