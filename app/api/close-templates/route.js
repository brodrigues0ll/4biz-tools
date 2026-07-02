import { connectDB } from "@/lib/mongodb";
import CloseTemplate from "@/lib/models/CloseTemplate";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const filter = tipo ? { tipo } : {};
    const templates = await CloseTemplate.find(filter).sort({ criadoEm: -1 }).lean();
    return Response.json(templates);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const template = await CloseTemplate.create(body);
    return Response.json(template, { status: 201 });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
