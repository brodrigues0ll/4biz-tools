"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { idbLoad, idbSave } from "@/lib/idb";

// ── Constantes ────────────────────────────────────────────────────────────────

const DIAS_SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES       = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const HORAS       = Array.from({ length: 24 }, (_, i) => i);
const MINUTOS     = Array.from({ length: 12 }, (_, i) => i * 5);

const DEFAULT_DESC_PLAIN =
  "Implementação da solução LAPS (Local Administrator Password Solution) no dispositivo {{patrimonio}}, conforme políticas de Segurança da Informação.\nAtividades realizadas:\n• Exclusão dos perfis de administradores locais existentes;\n• Manutenção apenas da conta padrão Administrador, visando conformidade com a política;\n• Inclusão do equipamento no grupo de gerenciamento do LAPS;\n• Atualização da planilha de controle conforme procedimento interno.\n\nAdequação do equipamento às diretrizes de segurança, garantindo o gerenciamento seguro da senha do administrador local e a mitigação de riscos.";

function descPlainToHtml(text) {
  return "<div>" + text.trim().replace(/\n/g, "<br>") + "</div>";
}

const BASE_TEMPLATE = {
  id: null, catalogo: "N", idTipoDemandaServico: 1, idStatus: 1,
  solucaoTemporaria: false, impacto: "B", urgencia: "B", registroExecucao: "",
  categoria: 4, idContrato: 1, idGrupoAtual: 2,
  mails: null, event: null, idOcorrenciaEvento: null, idManager: 0, nomeDoManager: "",
  idGrupoAprovador: 0, major: "N",
  userGroup: [{ key: "Grupo", number: 0 }, { key: " email.type.user", number: 1 }],
  problems: [], changes: [], releases: [], configurationItems: [], knowledges: [],
  listUserConfigurationItems: [], project: {}, signatures: [],
  enviaEmailCriacao: true, enviaEmailFinalizacao: true, enviaEmailAcoes: true,
  intelligenceCenterConfigured: false, dzUuid: "10e4",
  idUsuarioResponsavelAtual: 964, responsavel: "Bernardo Rodrigues Gomes",
  solicitante: "", idSolicitante: null, telefone: "", ramal: null, email: "",
  idUnidade: null, unidade: "", templates: [],
  origemContato: 14, idServico: null, tipo: "R",
  idServicoNegocioTecnico: null, nomeServico: "",
  idAcordoNivelServico: 3, sla: "24:00", slaColor: "#017301",
  descricao: "",
  builderObjects: {
    _businessObjects: [{
      applicationName: "AplicacaoParaAtendimentos",
      businessObjectName: "NavAtendimentos",
      model: "navAtendimentos",
    }],
    navAtendimentos: {
      rlc_unidadesnav: null,
      rlc_unidadesCadastradasNav: null,
      idUnidadeNav: null, "rlc_unidadesCadastradasNav.nome": "",
      telefone: "0", numeroPatrimonio: "{{patrimonio}}", tipoSolicitacao: "configuracao",
    },
  },
  acaoFluxo: "E", attachedFiles: [],
  original: {
    id: null, catalogo: "N", idTipoDemandaServico: 0, idStatus: 1,
    solucaoTemporaria: false, impacto: "B", urgencia: "B", registroExecucao: "",
    categoria: null, idContrato: null, idGrupoAtual: null,
    mails: null, event: null, idOcorrenciaEvento: null, idManager: 0, nomeDoManager: "",
    idGrupoAprovador: 0, major: "N",
    userGroup: [{ key: "Grupo", number: 0 }, { key: " email.type.user", number: 1 }],
  },
};

// ── Hooks de autocomplete ─────────────────────────────────────────────────────

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

function useSolicitanteSearch(session, authToken) {
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen]       = useState(false);
  const [query, setQuery]     = useState("");
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

  const search = useCallback((q) => {
    setQuery(q);
    setOpen(true);
  }, []);

  return { items, loading, open, setOpen, query, setQuery, search };
}

// ── Dropdown genérico ─────────────────────────────────────────────────────────

