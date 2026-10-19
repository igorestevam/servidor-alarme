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

-- Acelera a busca dos ultimos eventos
CREATE INDEX eventos_created_at_idx ON eventos (created_at DESC);

INSERT INTO sensores (codigo, nome, local)
VALUES
    ('quarto-1', 'Sensor Quarto 1', 'Quarto 1'),
    ('quarto-2', 'Sensor Quarto 2', 'Quarto 2');

-- O site so pode ler; quem grava e a API
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
