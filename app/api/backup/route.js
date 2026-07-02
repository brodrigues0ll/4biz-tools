import { connectDB } from "@/lib/mongodb";
import CloseTemplate from "@/lib/models/CloseTemplate";
import Schedule from "@/lib/models/Schedule";

export async function GET() {
  try {
    await connectDB();
    const [templates, schedules] = await Promise.all([
      CloseTemplate.find().lean(),
      Schedule.find().lean(),
    ]);
    const payload = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      closetemplates: templates,
      schedules,
    };
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="backup-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();

    if (!body.version || !body.closetemplates || !body.schedules) {
      return Response.json({ error: "Arquivo de backup inválido." }, { status: 400 });
    }

    // Substitui toda a base pelos dados do backup
    await Promise.all([
      CloseTemplate.deleteMany({}),
      Schedule.deleteMany({}),
    ]);

    const results = { templates: 0, schedules: 0 };

    if (body.closetemplates.length > 0) {
      const inserted = await CloseTemplate.insertMany(body.closetemplates, { ordered: false });
      results.templates = inserted.length;
    }

    if (body.schedules.length > 0) {
      const inserted = await Schedule.insertMany(body.schedules, { ordered: false });
      results.schedules = inserted.length;
    }

    return Response.json({ ok: true, ...results });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
