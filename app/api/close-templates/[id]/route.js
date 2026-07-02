import { connectDB } from "@/lib/mongodb";
import CloseTemplate from "@/lib/models/CloseTemplate";

export async function GET(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const t = await CloseTemplate.findById(id).lean();
    if (!t) return Response.json({ error: "Não encontrado." }, { status: 404 });
    return Response.json(t);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await request.json();
    const t = await CloseTemplate.findByIdAndUpdate(id, body, { new: true });
    if (!t) return Response.json({ error: "Não encontrado." }, { status: 404 });
    return Response.json(t);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    await CloseTemplate.findByIdAndDelete(id);
    return Response.json({ ok: true });
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 });
  }
}
