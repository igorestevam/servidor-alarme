// =====================================================================
// Ponto de extensao: tudo que deve acontecer DEPOIS que um evento e
// gravado no banco. Hoje nao faz nada.
//
// Quando formos implementar o e-mail, a ideia e:
//   1. Criar no banco uma tabela "configuracao" com os campos
//      "armado" (boolean) e "email_destino" (text).
//   2. Aqui dentro: ler essa configuracao; se armado = true, enviar o
//      e-mail (ex.: API HTTP do Resend, usando um secret RESEND_API_KEY).
//
// O index.ts ja chama esta funcao e trata erros, entao nao sera
// necessario mexer na API para adicionar a notificacao.
// =====================================================================

import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

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
  _supabase: SupabaseClient,
  _evento: Evento,
  _sensor: Sensor,
): Promise<void> {
  // Nada por enquanto.
}
