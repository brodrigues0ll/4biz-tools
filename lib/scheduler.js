import { createClient, createTicket, getTicketItemId, lookupDelegationUserId, delegateTicket } from "./4biz";
import { applyTemplate } from "./template";

// ── Calcula a próxima execução ────────────────────────────────────────────────

export function calcNextRun(schedule, from = new Date()) {
  const at = (d) => { d.setHours(schedule.hora, schedule.minuto, 0, 0); return d; };

  switch (schedule.frequencia) {
    case "diaria": {
      const c = at(new Date(from));
      if (c > from) return c;
      const next = new Date(from);
      next.setDate(next.getDate() + 1);
      return at(next);
    }
    case "semanal": {
      const dias = [...(schedule.diasSemana || [])].sort();
      if (!dias.length) break;
      for (let i = 0; i <= 7; i++) {
        const c = new Date(from);
        c.setDate(c.getDate() + i);
        at(c);
        if (dias.includes(c.getDay()) && c > from) return c;
      }
      break;
    }
    case "mensal": {
      const day = schedule.diaMes || 1;
      let c = new Date(from.getFullYear(), from.getMonth(), day);
      at(c);
      if (c > from) return c;
      c = new Date(from.getFullYear(), from.getMonth() + 1, day);
      return at(c);
    }
    case "anual": {
      const month = (schedule.mes || 1) - 1;
      const day   = schedule.diaMes || 1;
      let c = new Date(from.getFullYear(), month, day);
      at(c);
      if (c > from) return c;
      c = new Date(from.getFullYear() + 1, month, day);
      return at(c);
    }
  }
  // fallback: 1 dia
  return new Date(from.getTime() + 86400000);
}

// ── Executa um agendamento ────────────────────────────────────────────────────

async function tryDelegate(client, ticketId, tecnico, groupId) {
  if (!tecnico?.nome) return;
  try {
    const itemId = await getTicketItemId(client, ticketId);
    if (!itemId) { console.warn(`[scheduler] idItemTrabalho não encontrado para chamado ${ticketId}`); return; }
    const userId = await lookupDelegationUserId(client, ticketId, tecnico.nome);
    if (!userId) { console.warn(`[scheduler] Usuário "${tecnico.nome}" não encontrado para delegação`); return; }
    await delegateTicket(client, { ticketId, itemId, userId, userName: tecnico.nome, groupId });
    console.log(`[scheduler] Chamado ${ticketId} delegado para ${tecnico.nome} (userId=${userId})`);
  } catch (err) {
    console.error(`[scheduler] Falha ao delegar chamado ${ticketId}:`, err.message);
  }
}

export async function executeSchedule(schedule) {
  const { session, authToken, templateStr, unidades, todasUnidades, patrimonioFixo, tecnico } = schedule;
  const client = createClient(session, authToken);
  const results = [];

  const targets = todasUnidades ? [] : (unidades || []);

  console.log(`[executeSchedule] id=${schedule._id} todasUnidades=${todasUnidades} targets=${targets.length} unidades=${JSON.stringify((unidades||[]).map(u=>u.nome))}`);

  if (!targets.length && !todasUnidades) {
    console.log(`[executeSchedule] path=sem-unidades criando 1 chamado`);
    const payload = applyTemplate(templateStr, { patrimonio: patrimonioFixo || "" });
    const id = await createTicket(client, payload);
    console.log(`[executeSchedule] chamado criado id=${id}`);
    await tryDelegate(client, id, tecnico, payload.idGrupoAtual);
    return [{ success: true, ticketId: id }];
  }

  if (todasUnidades) {
    console.warn("[scheduler] 'Todas as unidades' ainda não implementado — pulando execução.");
    return [{ success: false, error: "Todas as unidades: não implementado" }];
  }

  for (const unit of targets) {
    console.log(`[executeSchedule] path=por-unidade unidade="${unit.nome}" (${unit.id})`);
    try {
      const patrimonio = patrimonioFixo || unit.sigla || "";
      let obj = applyTemplate(templateStr, { patrimonio });

      // Substitui campos de unidade no objeto resultante
      obj.idUnidade = unit.id;
      obj.unidade   = unit.nome;
      const nav = obj.builderObjects?.navAtendimentos;
      if (nav) {
        nav.idUnidadeNav = unit.id;
        nav["rlc_unidadesCadastradasNav.nome"] = unit.nome;
        nav.numeroPatrimonio = patrimonio;
        if (nav.rlc_unidadesCadastradasNav) {
          nav.rlc_unidadesCadastradasNav = {
            ...nav.rlc_unidadesCadastradasNav,
            nome: unit.nome,
            sigla: unit.sigla,
            idunidade: unit.id,
            fillColumn: unit.nome,
            key_0: unit.id,
          };
        }
      }

      const ticketId = await createTicket(client, obj);
      console.log(`[executeSchedule] chamado criado id=${ticketId} unidade="${unit.nome}"`);
      await tryDelegate(client, ticketId, tecnico, obj.idGrupoAtual);
      results.push({ unit: unit.nome, success: true, ticketId });
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data).slice(0, 300) : err.message;
      results.push({ unit: unit.nome, success: false, error: msg });
    }
    await new Promise((r) => setTimeout(r, 600));
  }

  return results;
}

// ── Inicia o cron (chamado pelo instrumentation.js) ───────────────────────────

export async function initScheduler() {
  if (global._schedulerStarted) return;
  global._schedulerStarted = true;

  const cron = (await import("node-cron")).default;
  const { connectDB } = await import("./mongodb");
  const Schedule = (await import("./models/Schedule")).default;

  console.log("[scheduler] Cron iniciado — verifica a cada minuto.");

  cron.schedule("* * * * *", async () => {
    try {
      await connectDB();
      const now = new Date();
      const due = await Schedule.find({ ativo: true, proximaExecucao: { $lte: now } });
      for (const schedule of due) {
        // Lock atômico: avança proximaExecucao antes de executar.
        // Se outra instância já adiantou, a condição não bate e pulamos.
        const nextRun = calcNextRun(schedule, now);
        const claimed = await Schedule.findOneAndUpdate(
          { _id: schedule._id, proximaExecucao: schedule.proximaExecucao },
          { $set: { proximaExecucao: nextRun, ultimaExecucao: now } },
        );
        if (!claimed) {
          console.log(`[scheduler] ${schedule.nome || schedule._id} já foi reivindicado — pulando.`);
          continue;
        }

        console.log(`[scheduler] Executando: ${schedule.nome || schedule._id}`);
        executeSchedule(schedule).catch((err) =>
          console.error(`[scheduler] Erro ao executar ${schedule._id}:`, err.message),
        );
      }
    } catch (err) {
      console.error("[scheduler] Erro no cron:", err.message);
    }
  });
}
