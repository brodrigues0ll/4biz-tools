import mongoose from "mongoose";

const PermissoesSchema = new mongoose.Schema(
  {
    abertura: {
      acessar:       { type: Boolean, default: false },
      verAvancado:   { type: Boolean, default: false },
      criacaoEmLote: { type: Boolean, default: false },
    },
    encerramento: {
      acessar: { type: Boolean, default: false },
    },
    templateEncerramento: {
      acessar: { type: Boolean, default: false },
      editar:  { type: Boolean, default: false },
    },
    agendamentos: {
      acessar:  { type: Boolean, default: false },
      editar:   { type: Boolean, default: false },
      verTodos: { type: Boolean, default: false },
    },
    configuracoes: {
      acessar:             { type: Boolean, default: true },
      backupRestauracao:   { type: Boolean, default: false },
      gerenciarPermissoes: { type: Boolean, default: false },
    },
  },
  { _id: false },
);

const PermissionGroupSchema = new mongoose.Schema({
  nome:      { type: String, required: true },
  emails:    [{ type: String, lowercase: true, trim: true }],
  permissoes: { type: PermissoesSchema, default: () => ({}) },
  criadoEm:  { type: Date, default: Date.now },
});

delete mongoose.models["PermissionGroup"];
export default mongoose.model("PermissionGroup", PermissionGroupSchema);
