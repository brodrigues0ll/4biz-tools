"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { idbLoad, idbSave } from "@/lib/idb";
import { useSession } from "next-auth/react";

// ── Template padrão ──────────────────────────────────────────────────────────

const DEFAULT_DESC_PLAIN =
  "Implementação da solução LAPS (Local Administrator Password Solution) no dispositivo {{patrimonio}}, conforme políticas de Segurança da Informação.\nAtividades realizadas:\n• Exclusão dos perfis de administradores locais existentes;\n• Manutenção apenas da conta padrão Administrador, visando conformidade com a política;\n• Inclusão do equipamento no grupo de gerenciamento do LAPS;\n• Atualização da planilha de controle conforme procedimento interno.\n\nAdequação do equipamento às diretrizes de segurança, garantindo o gerenciamento seguro da senha do administrador local e a mitigação de riscos.";

function descPlainToHtml(text) {
  return "<div>" + text.trim().replace(/\n/g, "<br>") + "</div>";
}

function descHtmlToPlain(html) {
  return html
    .replace(/<div>/gi, "")
    .replace(/<\/div>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .trim();
}

const DEFAULT_TEMPLATE_OBJ = {
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
  userGroup: [
    { key: "Grupo", number: 0 },
    { key: " email.type.user", number: 1 },
  ],
  problems: [],
  changes: [],
  releases: [],
  configurationItems: [],
  knowledges: [],
  listUserConfigurationItems: [],
  project: {},
  signatures: [],
  enviaEmailCriacao: true,
  enviaEmailFinalizacao: true,
  enviaEmailAcoes: true,
  intelligenceCenterConfigured: false,
  dzUuid: "10e4",
  idUsuarioResponsavelAtual: 964,
  responsavel: "Bernardo Rodrigues Gomes",
  solicitante: "Nome do Solicitante",
  idSolicitante: 825,
  telefone: "000000000000",
  ramal: null,
  email: "solicitante@empresa.gov.br",
  idUnidade: 27,
  unidade: "Nome da Unidade",
  templates: [],
  origemContato: 14,
  idServico: 219,
  tipo: "R",
  idServicoNegocioTecnico: 218,
  nomeServico: "Redes de Computadores",
  idAcordoNivelServico: 3,
  sla: "24:00",
  slaColor: "#017301",
  descricao: descPlainToHtml(DEFAULT_DESC_PLAIN),
  builderObjects: {
    _businessObjects: [
      {
        applicationName: "AplicacaoParaAtendimentos",
        businessObjectName: "NavAtendimentos",
        model: "navAtendimentos",
      },
    ],
    navAtendimentos: {
      rlc_unidadesnav: null,
      rlc_unidadesCadastradasNav: {
        datainicio: "2024-06-06",
        sigla: "SBME ",
        aceitaentregaproduto: "N",
        nome: "DNME - Macaé",
        idendereco: 33,
        descricao: "",
        idempresa: 1,
        idunidade: 33,
        email: "",
        fillColumn: "DNME - Macaé",
        key_0: 33,
      },
      idUnidadeNav: 33,
      "rlc_unidadesCadastradasNav.nome": "DNME - Macaé",
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
    userGroup: [
      { key: "Grupo", number: 0 },
      { key: " email.type.user", number: 1 },
    ],
  },
};

const DEFAULT_TEMPLATE = JSON.stringify(DEFAULT_TEMPLATE_OBJ, null, 2);

const BLANK_TEMPLATE = JSON.stringify({
  ...DEFAULT_TEMPLATE_OBJ,
  solicitante: "",
  idSolicitante: null,
  email: "",
  idUnidade: null,
  unidade: "",
  idServico: null,
  idServicoNegocioTecnico: null,
  nomeServico: "",
  descricao: "",
  knowledges: [],
  builderObjects: {
    _businessObjects: DEFAULT_TEMPLATE_OBJ.builderObjects._businessObjects,
    navAtendimentos: {
      rlc_unidadesnav: null,
      rlc_unidadesCadastradasNav: null,
      idUnidadeNav: null,
      "rlc_unidadesCadastradasNav.nome": "",
      telefone: "0",
      numeroPatrimonio: "{{patrimonio}}",
      tipoSolicitacao: "configuracao",
    },
  },
}, null, 2);

// ── Hooks de autocomplete ────────────────────────────────────────────────────

function useSolicitanteSearch(session, authToken) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const timer = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (!q || q.length < 2) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      if (!authToken) return;
      setLoading(true);
      try {
        const res  = await fetch("/api/solicitante-search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, authToken, query: q }),
        });
        const json = await res.json();
        setItems(json.data || []);
        setOpen(true);
      } catch { /* silencia */ }
      finally { setLoading(false); }
    }, 300);
  }, [session, authToken]);

  return { items, loading, open, setOpen, query, setQuery, search };
}

