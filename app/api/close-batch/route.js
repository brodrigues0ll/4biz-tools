import axios from "axios";

const REAL_URL = "/4biz/serviceRequestIncident/serviceRequestIncident.load";

// Valores fixos do template LAPS — correspondem ao serviço/contrato/grupo usado na criação
const TICKET_ID_CONTRATO            = 1;
const TICKET_ID_SERVICO             = 219;
const TICKET_ID_SERVICO_NEGOCIO     = 218;
const TICKET_ID_GRUPO_ATUAL         = 41;

function makeClient(session, authToken) {
  return axios.create({
    baseURL: "https://nav.4biz.one/4biz",
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-transform, no-store, no-cache, must-revalidate, post-check=0, pre-check=0",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      DNT: "1",
      Origin: "https://nav.4biz.one",
      Pragma: "no-cache",
      Referer: "https://nav.4biz.one/4biz/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      "X-Requested-With": "XMLHttpRequest",
      "sec-ch-ua": '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      charset: "UTF-8",
      encoding: "UTF-8",
      Cookie: session ? `SESSION=${session}; HYPER-AUTH-TOKEN=${authToken}` : `HYPER-AUTH-TOKEN=${authToken}`,
    },
  });
}

async function fetchTicketInfo(client, ticketId) {
  const { data } = await client.post(
    "/rest/citajax/ticket/serviceRequestIncident/atualizarLista",
    {
      object: {
        paginaSelecionada: 1,
        palavraChave: "",
        idSolicitacao: ticketId,
        idTipo: -1,
        idContrato: -1,
        idGrupoAtual: -1,
        tarefaAtual: "Todos",
        exibicao: "",
        tipoVisualizacao: "",
        exibicaoSubSolicitacoes: false,
        ordenarPor: "NSolicitacao",
        itensPorPagina: 10,
        totalize: false,
      },
      realUrl: REAL_URL,
    },
  );
  const ticket = (data.requests || []).find((t) => t.id === ticketId);
  if (!ticket) throw new Error(`Chamado #${ticketId} não encontrado ou sem permissão`);
  return ticket;
}

function extractPatrimonioFromDesc(descricao) {
  if (!descricao) return null;
  const match = descricao.match(/(?<!\d)(\d{7,12})(?!\d)/);
  return match ? match[1] : null;
}

