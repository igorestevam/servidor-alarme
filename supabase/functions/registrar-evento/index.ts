// =====================================================================
// API: POST /registrar-evento
// Recebe o evento enviado pela ESP32 e grava na tabela "eventos".
//
// Corpo esperado:  { "sensor": "quarto-1", "evento": "movimento" }
// Header esperado: X-Device-Key: <chave definida em DEVICE_KEY>
// =====================================================================

import { createClient } from "npm:@supabase/supabase-js@2";
import { aoRegistrarEvento } from "./notificacoes.ts";

// Tipos de evento aceitos. Para criar um novo tipo, basta incluir aqui.
const TIPOS_VALIDOS = ["movimento"];

// SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao injetadas automaticamente
// pelo Supabase. DEVICE_KEY e definida por nos (supabase secrets set).
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);
const DEVICE_KEY = Deno.env.get("DEVICE_KEY");

function responder(status: number, corpo: Record<string, unknown>) {
  return new Response(JSON.stringify(corpo), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return responder(405, { ok: false, mensagem: "Use o metodo POST" });
  }

  // 1. Chave do dispositivo (antes de tudo, para nao consultar o banco
  //    com requisicoes de quem nao tem a chave).
  if (!DEVICE_KEY) {
    console.error("DEVICE_KEY nao configurada no servidor");
    return responder(500, { ok: false, mensagem: "Servidor sem chave configurada" });
  }
  if (req.headers.get("X-Device-Key") !== DEVICE_KEY) {
    return responder(401, { ok: false, mensagem: "Chave do dispositivo invalida" });
  }

  // 2. Ler o JSON
  let corpo: { sensor?: unknown; evento?: unknown };
  try {
    corpo = await req.json();
  } catch {
    return responder(400, { ok: false, mensagem: "JSON invalido" });
  }

  const sensor = corpo.sensor;
  const evento = corpo.evento ?? "movimento";

  if (typeof sensor !== "string" || sensor.trim() === "") {
    return responder(400, { ok: false, mensagem: "Campo 'sensor' obrigatorio" });
  }
  if (typeof evento !== "string" || !TIPOS_VALIDOS.includes(evento)) {
    return responder(400, { ok: false, mensagem: "Campo 'evento' invalido" });
  }

  // 3. Validar se o sensor existe e esta ativo
  const { data: dadosSensor, error: erroSensor } = await supabase
    .from("sensores")
    .select("codigo, nome, local, ativo")
    .eq("codigo", sensor)
    .maybeSingle();

  if (erroSensor) {
    console.error(erroSensor);
    return responder(500, { ok: false, mensagem: "Erro ao consultar sensor" });
  }
  if (!dadosSensor) {
    return responder(404, { ok: false, mensagem: "Sensor nao cadastrado" });
  }
  if (!dadosSensor.ativo) {
    return responder(403, { ok: false, mensagem: "Sensor desativado" });
  }

  // 4. Inserir o evento. O created_at e gerado pelo banco (DEFAULT NOW()).
  const { data: novoEvento, error: erroInsert } = await supabase
    .from("eventos")
    .insert({ sensor_codigo: sensor, tipo: evento })
    .select("id, sensor_codigo, tipo, created_at")
    .single();

  if (erroInsert) {
    console.error(erroInsert);
    return responder(500, { ok: false, mensagem: "Erro ao registrar evento" });
  }

  // 5. Ponto de extensao (ex.: e-mail quando o alarme estiver armado).
  //    Uma falha aqui nao pode perder o evento, que ja foi salvo.
  try {
    await aoRegistrarEvento(supabase, novoEvento, dadosSensor);
  } catch (erro) {
    console.error("Falha na notificacao:", erro);
  }

  return responder(201, { ok: true, mensagem: "Evento registrado", id: novoEvento.id });
});
