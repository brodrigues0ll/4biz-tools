"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

// ── Helpers ───────────────────────────────────────────────────────────────────

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MESES_ABR = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function descFrequencia(s) {
  const hm = `${String(s.hora).padStart(2, "0")}:${String(s.minuto).padStart(2, "0")}`;
  switch (s.frequencia) {
    case "diaria":
      return `Diariamente às ${hm}`;
    case "semanal": {
      const dias = (s.diasSemana || [])
        .sort()
        .map((d) => DIAS[d])
        .join(", ");
      return `${dias || "—"} às ${hm}`;
    }
    case "mensal":
      return `Dia ${s.diaMes} de cada mês às ${hm}`;
    case "anual":
      return `${s.diaMes} de ${MESES_ABR[(s.mes || 1) - 1]} às ${hm}`;
    default:
      return hm;
  }
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function parseTemplate(templateStr) {
  try {
    return JSON.parse(templateStr);
  } catch {
    return {};
  }
}

function toggleItem(arr, val) {
  return arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
}

// ── Modal de confirmação de execução ──────────────────────────────────────────

function RunModal({ schedule, onConfirm, onClose, running }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl shadow-2xl w-full max-w-sm p-6">
        <h2 className="text-sm font-semibold text-white mb-2">
          Executar agendamento
        </h2>
        <p className="text-xs text-gray-400 mb-1">
          Deseja rodar{" "}
          <span className="text-white font-medium">
            {schedule.nome || "este agendamento"}
          </span>{" "}
          agora?
        </p>
        <p className="text-xs text-gray-500 mb-6">
          {(schedule.unidades || []).length} localidade
          {(schedule.unidades || []).length !== 1 ? "s" : ""} — um chamado será
          aberto para cada uma.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onConfirm}
            disabled={running}
            className="flex-1 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            {running ? "Executando…" : "Sim, executar agora"}
          </button>
          <button
            onClick={onClose}
            disabled={running}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-semibold rounded-lg border border-gray-700 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Filter helpers ────────────────────────────────────────────────────────────

const EMPTY_FILTERS = {
  nome: "",
  status: [],
  frequencias: [],
  diasSemana: [],
  localidades: [],
  solicitantes: [],
  filas: [],
  tecnicos: [],
};

function countActiveFilters(f) {
  return (
    (f.nome ? 1 : 0) +
    f.status.length +
    f.frequencias.length +
    f.diasSemana.length +
    f.localidades.length +
    f.solicitantes.length +
    f.filas.length +
    f.tecnicos.length
  );
}

const EMPTY = "__empty__";

function matchNullable(selected, value) {
  if (selected.length === 0) return true;
  const wantEmpty = selected.includes(EMPTY);
  const others = selected.filter((v) => v !== EMPTY);
  const isEmpty = !value;
  return (wantEmpty && isEmpty) || others.includes(value);
}

function applyFilters(schedules, f) {
  return schedules.filter((s) => {
    if (f.nome && !s.nome?.toLowerCase().includes(f.nome.toLowerCase()))
      return false;

    if (f.status.length > 0) {
      const st = s.ativo ? "Ativo" : "Inativo";
      if (!f.status.includes(st)) return false;
    }

    if (f.frequencias.length > 0 && !f.frequencias.includes(s.frequencia))
      return false;

    if (f.diasSemana.length > 0) {
      const has = f.diasSemana.some((d) => s.diasSemana?.includes(d));
      if (!has) return false;
    }

    if (f.localidades.length > 0) {
      const nomes = (s.unidades || []).map((u) => u.nome);
      const noUnit = !s.todasUnidades && nomes.length === 0;
      const wantEmpty = f.localidades.includes(EMPTY);
      const others = f.localidades.filter((v) => v !== EMPTY);
      if (!(wantEmpty && noUnit) && !others.some((l) => nomes.includes(l)))
        return false;
    }

    if (f.solicitantes.length > 0) {
      const t = parseTemplate(s.templateStr);
      if (!matchNullable(f.solicitantes, t.solicitante || null)) return false;
    }

    if (f.filas.length > 0) {
      const t = parseTemplate(s.templateStr);
      if (!matchNullable(f.filas, t.nomeGrupoAtual || null)) return false;
    }

    if (
      f.tecnicos.length > 0 &&
      !matchNullable(f.tecnicos, s.tecnico?.nome || null)
    )
      return false;

    return true;
  });
}

// ── ChipList ──────────────────────────────────────────────────────────────────

function ChipList({
  label,
  options,
  selected,
  onToggle,
  searchable = false,
  showEmpty = false,
}) {
  const [q, setQ] = useState("");

  const normalized = useMemo(() => {
    const base = options.map((o) =>
      typeof o === "string" ? { value: o, label: o } : o,
    );
    return showEmpty
      ? [{ value: EMPTY, label: "Não preenchido" }, ...base]
      : base;
  }, [options, showEmpty]);

  const visible = useMemo(
    () =>
      searchable && q
        ? normalized.filter(
            (o) =>
              o.value === EMPTY ||
              o.label.toLowerCase().includes(q.toLowerCase()),
          )
        : normalized,
    [normalized, searchable, q],
  );

  if (normalized.length === 0) return null;

  return (
    <div>
      <p className="text-xs text-gray-400 mb-1.5">{label}</p>
      {searchable && normalized.length > 8 && (
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar…"
          className="w-full mb-2 bg-gray-800 border border-gray-700 rounded px-2.5 py-1 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
        />
      )}
      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
        {visible.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onToggle(opt.value)}
            className={`px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
              selected.includes(opt.value)
                ? opt.value === EMPTY
                  ? "bg-amber-700 text-amber-100"
                  : "bg-blue-600 text-white"
                : opt.value === EMPTY
                  ? "bg-gray-800 text-amber-500 hover:text-amber-300 hover:bg-gray-700 border border-amber-800/50"
                  : "bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-700"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── FilterModal ───────────────────────────────────────────────────────────────

function FilterModal({ schedules, filters, onApply, onClose }) {
  const [f, setF] = useState(filters);

  const options = useMemo(() => {
    const localidades = [
      ...new Set(
        schedules.flatMap((s) => (s.unidades || []).map((u) => u.nome)),
      ),
    ].sort();

    const solicitantes = [
      ...new Set(
        schedules
          .map((s) => parseTemplate(s.templateStr).solicitante)
          .filter(Boolean),
      ),
    ].sort();

    const filas = [
      ...new Set(
        schedules
          .map((s) => parseTemplate(s.templateStr).nomeGrupoAtual)
          .filter(Boolean),
      ),
    ].sort();

    const tecnicos = [
      ...new Set(schedules.map((s) => s.tecnico?.nome).filter(Boolean)),
    ].sort();

    return { localidades, solicitantes, filas, tecnicos };
  }, [schedules]);

  function set(key, val) {
    setF((prev) => ({ ...prev, [key]: val }));
  }

  const hasFilters = countActiveFilters(f) > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-gray-900 border border-gray-700 rounded-t-2xl sm:rounded-xl shadow-2xl w-full sm:max-w-180 flex flex-col max-h-[90vh] sm:max-h-[95vh]">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 shrink-0">
          <h2 className="text-sm font-semibold text-white">
            Filtrar agendamentos
          </h2>
          {hasFilters && (
            <button
              type="button"
              onClick={() => setF(EMPTY_FILTERS)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Limpar filtros
            </button>
          )}
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-4 space-y-5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-gray-700 [&::-webkit-scrollbar-thumb]:rounded-full">
          {/* Nome */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Nome</p>
            <input
              value={f.nome}
              onChange={(e) => set("nome", e.target.value)}
              placeholder="Buscar por nome…"
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Status */}
          <ChipList
            label="Status"
            options={["Ativo", "Inativo"]}
            selected={f.status}
            onToggle={(v) => set("status", toggleItem(f.status, v))}
          />

          {/* Frequência */}
          <ChipList
            label="Frequência"
            options={[
              { value: "diaria", label: "Diária" },
              { value: "semanal", label: "Semanal" },
              { value: "mensal", label: "Mensal" },
              { value: "anual", label: "Anual" },
            ]}
            selected={f.frequencias}
            onToggle={(v) => set("frequencias", toggleItem(f.frequencias, v))}
          />

          {/* Dias da semana */}
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Dia da semana</p>
            <div className="flex gap-1.5">
              {DIAS.map((d, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => set("diasSemana", toggleItem(f.diasSemana, i))}
                  className={`flex-1 py-1 rounded-full text-xs font-medium transition-colors ${
                    f.diasSemana.includes(i)
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-400 hover:text-gray-200 hover:bg-gray-700 border border-gray-700"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Localidade */}
          <ChipList
            label="Localidade"
            options={options.localidades}
            selected={f.localidades}
            onToggle={(v) => set("localidades", toggleItem(f.localidades, v))}
            searchable
            showEmpty
          />

          {/* Solicitante */}
          <ChipList
            label="Solicitante"
            options={options.solicitantes}
            selected={f.solicitantes}
            onToggle={(v) => set("solicitantes", toggleItem(f.solicitantes, v))}
            searchable
            showEmpty
          />

          {/* Fila de atendimento */}
          <ChipList
            label="Fila de Atendimento"
            options={options.filas}
            selected={f.filas}
            onToggle={(v) => set("filas", toggleItem(f.filas, v))}
            searchable
            showEmpty
          />

          {/* Técnico */}
          <ChipList
            label="Técnico Responsável"
            options={options.tecnicos}
            selected={f.tecnicos}
            onToggle={(v) => set("tecnicos", toggleItem(f.tecnicos, v))}
            searchable
            showEmpty
          />
        </div>

        {/* Rodapé */}
        <div className="px-4 py-3 border-t border-gray-800 flex gap-3 shrink-0">
          <button
            type="button"
            onClick={() => {
              onApply(f);
              onClose();
            }}
            className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Aplicar filtros
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 text-xs font-semibold rounded-lg transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function ScheduleListPage() {
  const { data: session } = useSession();
  const canEdit = session?.isAdmin || session?.permissions?.agendamentos?.editar;

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [runTarget, setRunTarget] = useState(null);
  const [running, setRunning] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [showFilter, setShowFilter] = useState(false);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    fetchSchedules();
  }, []);

  const filtered = useMemo(
    () => applyFilters(schedules, filters),
    [schedules, filters],
  );
  const filterCount = countActiveFilters(filters);

  async function fetchSchedules() {
    setLoading(true);
    try {
      const res = await fetch("/api/schedules");
      const data = await res.json();
      setSchedules(Array.isArray(data) ? data : []);
    } catch {
      /* silencia */
    } finally {
      setLoading(false);
    }
  }

  async function toggleAtivo(id, current) {
    const res = await fetch(`/api/schedules/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ativo: !current }),
    });
    if (res.ok)
      setSchedules((p) =>
        p.map((s) => (s._id === id ? { ...s, ativo: !current } : s)),
      );
  }

  async function handleDelete(id) {
    if (!confirm("Excluir este agendamento?")) return;
    const res = await fetch(`/api/schedules/${id}`, { method: "DELETE" });
    if (res.ok) setSchedules((p) => p.filter((s) => s._id !== id));
  }

  async function handleToggleAll(ativo) {
    setToggling(true);
    try {
      const res = await fetch("/api/schedules", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ativo }),
      });
      if (res.ok) setSchedules((p) => p.map((s) => ({ ...s, ativo })));
    } catch {
      /* silencia */
    } finally {
      setToggling(false);
    }
  }

  async function handleRun() {
    if (!runTarget) return;
    setRunning(true);
    try {
      await fetch(`/api/schedules/${runTarget._id}/run`, { method: "POST" });
      setSchedules((p) =>
        p.map((s) =>
          s._id === runTarget._id
            ? { ...s, ultimaExecucao: new Date().toISOString() }
            : s,
        ),
      );
    } catch {
      /* silencia */
    } finally {
      setRunning(false);
      setRunTarget(null);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {runTarget && (
        <RunModal
          schedule={runTarget}
          running={running}
          onConfirm={handleRun}
          onClose={() => !running && setRunTarget(null)}
        />
      )}

      {showFilter && (
        <FilterModal
          schedules={schedules}
          filters={filters}
          onApply={setFilters}
          onClose={() => setShowFilter(false)}
        />
      )}

      {/* Cabeçalho */}
      <div className="border-b border-gray-800 px-4 sm:px-6 py-3 flex items-center gap-2 flex-wrap">
        <h1 className="font-semibold text-white text-sm sm:text-base">
          Agendamentos
        </h1>

        {schedules.length > 0 && (
          <div className="ml-auto flex items-center gap-2">
            {/* Filtrar */}
            <button
              onClick={() => setShowFilter(true)}
              className={`relative px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors flex items-center gap-1.5 ${
                filterCount > 0
                  ? "bg-blue-900/40 border-blue-700 text-blue-300"
                  : "bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700"
              }`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-3.5 h-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
                />
              </svg>
              Filtrar
              {filterCount > 0 && (
                <span className="ml-0.5 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none">
                  {filterCount}
                </span>
              )}
            </button>

            <button
              onClick={() => handleToggleAll(true)}
              disabled={toggling || schedules.every((s) => s.ativo)}
              className="px-3 py-1.5 bg-green-700 hover:bg-green-600 disabled:opacity-40 disabled:cursor-default text-white text-xs font-medium rounded-lg transition-colors"
            >
              {toggling ? "…" : "Ativar todos"}
            </button>
            <button
              onClick={() => handleToggleAll(false)}
              disabled={toggling || schedules.every((s) => !s.ativo)}
              className="px-3 py-1.5 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-default border border-gray-700 text-gray-300 text-xs font-medium rounded-lg transition-colors"
            >
              {toggling ? "…" : "Pausar todos"}
            </button>
          </div>
        )}

        {canEdit && <Link
          href="/schedule/new"
          className={`${schedules.length > 0 ? "" : "ml-auto"} px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Novo Agendamento
        </Link>}
      </div>

      <div className="flex-1 p-4 sm:p-6 w-full">
        {loading && (
          <div className="text-center py-16 text-gray-600 text-sm">
            Carregando…
          </div>
        )}

        {!loading && schedules.length === 0 && (
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-12 text-center max-w-md mx-auto">
            <div className="text-gray-500 text-sm mb-4">
              Nenhum agendamento criado ainda.
            </div>
            {canEdit && (
              <Link
                href="/schedule/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-lg transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Criar primeiro agendamento
              </Link>
            )}
          </div>
        )}

        {!loading && schedules.length > 0 && (
          <>
            {/* Contador de resultados quando filtrado */}
            {filterCount > 0 && (
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-500">
                  {filtered.length === schedules.length
                    ? `${schedules.length} agendamentos`
                    : `${filtered.length} de ${schedules.length} agendamentos`}
                </p>
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  Limpar filtros
                </button>
              </div>
            )}

            {filtered.length === 0 ? (
              <div className="bg-gray-900 rounded-xl border border-gray-800 p-10 text-center">
                <p className="text-gray-500 text-sm mb-2">
                  Nenhum agendamento encontrado.
                </p>
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Remover filtros
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {filtered.map((s) => (
                  <div
                    key={s._id}
                    className={`bg-gray-900 rounded-xl border flex flex-col transition-opacity ${s.ativo ? "border-gray-800" : "border-gray-800/50 opacity-55"}`}
                  >
                    {/* Indicador de status */}
                    <div
                      className={`h-1 rounded-t-xl ${s.ativo ? "bg-green-600" : "bg-gray-700"}`}
                    />

                    <div className="p-3 flex-1 flex flex-col gap-2">
                      {/* Nome */}
                      <p className="text-xs font-semibold text-white leading-snug line-clamp-2 min-h-10">
                        {s.nome || (
                          <span className="text-gray-500 font-normal italic">
                            Sem nome
                          </span>
                        )}
                      </p>

                      {/* Frequência */}
                      <p className="text-xs text-gray-500">
                        {descFrequencia(s)}
                      </p>

                      {/* Unidades */}
                      {s.todasUnidades ? (
                        <span className="text-xs text-blue-400">
                          Todas as unidades
                        </span>
                      ) : (s.unidades || []).length === 1 ? (
                        <span className="text-xs text-gray-400 truncate">
                          {s.unidades[0].nome}
                        </span>
                      ) : (s.unidades || []).length > 1 ? (
                        <span className="text-xs text-gray-400">
                          {s.unidades.length} unidades
                        </span>
                      ) : null}

                      {/* Próxima / última execução */}
                      <p className="text-xs text-gray-600 mt-auto">
                        {s.ultimaExecucao ? (
                          <>
                            Última:{" "}
                            <span className="text-gray-500">
                              {fmtDate(s.ultimaExecucao)}
                            </span>
                          </>
                        ) : (
                          <>
                            Próxima:{" "}
                            <span className="text-gray-500">
                              {fmtDate(s.proximaExecucao) || "—"}
                            </span>
                          </>
                        )}
                      </p>
                    </div>

                    {/* Ações */}
                    <div className="border-t border-gray-800 px-3 py-2 flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        {/* Play */}
                        <button
                          type="button"
                          onClick={() => setRunTarget(s)}
                          title="Executar agora"
                          className="p-1 text-gray-600 hover:text-green-400 rounded hover:bg-green-900/20 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                        {/* Editar */}
                        {canEdit && <Link
                          href={`/schedule/${s._id}/edit`}
                          title="Editar"
                          className="p-1 text-gray-600 hover:text-blue-400 rounded hover:bg-blue-900/20 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 16H9v-3z"
                            />
                          </svg>
                        </Link>}
                        {/* Excluir */}
                        {canEdit && <button
                          onClick={() => handleDelete(s._id)}
                          title="Excluir"
                          className="p-1 text-gray-600 hover:text-red-400 rounded hover:bg-red-900/20 transition-colors"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="w-3.5 h-3.5"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>}
                      </div>

                      {/* Toggle ativo */}
                      <button
                        type="button"
                        onClick={() => toggleAtivo(s._id, s.ativo)}
                        title={s.ativo ? "Pausar" : "Ativar"}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full border-2 transition-colors focus:outline-none ${
                          s.ativo
                            ? "bg-green-600 border-green-600"
                            : "bg-gray-700 border-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-3 w-3 transform rounded-full bg-white shadow transition-transform ${
                            s.ativo ? "translate-x-4" : "translate-x-0.5"
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
