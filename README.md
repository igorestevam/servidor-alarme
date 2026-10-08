# Servidor do Alarme (ESP32 + PIR)

Banco + API + site do sistema de monitoramento de movimento.

```
PIR -> ESP32 -> Wi-Fi -> API (Edge Function) -> Banco (Supabase) -> Site
```

## Estrutura

```
supabase/
  schema.sql                          tabelas, sensores iniciais e RLS
  config.toml                         desliga verificacao de JWT na API
  functions/registrar-evento/
    index.ts                          a API (POST /registrar-evento)
    notificacoes.ts                   ponto de extensao (futuro e-mail)
site/
  index.html, style.css, app.js       site do log
  config.js                           URL + chave publica do Supabase
testes/
  testar-api.ps1                      simula a ESP32
```

## Passo a passo

### 1. Banco

1. Crie um projeto em <https://supabase.com>.
2. Abra **SQL Editor**, cole o conteudo de `supabase/schema.sql` e rode.

### 2. API (Edge Function)

No terminal, na pasta do projeto (usa o Supabase CLI via `npx`, nao precisa instalar):

```powershell
npx supabase login
npx supabase link --project-ref SEU_PROJECT_REF
npx supabase secrets set DEVICE_KEY=escolha-uma-chave-longa
npx supabase functions deploy registrar-evento --no-verify-jwt
```

O `SEU_PROJECT_REF` e o trecho `xxxx` de `https://xxxx.supabase.co`.

A URL da API fica:

```
https://SEU_PROJECT_REF.supabase.co/functions/v1/registrar-evento
```

> `--no-verify-jwt` e necessario porque a ESP32 so manda o header
> `X-Device-Key`, nao o token do Supabase. A propria funcao valida a chave.

### 3. Site

1. Edite `site/config.js` com a URL do projeto e a chave **publica**
   (Project Settings > API > anon / publishable key).
2. Abra `site/index.html` no navegador (ou publique a pasta `site/` na Vercel/Netlify).

### 4. Teste sem a ESP32

```powershell
.\testes\testar-api.ps1 -Url "https://SEU_PROJECT_REF.supabase.co/functions/v1/registrar-evento" -Chave "sua-device-key"
```

Ou com curl:

```bash
curl -X POST https://SEU_PROJECT_REF.supabase.co/functions/v1/registrar-evento \
  -H "Content-Type: application/json" \
  -H "X-Device-Key: sua-device-key" \
  -d '{"sensor":"quarto-1","evento":"movimento"}'
```

O evento deve aparecer no site em ate 3 segundos, sem precisar apertar F5.

## Respostas da API

| Situacao                     | HTTP | Grava? |
|------------------------------|------|--------|
| Tudo certo                   | 201  | sim    |
| `X-Device-Key` errada/ausente| 401  | nao    |
| JSON invalido / campo faltando | 400 | nao   |
| Sensor nao cadastrado        | 404  | nao    |
| Sensor com `ativo = false`   | 403  | nao    |
| Metodo diferente de POST     | 405  | nao    |

Sucesso: `{"ok": true, "mensagem": "Evento registrado", "id": 1}`

## Dados para quem programa a ESP32

| Item         | Valor |
|--------------|-------|
| URL da API   | `https://SEU_PROJECT_REF.supabase.co/functions/v1/registrar-evento` |
| Metodo       | `POST` |
| Header       | `X-Device-Key: <DEVICE_KEY>` |
| Content-Type | `application/json` |
| JSON         | `{"sensor":"quarto-1","evento":"movimento"}` |

## Futuro: notificacao por e-mail

A API ja chama `aoRegistrarEvento()` em
`supabase/functions/registrar-evento/notificacoes.ts` logo depois de gravar
cada evento. Hoje ela nao faz nada. Para adicionar o e-mail, so essa funcao
precisa mudar (mais uma tabela de configuracao com `armado` e
`email_destino`). Se o envio falhar, o evento continua salvo.
