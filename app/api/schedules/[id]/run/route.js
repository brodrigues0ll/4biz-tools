import { connectDB } from "@/lib/mongodb";
import Schedule from "@/lib/models/Schedule";
import { executeSchedule } from "@/lib/scheduler";

export async function POST(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const schedule = await Schedule.findById(id);
    if (!schedule) return Response.json({ error: "Não encontrado." }, { status: 404 });

    const results = await executeSchedule(schedule);

    schedule.ultimaExecucao = new Date();
    await schedule.save();

    return Response.json({ ok: true, results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
