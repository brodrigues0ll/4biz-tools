"use client";

import { useState } from "react";

const SECTIONS = [
  { id: "login",          label: "Login" },
  { id: "abertura",       label: "Abrir Chamados" },
  { id: "encerramento",   label: "Encerrar Chamados" },
  { id: "templates",      label: "Templates" },
  { id: "agendamentos",   label: "Agendamentos" },
  { id: "configuracoes",  label: "Configurações" },
  { id: "permissoes",     label: "Permissões" },
];

function Section({ title, children }) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-white border-b border-gray-800 pb-2">{title}</h2>
      {children}
    </div>
  );
}

function Block({ title, children }) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-2">
      {title && <h3 className="text-sm font-medium text-gray-200">{title}</h3>}
      <div className="text-xs text-gray-400 space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}

function Field({ name, children }) {
  return (
    <div className="flex gap-2">
      <span className="text-gray-300 font-medium shrink-0">{name}:</span>
      <span>{children}</span>
    </div>
  );
}

// ── Conteúdo das seções ───────────────────────────────────────────────────────

function LoginSection() {
  return (
    <Section title="Login">
      <Block>
        <p>
          O acesso ao sistema é feito com os cookies de autenticação do 4Biz. Esses cookies identificam
          sua sessão e permitem que o sistema opere em seu nome no 4Biz.
        </p>
        <p>
          Os cookies expiram periodicamente. Quando isso acontece você será redirecionado para esta tela
          automaticamente. Basta obter novos cookies e fazer login novamente.
        </p>
      </Block>
      <Block title="Como obter os cookies">
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Acesse <span className="text-blue-400 font-mono">nav.4biz.one</span> e faça login normalmente.</li>
          <li>Com o 4Biz aberto, pressione <kbd className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 font-mono">F12</kbd> para abrir as ferramentas de desenvolvedor.</li>
          <li>Vá na aba <span className="text-gray-200">Application</span> → <span className="text-gray-200">Cookies</span> → clique no domínio <span className="font-mono text-gray-200">nav.4biz.one</span>.</li>
          <li>Encontre os cookies <span className="font-mono text-yellow-400">SESSION</span> e <span className="font-mono text-yellow-400">HYPER-AUTH-TOKEN</span> e copie os valores de cada um.</li>
          <li>Cole os valores nos campos da tela de login e clique em <strong className="text-gray-200">Entrar</strong>.</li>
        </ol>
      </Block>
      <Block title="Campos">
        <Field name="SESSION">Cookie de sessão HTTP do 4Biz. Começa com uma sequência alfanumérica longa.</Field>
        <Field name="HYPER-AUTH-TOKEN">Token JWT de autenticação. Começa com <span className="font-mono text-gray-300">eyJ…</span></Field>
      </Block>
    </Section>
  );
}

