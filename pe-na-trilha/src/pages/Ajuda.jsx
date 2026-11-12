import { Link } from "react-router-dom";
import { niveisMedalhas } from "../data/niveisMedalhas.js";

const duvidas = [
  ["Por que minha publicação ainda não aparece no Feed?", "No fluxo previsto, o Feed público exibe apenas conteúdo aprovado. Uma publicação pendente aguarda análise. Nesta versão, o envio de novas publicações está indisponível: preencher o formulário não salva nem publica o conteúdo."],
  ["Posso publicar sem responder todas as perguntas?", "Sim. As dez perguntas são opcionais, assim como a duração. Responda apenas ao que souber e use ‘Limpar resposta’ para desfazer uma escolha. Título, descrição e localização continuam necessários no contrato atual. O envio será liberado quando a integração estiver disponível."],
  ["Posso alterar uma publicação?", "Quando a publicação informar que sua conta pode editá-la, o ícone de lápis abre a edição dos dados básicos. A regra de nova aprovação após alterações ainda precisa ser definida na integração. A ausência do botão pode indicar que a permissão não foi informada."],
  ["Como conquisto uma medalha?", "Somente trilhas aprovadas vinculadas à sua conta contam. A medalha Transparente corresponde a zero aprovações; os demais níveis seguem as faixas do Guia de Medalhas. Sem contagem recebida, o Perfil informa que o progresso está indisponível."],
  ["O que acontece quando minha publicação é rejeitada?", "No fluxo previsto, uma publicação rejeitada não entra no Feed público e não soma para medalhas. A consulta do motivo e os procedimentos de correção ou reenvio ainda dependem da integração. Não há notificação de rejeição implementada nesta versão."],
];

export default function Ajuda() {
  return (
    <main className="productMain helpPage">
      <header className="productPageHeading"><span className="pageEyebrow">A gente se encontra pelo caminho</span><h1>Central de Ajuda</h1><p>Um guia simples para explorar, compartilhar e cuidar da comunidade.</p></header>
      <div className="helpGrid">
        <section className="helpCard"><span className="helpNumber" aria-hidden="true">01</span><h2>Primeiros passos</h2><ul><li><Link to="/cadastro">Crie sua conta</Link> com seus dados, leia os documentos e aceite os Termos de Uso. Após a confirmação do servidor, você será levado ao login.</li><li>Entre na sua conta e abra <Link to="/perfil">Perfil</Link> no menu para conferir suas informações.</li><li>No <Link to="/trilhas">Feed</Link>, busque pelo título, descrição ou localização e consulte os detalhes dos percursos.</li></ul></section>
        <section className="helpCard"><span className="helpNumber" aria-hidden="true">02</span><h2>Publicações</h2><ul><li>Abra <Link to="/trilhas/nova">Nova publicação</Link>, informe título, descrição e localização. Para identificar uma trilha, praia ou cachoeira, você pode responder ‘Tipo de local’.</li><li>As dez perguntas são opcionais. A característica principal depende do tipo de local; ao trocar o tipo, escolha novamente o destaque.</li><li>Use os botões de horas e minutos para informar um tempo maior que zero, ou limpe a duração.</li><li>O envio de fotos ainda não está disponível. Quando for liberado, utilize imagens suas ou autorizadas e evite expor outras pessoas sem permissão.</li><li>O envio e a aprovação administrativa aguardam integração. O fluxo previsto mantém novas publicações pendentes até a aprovação.</li></ul></section>
        <section className="helpCard"><span className="helpNumber" aria-hidden="true">03</span><h2>Medalhas</h2><ul>{niveisMedalhas.map((nivel) => <li key={nivel.medalha}><strong>{nivel.nivel} — {nivel.titulo}:</strong> {nivel.faixa}.</li>)}</ul><p>Pendentes e rejeitadas não contam, pois ainda não representam contribuições aprovadas. Veja as artes no <Link to="/medalhas">Guia de Medalhas</Link>.</p></section>
        <section className="helpCard"><span className="helpNumber" aria-hidden="true">04</span><h2>Conta e segurança</h2><ul><li>Crie uma senha exclusiva, não a compartilhe e saia da conta em aparelhos compartilhados.</li><li>Confira os dados no Perfil. A edição de informações da conta ainda não está disponível.</li><li>Não publique documentos, contatos pessoais ou imagens que exponham terceiros.</li><li>Respeite áreas privadas, locais protegidos e autorizações de acesso. Uma localização no Feed não é permissão de entrada.</li></ul><p>Leia os <Link to="/termos">Termos de Uso</Link> e a <Link to="/privacidade">Política de Privacidade</Link>.</p></section>
      </div>
      <section className="helpFaq" aria-labelledby="duvidas-title"><h2 id="duvidas-title">Dúvidas frequentes</h2>{duvidas.map(([pergunta, resposta]) => <details key={pergunta}><summary>{pergunta}</summary><p>{resposta}</p></details>)}</section>
    </main>
  );
}
