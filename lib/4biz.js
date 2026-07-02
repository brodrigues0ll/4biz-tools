import axios from "axios";

const BASE_URL = "https://nav.4biz.one/4biz";
const REAL_URL = "/4biz/serviceRequestIncident/serviceRequestIncident.load";

export function createClient(session, authToken) {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      Accept: "application/json, text/plain, */*",
      "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control":
        "no-transform, no-store, no-cache, must-revalidate, post-check=0, pre-check=0",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      DNT: "1",
      Origin: "https://nav.4biz.one",
      Pragma: "no-cache",
      Referer: `${BASE_URL}/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true`,
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
      "sec-ch-ua":
        '"Google Chrome";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"Windows"',
      charset: "UTF-8",
      encoding: "UTF-8",
      Cookie: session ? `SESSION=${session}; HYPER-AUTH-TOKEN=${authToken}` : `HYPER-AUTH-TOKEN=${authToken}`,
    },
  });
}

export async function validateConcurrentAccess(client) {
  const { data } = await client.post(
    "/rest/citajax/ticket/serviceRequestIncident/validateConcurrentAccess",
    { object: { id: null }, realUrl: REAL_URL },
  );
  return data === true || data === "true";
}

export async function createTicket(client, ticketObject) {
  const { data } = await client.post(
    "/rest/citajax/ticket/serviceRequestIncident/saveOrUpdate",
    { object: ticketObject, realUrl: REAL_URL },
  );
  return data;
}

export async function lookupDelegationUserId(client, ticketId, userName) {
  try {
    const { data } = await client.get(
      "/pages/delegacaoTarefa/pages/autoCompleteUsersForDelegation/autoCompleteUsersForDelegation.load",
      {
        params: { idSolicitacaoServico: ticketId, query: userName.split(" ")[0] },
        headers: { "Content-Type": undefined, Accept: "text/plain, */*; q=0.01" },
      },
    );
    const nameLower = userName.toLowerCase();
    const idx = (data.suggestions || []).findIndex((s) => s.toLowerCase() === nameLower);
    if (idx >= 0 && data.data?.[idx] != null) return data.data[idx];
    return data.data?.[0] ?? null;
  } catch {
    return null;
  }
}

export async function getTicketItemId(client, ticketId) {
  const { data } = await client.post(
    "/rest/citajax/ticket/serviceRequestIncident/atualizarLista",
    {
      object: {
        paginaSelecionada: 1, palavraChave: "", idSolicitacao: ticketId,
        idTipo: -1, idContrato: -1, idGrupoAtual: -1, tarefaAtual: "Todos",
        exibicao: "", tipoVisualizacao: "", exibicaoSubSolicitacoes: "N",
        situacaoSla: "", ordenarPor: "NSolicitacao", allowCommentOnly: false,
        itensPorPagina: 20, idStatus: null, idStatusFluxo: null,
        totalRequests: 0, totalize: true,
      },
      realUrl: REAL_URL,
    },
  );
  return data?.requests?.[0]?.idItemTrabalho ?? null;
}

export async function delegateTicket(client, { ticketId, itemId, userId, userName, groupId }) {
  const nocache = new Date().toString();
  const baseFields = {
    idSolicitacaoServico: ticketId,
    idTarefa: itemId,
    acaoFluxo: "D",
    idUsuarioDestino: userId,
    txtFiltro: "",
    acUsuario: userName,
    idGrupoDestino: groupId ?? "",
    delegacaoJustificativa: "Agendamento automático",
    nocache,
  };

  // Chama .event primeiro para que o servidor registre o grupo disponível para o usuário destino
  await client.post(
    "/pages/delegacaoTarefa/delegacaoTarefa.event",
    new URLSearchParams({
      ...baseFields,
      idGrupoDestino: "",
      delegacaoJustificativa: "",
      method: "execute",
      parmCount: "3",
      parm1: "delegacaoTarefa",
      parm2: "",
      parm3: "reloadGroupSelect",
    }).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );

  await client.post(
    "/pages/delegacaoTarefa/delegacaoTarefa.save",
    new URLSearchParams(baseFields).toString(),
    { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
  );
}