function AberturaSection() {
  return (
    <Section title="Abrir Chamados">
      <Block>
        <p>
          Esta é a página principal do sistema. Permite criar um ou vários chamados de uma vez,
          preenchendo os campos do ticket e informando os números de patrimônio dos equipamentos.
        </p>
      </Block>
      <Block title="Campos de Configuração">
        <Field name="Solicitante">Pessoa em nome de quem o chamado será aberto. Digite o nome ou e-mail e selecione na lista.</Field>
        <Field name="Atividade">Tipo de serviço do chamado. Só fica disponível depois que o solicitante é selecionado.</Field>
        <Field name="Unidade do Equipamento">Localidade física do equipamento. Busque pelo nome da unidade.</Field>
        <Field name="Fila de Atendimento">Grupo responsável pelo chamado (ex: Helpdesk, Suporte Nível 2). Se não selecionado, vai para a fila padrão do template.</Field>
        <Field name="Técnico Responsável">Atribui o chamado a um técnico específico após a criação. Busque pelo nome.</Field>
      </Block>
      <Block title="Texto do Chamado">
        <p>
          Descrição que será inserida em todos os chamados criados. Use <span className="font-mono text-yellow-400">{"{{patrimonio}}"}</span> como marcador
          — ele será substituído pelo número de patrimônio correspondente em cada chamado.
        </p>
        <p>Exemplo: <span className="font-mono text-gray-300">{"Equipamento {{patrimonio}} com problema na tela."}</span></p>
      </Block>
      <Block title="Números de Patrimônio">
        <p>
          Lista de patrimônios para os quais serão criados chamados. Coloque um número por linha.
          O sistema cria um chamado para cada patrimônio, em sequência, com um intervalo de 600ms entre eles.
        </p>
        <p>
          Se você tiver permissão apenas de criação simples (sem lote), verá um campo único de patrimônio.
        </p>
      </Block>
      <Block title="Aba Avançado">
        <p>
          Exibe o JSON completo do template que será enviado ao 4Biz. Permite editar diretamente
          quaisquer campos do payload antes de criar os chamados. Útil para ajustes finos que não
          estão expostos na interface principal.
        </p>
        <p>
          Esta aba só é exibida para usuários com permissão de <strong className="text-gray-200">Ver Avançado</strong>.
        </p>
      </Block>
      <Block title="Aba Resultados">
        <p>Após criar os chamados, mostra o status de cada um: sucesso com o número do chamado gerado, ou falha com a mensagem de erro retornada pelo 4Biz.</p>
      </Block>
    </Section>
  );
}

function EncerramentoSection() {
  return (
    <Section title="Encerrar Chamados">
      <Block>
        <p>
          Permite encerrar múltiplos chamados de uma vez, informando os números dos chamados e
          aplicando um template de encerramento com solução, causa e descrição.
        </p>
      </Block>
      <Block title="Como usar">
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Selecione um template de encerramento na lista ou preencha os campos manualmente.</li>
          <li>Informe os números dos chamados a serem encerrados (um por linha).</li>
          <li>Clique em <strong className="text-gray-200">Encerrar Chamados</strong>.</li>
          <li>Acompanhe os resultados na aba Resultados.</li>
        </ol>
      </Block>
      <Block title="Campos do encerramento">
        <Field name="Template">Selecione um template salvo para preencher automaticamente os campos de encerramento.</Field>
        <Field name="Solução">Texto descrevendo a solução aplicada ao problema.</Field>
        <Field name="Causa">Causa raiz identificada para o problema.</Field>
        <Field name="Descrição">Informações adicionais sobre o atendimento.</Field>
        <Field name="Conhecimentos">Artigos da base de conhecimento vinculados ao encerramento.</Field>
      </Block>
    </Section>
  );
}

function TemplatesSection() {
  return (
    <Section title="Templates">
      <Block>
        <p>
          Templates são configurações salvas que podem ser reutilizadas na abertura ou encerramento de chamados.
          Evitam ter que preencher os mesmos campos repetidamente.
        </p>
      </Block>
      <Block title="Templates de Encerramento">
        <p>
          Contêm solução, causa, descrição e artigos de conhecimento predefinidos.
          Ao selecionar um template na tela de encerramento, todos os campos são preenchidos automaticamente.
        </p>
      </Block>
      <Block title="Templates de Abertura">
        <p>
          Contêm o JSON completo de um chamado (payload). São usados pela tela de Abrir Chamados
          e pelos Agendamentos como base para criação dos tickets.
        </p>
        <p>
          Para criar um template de abertura, a forma mais simples é configurar um chamado na tela principal
          e usar a aba <strong className="text-gray-200">Avançado</strong> para copiar o JSON gerado.
        </p>
      </Block>
      <Block title="Permissões">
        <p>
          Usuários sem permissão de edição podem visualizar os templates mas não criar, editar ou excluir.
          Os botões de ação ficam ocultos nesses casos.
        </p>
      </Block>
    </Section>
  );
}

