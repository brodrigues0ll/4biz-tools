import { connectDB } from "@/lib/mongodb";
import SchedulerNotification from "@/lib/models/SchedulerNotification";

export async function GET() {
  await connectDB();
  const items  = await SchedulerNotification.find().sort({ criadoEm: -1 }).limit(200).lean();
  const unread = await SchedulerNotification.countDocuments({ lido: false });
  return Response.json({ items, unread });
}

export async function PATCH(req) {
  await connectDB();
  const body = await req.json().catch(() => ({}));

  if (body.marcarTodosLidos) {
    await SchedulerNotification.updateMany({ lido: false }, { $set: { lido: true } });
    return Response.json({ ok: true });
  }

  if (body.id) {
    await SchedulerNotification.findByIdAndUpdate(body.id, { $set: { lido: true } });
    return Response.json({ ok: true });
  }

  return Response.json({ error: "Parâmetro inválido" }, { status: 400 });
}