function useTecnicoSearch(session, authToken) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const timer = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (!q || q.length < 2) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      if (!authToken) return;
      setLoading(true);
      try {
        const res  = await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, authToken, action: "search-technician", query: q }),
        });
        const json = await res.json();
        setItems(json.items || []);
        setOpen(true);
      } catch { /* silencia */ }
      finally { setLoading(false); }
    }, 300);
  }, [session, authToken]);

  return { items, loading, open, setOpen, query, setQuery, search };
}

function useSearch(session, authToken, action, extraParams = {}) {
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]     = useState(false);
  const [query, setQuery]   = useState("");
  const timer = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    clearTimeout(timer.current);
    if (!q || q.length < 2) { setItems([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      if (!authToken) return;
      setLoading(true);
      try {
        const res  = await fetch("/api/portfolio", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ session, authToken, action, query: q, ...extraParams }),
        });
        const json = await res.json();
        setItems(json.items || json.data || []);
        setOpen(true);
      } catch { /* silencia */ }
      finally { setLoading(false); }
    }, 300);
  }, [session, authToken, action, JSON.stringify(extraParams)]);

  return { items, loading, open, setOpen, query, setQuery, search };
}

function useGroupSearch(session, authToken) {
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [query, setQuery]         = useState("");

  useEffect(() => {
    if (!authToken) return;
    setLoading(true);
    fetch("/api/portfolio", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session, authToken, action: "search-group" }),
    })
      .then((r) => r.json())
      .then((json) => setAllGroups(json.items || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [session, authToken]);

  const items = query.trim()
    ? allGroups.filter((g) => g.nome.toLowerCase().includes(query.toLowerCase()))
    : allGroups;

  const search = useCallback((q) => { setQuery(q); setOpen(true); }, []);

  return { items, loading, open, setOpen, query, setQuery, search };
}

// ── Componente principal ─────────────────────────────────────────────────────