function AgendamentosSection() {
  return (
    <Section title="Agendamentos">
      <Block>
        <p>
          Permite criar chamados automaticamente em datas e horários programados, sem intervenção manual.
          O sistema verifica a cada minuto se há agendamentos a executar.
        </p>
      </Block>
      <Block title="Campos de um agendamento">
        <Field name="Nome">Identificação do agendamento para facilitar a gestão.</Field>
        <Field name="Frequência">Define quando o agendamento executa: diária, semanal, mensal ou anual.</Field>
        <Field name="Horário">Hora e minuto em que os chamados serão criados.</Field>
        <Field name="Dias da semana">Para frequência semanal, selecione os dias em que deve executar.</Field>
        <Field name="Dia do mês">Para frequência mensal ou anual, o dia do mês de execução.</Field>
        <Field name="Mês">Para frequência anual, o mês de execução.</Field>
        <Field name="Template">JSON do chamado que será criado. Pode ser preenchido a partir de um template salvo.</Field>
        <Field name="Unidades">Lista de unidades para as quais serão criados chamados. Um chamado por unidade.</Field>
        <Field name="Patrimônio fixo">Número de patrimônio aplicado a todos os chamados do agendamento.</Field>
        <Field name="Técnico responsável">Técnico para quem os chamados serão delegados após a criação.</Field>
      </Block>
      <Block title="Frequências disponíveis">
        <Field name="Diária">Executa todos os dias no horário definido.</Field>
        <Field name="Semanal">Executa nos dias da semana selecionados, no horário definido.</Field>
        <Field name="Mensal">Executa no dia do mês especificado, todo mês.</Field>
        <Field name="Anual">Executa em uma data específica (dia e mês) a cada ano.</Field>
      </Block>
      <Block title="Ativar / Pausar">
        <p>
          Cada agendamento pode ser ativado ou pausado individualmente pelo toggle na listagem.
          Agendamentos pausados não executam mesmo quando o horário chega.
          Use os botões <strong className="text-gray-200">Ativar todos</strong> e <strong className="text-gray-200">Pausar todos</strong> para controle em massa.
        </p>
      </Block>
      <Block title="Executar manualmente">
        <p>
          O botão de play (▶) na lista executa o agendamento imediatamente, independente do horário programado.
          Útil para testar ou executar fora do horário.
        </p>
      </Block>
      <Block title="Permissões">
        <p>
          Usuários com acesso de somente leitura veem os agendamentos mas não têm os botões Novo, Editar e Excluir.
          A permissão de <strong className="text-gray-200">Editar</strong> é necessária para criar ou modificar agendamentos.
        </p>
      </Block>
    </Section>
  );
}

function ConfiguracoesSection() {
  return (
    <Section title="Configurações">
      <Block title="Aba Autenticação">
        <p>
          Permite atualizar os cookies SESSION e HYPER-AUTH-TOKEN sem precisar fazer logout.
          Ao clicar em <strong className="text-gray-200">Salvar e renovar sessão</strong>, o sistema valida os novos cookies
          no 4Biz e atualiza a sessão automaticamente.
        </p>
        <p>
          Use esta aba quando os cookies expirarem e o sistema começar a retornar erros de autenticação.
        </p>
      </Block>
      <Block title="Aba Backup e Restauração">
        <p>
          Exporta um arquivo JSON com todos os templates e agendamentos cadastrados no sistema.
          Útil para migrar dados entre ambientes ou como backup preventivo.
        </p>
        <p>
          <strong className="text-red-400">Atenção:</strong> A restauração substitui todos os dados existentes pelo conteúdo do arquivo.
          Faça um backup antes de restaurar.
        </p>
      </Block>
      <Block title="Aba Permissões">
        <p>
          Gerencia os grupos de permissão do sistema. Disponível apenas para administradores e usuários
          com permissão de gerenciar permissões.
        </p>
      </Block>
    </Section>
  );
}

