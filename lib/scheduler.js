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
  if (!tecnico?.nome) return { success: false, error: "Técnico não definido" };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      // Polling para idItemTrabalho (pode demorar a aparecer após criação)
      let itemId = null;
      for (let poll = 0; poll < 5; poll++) {
        itemId = await getTicketItemId(client, ticketId);
        if (itemId) break;
        if (poll < 4) await sleep(1000);
      }

      if (!itemId) {
        const msg = `idItemTrabalho não encontrado para chamado ${ticketId}`;
        console.warn(`[scheduler] ${msg}`);
        if (attempt < 3) { await sleep(2000 * attempt); continue; }
        return { success: false, error: msg };
      }

      let userId = tecnico.id ?? null;
      if (!userId) {
        userId = await lookupDelegationUserId(client, ticketId, tecnico.nome);
      }
      if (!userId) {
        const msg = `Usuário "${tecnico.nome}" não encontrado para delegação`;
        console.warn(`[scheduler] ${msg}`);
        return { success: false, error: msg };
      }

      await delegateTicket(client, { ticketId, itemId, userId, userName: tecnico.nome, groupId });
      console.log(`[scheduler] Chamado ${ticketId} delegado para ${tecnico.nome} (userId=${userId})`);
      return { success: true };
    } catch (err) {
      console.warn(`[scheduler] Tentativa ${attempt}/3 de delegação para chamado ${ticketId} falhou: ${err.message}`);
      if (attempt < 3) await sleep(2000 * attempt);
      else return { success: false, error: err.message };
    }
  }
  return { success: false, error: "Delegação falhou após 3 tentativas" };
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
    const delegResult = await tryDelegate(client, id, tecnico, payload.idGrupoAtual);
    return [{ success: true, ticketId: id, delegated: delegResult?.success, delegError: delegResult?.error }];
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
      const delegResult = await tryDelegate(client, ticketId, tecnico, obj.idGrupoAtual);
      results.push({ unit: unit.nome, success: true, ticketId, delegated: delegResult?.success, delegError: delegResult?.error });
    } catch (err) {
      const msg = err.response?.data ? JSON.stringify(err.response.data).slice(0, 300) : err.message;
      console.error(`[executeSchedule] ERRO unidade="${unit.nome}" (${unit.id}): ${msg}`);
      results.push({ unit: unit.nome, success: false, error: msg });
    }
    await sleep(500);
  }

  return results;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const MAX_ATTEMPTS = 3;
const DELAY_BETWEEN_SCHEDULES = 500;

// ── Inicia o cron ─────────────────────────────────────────────────────────────

export async function initScheduler() {
  if (global._schedulerStarted) return;
  global._schedulerStarted = true;

  const cron = (await import("node-cron")).default;
  const { connectDB } = await import("./mongodb");
  const Schedule              = (await import("./models/Schedule")).default;
  const SchedulerConfig       = (await import("./models/SchedulerConfig")).default;
  const SchedulerNotification = (await import("./models/SchedulerNotification")).default;

  console.log("[scheduler] Cron iniciado — verifica a cada minuto.");

  cron.schedule("* * * * *", async () => {
    try {
      await connectDB();
      const now = new Date();

      const cfg = await SchedulerConfig.findById("global").lean();
      if (!cfg?.session || !cfg?.authToken) {
        console.warn("[scheduler] Auth não configurada — pulando ciclo.");
        return;
      }

      const due = await Schedule.find({ ativo: true, proximaExecucao: { $lte: now } });
      if (!due.length) return;

      const total = due.length;
      console.log(`[scheduler] Ciclo ${now.toISOString()}: ${total} agendamento(s) vencido(s).`);

      let processados = 0;
      let falhas = 0;

      for (let i = 0; i < due.length; i++) {
        const schedule = due[i];
        const label    = schedule.nome || String(schedule._id);
        const nextRun  = calcNextRun(schedule, now);

        // Lock atômico — impede dupla execução
        const claimed = await Schedule.findOneAndUpdate(
          { _id: schedule._id, proximaExecucao: schedule.proximaExecucao },
          { $set: { proximaExecucao: nextRun, ultimaExecucao: now } },
        );
        if (!claimed) {
          console.log(`[scheduler] [${i + 1}/${total}] "${label}" já reivindicado — pulando.`);
          continue;
        }

        console.log(`[scheduler] [${i + 1}/${total}] Iniciando: "${label}" | ok=${processados} | faltam=${total - i - 1}`);

        if (!schedule.tecnico?.nome) {
          console.warn(`[scheduler] "${label}" sem técnico responsável — pulando execução.`);
          await SchedulerNotification.create({
            scheduleId:   schedule._id,
            scheduleName: label,
            tipo:         "sem_tecnico",
            mensagem:     `Agendamento "${label}" não foi executado: técnico responsável não definido.`,
          }).catch((e) => console.error("[scheduler] Erro ao criar notificação:", e.message));
          falhas++;
          continue;
        }

        let ok = false;
        let execResults = [];
        for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
          try {
            execResults = await executeSchedule({ ...schedule.toObject(), session: cfg.session, authToken: cfg.authToken });
            ok = true;
            processados++;
            break;
          } catch (err) {
            console.warn(`[scheduler] "${label}" tentativa ${attempt}/${MAX_ATTEMPTS} falhou: ${err.message}`);
            if (attempt < MAX_ATTEMPTS) await sleep(1000 * attempt);
          }
        }

        if (!ok) {
          falhas++;
          console.error(`[scheduler] "${label}" falhou após ${MAX_ATTEMPTS} tentativas.`);
          await SchedulerNotification.create({
            scheduleId:   schedule._id,
            scheduleName: label,
            tipo:         "erro_execucao",
            mensagem:     `Agendamento "${label}" falhou após ${MAX_ATTEMPTS} tentativas de execução.`,
          }).catch((e) => console.error("[scheduler] Erro ao criar notificação:", e.message));
        } else {
          for (const r of execResults) {
            if (!r.success) {
              console.error(`[scheduler] "${label}" falha na unidade "${r.unit}": ${r.error}`);
              await SchedulerNotification.create({
                scheduleId:   schedule._id,
                scheduleName: label,
                tipo:         "erro_unidade",
                mensagem:     `Chamado não criado para "${r.unit}": ${r.error}`,
              }).catch((e) => console.error("[scheduler] Erro ao criar notificação:", e.message));
            } else if (!r.delegated && r.delegError) {
              await SchedulerNotification.create({
                scheduleId:   schedule._id,
                scheduleName: label,
                tipo:         "erro_delegacao",
                mensagem:     `Chamado ${r.ticketId} criado mas delegação falhou${r.unit ? ` (${r.unit})` : ""}: ${r.delegError}`,
              }).catch((e) => console.error("[scheduler] Erro ao criar notificação:", e.message));
            }
          }
        }

        if (i < due.length - 1) await sleep(DELAY_BETWEEN_SCHEDULES);
      }

      console.log(`[scheduler] Ciclo concluído: ${processados}/${total} executados, ${falhas} falha(s).`);
    } catch (err) {
      console.error("[scheduler] Erro no cron:", err.message);
    }
  });
}