function Dropdown({ hook, placeholder, disabled, renderItem, onSelect }) {
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) hook.setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <input
          type="text" value={hook.query}
          onChange={(e) => hook.search(e.target.value)}
          onFocus={() => hook.items.length > 0 && hook.setOpen(true)}
          placeholder={disabled ? "Configure a autenticação primeiro" : placeholder}
          disabled={disabled}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
        />
        {hook.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
      </div>
      {hook.open && hook.items.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-56 overflow-y-auto">
          {hook.items.map((item, i) => (
            <button key={i} type="button"
              onMouseDown={() => { onSelect(item); hook.setOpen(false); }}
              className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
              {renderItem(item)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function NewSchedulePage() {
  const router = useRouter();

  // Auth
  const [session, setSession]       = useState("");
  const [authToken, setAuthToken]   = useState("");
  const [idbReady, setIdbReady]     = useState(false);

  // Template interno
  const [template, setTemplate] = useState({ ...BASE_TEMPLATE });

  // Campos visíveis de ticket
  const [descricao, setDescricao]   = useState("");
  const [selectedSolicitante, setSelectedSolicitante] = useState(null);
  const [selectedActivity, setSelectedActivity]       = useState(null);
  const [selectedUnidade, setSelectedUnidade]         = useState(null);
  const [selectedKnowledges, setSelectedKnowledges]   = useState([]);
  const [selectedGroup, setSelectedGroup]             = useState(null);
  const [selectedTecnico, setSelectedTecnico]         = useState(null);

  // Campos de agendamento
  const [nome, setNome]             = useState("");
  const [frequencia, setFrequencia] = useState("diaria");
  const [diasSemana, setDiasSemana] = useState([]);
  const [diaMes, setDiaMes]         = useState(1);
  const [mes, setMes]               = useState(1);
  const [hora, setHora]             = useState(8);
  const [minuto, setMinuto]         = useState(0);
  const [unidadesAgendamento, setUnidadesAgendamento] = useState([]);
  const [patrimonioFixo, setPatrimonioFixo] = useState("");

  // UI
  const [saving, setSaving]     = useState(false);
  const [formError, setFormError] = useState("");

  // Hooks de busca
  const sol  = useSolicitanteSearch(session, authToken);
  const act  = useSearch(session, authToken, "search-activity",
    selectedSolicitante ? { idEmployee: selectedSolicitante.idEmpregado } : {});
  const unid = useSearch(session, authToken, "search-unidade");
  const know = useSearch(session, authToken, "search-knowledge");
  const unidAgend = useSearch(session, authToken, "search-unidade");
  const grp       = useGroupSearch(session, authToken);
  const tec       = useTecnicoSearch(session, authToken);

  // Refs de dropdown para fechar ao clicar fora
  const solRef  = useRef(null);
  const actRef  = useRef(null);
  const unidRef = useRef(null);
  const knowRef = useRef(null);
  const unidAgendRef = useRef(null);

  // ── Carrega auth + rascunho do IDB ─────────────────────────────────────────
  useEffect(() => {
    Promise.all([idbLoad("auth"), idbLoad("schedule-draft")]).then(([auth, draft]) => {
      if (auth?.session)   setSession(auth.session);
      if (auth?.authToken) setAuthToken(auth.authToken);

      if (draft) {
        if (draft.nome        !== undefined) setNome(draft.nome);
        if (draft.frequencia  !== undefined) setFrequencia(draft.frequencia);
        if (draft.diasSemana  !== undefined) setDiasSemana(draft.diasSemana);
        if (draft.diaMes      !== undefined) setDiaMes(draft.diaMes);
        if (draft.mes         !== undefined) setMes(draft.mes);
        if (draft.hora        !== undefined) setHora(draft.hora);
        if (draft.minuto      !== undefined) setMinuto(draft.minuto);
        if (draft.unidadesAgendamento) setUnidadesAgendamento(draft.unidadesAgendamento);
        if (draft.patrimonioFixo !== undefined) setPatrimonioFixo(draft.patrimonioFixo);
        if (draft.descricao   !== undefined) setDescricao(draft.descricao);
        if (draft.template)    setTemplate(draft.template);
        if (draft.selectedSolicitante) { setSelectedSolicitante(draft.selectedSolicitante); sol.setQuery(draft.selectedSolicitante.nome); }
        if (draft.selectedActivity)    { setSelectedActivity(draft.selectedActivity);       act.setQuery((draft.selectedActivity.nomeComHierarquia || draft.selectedActivity.nome || "").split(" > ").pop()); }
        if (draft.selectedUnidade)     { setSelectedUnidade(draft.selectedUnidade);         unid.setQuery(draft.selectedUnidade.nome); }
        if (draft.selectedKnowledges)    setSelectedKnowledges(draft.selectedKnowledges);
        if (draft.selectedGroup)       { setSelectedGroup(draft.selectedGroup);             grp.setQuery(draft.selectedGroup.nome); }
        if (draft.selectedTecnico)     { setSelectedTecnico(draft.selectedTecnico);         tec.setQuery(draft.selectedTecnico.nome); }
      }

      setIdbReady(true);
    });
  }, []);

  // ── Salva rascunho no IDB ao alterar campos ─────────────────────────────────
  useEffect(() => {
    if (!idbReady) return;
    idbSave({
      nome, frequencia, diasSemana, diaMes, mes, hora, minuto,
      unidadesAgendamento, patrimonioFixo,
      descricao, template,
      selectedSolicitante, selectedActivity, selectedUnidade,
      selectedKnowledges, selectedGroup, selectedTecnico,
    }, "schedule-draft");
  }, [
    nome, frequencia, diasSemana, diaMes, mes, hora, minuto,
    unidadesAgendamento, patrimonioFixo,
    descricao, template,
    selectedSolicitante, selectedActivity, selectedUnidade,
    selectedKnowledges, selectedGroup, selectedTecnico,
    idbReady,
  ]);

  // ── Helpers de template ─────────────────────────────────────────────────────
  function patch(obj) {
    setTemplate((prev) => ({ ...prev, ...obj }));
  }

  // ── Selecionar solicitante ──────────────────────────────────────────────────
  async function selectSolicitante(person) {
    setSelectedSolicitante(person);
    sol.setQuery(person.nome);
    sol.setOpen(false);
    setSelectedActivity(null);
    act.setQuery("");

    patch({ solicitante: person.nome, idSolicitante: person.idEmpregado, email: person.email });

    try {
      const res  = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session, authToken, action: "requester-info", idSolicitante: person.idEmpregado }),
      });
      const json = await res.json();
      if (res.ok && json.idUnidade) patch({ idUnidade: json.idUnidade, unidade: json.unidade });
    } catch { /* silencia */ }
  }

  // ── Selecionar atividade ────────────────────────────────────────────────────
  function selectActivity(item) {
    setSelectedActivity(item);
    act.setQuery((item.nomeComHierarquia || item.nome || "").split(" > ").pop());
    act.setOpen(false);
    const parts = (item.nomeComHierarquia || "").split(" > ");
    const nomeServico = parts.length >= 2 ? parts[parts.length - 2] : parts[0];
    patch({ idServico: item.idAtividade, idServicoNegocioTecnico: item.idServico, nomeServico, nomeAtividade: item.nomeComHierarquia || item.nome });
  }

  // ── Selecionar unidade do template ─────────────────────────────────────────
  function selectUnidade(unit) {
    setSelectedUnidade(unit);
    unid.setQuery(unit.nome);
    unid.setOpen(false);
    const nav = { ...template.builderObjects.navAtendimentos };
    nav.idUnidadeNav = unit.id;
    nav["rlc_unidadesCadastradasNav.nome"] = unit.nome;
    nav.rlc_unidadesCadastradasNav = {
      ...nav.rlc_unidadesCadastradasNav,
      nome: unit.nome, sigla: unit.sigla, idunidade: unit.id, fillColumn: unit.nome, key_0: unit.id,
    };
    setTemplate((prev) => ({
      ...prev,
      builderObjects: { ...prev.builderObjects, navAtendimentos: nav },
    }));
  }

  // ── Selecionar fila/grupo ───────────────────────────────────────────────────
  function selectGroup(g) {
    setSelectedGroup(g);
    grp.setQuery(g.nome);
    grp.setOpen(false);
    patch({ idGrupoAtual: Number(g.id), nomeGrupoAtual: g.nome });
  }

  // ── Selecionar base de conhecimento ────────────────────────────────────────
  function selectKnowledge(item) {
    know.setQuery("");
    know.setOpen(false);
    if (selectedKnowledges.some((k) => k.id === item.id)) return;
    const next = [...selectedKnowledges, item];
    setSelectedKnowledges(next);
    patch({ knowledges: next.map((k) => ({ idBaseConhecimento: k.id, titulo: k.titulo })) });
  }
  function removeKnowledge(id) {
    const next = selectedKnowledges.filter((k) => k.id !== id);
    setSelectedKnowledges(next);
    patch({ knowledges: next.map((k) => ({ idBaseConhecimento: k.id, titulo: k.titulo })) });
  }

  // ── Descrição ───────────────────────────────────────────────────────────────
  function handleDescricaoChange(text) {
    setDescricao(text);
    patch({ descricao: descPlainToHtml(text) });
  }

  // ── Unidades do agendamento ─────────────────────────────────────────────────
  function addUnidadeAgendamento(unit) {
    unidAgend.setQuery("");
    unidAgend.setOpen(false);
    if (!unidadesAgendamento.some((u) => u.id === unit.id)) {
      setUnidadesAgendamento((prev) => [...prev, unit]);
    }
  }
  function removeUnidadeAgendamento(id) {
    setUnidadesAgendamento((prev) => prev.filter((u) => u.id !== id));
  }

  // ── Dias da semana ──────────────────────────────────────────────────────────
  function toggleDia(dia) {
    setDiasSemana((prev) => prev.includes(dia) ? prev.filter((d) => d !== dia) : [...prev, dia]);
  }

  // ── Submissão ───────────────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!authToken) return setFormError("Configure a autenticação em Configurações.");
    if (frequencia === "semanal" && diasSemana.length === 0) return setFormError("Selecione ao menos um dia da semana.");
    if (unidadesAgendamento.length === 0) return setFormError("Adicione ao menos uma localidade.");

    setSaving(true);
    try {
      const templateStr = JSON.stringify({ ...template, descricao: descPlainToHtml(descricao) });
      const res = await fetch("/api/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nome, frequencia, diasSemana, diaMes, mes, hora, minuto,
          todasUnidades: false, unidades: unidadesAgendamento, patrimonioFixo,
          session, authToken, templateStr,
          tecnico: selectedTecnico ? { id: selectedTecnico.idEmpregado, nome: selectedTecnico.nome } : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      router.push("/schedule");
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const noAuth = idbReady && !session && !authToken;

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0">

      {/* Cabeçalho */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="font-semibold text-white text-sm sm:text-base">Novo Agendamento</h1>
        {noAuth && (
          <a href="/settings" className="ml-auto text-xs text-yellow-500 hover:text-yellow-400">
            ⚠ Autenticação não configurada
          </a>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-4 sm:p-6 max-w-4xl mx-auto w-full space-y-4 sm:space-y-5">

        {/* ── Nome ─────────────────────────────────────────────────────────── */}
        <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="font-semibold text-white mb-3 text-sm">Identificação</h2>
          <input
            type="text" value={nome} onChange={(e) => setNome(e.target.value)}
            placeholder="Nome do agendamento (opcional)"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
          />
        </section>

        {/* ── Frequência e horário ─────────────────────────────────────────── */}
        <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="font-semibold text-white mb-4 text-sm">Frequência e Horário</h2>

          {/* Radio frequência */}
          <div className="flex flex-wrap gap-2 mb-4">
            {[["diaria","Diária"],["semanal","Semanal"],["mensal","Mensal"],["anual","Anual"]].map(([val,label]) => (
              <button key={val} type="button" onClick={() => setFrequencia(val)}
                className={`px-4 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                  frequencia === val
                    ? "bg-blue-600/20 text-blue-400 border-blue-600/40"
                    : "text-gray-400 border-gray-700 hover:border-gray-600 hover:text-gray-200"
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Dias da semana */}
          {frequencia === "semanal" && (
            <div className="mb-4">
              <span className="text-xs text-gray-400 mb-2 block">Dias da semana</span>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map((d, i) => (
                  <button key={i} type="button" onClick={() => toggleDia(i)}
                    className={`w-10 h-9 rounded-lg text-xs font-medium border transition-colors ${
                      diasSemana.includes(i)
                        ? "bg-blue-600/20 text-blue-400 border-blue-600/40"
                        : "text-gray-400 border-gray-700 hover:border-gray-600"
                    }`}>
                    {d}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Dia do mês */}
          {frequencia === "mensal" && (
            <div className="mb-4">
              <span className="text-xs text-gray-400 mb-1 block">Dia do mês</span>
              <input type="number" min={1} max={31} value={diaMes}
                onChange={(e) => setDiaMes(Number(e.target.value))}
                className="w-20 bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Mês + dia */}
          {frequencia === "anual" && (
            <div className="flex gap-3 mb-4">
              <label className="flex-1">
                <span className="text-xs text-gray-400 mb-1 block">Mês</span>
                <select value={mes} onChange={(e) => setMes(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500">
                  {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </select>
              </label>
              <label className="w-24">
                <span className="text-xs text-gray-400 mb-1 block">Dia</span>
                <input type="number" min={1} max={31} value={diaMes}
                  onChange={(e) => setDiaMes(Number(e.target.value))}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
                />
              </label>
            </div>
          )}

          {/* Horário */}
          <div>
            <span className="text-xs text-gray-400 mb-1 block">Horário</span>
            <div className="flex items-center gap-2">
              <select value={hora} onChange={(e) => setHora(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500">
                {HORAS.map((h) => <option key={h} value={h}>{String(h).padStart(2,"0")}</option>)}
              </select>
              <span className="text-gray-400 font-bold text-sm">:</span>
              <select value={minuto} onChange={(e) => setMinuto(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500">
                {MINUTOS.map((m) => <option key={m} value={m}>{String(m).padStart(2,"0")}</option>)}
              </select>
            </div>
          </div>
        </section>

        {/* ── Localidades do agendamento ───────────────────────────────────── */}
        <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="font-semibold text-white mb-1 text-sm">Localidades</h2>
          <p className="text-xs text-gray-500 mb-3">Um chamado será aberto para cada localidade selecionada.</p>

          <div ref={unidAgendRef} className="relative">
            <div className="relative">
              <input
                type="text" value={unidAgend.query}
                onChange={(e) => unidAgend.search(e.target.value)}
                onFocus={() => unidAgend.items.length > 0 && unidAgend.setOpen(true)}
                placeholder={noAuth ? "Configure a autenticação primeiro" : "Buscar localidade…"}
                disabled={noAuth}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500 disabled:opacity-40"
              />
              {unidAgend.loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500">…</span>}
            </div>
            {unidAgend.open && unidAgend.items.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-gray-800 border border-gray-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {unidAgend.items.map((u) => (
                  <li key={u.id}
                    onMouseDown={(e) => { e.preventDefault(); addUnidadeAgendamento(u); }}
                    className="px-3 py-2 text-xs hover:bg-gray-700 cursor-pointer">
                    <span className="text-white">{u.nome}</span>
                    {u.sigla && <span className="text-gray-500 ml-1">· {u.sigla}</span>}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {unidadesAgendamento.length > 0 && (
            <ul className="mt-2 space-y-1">
              {unidadesAgendamento.map((u) => (
                <li key={u.id} className="flex items-center justify-between bg-gray-800 rounded-lg px-3 py-1.5">
                  <span className="text-xs text-gray-200">
                    {u.nome}
                    {u.sigla && <span className="text-gray-500 ml-1.5">· {u.sigla}</span>}
                  </span>
                  <button type="button" onClick={() => removeUnidadeAgendamento(u.id)}
                    className="text-gray-600 hover:text-red-400 text-xs ml-2">✕</button>
                </li>
              ))}
            </ul>
          )}

          {unidadesAgendamento.length === 0 && (
            <p className="mt-2 text-xs text-gray-600">Nenhuma localidade adicionada.</p>
          )}
        </section>

        {/* ── Dados do chamado ─────────────────────────────────────────────── */}
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
                  <div className="flex-1 min-w-0 text-xs text-blue-200 truncate">{(selectedActivity.nomeComHierarquia || selectedActivity.nome || "").split(" > ").pop()}</div>
                  <button type="button" onClick={() => { setSelectedActivity(null); act.setQuery(""); }}
                    className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
                </div>
              )}
            </div>

            {/* Unidade do equipamento */}
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

            {/* Patrimônio padrão */}
            <div>
              <span className="text-xs text-gray-400 mb-1 block">Patrimônio</span>
              <input type="text" value={patrimonioFixo}
                onChange={(e) => setPatrimonioFixo(e.target.value)}
                placeholder="Vazio = usa sigla da localidade"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-100 focus:outline-none focus:border-blue-500"
              />
              <p className="text-xs text-gray-600 mt-1">Substitui <span className="font-mono text-yellow-500/70">{"{{patrimonio}}"}</span> nos chamados.</p>
            </div>

            {/* Fila / Grupo */}
            <div className="sm:col-span-2">
              <span className="text-xs text-gray-400 mb-1 block">Fila de Atendimento</span>
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
              {selectedGroup ? (
                <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                  <div className="flex-1 min-w-0 text-xs text-blue-200 truncate">{selectedGroup.nome}</div>
                  <button type="button" onClick={() => { setSelectedGroup(null); grp.setQuery(""); patch({ idGrupoAtual: 2, nomeGrupoAtual: null }); }}
                    className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
                </div>
              ) : (
                <p className="text-xs text-gray-600 mt-1">Se não selecionada, usa o Helpdesk (padrão).</p>
              )}
            </div>

            {/* Técnico Responsável */}
            <div className="sm:col-span-2">
              <span className="text-xs text-gray-400 mb-1 block">Técnico Responsável <span className="text-gray-600">(opcional — delegação automática)</span></span>
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
                        onMouseDown={() => { setSelectedTecnico(p); tec.setQuery(p.nome); tec.setOpen(false); }}
                        className="w-full text-left px-3 py-2 hover:bg-gray-700 border-b border-gray-700/50 last:border-0">
                        <div className="text-xs text-white">{p.nome}</div>
                        <div className="text-xs text-gray-400">{p.email}</div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {selectedTecnico && (
                <div className="mt-1.5 flex items-center gap-2 bg-blue-950/50 border border-blue-800/50 rounded-lg px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-blue-200 truncate">{selectedTecnico.nome}</div>
                    <div className="text-xs text-blue-400 truncate">{selectedTecnico.email}</div>
                  </div>
                  <button type="button" onClick={() => { setSelectedTecnico(null); tec.setQuery(""); }}
                    className="text-blue-500 hover:text-blue-300 text-xs shrink-0">limpar</button>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* ── Descrição ────────────────────────────────────────────────────── */}
        <section className="bg-gray-900 rounded-xl p-4 border border-gray-800">
          <h2 className="font-semibold text-white mb-1 text-sm">Texto do Chamado</h2>
          <p className="text-xs text-gray-500 mb-3">
            Use <span className="font-mono text-yellow-400">{"{{patrimonio}}"}</span> onde o número deve aparecer.
          </p>
          <textarea value={descricao} onChange={(e) => handleDescricaoChange(e.target.value)}
            rows={8} spellCheck={false}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-100 focus:outline-none focus:border-blue-500 resize-y font-mono"
          />
        </section>

        {/* ── Base de Conhecimento ─────────────────────────────────────────── */}
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

        {/* ── Erro + Botão ──────────────────────────────────────────────────── */}
        {formError && (
          <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
            {formError}
          </p>
        )}

        <div className="flex gap-3 pb-6">
          <button type="submit" disabled={saving}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-semibold rounded-lg transition-colors text-sm">
            {saving ? "Salvando…" : "Salvar Agendamento"}
          </button>
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold rounded-lg text-sm border border-gray-700">
            Cancelar
          </button>
        </div>

      </form>
    </div>
  );
}
