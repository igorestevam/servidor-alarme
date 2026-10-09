// =====================================================================
// Tudo que acontece DEPOIS que um evento e gravado no banco.
//
// Se o alarme estiver armado, envia um e-mail avisando do movimento.
// Para nao lotar a caixa de entrada (o PIR dispara varias vezes
// seguidas), envia no maximo 1 e-mail a cada INTERVALO_MINIMO_SEGUNDOS.
// =====================================================================

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const INTERVALO_MINIMO_SEGUNDOS = 60;

// Secrets definidos com "supabase secrets set".
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
// Sem dominio proprio no Resend, o remetente precisa ser onboarding@resend.dev
const EMAIL_REMETENTE = Deno.env.get("EMAIL_REMETENTE") ?? "Alarme <onboarding@resend.dev>";

export type Evento = {
  id: number;
  sensor_codigo: string;
  tipo: string;
  created_at: string;
};

export type Sensor = {
  codigo: string;
  nome: string;
  local: string;
};

export async function aoRegistrarEvento(
  supabase: SupabaseClient,
  evento: Evento,
  sensor: Sensor,
): Promise<void> {
  // Um unico UPDATE faz tres coisas ao mesmo tempo:
  //   - so atualiza se o alarme estiver armado;
  //   - so atualiza se o ultimo e-mail foi ha mais de 60 s;
  //   - marca o horario deste envio.
  // Se nenhuma linha for atualizada, nao devemos enviar e-mail.
  // Fazer tudo num UPDATE so evita que dois sensores disparando juntos
  // mandem dois e-mails.
  const limite = new Date(Date.now() - INTERVALO_MINIMO_SEGUNDOS * 1000).toISOString();

  const { data: config, error } = await supabase
    .from("configuracao")
    .update({ ultimo_email_em: new Date().toISOString() })
    .eq("id", 1)
    .eq("armado", true)
    .or(`ultimo_email_em.is.null,ultimo_email_em.lt."${limite}"`)
    .select("email_destino")
    .maybeSingle();

  if (error) throw error;
  if (!config) return; // desarmado ou e-mail enviado ha pouco tempo

  await enviarEmail(config.email_destino, evento, sensor);
}

async function enviarEmail(destino: string, evento: Evento, sensor: Sensor) {
  if (!RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY nao configurada");
  }

  const horario = new Date(evento.created_at).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });

  const resposta = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: EMAIL_REMETENTE,
      to: [destino],
      subject: `ALARME: ${evento.tipo} detectado em ${sensor.local}`,
      text:
        `O alarme detectou ${evento.tipo}.\n\n` +
        `Local: ${sensor.local}\n` +
        `Sensor: ${sensor.nome}\n` +
        `Horario: ${horario}\n\n` +
        `Novos avisos so serao enviados apos ${INTERVALO_MINIMO_SEGUNDOS} segundos.`,
    }),
  });

  if (!resposta.ok) {
    throw new Error(`Resend respondeu ${resposta.status}: ${await resposta.text()}`);
  }
}
