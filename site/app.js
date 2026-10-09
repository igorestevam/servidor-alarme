// =====================================================================
// Site: lista sensores e mostra os ultimos eventos, atualizando a cada
// 3 segundos.
// =====================================================================

const INTERVALO_MS = 3000;
const LIMITE_EVENTOS = 50;

const cliente = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const listaSensores = document.getElementById("lista-sensores");
const tabelaEventos = document.getElementById("tabela-eventos");
const statusEl = document.getElementById("status");

// Converte o TIMESTAMPTZ do banco para o horario de Brasilia.
function formatarHorario(timestamp) {
  return new Date(timestamp).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
  });
}

// "movimento" -> "Movimento"
function formatarTipo(tipo) {
  return tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

function mostrarStatus(texto, erro = false) {
  statusEl.textContent = texto;
  statusEl.classList.toggle("erro", erro);
}

async function carregarSensores() {
  const { data, error } = await cliente
    .from("sensores")
    .select("codigo, nome, local, ativo")
    .order("nome");

  listaSensores.innerHTML = "";

  if (error) {
    console.error(error);
    listaSensores.innerHTML = "<li>Erro ao carregar sensores</li>";
    return;
  }

  for (const sensor of data) {
    const li = document.createElement("li");
    li.textContent = sensor.local + (sensor.ativo ? "" : " (desativado)");
    if (!sensor.ativo) li.classList.add("inativo");
    listaSensores.appendChild(li);
  }
}

// Equivalente ao SELECT ... FROM eventos JOIN sensores ... ORDER BY
// created_at DESC LIMIT 50. O "sensores(nome, local)" faz o JOIN pela
// chave estrangeira sensor_codigo -> sensores.codigo.
let carregando = false;

async function carregarEventos() {
  if (carregando) return; // evita requisicoes sobrepostas se a rede estiver lenta
  carregando = true;

  try {
    const { data, error } = await cliente
      .from("eventos")
      .select("id, tipo, created_at, sensores(nome, local)")
      .order("created_at", { ascending: false })
      .limit(LIMITE_EVENTOS);

    if (error) throw error;

    tabelaEventos.innerHTML = "";

    if (data.length === 0) {
      tabelaEventos.innerHTML = '<tr><td colspan="3">Nenhum evento registrado</td></tr>';
    }

    for (const evento of data) {
      const tr = document.createElement("tr");
      const colunas = [
        formatarHorario(evento.created_at),
        evento.sensores ? evento.sensores.local : "?",
        formatarTipo(evento.tipo),
      ];
      for (const texto of colunas) {
        const td = document.createElement("td");
        td.textContent = texto;
        tr.appendChild(td);
      }
      tabelaEventos.appendChild(tr);
    }

    mostrarStatus("Atualizado em " + formatarHorario(new Date()));
  } catch (erro) {
    console.error(erro);
    mostrarStatus("Erro ao carregar eventos. Tentando novamente...", true);
  } finally {
    carregando = false;
  }
}

// ---------- Armar / desarmar ----------

const URL_ALTERNAR = CONFIG.SUPABASE_URL + "/functions/v1/alternar-alarme";
const statusAlarme = document.getElementById("status-alarme");
const botaoAlarme = document.getElementById("botao-alarme");
let alarmeArmado = null;

function mostrarAlarme(armado) {
  alarmeArmado = armado;
  statusAlarme.textContent = armado ? "ARMADO" : "Desarmado";
  statusAlarme.className = armado ? "armado" : "desarmado";
  botaoAlarme.textContent = armado ? "Desarmar" : "Armar";
  botaoAlarme.disabled = false;
}

async function carregarAlarme() {
  const { data, error } = await cliente
    .from("configuracao")
    .select("armado")
    .eq("id", 1)
    .maybeSingle();

  if (error || !data) {
    console.error(error);
    statusAlarme.textContent = "Erro ao carregar";
    return;
  }
  mostrarAlarme(data.armado);
}

async function alternarAlarme() {
  const senha = prompt("Digite a senha do alarme:");
  if (!senha) return;

  botaoAlarme.disabled = true;
  try {
    const resposta = await fetch(URL_ALTERNAR, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Admin-Key": senha },
      body: JSON.stringify({ armado: !alarmeArmado }),
    });
    const json = await resposta.json();
    if (!resposta.ok) {
      alert(json.mensagem || "Erro ao alterar o alarme");
    }
  } catch (erro) {
    console.error(erro);
    alert("Nao foi possivel falar com o servidor");
  }
  await carregarAlarme(); // mostra o estado real salvo no banco
}

botaoAlarme.addEventListener("click", alternarAlarme);

carregarSensores();
carregarAlarme();
carregarEventos();
setInterval(carregarEventos, INTERVALO_MS);
// O status tambem e atualizado periodicamente, caso seja alterado em outra aba.
setInterval(carregarAlarme, INTERVALO_MS);
