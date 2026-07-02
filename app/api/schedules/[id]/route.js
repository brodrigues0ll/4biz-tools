import { connectDB } from "@/lib/mongodb";
import Schedule from "@/lib/models/Schedule";
import { calcNextRun } from "@/lib/scheduler";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const schedule = await Schedule.findById(id).lean();
    if (!schedule) return Response.json({ error: "Não encontrado." }, { status: 404 });
    return Response.json(schedule);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();

    const schedule = await Schedule.findById(id);
    if (!schedule) return Response.json({ error: "Não encontrado." }, { status: 404 });

    // Toggle rápido de ativo (da lista)
    if (Object.keys(body).length === 1 && body.ativo !== undefined) {
      schedule.ativo = body.ativo;
      if (body.ativo) schedule.proximaExecucao = calcNextRun(schedule);
      await schedule.save();
      return Response.json(schedule);
    }

    // Edição completa
    const fields = [
      "nome","frequencia","diasSemana","diaMes","mes","hora","minuto",
      "todasUnidades","unidades","patrimonioFixo","session","authToken","templateStr","tecnico",
    ];
    for (const f of fields) {
      if (body[f] !== undefined) schedule[f] = body[f];
    }
    if (body.ativo !== undefined) schedule.ativo = body.ativo;
    schedule.proximaExecucao = calcNextRun(schedule);

    await schedule.save();
    return Response.json(schedule);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    await Schedule.findByIdAndDelete(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
