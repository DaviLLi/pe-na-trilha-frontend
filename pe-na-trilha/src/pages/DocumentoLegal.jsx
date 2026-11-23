import { Link } from "react-router-dom";
import { documentosLegais } from "../data/documentosLegais.js";

export default function DocumentoLegal({ tipo }) {
  const documento = documentosLegais[tipo];
  return (
    <main className="productMain readingPage">
      <header className="productPageHeading">
        <span className="pageEyebrow">Transparência na comunidade · versão {documento.versao}</span>
        <h1>{documento.titulo}</h1>
        <p>{documento.introducao}</p>
      </header>
      <aside className="documentDraft" role="note"><strong>Documento em preparação</strong><p>Este texto não foi juridicamente validado. Os campos indicados devem ser preenchidos e as práticas confirmadas antes da publicação oficial.</p></aside>
      <nav className="documentIndex" aria-label="Seções do documento">
        {documento.secoes.map(([titulo], indice) => <a href={`#secao-${indice + 1}`} key={titulo}>{indice + 1}. {titulo}</a>)}
      </nav>
      {documento.secoes.map(([titulo, texto], indice) => (
        <section className="readingSection" key={titulo} id={`secao-${indice + 1}`}>
          <h2>{indice + 1}. {titulo}</h2><p>{texto}</p>
        </section>
      ))}
      {tipo === "privacidade" ? <p className="documentSources">Referências: <a href="https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados-1/direito-dos-titulares" target="_blank" rel="noopener noreferrer">Direitos dos titulares — ANPD</a> e <a href="https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm" target="_blank" rel="noopener noreferrer">Lei Geral de Proteção de Dados</a>.</p> : null}
      <footer className="readingFooter"><Link to="/cadastro">Ir para cadastro</Link><Link to={tipo === "termos" ? "/privacidade" : "/termos"}>{tipo === "termos" ? "Política de Privacidade" : "Termos de Uso"}</Link></footer>
    </main>
  );
}