export default function Home() {
  const { data: sessionData } = useSession();
  const canVerAvancado  = sessionData?.isAdmin || sessionData?.permissions?.abertura?.verAvancado;
  const canCriacaoEmLote = sessionData?.isAdmin || sessionData?.permissions?.abertura?.criacaoEmLote;

  const [session, setSession]       = useState("");
  const [authToken, setAuthToken]   = useState("");
  const [patrimoniosText, setPatrimoniosText] = useState("");
  const [templateStr, setTemplateStr] = useState(BLANK_TEMPLATE);
  const [templateError, setTemplateError] = useState("");
  const [descricao, setDescricao]   = useState("");

  const [selectedSolicitante, setSelectedSolicitante] = useState(null);
  const [selectedActivity, setSelectedActivity]       = useState(null);
  const [selectedUnidade, setSelectedUnidade]         = useState(null);
  const [selectedKnowledges, setSelectedKnowledges]   = useState([]);
  const [selectedTecnico, setSelectedTecnico]         = useState(null);
  const [selectedGroup, setSelectedGroup]             = useState(null);

  const [results, setResults]   = useState([]);
  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const [activeTab, setActiveTab] = useState("config");
  const [idbReady, setIdbReady] = useState(false);

  const [tplModalOpen, setTplModalOpen] = useState(false);
  const [tplList, setTplList]           = useState([]);
  const [tplLoading, setTplLoading]     = useState(false);

  const abortRef    = useRef(null);
  const saveTimerRef = useRef(null);

  const sol  = useSolicitanteSearch(session, authToken);
  const act  = useSearch(session, authToken, "search-activity",
    selectedSolicitante ? { idEmployee: selectedSolicitante.idEmpregado } : {});
  const unid = useSearch(session, authToken, "search-unidade");
  const know = useSearch(session, authToken, "search-knowledge");
  const tec  = useTecnicoSearch(session, authToken);
  const grp  = useGroupSearch(session, authToken);

  const solRef  = useRef(null);
  const actRef  = useRef(null);
  const unidRef = useRef(null);
  const knowRef = useRef(null);
  const tecRef  = useRef(null);
  const grpRef  = useRef(null);

  // ── Carrega do IndexedDB na montagem ────────────────────────────────────────
  useEffect(() => {
    Promise.all([idbLoad("state"), idbLoad("auth")]).then(([saved, auth]) => {
      if (auth?.session)   setSession(auth.session);
      if (auth?.authToken) setAuthToken(auth.authToken);
      if (saved) {
        if (saved.templateStr)    setTemplateStr(saved.templateStr);
        if (saved.patrimoniosText) setPatrimoniosText(saved.patrimoniosText);
        if (saved.descricao != null) setDescricao(saved.descricao);
        if (saved.selectedSolicitante) {
          setSelectedSolicitante(saved.selectedSolicitante);
          sol.setQuery(saved.selectedSolicitante.nome);
        }
        if (saved.selectedActivity) {
          setSelectedActivity(saved.selectedActivity);
          act.setQuery((saved.selectedActivity.nomeComHierarquia || saved.selectedActivity.nome || "").split(" > ").pop());
        }
        if (saved.selectedUnidade) {
          setSelectedUnidade(saved.selectedUnidade);
          unid.setQuery(saved.selectedUnidade.nome);
        }
        if (saved.selectedKnowledges) setSelectedKnowledges(saved.selectedKnowledges);
        if (saved.selectedTecnico) {
          setSelectedTecnico(saved.selectedTecnico);
          tec.setQuery(saved.selectedTecnico.nome);
        }
        if (saved.selectedGroup) {
          setSelectedGroup(saved.selectedGroup);
          grp.setQuery(saved.selectedGroup.nome);
        }
      }
      setIdbReady(true);
    });
  }, []);

  // ── Salva no IndexedDB com debounce de 800ms ─────────────────────────────
  useEffect(() => {
    if (!idbReady) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      idbSave({
        templateStr, patrimoniosText, descricao,
        selectedSolicitante, selectedActivity, selectedUnidade,
        selectedKnowledges, selectedTecnico, selectedGroup,
      });
    }, 800);
  }, [
    templateStr, patrimoniosText, descricao,
    selectedSolicitante, selectedActivity, selectedUnidade,
    selectedKnowledges, selectedTecnico, selectedGroup,
    idbReady,
  ]);

  // ── Fecha dropdowns ao clicar fora ──────────────────────────────────────────
  useEffect(() => {
    function handler(e) {
      if (solRef.current  && !solRef.current.contains(e.target))  sol.setOpen(false);
      if (actRef.current  && !actRef.current.contains(e.target))  act.setOpen(false);
      if (unidRef.current && !unidRef.current.contains(e.target)) unid.setOpen(false);
      if (knowRef.current && !knowRef.current.contains(e.target)) know.setOpen(false);
      if (tecRef.current  && !tecRef.current.contains(e.target))  tec.setOpen(false);
      if (grpRef.current  && !grpRef.current.contains(e.target))  grp.setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function patchTemplate(patch) {
    setTemplateStr(prev => {
      try {
        const obj = JSON.parse(prev);
        Object.assign(obj, patch);
        return JSON.stringify(obj, null, 2);
      } catch { return prev; }
    });
    setTemplateError("");
  }

  async function selectSolicitante(person) {
    setSelectedSolicitante(person);
    sol.setQuery(person.nome);
    sol.setOpen(false);
    setSelectedActivity(null);
    act.setQuery("");

    const patch = { solicitante: person.nome, idSolicitante: person.idEmpregado, email: person.email };
    try {
      const res  = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, authToken, action: "requester-info", idSolicitante: person.idEmpregado }),
      });
      const json = await res.json();
      if (res.ok && json.idUnidade) { patch.idUnidade = json.idUnidade; patch.unidade = json.unidade; }
    } catch { /* silencia */ }
    patchTemplate(patch);
  }

  function selectActivity(item) {
    setSelectedActivity(item);
    act.setQuery((item.nomeComHierarquia || item.nome || "").split(" > ").pop());
    act.setOpen(false);
    const parts = (item.nomeComHierarquia || "").split(" > ");
    const nomeServico = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    patchTemplate({ idServico: item.idAtividade, idServicoNegocioTecnico: item.idServico, nomeServico, nomeAtividade: item.nomeComHierarquia || item.nome });
  }

  function selectUnidade(unit) {
    setSelectedUnidade(unit);
    unid.setQuery(unit.nome);
    unid.setOpen(false);
    setTemplateStr(prev => {
      try {
        const obj = JSON.parse(prev);
        const nav = obj.builderObjects.navAtendimentos;
        nav.idUnidadeNav = unit.id;
        nav["rlc_unidadesCadastradasNav.nome"] = unit.nome;
        nav.rlc_unidadesCadastradasNav = {
          ...nav.rlc_unidadesCadastradasNav,
          nome: unit.nome, sigla: unit.sigla, idunidade: unit.id, fillColumn: unit.nome, key_0: unit.id,
        };
        return JSON.stringify(obj, null, 2);
      } catch { return prev; }
    });
    setTemplateError("");
  }

  function selectGroup(g) {
    setSelectedGroup(g);
    grp.setQuery(g.nome);
    grp.setOpen(false);
    patchTemplate({ idGrupoAtual: Number(g.id), nomeGrupoAtual: g.nome });
  }

  function selectTecnico(person) {
    setSelectedTecnico(person);
    tec.setQuery(person.nome);
    tec.setOpen(false);
    patchTemplate({ idUsuarioResponsavelAtual: Number(person.idEmpregado), responsavel: person.nome });
  }

  function selectKnowledge(item) {
    know.setQuery("");
    know.setOpen(false);
    if (selectedKnowledges.some((k) => k.id === item.id)) return;
    const next = [...selectedKnowledges, item];
    setSelectedKnowledges(next);
    patchTemplate({ knowledges: next.map((k) => ({ idBaseConhecimento: k.id, titulo: k.titulo })) });
  }

  function removeKnowledge(id) {
    const next = selectedKnowledges.filter((k) => k.id !== id);
    setSelectedKnowledges(next);
    patchTemplate({ knowledges: next.map((k) => ({ idBaseConhecimento: k.id, titulo: k.titulo })) });
  }

  function handleDescricaoChange(text) {
    setDescricao(text);
    patchTemplate({ descricao: descPlainToHtml(text) });
  }

  function validateTemplate(str) {
    try {
      JSON.parse(str);
      setTemplateError("");
      return true;
    } catch (e) {
      setTemplateError(e.message);
      return false;
    }
  }

  const patrimonios = patrimoniosText
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  // ── Criação em lote ──────────────────────────────────────────────────────────
  async function handleCreate() {
    if (!authToken) return alert("Preencha SESSION e HYPER-AUTH-TOKEN.");
    if (patrimonios.length === 0) return alert("Adicione ao menos um número de patrimônio.");
    if (!validateTemplate(templateStr)) {
      alert("O template JSON está inválido.");
      return setActiveTab("template");
    }

    setResults([]);
    setDone(false);
    setRunning(true);
    setActiveTab("results");
    setResults(patrimonios.map((p) => ({ patrimonio: p, status: "pending" })));

    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const resp = await fetch("/api/create-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, authToken, patrimonios, templateStr, tecnico: selectedTecnico ? { nome: selectedTecnico.nome } : null }),
        signal: controller.signal,
      });
      const reader  = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done: sd } = await reader.read();
        if (sd) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const evt = JSON.parse(line.slice(6));
          if (evt.done) { setDone(true); break; }
          setResults((prev) => {
            const next = [...prev];
            next[evt.index] = { patrimonio: evt.patrimonio, status: evt.success ? "success" : "error", ticketId: evt.ticketId, error: evt.error };
            return next;
          });
        }
      }
    } catch (err) {
      if (err.name !== "AbortError") alert("Erro de conexão: " + err.message);
    } finally {
      setRunning(false);
    }
  }

  function handleAbort() {
    abortRef.current?.abort();
    setRunning(false);
  }

  async function openTemplateModal() {
    setTplModalOpen(true);
    setTplLoading(true);
    try {
      const res  = await fetch("/api/close-templates?tipo=abertura");
      const data = await res.json();
      setTplList(Array.isArray(data) ? data : []);
    } catch { setTplList([]); }
    finally { setTplLoading(false); }
  }

  function applyTemplate(t) {
    if (t.solicitante?.idEmpregado) {
      setSelectedSolicitante(t.solicitante);
      sol.setQuery(t.solicitante.nome);
      patchTemplate({ solicitante: t.solicitante.nome, idSolicitante: t.solicitante.idEmpregado, email: t.solicitante.email || "" });
    }
    if (t.atividade?.idAtividade) {
      setSelectedActivity(t.atividade);
      act.setQuery((t.atividade.nomeComHierarquia || "").split(" > ").pop());
      const parts = (t.atividade.nomeComHierarquia || "").split(" > ");
      const nomeServico = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
      patchTemplate({ idServico: t.atividade.idAtividade, idServicoNegocioTecnico: t.atividade.idServico, nomeServico });
    }
    if (t.unidade?.id) {
      setSelectedUnidade(t.unidade);
      unid.setQuery(t.unidade.nome);
      try {
        const obj = JSON.parse(templateStr);
        const nav = obj.builderObjects.navAtendimentos;
        nav.idUnidadeNav = t.unidade.id;
        nav["rlc_unidadesCadastradasNav.nome"] = t.unidade.nome;
        nav.rlc_unidadesCadastradasNav = { ...nav.rlc_unidadesCadastradasNav, nome: t.unidade.nome, sigla: t.unidade.sigla, idunidade: t.unidade.id, fillColumn: t.unidade.nome, key_0: t.unidade.id };
        setTemplateStr(JSON.stringify(obj, null, 2));
        setTemplateError("");
      } catch { /* template inválido */ }
    }
    if (t.grupo?.id) {
      patchTemplate({ idGrupoAtual: t.grupo.id });
    }
    if (t.descricao) {
      setDescricao(t.descricao);
      patchTemplate({ descricao: descPlainToHtml(t.descricao) });
    }
    if ((t.conhecimentos || []).length > 0) {
      const knowledges = t.conhecimentos.map((k) => ({ id: k.id, titulo: k.titulo }));
      setSelectedKnowledges(knowledges);
      patchTemplate({ knowledges: knowledges.map((k) => ({ idBaseConhecimento: k.id, titulo: k.titulo })) });
    }
    setTplModalOpen(false);
  }

  const noAuth       = idbReady && !session && !authToken;
  const successCount = results.filter((r) => r.status === "success").length;
  const errorCount   = results.filter((r) => r.status === "error").length;
  const pendingCount = results.filter((r) => r.status === "pending").length;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Cabeçalho */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-3">
        <h1 className="font-semibold text-white text-sm sm:text-base">Abrir Chamados</h1>
        <div className="ml-auto flex items-center gap-3">
          {noAuth && (
            <a href="/settings" className="text-xs text-yellow-500 hover:text-yellow-400">
              ⚠ Autenticação não configurada
            </a>
          )}
          <button onClick={openTemplateModal}
            className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Importar Template
          </button>
          {idbReady && <span className="text-xs text-gray-600">● salvo automaticamente</span>}
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-800 px-4 sm:px-6 flex gap-1 overflow-x-auto">
        {[
          { id: "config",   label: "Configuração",                              show: true },
          { id: "template", label: "Avançado",                                  show: canVerAvancado },
          { id: "results",  label: `Resultados${results.length ? ` (${results.length})` : ""}`, show: true },
        ].filter((t) => t.show).map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-3 sm:px-4 py-3 text-xs sm:text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-gray-400 hover:text-gray-200"
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 sm:p-6 max-w-5xl mx-auto w-full">

        {/* ABA: CONFIGURAÇÃO */}
        {activeTab === "config" && (
          <div className="space-y-4 sm:space-y-5">

            {/* Campos do chamado */}
            <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h2 className="font-semibold text-white mb-4 text-sm">Dados do Chamado</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Solicitante */}
                <div>
                  <span className="text-xs text-gray-400 mb-1 block">Solicitante</span>
                  <div ref={solRef} className="relative">
                    <div className="relative">
                      <input type="text" value={sol.query}
                        onChange={(e) => sol.search(e.target.value)}
                        onFocus={() => sol.items.length > 0 && sol.setOpen(true)}
                        placeholder={noAuth ? "Configure a autenticação" : "Digite o nome…"}
                        disabled={noAuth}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                      />
                      {sol.loading && <span className="absolute right-3 top-1.5 text-gray-500 text-xs">…</span>}
                    </div>
                    {sol.open && sol.items.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {sol.items.map((p) => (
                          <button key={p.idEmpregado} type="button"
                            onMouseDown={() => selectSolicitante(p)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                            <div className="text-xs text-white">{p.nome}</div>
                            <div className="text-xs text-gray-400">{p.email}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedSolicitante && (
                    <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-blue-200 truncate">{selectedSolicitante.nome}</div>
                        <div className="text-xs text-blue-400 truncate">{selectedSolicitante.email}</div>
                      </div>
                      <button type="button" onClick={() => { setSelectedSolicitante(null); sol.setQuery(""); }}
                        className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
                    </div>
                  )}
                </div>

                {/* Atividade */}
                <div>
                  <span className="text-xs text-gray-400 mb-1 block">Atividade</span>
                  <div ref={actRef} className="relative">
                    <div className="relative">
                      <input type="text" value={act.query}
                        onChange={(e) => act.search(e.target.value)}
                        onFocus={() => act.items.length > 0 && act.setOpen(true)}
                        placeholder={!selectedSolicitante ? "Selecione o solicitante primeiro" : "Buscar atividade…"}
                        disabled={!selectedSolicitante || noAuth}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                      />
                      {act.loading && <span className="absolute right-3 top-1.5 text-gray-500 text-xs">…</span>}
                    </div>
                    {act.open && act.items.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {act.items.map((item) => (
                          <button key={item.idAtividade} type="button"
                            onMouseDown={() => selectActivity(item)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                            <div className="text-xs text-white">{item.nomeComHierarquia || item.nome}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedActivity && (
                    <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                      <div className="flex-1 min-w-0 text-xs text-blue-200 truncate">
                        {(selectedActivity.nomeComHierarquia || selectedActivity.nome || "").split(" > ").pop()}
                      </div>
                      <button type="button" onClick={() => { setSelectedActivity(null); act.setQuery(""); }}
                        className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
                    </div>
                  )}
                </div>

                {/* Unidade do Equipamento */}
                <div>
                  <span className="text-xs text-gray-400 mb-1 block">Unidade do Equipamento</span>
                  <div ref={unidRef} className="relative">
                    <div className="relative">
                      <input type="text" value={unid.query}
                        onChange={(e) => unid.search(e.target.value)}
                        onFocus={() => unid.items.length > 0 && unid.setOpen(true)}
                        placeholder={noAuth ? "Configure a autenticação" : "Buscar unidade…"}
                        disabled={noAuth}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                      />
                      {unid.loading && <span className="absolute right-3 top-1.5 text-gray-500 text-xs">…</span>}
                    </div>
                    {unid.open && unid.items.length > 0 && (
                      <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
                        {unid.items.map((u) => (
                          <button key={u.id} type="button"
                            onMouseDown={() => selectUnidade(u)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                            <div className="text-xs text-white">{u.nome}</div>
                            {u.sigla && <div className="text-xs text-gray-400">{u.sigla}</div>}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedUnidade && (
                    <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                      <div className="flex-1 min-w-0 text-xs text-blue-200 truncate">{selectedUnidade.nome}</div>
                      <button type="button" onClick={() => { setSelectedUnidade(null); unid.setQuery(""); }}
                        className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
                    </div>
                  )}
                </div>

                {/* Fila de Atendimento */}
                <div>
                  <span className="text-xs text-gray-400 mb-1 block">Fila de Atendimento</span>
                  <div ref={grpRef} className="relative">
                    <div className="relative">
                      <input type="text" value={grp.query}
                        onChange={(e) => grp.search(e.target.value)}
                        onFocus={() => grp.setOpen(true)}
                        placeholder={noAuth ? "Configure a autenticação" : grp.loading ? "Carregando filas…" : "Buscar fila…"}
                        disabled={noAuth}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                      />
                      {grp.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
                      {grp.open && grp.items.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {grp.items.map((g) => (
                            <button key={g.id} type="button"
                              onMouseDown={() => selectGroup(g)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0 text-xs text-gray-200">
                              {g.nome}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedGroup ? (
                    <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                      <div className="flex-1 min-w-0 text-xs text-blue-200 truncate">{selectedGroup.nome}</div>
                      <button type="button" onClick={() => { setSelectedGroup(null); grp.setQuery(""); patchTemplate({ idGrupoAtual: 2, nomeGrupoAtual: null }); }}
                        className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-600 mt-1">Se não selecionada, usa o Helpdesk (padrão).</p>
                  )}
                </div>

                {/* Técnico Responsável */}
                <div className="sm:col-span-2">
                  <span className="text-xs text-gray-400 mb-1 block">
                    Técnico Responsável <span className="text-gray-600">(opcional)</span>
                  </span>
                  <div ref={tecRef} className="relative">
                    <div className="relative">
                      <input type="text" value={tec.query}
                        onChange={(e) => tec.search(e.target.value)}
                        onFocus={() => tec.items.length > 0 && tec.setOpen(true)}
                        placeholder={noAuth ? "Configure a autenticação" : "Buscar técnico…"}
                        disabled={noAuth}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                      />
                      {tec.loading && <span className="absolute right-3 top-1.5 text-gray-500 text-xs">…</span>}
                      {tec.open && tec.items.length > 0 && (
                        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                          {tec.items.map((p) => (
                            <button key={p.idEmpregado} type="button"
                              onMouseDown={() => selectTecnico(p)}
                              className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                              <div className="text-xs text-white">{p.nome}</div>
                              <div className="text-xs text-gray-400">{p.email}</div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {selectedTecnico && (
                    <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-blue-200 truncate">{selectedTecnico.nome}</div>
                        <div className="text-xs text-blue-400 truncate">{selectedTecnico.email}</div>
                      </div>
                      <button type="button" onClick={() => { setSelectedTecnico(null); tec.setQuery(""); patchTemplate({ idUsuarioResponsavelAtual: undefined, responsavel: "" }); }}
                        className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
                    </div>
                  )}
                </div>

              </div>
            </section>

            {/* Texto do Chamado + Patrimônios */}
            <div className={`grid grid-cols-1 ${canCriacaoEmLote ? "sm:grid-cols-2" : ""} gap-4`}>
              <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                <h2 className="font-semibold text-white mb-1 text-sm">Texto do Chamado</h2>
                <p className="text-xs text-gray-500 mb-3">
                  Use <span className="text-yellow-400 font-mono">{"{{patrimonio}}"}</span> onde o número deve aparecer.
                </p>
                <textarea value={descricao} onChange={(e) => handleDescricaoChange(e.target.value)}
                  rows={10} spellCheck={false}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100 focus:outline-none focus:border-blue-500 resize-y font-mono"
                />
              </section>

              {canCriacaoEmLote ? (
                <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <h2 className="font-semibold text-white mb-1 text-sm">Números de Patrimônio</h2>
                  <p className="text-xs text-gray-500 mb-3">Um por linha.</p>
                  <textarea value={patrimoniosText} onChange={(e) => setPatrimoniosText(e.target.value)}
                    placeholder={"14345954\n98765432\n11223344"}
                    rows={10}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:border-blue-500 resize-y"
                  />
                  {patrimonios.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {patrimonios.length} patrimônio{patrimonios.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </section>
              ) : (
                <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <h2 className="font-semibold text-white mb-1 text-sm">Número de Patrimônio</h2>
                  <p className="text-xs text-gray-500 mb-3">Número do equipamento para o chamado.</p>
                  <input
                    type="text"
                    value={patrimoniosText}
                    onChange={(e) => setPatrimoniosText(e.target.value)}
                    placeholder="Ex: 14345954"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm font-mono text-gray-100 focus:outline-none focus:border-blue-500"
                  />
                </section>
              )}
            </div>

            {/* Base de Conhecimento */}
            <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
              <h2 className="font-semibold text-white mb-3 text-sm">Base de Conhecimento</h2>
              <div ref={knowRef} className="relative">
                <div className="relative">
                  <input type="text" value={know.query}
                    onChange={(e) => know.search(e.target.value)}
                    onFocus={() => know.items.length > 0 && know.setOpen(true)}
                    placeholder={noAuth ? "Configure a autenticação" : "Buscar artigo…"}
                    disabled={noAuth}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
                  />
                  {know.loading && <span className="absolute right-3 top-1.5 text-gray-500 text-xs">…</span>}
                </div>
                {know.open && know.items.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                    {know.items.map((k) => (
                      <button key={k.id} type="button"
                        onMouseDown={() => selectKnowledge(k)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0 text-xs text-gray-200">
                        {k.titulo}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedKnowledges.length > 0 && (
                <ul className="mt-2 space-y-1">
                  {selectedKnowledges.map((k) => (
                    <li key={k.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-gray-300 truncate">{k.titulo}</span>
                      <button type="button" onClick={() => removeKnowledge(k.id)}
                        className="text-gray-600 hover:text-red-400 text-xs ml-2 shrink-0">✕</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Ações */}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={handleCreate} disabled={running}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm">
                {running ? "Criando chamados…" : `Abrir ${patrimonios.length || ""} chamado${patrimonios.length !== 1 ? "s" : ""}`}
              </button>
              {running && (
                <button onClick={handleAbort}
                  className="px-4 py-2.5 bg-red-900 hover:bg-red-800 text-red-300 font-semibold rounded-lg text-sm">
                  Cancelar
                </button>
              )}
            </div>
          </div>
        )}

        {/* ABA: AVANÇADO */}
        {activeTab === "template" && (
          <div className="space-y-4">
            <div className="bg-gray-900 rounded-xl p-4 sm:p-5 border border-gray-800">
              <h2 className="font-semibold text-white mb-1 text-sm">Configuração Avançada</h2>
              <p className="text-xs text-gray-400 mb-3">
                Estrutura completa do chamado. Use{" "}
                <span className="text-yellow-400 font-mono">{"{{patrimonio}}"}</span> em qualquer campo de texto.
              </p>
              <textarea value={templateStr}
                onChange={(e) => { setTemplateStr(e.target.value); validateTemplate(e.target.value); }}
                rows={30} spellCheck={false}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs font-mono text-gray-100 focus:outline-none focus:border-blue-500 resize-y"
              />
              {templateError ? (
                <p className="text-red-400 text-xs mt-2">Estrutura inválida: {templateError}</p>
              ) : (
                <p className="text-green-500 text-xs mt-2">✓ Estrutura válida</p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setTemplateStr(DEFAULT_TEMPLATE); setTemplateError(""); setDescricao(DEFAULT_DESC_PLAIN); }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
                Restaurar padrão
              </button>
              <button onClick={() => setActiveTab("config")}
                className="px-4 py-2 text-gray-400 hover:text-gray-200 text-sm">
                ← Voltar
              </button>
            </div>
          </div>
        )}

        {/* ABA: RESULTADOS */}
        {activeTab === "results" && (
          <div className="space-y-4">
            {results.length > 0 && (
              <div className="flex gap-3 flex-wrap">
                {[
                  { label: "Total",      val: results.length, color: "white" },
                  { label: "Criados",    val: successCount,   color: "green-400" },
                  { label: "Erros",      val: errorCount,     color: "red-400" },
                  ...(pendingCount > 0 ? [{ label: "Aguardando", val: pendingCount, color: "yellow-400" }] : []),
                ].map(({ label, val, color }) => (
                  <div key={label} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-3 text-center min-w-20">
                    <div className={`text-2xl font-bold text-${color}`}>{val}</div>
                    <div className="text-xs text-gray-400">{label}</div>
                  </div>
                ))}
                {done && <div className="flex items-center px-3 text-green-400 text-sm font-medium">✓ Concluído</div>}
              </div>
            )}

            {results.length === 0 ? (
              <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center text-gray-500">
                Nenhum chamado iniciado ainda.
              </div>
            ) : (
              <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-x-auto">
                <table className="w-full text-sm min-w-120">
                  <thead>
                    <tr className="border-b border-gray-800 text-left">
                      <th className="px-4 py-3 text-gray-400 font-medium w-8">#</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">Patrimônio</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">Status</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">Chamado</th>
                      <th className="px-4 py-3 text-gray-400 font-medium">Detalhe</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r, i) => (
                      <tr key={i} className="border-b border-gray-800/50 last:border-0">
                        <td className="px-4 py-3 text-gray-500">{i + 1}</td>
                        <td className="px-4 py-3 font-mono text-gray-200">{r.patrimonio}</td>
                        <td className="px-4 py-3">
                          {r.status === "pending"  && <span className="text-yellow-400 text-xs">⏳ aguardando</span>}
                          {r.status === "success"  && <span className="text-green-400 text-xs">✓ criado</span>}
                          {r.status === "error"    && <span className="text-red-400 text-xs">✗ erro</span>}
                        </td>
                        <td className="px-4 py-3">
                          {r.ticketId
                            ? <span className="text-blue-400 font-mono">#{r.ticketId}</span>
                            : <span className="text-gray-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{r.error || ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {successCount > 0 && done && (
              <button
                onClick={() => {
                  const ids = results.filter((r) => r.status === "success").map((r) => `${r.patrimonio}\t#${r.ticketId}`).join("\n");
                  navigator.clipboard.writeText(ids);
                }}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm">
                Copiar patrimônio ↔ chamado
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de templates */}
      {tplModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setTplModalOpen(false)}>
          <div className="bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
              <h2 className="font-semibold text-white text-sm">Selecionar Template de Abertura</h2>
              <button onClick={() => setTplModalOpen(false)} className="text-gray-500 hover:text-gray-300 text-lg leading-none">×</button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {tplLoading && <p className="text-center text-gray-500 text-sm py-8">Carregando…</p>}
              {!tplLoading && tplList.length === 0 && (
                <p className="text-center text-gray-500 text-sm py-8">Nenhum template de abertura cadastrado.</p>
              )}
              {!tplLoading && tplList.map((t) => (
                <button key={t._id} onClick={() => applyTemplate(t)}
                  className="w-full text-left px-4 py-3 rounded-lg hover:bg-gray-800 transition-colors mb-1 border border-transparent hover:border-gray-700">
                  <div className="text-sm font-medium text-gray-100">{t.nome}</div>
                  <div className="text-xs text-gray-500 mt-0.5 flex flex-wrap gap-1">
                    {t.solicitante?.nome && <span>{t.solicitante.nome}</span>}
                    {t.unidade?.nome    && <span>· {t.unidade.nome}</span>}
                    {t.grupo?.nome      && <span>· {t.grupo.nome}</span>}
                  </div>
                </button>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-gray-800 flex justify-end">
              <button onClick={() => setTplModalOpen(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-sm rounded-lg">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
