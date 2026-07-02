import { auth } from "@/auth";
import { connectDB } from "@/lib/mongodb";
import PermissionGroup from "@/lib/models/PermissionGroup";

const ADMIN_EMAIL = "bernardo.gomes@grupontsec.com.br";

function isAdmin(session) {
  return session?.isAdmin || session?.user?.email?.toLowerCase() === ADMIN_EMAIL;
}

export async function PUT(request, { params }) {
  const session = await auth();
  if (!isAdmin(session)) return Response.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  const { nome, emails, permissoes } = await request.json();

  await connectDB();
  const group = await PermissionGroup.findByIdAndUpdate(
    id,
    {
      nome: nome?.trim(),
      emails: (emails || []).map((e) => e.toLowerCase().trim()).filter(Boolean),
      permissoes,
    },
    { new: true, runValidators: true },
  );
  if (!group) return Response.json({ error: "Grupo não encontrado." }, { status: 404 });
  return Response.json(group);
}

export async function DELETE(_, { params }) {
  const session = await auth();
  if (!isAdmin(session)) return Response.json({ error: "Sem permissão." }, { status: 403 });

  const { id } = await params;
  await connectDB();
  const group = await PermissionGroup.findByIdAndDelete(id);
  if (!group) return Response.json({ error: "Grupo não encontrado." }, { status: 404 });
  return Response.json({ ok: true });
}
