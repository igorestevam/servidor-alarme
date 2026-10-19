-- Estado do alarme (tabela de uma unica linha)
CREATE TABLE configuracao (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    armado BOOLEAN NOT NULL DEFAULT FALSE,
    email_destino TEXT NOT NULL,
    -- Usado para limitar a 1 e-mail por minuto
    ultimo_email_em TIMESTAMPTZ
);

-- E-mail que recebe os avisos (o mesmo da conta do Resend)
INSERT INTO configuracao (id, armado, email_destino)
VALUES (1, FALSE, 'igorestevam1900@gmail.com');

-- O site so pode ler a coluna "armado"; o e-mail fica oculto

ALTER TABLE configuracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site pode ler configuracao"
    ON configuracao FOR SELECT
    TO anon, authenticated
    USING (true);

REVOKE ALL ON configuracao FROM anon, authenticated;
GRANT SELECT (id, armado) ON configuracao TO anon, authenticated;
