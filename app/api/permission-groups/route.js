import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import PermissionGroup from "@/lib/models/PermissionGroup";

const ADMIN_EMAIL = "bernardo.gomes@grupontsec.com.br";

function isAdmin(session) {
  return session?.isAdmin || session?.user?.email?.toLowerCase() === ADMIN_EMAIL;
}

export async function GET() {
  const session = await auth();
  if (!isAdmin(session)) return Response.json({ error: "Sem permissão." }, { status: 403 });

  await connectDB();
  const groups = await PermissionGroup.find().sort({ criadoEm: 1 }).lean();
  return Response.json(groups);
}

export async function POST(request) {
  const session = await auth();
  if (!isAdmin(session)) return Response.json({ error: "Sem permissão." }, { status: 403 });

  const body = await request.json();
  const { nome, emails, permissoes } = body;

  if (!nome?.trim()) return Response.json({ error: "Nome obrigatório." }, { status: 400 });

  await connectDB();
  const group = await PermissionGroup.create({
    nome: nome.trim(),
    emails: (emails || []).map((e) => e.toLowerCase().trim()).filter(Boolean),
    permissoes: permissoes || {},
  });
  return Response.json(group, { status: 201 });
}
