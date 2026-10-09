// =====================================================================
// API: POST /alternar-alarme
// Chamada pelo botao do site para armar ou desarmar o alarme.
//
// Corpo esperado:  { "armado": true }  ou  { "armado": false }
// Header esperado: X-Admin-Key: <senha definida em ADMIN_KEY>
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const ADMIN_KEY = Deno.env.get("ADMIN_KEY");

// Esta API e chamada pelo navegador (site), entao precisa de CORS.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Key",
};

function responder(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // Pre-requisicao que o navegador faz antes do POST
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS });
  }
  if (req.method !== "POST") {
    return responder(405, { ok: false, mensagem: "Use o metodo POST" });
  }

  if (!ADMIN_KEY) {
    console.error("ADMIN_KEY nao configurada no servidor");
    return responder(500, { ok: false, mensagem: "Servidor sem senha configurada" });
  }
  if (req.headers.get("X-Admin-Key") !== ADMIN_KEY) {
    return responder(401, { ok: false, mensagem: "Senha incorreta" });
  }

  let corpo: { armado?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return responder(400, { ok: false, mensagem: "JSON invalido" });
  }
  if (typeof corpo.armado !== "boolean") {
    return responder(400, { ok: false, mensagem: "Campo 'armado' deve ser true ou false" });
  }

  // Ao armar, zera o ultimo envio para o primeiro movimento ja gerar e-mail.
  const { error } = await supabase
    .from("configuracao")
    .update({ armado: corpo.armado, ultimo_email_em: null })
    .eq("id", 1);

  if (error) {
    console.error(error);
    return responder(500, { ok: false, mensagem: "Erro ao salvar" });
  }

  return responder(200, {
    ok: true,
    armado: corpo.armado,
    mensagem: corpo.armado ? "Alarme armado" : "Alarme desarmado",
  });
});
