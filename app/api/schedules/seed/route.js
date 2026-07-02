import axios from "axios";
import { connectDB } from "@/lib/mongodb";
import Schedule from "@/lib/models/Schedule";
import { calcNextRun } from "@/lib/scheduler";

const BASE_URL = "https://nav.4biz.one/4biz";

function makeClient(session, authToken, accept = "application/json, text/plain, */*") {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Accept: accept,
      "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-transform, no-store, no-cache, must-revalidate, post-check=0, pre-check=0",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      DNT: "1",
      Origin: "https://nav.4biz.one",
      Pragma: "no-cache",
      Referer: `${BASE_URL}/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      charset: "UTF-8",
      encoding: "UTF-8",
      Cookie: session ? `SESSION=${session}; HYPER-AUTH-TOKEN=${authToken}` : `HYPER-AUTH-TOKEN=${authToken}`,
    },
  });
}

// ── Busca idEmpregado via JWT ───────────────────────────────────────────────────

async function getEmployeeId(session, authToken) {
  try {
    const parts = authToken.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
    const query = payload.name || payload.preferred_username || payload.given_name || null;
    if (!query) return null;
    const client = makeClient(session, authToken, "text/plain, */*; q=0.01");
    const { data } = await client.get(
      "/pages/serviceRequestIncident/pages/autoCompleteSolicitante/autoCompleteSolicitante.load",
      { params: { query: query.trim() }, headers: { "Content-Type": undefined } },
    );
    return (data?.data || [])[0]?.idEmpregado ?? null;
  } catch {
    return null;
  }
}

// ── Busca atividade por query ──────────────────────────────────────────────────

async function searchActivity(session, authToken, idEmployee, query) {
  const client = makeClient(session, authToken, "text/plain, */*; q=0.01");
  const { data } = await client.get(
    "/pages/autoCompleteDirectiveActivity/autoCompleteDirectiveActivity.load",
    {
      params: { ...(idEmployee ? { idEmpregado: idEmployee } : {}), type: "S", productId: "", query },
      headers: { "Content-Type": undefined },
    },
  );
  return (data.data || []).map((item) => {
    try { return JSON.parse(item); } catch { return null; }
  }).filter(Boolean);
}

// ── Busca unidades por query ────────────────────────────────────────────────────

async function searchUnidades(session, authToken, query) {
  const client = makeClient(session, authToken, "text/plain, */*; q=0.01");
  const { data } = await client.get(
    "/pages/serviceRequestIncident/pages/autoCompleteUnidade/autoCompleteUnidade.load",
    { params: { query }, headers: { "Content-Type": undefined } },
  );
  return (data.suggestions || []).map((suggestion, i) => {
    const parts = suggestion.split("|").map((s) => s.trim());
    return {
      id: data.data?.[i] != null ? Number(data.data[i]) : null,
      nome: parts[0] ?? suggestion,
      sigla: parts[1] ?? "",
    };
  }).filter((u) => u.id != null);
}

// ── IDs excluídos: SEDE e ALADA ────────────────────────────────────────────────

const EXCLUDE_IDS = new Set([27, 51]);

// ── Monta o templateStr para um ticket de saúde ────────────────────────────────

function buildTemplateStr(activity, unit) {
  const parts = (activity.nomeComHierarquia || "").split(" > ");
  const nomeServico = parts.length >= 2 ? parts[parts.length - 2] : (parts[0] || "");
  const tipo = activity.tipoServico || "R";

  const obj = {
    id: null,
    catalogo: "N",
    idTipoDemandaServico: 1,
    idStatus: 1,
    solucaoTemporaria: false,
    impacto: "B",
    urgencia: "B",
    registroExecucao: "",
    categoria: 4,
    idContrato: 1,
    idGrupoAtual: 2,
    mails: null,
    event: null,
    idOcorrenciaEvento: null,
    idManager: 0,
    nomeDoManager: "",
    idGrupoAprovador: 0,
    major: "N",
    userGroup: [{ key: "Grupo", number: 0 }, { key: " email.type.user", number: 1 }],
    problems: [],
    changes: [],
    releases: [],
    configurationItems: [],
    knowledges: [{ idBaseConhecimento: 500, titulo: "Verificação da Saúde Física dos Servidores" }],
    listUserConfigurationItems: [],
    project: {},
    signatures: [],
    enviaEmailCriacao: true,
    enviaEmailFinalizacao: true,
    enviaEmailAcoes: true,
    intelligenceCenterConfigured: false,
    dzUuid: "10e4",
    solicitante: "",
    idSolicitante: null,
    telefone: "",
    ramal: null,
    email: "",
    idUnidade: unit.id,
    unidade: unit.nome,
    templates: [],
    origemContato: 14,
    idServico: activity.idAtividade,
    tipo,
    idServicoNegocioTecnico: activity.idServico,
    nomeServico,
    descricao: "<div>ROTINA - Favor verificar a saúde física (cpu, memória, espaço em disco) dos servidores</div>",
    builderObjects: {
      _businessObjects: [{
        applicationName: "AplicacaoParaAtendimentos",
        businessObjectName: "NavAtendimentos",
        model: "navAtendimentos",
      }],
      navAtendimentos: {
        rlc_unidadesnav: null,
        rlc_unidadesCadastradasNav: {
          datainicio: "2024-06-06",
          sigla: unit.sigla,
          aceitaentregaproduto: "N",
          nome: unit.nome,
          idendereco: unit.id,
          descricao: "",
          idempresa: 1,
          idunidade: unit.id,
          email: "",
          fillColumn: unit.nome,
          key_0: unit.id,
        },
        idUnidadeNav: unit.id,
        "rlc_unidadesCadastradasNav.nome": unit.nome,
        telefone: "0",
        numeroPatrimonio: "{{patrimonio}}",
        tipoSolicitacao: "configuracao",
      },
    },
    acaoFluxo: "E",
    attachedFiles: [],
    original: {
      id: null,
      catalogo: "N",
      idTipoDemandaServico: 0,
      idStatus: 1,
      solucaoTemporaria: false,
      impacto: "B",
      urgencia: "B",
      registroExecucao: "",
      categoria: null,
      idContrato: null,
      idGrupoAtual: null,
      mails: null,
      event: null,
      idOcorrenciaEvento: null,
      idManager: 0,
      nomeDoManager: "",
      idGrupoAprovador: 0,
      major: "N",
      userGroup: [{ key: "Grupo", number: 0 }, { key: " email.type.user", number: 1 }],
    },
  };

  return JSON.stringify(obj);
}

// ── Handler POST ────────────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { session, authToken } = await request.json();
    if (!authToken) {
      return Response.json({ error: "HYPER-AUTH-TOKEN obrigatório." }, { status: 400 });
    }

    // 1. ID do funcionário (para busca de atividade)
    const idEmployee = await getEmployeeId(session, authToken);

    // 2. Busca atividade "Elaborar relatório técnico"
    const activities = await searchActivity(session, authToken, idEmployee, "Elaborar");
    const activity = activities.find((a) =>
      (a.nomeComHierarquia || a.sugestao || "")
        .toLowerCase()
        .includes("elaborar relat"),
    );
    if (!activity) {
      return Response.json({ error: "Atividade 'Elaborar relatório técnico' não encontrada." }, { status: 404 });
    }

    // 3. Busca unidades SB* e DN*
    const [uSB, uDN] = await Promise.all([
      searchUnidades(session, authToken, "SB"),
      searchUnidades(session, authToken, "DN"),
    ]);

    const seen = new Set();
    const unidades = [...uSB, ...uDN].filter((u) => {
      if (EXCLUDE_IDS.has(u.id) || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });

    if (!unidades.length) {
      return Response.json({ error: "Nenhuma unidade encontrada na API do 4Biz." }, { status: 404 });
    }

    // 4. Cria um agendamento por unidade
    await connectDB();

    const scheduleDraft = {
      frequencia: "semanal",
      diasSemana: [4], // quinta-feira
      hora: 8,
      minuto: 0,
      todasUnidades: false,
      patrimonioFixo: "",
      session,
      authToken,
      ativo: false,
    };

    const created = [];
    for (const unit of unidades) {
      const templateStr = buildTemplateStr(activity, unit);
      const draft = {
        ...scheduleDraft,
        nome: `ROTINA Saúde - ${unit.nome}`,
        unidades: [unit],
        templateStr,
      };
      draft.proximaExecucao = calcNextRun(draft);
      const doc = await Schedule.create(draft);
      created.push({ id: String(doc._id), nome: doc.nome });
    }

    return Response.json({
      ok: true,
      activity: activity.nomeComHierarquia,
      unidades: unidades.length,
      created: created.length,
      schedules: created,
    });
  } catch (err) {
    if (err.response) {
      return Response.json(
        { error: `Erro da API 4Biz: ${err.response.status}`, detail: JSON.stringify(err.response.data).slice(0, 500) },
        { status: err.response.status },
      );
    }
    console.error("[seed] erro:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