function PermissoesSection() {
  return (
    <Section title="Permissões">
      <Block>
        <p>
          O sistema usa grupos de permissão para controlar o que cada usuário pode acessar e fazer.
          Cada usuário é identificado pelo e-mail que vem do cadastro no 4Biz.
        </p>
        <p>
          Usuários que não pertencem a nenhum grupo ficam restritos apenas à página de Configurações
          (para atualizar os cookies). Entre em contato com o administrador para ser adicionado a um grupo.
        </p>
      </Block>
      <Block title="Como criar um grupo">
        <ol className="list-decimal list-inside space-y-1.5">
          <li>Acesse <strong className="text-gray-200">Configurações → Permissões</strong>.</li>
          <li>Clique em <strong className="text-gray-200">+ Novo grupo</strong>.</li>
          <li>Defina um nome para o grupo (ex: Técnicos, Supervisores).</li>
          <li>Adicione os e-mails dos usuários que farão parte do grupo.</li>
          <li>Ative as permissões desejadas para o grupo.</li>
          <li>Clique em <strong className="text-gray-200">Salvar</strong>.</li>
        </ol>
      </Block>
      <Block title="Permissões disponíveis">
        <Field name="Abrir Chamados — acessar">Permite entrar na página de abertura de chamados.</Field>
        <Field name="Abrir Chamados — ver Avançado">Exibe a aba Avançado com o JSON do template.</Field>
        <Field name="Abrir Chamados — criação em lote">Permite inserir uma lista de patrimônios para criar múltiplos chamados de uma vez.</Field>
        <Field name="Encerrar Chamados — acessar">Permite entrar na página de encerramento de chamados.</Field>
        <Field name="Templates — acessar">Permite visualizar os templates de abertura e encerramento.</Field>
        <Field name="Templates — criar / editar / excluir">Permite modificar os templates.</Field>
        <Field name="Agendamentos — acessar">Permite visualizar a lista de agendamentos.</Field>
        <Field name="Agendamentos — criar / editar / excluir">Permite criar e modificar agendamentos.</Field>
        <Field name="Agendamentos — ver de todos">Permite visualizar agendamentos criados por outros usuários.</Field>
        <Field name="Configurações — Backup e Restauração">Acesso à aba de backup.</Field>
        <Field name="Configurações — Permissões">Acesso à aba de gerenciamento de grupos de permissão.</Field>
      </Block>
      <Block title="Administrador">
        <p>
          O e-mail <span className="font-mono text-yellow-400">bernardo.gomes@grupontsec.com.br</span> tem acesso total ao sistema
          independente de grupos. As permissões do administrador não podem ser removidas.
        </p>
      </Block>
      <Block title="Quando as permissões são aplicadas">
        <p>
          As permissões são carregadas no momento do login. Se um usuário for adicionado a um grupo
          ou tiver suas permissões alteradas, ele precisa fazer logout e login novamente para que
          as mudanças tenham efeito.
        </p>
      </Block>
    </Section>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

const CONTENT = {
  login:         <LoginSection />,
  abertura:      <AberturaSection />,
  encerramento:  <EncerramentoSection />,
  templates:     <TemplatesSection />,
  agendamentos:  <AgendamentosSection />,
  configuracoes: <ConfiguracoesSection />,
  permissoes:    <PermissoesSection />,
};

export default function TutorialPage() {
  const [active, setActive] = useState("login");

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0">
      {/* Sidebar de navegação */}
      <aside className="lg:w-48 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-800 bg-gray-950">
        <div className="px-4 py-3 border-b border-gray-800">
          <h1 className="font-semibold text-white text-sm">Tutorial</h1>
        </div>
        <nav className="flex lg:flex-col gap-1 p-2 overflow-x-auto lg:overflow-x-visible">
          {SECTIONS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className={`shrink-0 text-left px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                active === id
                  ? "bg-blue-600/20 text-blue-400 border border-blue-600/30"
                  : "text-gray-400 hover:text-gray-100 hover:bg-gray-800"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto">
        <div className="max-w-2xl space-y-6">
          {CONTENT[active]}
        </div>
      </main>
    </div>
  );
}
