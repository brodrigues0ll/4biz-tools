/**
 * Substitui {{variavel}} em uma string JSON pelo valor correspondente.
 * Retorna o objeto JavaScript resultante.
 */
export function applyTemplate(templateStr, vars) {
  const filled = templateStr.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    return key in vars ? String(vars[key]) : `{{${key}}}`;
  });
  return JSON.parse(filled);
}

/**
 * Gera preview de N objetos a partir do template e da lista de patrimônios.
 */
export function previewTemplates(templateStr, patrimonios) {
  return patrimonios.map((p) => ({
    patrimonio: p,
    payload: applyTemplate(templateStr, { patrimonio: p }),
  }));
}
