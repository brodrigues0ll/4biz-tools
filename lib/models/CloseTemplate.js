import mongoose from "mongoose";

const CloseTemplateSchema = new mongoose.Schema({
  nome:             { type: String, required: true },
  tipo:             { type: String, enum: ["abertura", "encerramento"], required: true },
  // Campos de encerramento
  causa:            { type: { id: Number, nome: String }, _id: false },
  categoriaSolucao: { type: { id: Number, nome: String }, _id: false },
  conhecimento:     { type: { id: Number, titulo: String }, _id: false },
  icRelacionado:    { type: { idItemConfiguracao: Number, identificacao: String, nomeItemConfiguracao: String }, _id: false },
  solucao:          { type: String, default: "" },
  descricaoCausa:   { type: String, default: "" },
  // Campos de abertura
  solicitante:      { type: { idEmpregado: Number, nome: String, email: String }, _id: false },
  atividade:        { type: { idAtividade: Number, idServico: Number, nomeComHierarquia: String }, _id: false },
  unidade:          { type: { id: Number, nome: String, sigla: String }, _id: false },
  grupo:            { type: { id: Number, nome: String }, _id: false },
  descricao:        { type: String, default: "" },
  conhecimentos:    { type: [{ type: { id: Number, titulo: String }, _id: false }], default: [] },
  criadoEm:         { type: Date, default: Date.now },
});

// Garante recompilação do modelo após hot-reload em dev (evita schema desatualizado em cache)
delete mongoose.models["CloseTemplate"];
export default mongoose.model("CloseTemplate", CloseTemplateSchema);