function decodeHtml(str) {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&eacute;/g, "é")
    .replace(/&ecirc;/g, "ê")
    .replace(/&atilde;/g, "ã")
    .replace(/&otilde;/g, "õ")
    .replace(/&agrave;/g, "à")
    .replace(/&aacute;/g, "á")
    .replace(/&ccedil;/g, "ç")
    .replace(/&oacute;/g, "ó")
    .replace(/&ocirc;/g, "ô")
    .replace(/&uacute;/g, "ú")
    .replace(/&iacute;/g, "í")
    .replace(/&#45;/g, "-")
    .replace(/\\+\//g, "/");
}

async function findICByPatrimonio(client, patrimonio) {
  if (!patrimonio) return null;
  try {
    const params = new URLSearchParams({
      idGrupoItemConfiguracao: "",
      paginaSelecionada: "1",
      isFiltroSomenteFilhos: "false",
      idItemPai: "",
      isSelectMany: "S",
      idsAlreadyLinked: "",
      filtroIdentificacao: patrimonio,
      filtroNome: "",
      nomeGrupoItemConfiguracao: "",
      dataInicio: "",
      dataFim: "",
      filtroStatus: "",
      filtroCriticidade: "",
      method: "execute",
      parmCount: "3",
      parm1: "pesquisaItemConfiguracao",
      parm2: "",
      parm3: "pesquisarItemConfiguracao",
    });
    const { data } = await client.post(
      "/pages/pesquisaItemConfiguracao/pesquisaItemConfiguracao.event",
      params.toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );
    const match = String(data).match(
      /popupAtivos\(\s*(\d+)\s*,\s*\\#33#(.*?)\\#33#\s*,\s*\\#33#(.*?)\\#33#\s*,\s*\\#33#(.*?)\\#33#\s*,\s*\\#33#(.*?)\\#33#\s*\)/,
    );
    if (!match) return null;
    const identificacao = decodeHtml(match[2]);
    const nome = decodeHtml(match[3]);
    const nomeGrupo = decodeHtml(match[5]);
    return {
      idItemConfiguracao: parseInt(match[1]),
      identificacao,
      nomeItemConfiguracao: nome,
      idGrupoItemConfiguracao: match[4] || null,
      nomeGrupoItemConfiguracao: nomeGrupo || null,
    };
  } catch {
    return null;
  }
}

async function getRequesterInfo(client, idSolicitante) {
  try {
    const { data } = await client.post(
      "/rest/citajax/ticket/serviceRequestIncident/getRequesterInfo",
      { object: { idSolicitante }, realUrl: REAL_URL },
    );
    return {
      idUnidade: data.idUnidade ?? null,
      unidade: data.unidade ?? null,
      requestersUserId: data.idUsuario ?? data.requestersUserId ?? null,
      telefone: data.telefone ?? null,
      email: data.email ?? null,
      origemContatoNome: data.origemContatoNome ?? null,
    };
  } catch {
    return { idUnidade: null, unidade: null, requestersUserId: null, telefone: null, email: null, origemContatoNome: null };
  }
}

async function getRelatedCIs(client, ticketId) {
  try {
    const { data } = await client.post(
      "/rest/citajax/ticket/serviceRequestIncident/getRelatedConfigurationItems",
      { object: { idSolicitacaoServico: ticketId }, realUrl: REAL_URL },
    );
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function buildSla(prazohh, prazomm) {
  if (prazohh == null && prazomm == null) return null;
  const h = String(prazohh ?? 0);
  const m = String(prazomm ?? 0).padStart(2, "0");
  return `${h}:${m}`;
}

const PROJECT_EMPTY = {
  idProjeto: null, nome: null, processo: null, idProcesso: null, nomeProcesso: null,
  descricaoProcesso: null, nomeGestor: null, progresso: null, tipoProjeto: null,
  dataCriacao: null, criadoPor: null, dataAlteracao: null, alteradoPor: null,
  excluidoPor: null, motivoExclusao: null, origem: null, dataFim: null,
  existeLinhaBaseAtiva: null, existeTarefas: null, tarefaDTOs: null,
  tarefaLigacaoDTOs: null, idProjetoTemplate: null, projetoBasesConhecimento: null,
  idRequisicaoMudanca: null,
};

function buildBase(ticket, tipo, requesterInfo, configurationItems) {
  const { idUnidade, unidade, requestersUserId, telefone, email, origemContatoNome } = requesterInfo;
  return {
    checked: false,
    hovered: false,
    id: ticket.id,
    tipo,
    prioridade: String(ticket.prioridade || "5"),
    nomePrioridade: null,
    solicitacao: null,
    tarefa: ticket.tarefa,
    responsavel: ticket.responsavel,
    solicitante: ticket.solicitante,
    requestersUserId: requestersUserId ?? null,
    requestersImageLink: null,
    grupoExecutor: null,
    situacao: ticket.situacao ?? null,
    dataCriacao: ticket.dataCriacao,
    dataLimite: ticket.dataLimite,
    tempodecorridohh: ticket.tempodecorridohh ?? 0,
    tempodecorridomm: ticket.tempodecorridomm ?? 0,
    tempoRestante: null,
    prazohh: ticket.prazohh ?? null,
    prazomm: ticket.prazomm ?? null,
    idItemTrabalho: ticket.idItemTrabalho,
    telefone: telefone ?? null,
    email: email ?? null,
    origemContato: ticket.idOrigem,
    unidade: unidade ?? null,
    ramal: null,
    localidade: null,
    catalogo: "N",
    servico: null,
    contrato: null,
    impacto: "B",
    urgencia: "B",
    descricao: ticket.descricao ?? null,
    grupoAtual: null,
    enviaEmailCriacao: true,
    enviaEmailFinalizacao: true,
    enviaEmailAcoes: true,
    idUnidade: idUnidade ?? null,
    idSolicitante: ticket.idSolicitante,
    idContrato: TICKET_ID_CONTRATO,
    idGrupoAtual: TICKET_ID_GRUPO_ATUAL,
    nomeAtividade: ticket.solicitacao ?? null,
    nomeServico: ticket.nomeServico,
    idServico: TICKET_ID_SERVICO,
    idServicoNegocioTecnico: TICKET_ID_SERVICO_NEGOCIO,
    idTipoDemandaServico: ticket.idTipoDemandaServico,
    outrasInformacoes: " ",
    justificativaVencimentoSLA: null,
    qtdAnexos: null,
    quantidadeSolicitacoesRelacionadas: null,
    quantidadeSubSolicitacoes: null,
    qtdItensConfiguracao: null,
    solucaoTemporaria: false,
    strSolucaoTemporaria: null,
    idUsuarioResponsavelAtual: ticket.idUsuarioResponsavelAtual,
    idEmpregadoResponsavelAtual: ticket.idEmpregadoResponsavelAtual ?? null,
    idAssignmentType: null,
    compartilhamento: null,
    idGrupo: null,
    idFluxo: null,
    idElementoFluxo: null,
    criar: null,
    executar: null,
    delegar: null,
    suspender: null,
    reativar: null,
    alterarSLA: null,
    reopen: null,
    cancelar: null,
    allowReclassify: null,
    escalar: null,
    contabilizaSLA: "S",
    alterarSituacao: null,
    idTipoFluxo: null,
    titulo: null,
    idSolicitacaoRelacionada: null,
    idSolicitacaoPai: null,
    nomeGrupoAtual: ticket.nomeGrupoAtual,
    numeroContrato: ticket.numeroContrato ?? null,
    criadoPor: null,
    configurationItems,
    idLocalidade: null,
    critico: null,
    idCalendario: ticket.idCalendario,
    dataHoraInicioSLA: ticket.dataHoraInicioSLA,
    idOrigem: ticket.idOrigem,
    origemContato: ticket.idOrigem,
    status: ticket.status || "NORMAL",
    statusFluxoId: null,
    statusFluxoSigla: null,
    statusFluxoNome: null,
    statusFluxoCorFundo: null,
    statusFluxoCorTexto: null,
    validarUnidade: null,
    idProjeto: null,
    permission: null,
    habilitaNotificacaoEmail: null,
    unidadeSolicitante: null,
    emailCriadoPor: null,
    telefoneCriadoPor: null,
    unidadeCriadoPor: null,
    isTarefaAprovacao: false,
    categoria: 4,
    requestTrackingCount: null,
    dtLastModification: ticket.dtLastModification,
    nomeServicoPt: null,
    nomeServicoEn: null,
    nomeServicoEs: null,
    multiIdioma: null,
    idInstancia: null,
    habilitaItemConfiguracao: null,
    habilitaMudanca: null,
    habilitaProblema: null,
    habilitaSolucao: null,
    habilitaSolicitacaoRelacionada: null,
    habilitaGravarEContinuar: null,
    habilitaEditarQuestionario: null,
    enableFields: false,
    latitude: null,
    longitude: null,
    dataContrato: null,
    idCliente: null,
    nomeCliente: null,
    idFornecedor: null,
    nomeFornecedor: null,
    requerAssinatura: "N",
    idItemFinanceiro: null,
    allowCommentOnly: false,
    nomeSituacao: null,
    major: ticket.major || "N",
    numberOfAssignments: 1,
    assignmentsExceeded: false,
    activityWorkspaceId: null,
    intelligenceCenterConfigured: false,
    aiScreenUuid: ticket.aiScreenUuid ?? null,
    aiScreenUrl: ticket.aiScreenUrl ?? null,
    userPermissions: null,
    keepOnTheScreenEnabled: false,
    dataHoraCaptura: ticket.dtLastModification ?? null,
    deadLineForCapture: null,
    view: false,
    commentMode: false,
    problems: [],
    changes: [],
    releases: [],
    knowledges: [],
    listUserConfigurationItems: [],
    project: PROJECT_EMPTY,
    signatures: [],
    sla: buildSla(ticket.prazohh, ticket.prazomm),
    origemContatoNome: origemContatoNome ?? null,
    relatedRequests: [],
    subRequests: [],
    interestedPartsRequestDTOs: [],
    groupList: [],
    userList: [],
    arrayEmail: [],
    interestedPartsDeletedIds: [],
    event: { id: null, classification: null, date: null, host: null, managed: null, tool: null, category: null, epls: null },
    relatedWorkarounds: [],
    tasks: [],
    dzUuid: null,
    attachedFiles: [],
  };
}

async function closeTicket(client, ticket, requesterInfo, solucaoResposta, detalhamentoCausa, configurationItems, idCausaIncidente, idCategoriaSolucao, knowledges) {
  const tipo = ticket.tipo === "Requisição" ? "R" : ticket.tipo === "Incidente" ? "I" : "R";

  // Passo 1: valida acesso concorrente
  await client.post(
    "/rest/citajax/ticket/serviceRequestIncident/validateConcurrentAccess",
    {
      object: {
        id: ticket.id,
        idItemTrabalho: ticket.idItemTrabalho,
        idUsuarioResponsavelAtual: ticket.idUsuarioResponsavelAtual,
        dtLastModification: ticket.dtLastModification,
      },
      realUrl: REAL_URL,
    },
  );

  // Passo 2: encerra
  const base = buildBase(ticket, tipo, requesterInfo, configurationItems);

  const closeObject = {
    ...base,
    idStatus: 4,
    acaoFluxo: "E",
    solucaoResposta,
    detalhamentoCausa,
    idCategoriaSolucao,
    idCausaIncidente,
    knowledges: knowledges || [],
    original: {
      ...base,
      configurationItems: [],
      knowledges: [],
      idStatus: ticket.idStatus ?? 1,
      acaoFluxo: null,
      solucaoResposta: null,
      detalhamentoCausa: null,
      idCategoriaSolucao: null,
      idCausaIncidente: null,
    },
  };

  console.error(`[close-batch] #${ticket.id} tentando encerrar (acaoFluxo:E)`);
  try {
    const { data } = await client.post(
      "/rest/citajax/ticket/serviceRequestIncident/saveOrUpdate",
      { object: closeObject, realUrl: REAL_URL },
    );
    return data;
  } catch (err) {
    if (err.response) {
      const d = err.response.data;
      const msg = d?.message || d?.localizedMessage || d?.detailMessage || "";
      console.error(`[close-batch] #${ticket.id} 412 message: ${msg}`);
      console.error(`[close-batch] #${ticket.id} 412 full: ${JSON.stringify(d).slice(0, 2000)}`);
      throw new Error(`[encerramento] HTTP ${err.response.status}: ${msg || JSON.stringify(d).slice(0, 300)}`);
    }
    throw new Error(`[encerramento] ${err.message}`);
  }
}

export async function POST(request) {
  const { session, authToken, ticketIds, solucaoResposta, detalhamentoCausa, idCausaIncidente, idCategoriaSolucao, knowledges, descricaoTemplate, icFixo } = await request.json();

  if (!authToken) {
    return Response.json({ error: "HYPER-AUTH-TOKEN obrigatório." }, { status: 400 });
  }
  if (!ticketIds?.length) {
    return Response.json({ error: "Nenhum chamado informado." }, { status: 400 });
  }

  const client = makeClient(session, authToken);

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (payload) => controller.enqueue(enc.encode(`data: ${JSON.stringify(payload)}\n\n`));

      for (let i = 0; i < ticketIds.length; i++) {
        const ticketId = ticketIds[i];
        try {
          const ticket = await fetchTicketInfo(client, ticketId);
          const patrimonio = extractPatrimonioFromDesc(ticket.descricao);
          if (descricaoTemplate && patrimonio) {
            ticket.descricao = descricaoTemplate.replace(/\{\{patrimonio\}\}/g, patrimonio);
          }

          const requesterInfo = await getRequesterInfo(client, ticket.idSolicitante);

          let configurationItems;
          let icFound;

          if (icFixo?.idItemConfiguracao) {
            configurationItems = [icFixo];
            icFound = true;
          } else {
            configurationItems = await getRelatedCIs(client, ticketId);
            icFound = configurationItems.length > 0;
            if (!icFound && patrimonio) {
              const ic = await findICByPatrimonio(client, patrimonio);
              if (ic) { configurationItems = [ic]; icFound = true; }
            }
          }

          await closeTicket(client, ticket, requesterInfo, solucaoResposta, detalhamentoCausa, configurationItems, idCausaIncidente, idCategoriaSolucao, knowledges);
          send({ index: i, ticketId, success: true, patrimonio, icFound });
        } catch (err) {
          const detail = err.response
            ? `HTTP ${err.response.status}: ${JSON.stringify(err.response.data).slice(0, 3000)}`
            : err.message;
          send({ index: i, ticketId, success: false, error: detail });
        }
        if (i < ticketIds.length - 1) await new Promise((r) => setTimeout(r, 600));
      }

      send({ done: true });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
