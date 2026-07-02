import mongoose from "mongoose";

const DnbSchema = new mongoose.Schema({
  nomeTecnico:           { type: String, required: true },
  idUnidade:             { type: Number, required: true, unique: true },
  nomeUnidade:           { type: String, required: true },
  siglaUnidade:          { type: String, default: "" },
  navData:               { type: Object, default: {} },
  idSolicitante:         { type: Number, default: null },
  solicitante:           { type: String, default: "" },
  emailSolicitante:      { type: String, default: "" },
  idServico:             { type: Number, default: null },
  idServicoNegocioTecnico: { type: Number, default: null },
  nomeServico:           { type: String, default: "" },
  patrimonio:            { type: String, default: "" },
  idGrupoAtual:          { type: Number, default: 2 },
  nomeGrupoAtual:        { type: String, default: "" },
  atualizadoEm:          { type: Date, default: Date.now },
});

export default mongoose.models.Dnb || mongoose.model("Dnb", DnbSchema);
