-- =====================================================================
-- Notificacao por e-mail - rodar no SQL Editor DEPOIS do schema.sql.
-- Antes de rodar, troque o e-mail no INSERT abaixo.
-- =====================================================================

-- Tabela com uma unica linha (id = 1) guardando o estado do alarme.
CREATE TABLE configuracao (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    armado BOOLEAN NOT NULL DEFAULT FALSE,
    email_destino TEXT NOT NULL,
    -- Horario do ultimo e-mail enviado, usado para nao mandar um e-mail
    -- a cada disparo do PIR.
    ultimo_email_em TIMESTAMPTZ
);

-- TROQUE PELO E-MAIL QUE VAI RECEBER OS AVISOS.
-- (No plano gratuito do Resend, sem dominio proprio, so e possivel enviar
-- para o mesmo e-mail usado para criar a conta no Resend.)
INSERT INTO configuracao (id, armado, email_destino)
VALUES (1, FALSE, 'igorestevam1900@gmail.com');

-- ---------- Seguranca ----------
-- O site pode ler APENAS a coluna "armado" (para mostrar o status).
-- O e-mail de destino nao fica visivel para quem abrir o site.
-- Alterar so pela API (service role).

ALTER TABLE configuracao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site pode ler configuracao"
    ON configuracao FOR SELECT
    TO anon, authenticated
    USING (true);

REVOKE ALL ON configuracao FROM anon, authenticated;
GRANT SELECT (id, armado) ON configuracao TO anon, authenticated;
