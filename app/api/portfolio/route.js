import axios from "axios";

const REAL_URL = "/4biz/citsmartServiceRequestPortfolio/citsmartServiceRequestPortfolio.load";

function makeClient(session, authToken, accept = "application/json, text/plain, */*") {
  return axios.create({
    baseURL: "https://nav.4biz.one/4biz",
    headers: {
      Accept: accept,
      "Accept-Language": "pt-PT,pt;q=0.9,en-US;q=0.8,en;q=0.7",
      "Cache-Control": "no-transform, no-store, no-cache, must-revalidate, post-check=0, pre-check=0",
      Connection: "keep-alive",
      "Content-Type": "application/json",
      DNT: "1",
      Origin: "https://nav.4biz.one",
      Pragma: "no-cache",
      Referer:
        "https://nav.4biz.one/4biz/pages/serviceRequestIncident/serviceRequestIncident.load?iframe=true",
      "Sec-Fetch-Dest": "empty",
      "Sec-Fetch-Mode": "cors",
      "Sec-Fetch-Site": "same-origin",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36",
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

export async function POST(request) {
  try {
    const body = await request.json();
    const { session, authToken, action, ...params } = body;

    if (!authToken) {
      return Response.json({ error: "HYPER-AUTH-TOKEN obrigatório." }, { status: 400 });
    }

    // ── ID do funcionário logado via JWT + busca no 4biz ────────────────────────
    if (action === "my-employee-id") {
      try {
        const parts = authToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf-8"));
          // Usa preferred_username (email/login) ou name como query de busca
          const query = payload.name || payload.preferred_username || payload.given_name || null;
          if (query) {
            const client = makeClient(session, authToken, "text/plain, */*; q=0.01");
            const { data } = await client.get(
              "/pages/serviceRequestIncident/pages/autoCompleteSolicitante/autoCompleteSolicitante.load",
              { params: { query: query.trim() }, headers: { "Content-Type": undefined } },
            );
            const first = (data?.data || [])[0];
            if (first?.idEmpregado) {
              return Response.json({ idEmployee: Number(first.idEmpregado) });
            }
          }
        }
      } catch { /* token inválido ou busca falhou */ }
      return Response.json({ idEmployee: null });
    }

    // ── Busca de portfólios ──────────────────────────────────────────────────
    if (action === "portfolios") {
      const { idEmployee, idUnity } = params;
      const client = makeClient(session, authToken);
      const { data } = await client.post(
        "/rest/citajax/citsmartServiceRequestPortfolio/searchPortfolios",
        {
          object: { idEmployee: idEmployee || null, idUnity: idUnity || null, type: "S", language: "pt", productId: null },
          realUrl: REAL_URL,
        },
      );
      const list = Array.isArray(data) ? data : [];
      const items = list.map(p => ({
        idPortfolio: p.idPortfolio,
        nome: p.nomeApresentacao || p.nome || "",
      }));
      return Response.json(items);
    }

    // ── Busca de serviços de um portfólio ─────────────────────────────────────
    if (action === "services") {
      const { idPortfolio, idEmployee } = params;
      const client = makeClient(session, authToken);
      const { data } = await client.post(
        "/rest/citajax/citsmartServiceRequestPortfolio/searchServices",
        {
          object: { idPortfolio, typePortfolio: "N", idEmployee, type: "S", language: "pt", productId: null },
          realUrl: REAL_URL,
        },
      );
      const items = data.map((s) => ({
        idServico: s.idServico,
        nome: s.nomeApresentacao,
      }));
      return Response.json(items);
    }

    // ── Busca de atividades de um serviço ────────────────────────────────────
    if (action === "activities") {
      const { idPortfolio, idService, idEmployee } = params;
      const client = makeClient(session, authToken);
      const { data } = await client.post(
        "/rest/citajax/citsmartServiceRequestPortfolio/searchActivities",
        {
          object: { idPortfolio, idService, idEmployee, type: "S", language: "pt", productId: null },
          realUrl: REAL_URL,
        },
      );
      const items = data.map((a) => ({
        idAtividade: a.idServico,
        idServicoRelacionado: a.idServicoRelacionado,
        nome: a.nomeApresentacao,
        tipo: a.tipoServico,
      }));
      return Response.json(items);
    }

    // ── Autocomplete de atividade por texto ──────────────────────────────────
    if (action === "search-activity") {
      const { idEmployee, query } = params;
      if (!query || query.trim().length < 2) {
        return Response.json({ suggestions: [], data: [] });
      }
      const client = makeClient(session, authToken, "text/plain, */*; q=0.01");
      // usa GET — retira Content-Type para não causar 500
      const { data } = await client.get(
        "/pages/autoCompleteDirectiveActivity/autoCompleteDirectiveActivity.load",
        {
          params: { ...(idEmployee ? { idEmpregado: idEmployee } : {}), type: "S", productId: "", query: query.trim() },
          headers: { "Content-Type": undefined },
        },
      );
      // data.data é array de JSON strings
      const parsed = (data.data || []).map((item) => {
        try {
          return JSON.parse(item);
        } catch {
          return null;
        }
      }).filter(Boolean);
      return Response.json({ suggestions: data.suggestions || [], items: parsed });
    }

    // ── Info do solicitante (unidade) ────────────────────────────────────────
    if (action === "requester-info") {
      const { idSolicitante } = params;
      const client = makeClient(session, authToken);
      const { data } = await client.post(
        "/rest/citajax/ticket/serviceRequestIncident/getRequesterInfo",
        {
          object: { idSolicitante },
          realUrl: "/4biz/serviceRequestIncident/serviceRequestIncident.load",
        },
      );
      return Response.json({
        idUnidade: data.idUnidade,
        unidade: data.unidade,
      });
    }

    // ── Autocomplete de unidade por texto ───────────────────────────────────
    if (action === "search-unidade") {
      const { query } = params;
      if (!query || query.trim().length < 2) {
        return Response.json({ items: [] });
      }
      const client = makeClient(session, authToken, "text/plain, */*; q=0.01");
      const { data } = await client.get(
        "/pages/serviceRequestIncident/pages/autoCompleteUnidade/autoCompleteUnidade.load",
        {
          params: { query: query.trim() },
          headers: { "Content-Type": undefined },
        },
      );
      const items = (data.suggestions || []).map((suggestion, i) => {
        const parts = suggestion.split("|").map((s) => s.trim());
        return {
          id: data.data?.[i] ?? null,
          nome: parts[0] ?? suggestion,
          sigla: parts[1] ?? "",
          label: suggestion,
        };
      });
      return Response.json({ items });
    }

    // ── Causas de incidente (por idServico) ─────────────────────────────────
    if (action === "causes") {
      const { idServico } = params;
      const client = makeClient(session, authToken);
      const { data } = await client.post(
        "/rest/citajax/ticket/serviceRequestIncident/loadCausesByServiceId",
        { object: idServico ?? null, realUrl: "/4biz/serviceRequestIncident/serviceRequestIncident.load" },
      );
      const items = (Array.isArray(data) ? data : []).map((c) => ({
        id: c.idCausaIncidente,
        nome: c.descricaoCausa,
      }));
      return Response.json({ items });
    }

    // ── Categorias de solução ────────────────────────────────────────────────
    if (action === "solution-categories") {
      const client = makeClient(session, authToken);
      const { data } = await client.post(
        "/rest/citajax/ticket/serviceRequestIncident/loadSolutionCategoriesByCauseId",
        { realUrl: "/4biz/serviceRequestIncident/serviceRequestIncident.load" },
      );
      const items = (Array.isArray(data) ? data : []).map((c) => ({
        id: c.idCategoriaSolucao,
        nome: c.descricaoCategoriaSolucao,
      }));
      return Response.json({ items });
    }

    // ── Busca de IC (Item de Configuração) por identificação/patrimônio ─────
    if (action === "search-ic") {
      const { query } = params;
      if (!query || query.trim().length < 2) return Response.json({ items: [] });
      const client = makeClient(session, authToken);
      const formData = new URLSearchParams({
        idGrupoItemConfiguracao: "", paginaSelecionada: "1",
        isFiltroSomenteFilhos: "false", idItemPai: "", isSelectMany: "S",
        idsAlreadyLinked: "", filtroIdentificacao: query.trim(),
        filtroNome: "", nomeGrupoItemConfiguracao: "",
        dataInicio: "", dataFim: "", filtroStatus: "", filtroCriticidade: "",
        method: "execute", parmCount: "3",
        parm1: "pesquisaItemConfiguracao", parm2: "", parm3: "pesquisarItemConfiguracao",
      });
      const { data } = await client.post(
        "/pages/pesquisaItemConfiguracao/pesquisaItemConfiguracao.event",
        formData.toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
      );
      const items = [];
      const re = /popupAtivos\(\s*(\d+)\s*,\s*\\#33#(.*?)\\#33#\s*,\s*\\#33#(.*?)\\#33#\s*,\s*\\#33#(.*?)\\#33#\s*,\s*\\#33#(.*?)\\#33#\s*\)/g;
      let m;
      while ((m = re.exec(String(data))) !== null) {
        items.push({
          idItemConfiguracao: parseInt(m[1]),
          identificacao: m[2].replace(/\\u003[Cc]/g, "<").replace(/\\u003[Ee]/g, ">"),
          nomeItemConfiguracao: m[3],
          nomeGrupoItemConfiguracao: m[5] || "",
        });
      }
      return Response.json({ items });
    }

    // ── Autocomplete de usuário para delegação ───────────────────────────────
    if (action === "search-technician") {
      const { query } = params;
      if (!query || query.trim().length < 2) return Response.json({ items: [] });
      const client = makeClient(session, authToken, "text/plain, */*; q=0.01");
      const { data } = await client.get(
        "/pages/serviceRequestIncident/pages/autoCompleteSolicitante/autoCompleteSolicitante.load",
        { params: { query: query.trim() }, headers: { "Content-Type": undefined } },
      );
      const items = (data.data || []).map((p) => ({
        idEmpregado: p.idEmpregado,
        nome: p.nome,
        email: p.email || "",
      })).filter((p) => p.idEmpregado);
      return Response.json({ items });
    }

    // ── Listar grupos/filas ──────────────────────────────────────────────────
    if (action === "search-group") {
      const client = makeClient(session, authToken);
      const { data } = await client.post(
        "/rest/citajax/ticket/serviceRequestIncident/carregarComboGrupoAtual",
        { object: { idSolicitacaoServico: null }, realUrl: "/4biz/serviceRequestIncident/serviceRequestIncident.load" },
      );
      const list = Array.isArray(data) ? data : [];
      const items = list.map((g) => ({ id: g.idGrupo, nome: g.nome })).filter((g) => g.id != null);
      return Response.json({ items });
    }

    // ── Busca de conhecimentos ───────────────────────────────────────────────
    if (action === "search-knowledge") {
      const { query } = params;
      const client = makeClient(session, authToken);
      const { data } = await client.post(
        "/rest/citajax/LookupAngular/searchList",
        {
          object: {
            lookupName: "LOOKUP_CONHECIMENTO_RELACIONADO",
            mapSearchFields: { titulo: query || "" },
            colCamposChave: [{ nomeFisico: "idbaseconhecimento", strValue: "" }],
            hiddenValues: {},
            pagination: { totalItems: 0, selectedPage: 1, totalByPage: 10, maxSize: 10 },
          },
          realUrl: "/4biz/LookupAngular/LookupAngular.load",
        },
      );
      const items = (data.searchResults || []).map(([id, titulo]) => ({ id, titulo }));
      return Response.json({ items });
    }

    return Response.json({ error: "Action inválida." }, { status: 400 });
  } catch (err) {
    if (err.response) {
      const body =
        typeof err.response.data === "string"
          ? err.response.data.slice(0, 1000)
          : JSON.stringify(err.response.data).slice(0, 1000);
      console.error("[portfolio] status:", err.response.status, "body:", body);
      return Response.json(
        { error: `Erro da API 4Biz: ${err.response.status}`, detail: body },
        { status: err.response.status },
      );
    }
    console.error("[portfolio] erro interno:", err.message);
    return Response.json({ error: err.message }, { status: 500 });
  }
}
