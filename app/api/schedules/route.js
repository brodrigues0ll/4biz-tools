import { connectDB } from "@/lib/mongodb";
import Schedule from "@/lib/models/Schedule";
import { calcNextRun } from "@/lib/scheduler";

// ── Ativar / pausar todos ──────────────────────────────────────────────────────

export async function PATCH(request) {
  try {
    await connectDB();
    const { ativo } = await request.json();
    if (typeof ativo !== "boolean") {
      return Response.json({ error: "Campo 'ativo' booleano obrigatório." }, { status: 400 });
    }

    if (ativo) {
      // Recalcula proximaExecucao para cada agendamento ao ativar
      const schedules = await Schedule.find({ ativo: false });
      await Promise.all(schedules.map((s) => {
        s.ativo = true;
        s.proximaExecucao = calcNextRun(s);
        return s.save();
      }));
      return Response.json({ ok: true, updated: schedules.length });
    } else {
      const result = await Schedule.updateMany({}, { $set: { ativo: false } });
      return Response.json({ ok: true, updated: result.modifiedCount });
    }
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    await connectDB();
    const schedules = await Schedule.find().sort({ criadoEm: -1 }).lean();
    return Response.json(schedules);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      nome, frequencia, diasSemana, diaMes, mes, hora, minuto,
      todasUnidades, unidades, patrimonioFixo,
      session, authToken, templateStr, tecnico,
    } = body;

    if (!authToken) return Response.json({ error: "Autenticação obrigatória." }, { status: 400 });
    if (!templateStr) return Response.json({ error: "Template obrigatório." }, { status: 400 });
    if (!frequencia)  return Response.json({ error: "Frequência obrigatória." }, { status: 400 });

    await connectDB();

    const draft = {
      nome: nome || "", frequencia, diasSemana, diaMes, mes,
      hora: hora ?? 8, minuto: minuto ?? 0,
      todasUnidades: todasUnidades || false,
      unidades: unidades || [],
      patrimonioFixo: patrimonioFixo || "",
      session, authToken, templateStr,
      tecnico: tecnico || null,
      ativo: true,
    };
    draft.proximaExecucao = calcNextRun(draft);

    const schedule = await Schedule.create(draft);
    return Response.json(schedule, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
