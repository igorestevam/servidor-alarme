// Recebe o evento da ESP32 e grava no banco

import { createClient } from "npm:@supabase/supabase-js@2";
import { aoRegistrarEvento } from "./notificacoes.ts";

// Tipos de evento aceitos
const TIPOS_VALIDOS = ["movimento"];

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

  // Valida a chave do dispositivo
  if (!DEVICE_KEY) {
    console.error("DEVICE_KEY nao configurada no servidor");
    return responder(500, { ok: false, mensagem: "Servidor sem chave configurada" });
  }
  if (req.headers.get("X-Device-Key") !== DEVICE_KEY) {
    return responder(401, { ok: false, mensagem: "Chave do dispositivo invalida" });
  }

  // Le e valida o JSON
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

  // Verifica se o sensor existe e esta ativo
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

  // Grava o evento (o horario e gerado pelo banco)
  const { data: novoEvento, error: erroInsert } = await supabase
    .from("eventos")
    .insert({ sensor_codigo: sensor, tipo: evento })
    .select("id, sensor_codigo, tipo, created_at")
    .single();

  if (erroInsert) {
    console.error(erroInsert);
    return responder(500, { ok: false, mensagem: "Erro ao registrar evento" });
  }

  // Envia o e-mail se armado; uma falha aqui nao desfaz o evento
  try {
    await aoRegistrarEvento(supabase, novoEvento, dadosSensor);
  } catch (erro) {
    console.error("Falha na notificacao:", erro);
  }

  return responder(201, { ok: true, mensagem: "Evento registrado", id: novoEvento.id });
});
