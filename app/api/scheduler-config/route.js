import { connectDB } from "@/lib/mongodb";
import SchedulerConfig from "@/lib/models/SchedulerConfig";
import Schedule from "@/lib/models/Schedule";

export async function GET() {
  try {
    await connectDB();
    const cfg = await SchedulerConfig.findById("global").lean();
    return Response.json({
      session:   cfg?.session   ? "***" : "",
      authToken: cfg?.authToken ? "***" : "",
      configured: !!(cfg?.session && cfg?.authToken),
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    await connectDB();
    const { session, authToken } = await request.json();
    await SchedulerConfig.findByIdAndUpdate(
      "global",
      { session, authToken, updatedAt: new Date() },
      { upsert: true },
    );
    await Schedule.updateMany({}, { $set: { session, authToken } });
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
