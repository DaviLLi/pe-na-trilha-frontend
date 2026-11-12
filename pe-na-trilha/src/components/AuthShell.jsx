import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

function AuthShell({ eyebrow, title, description, mode, children }) {
  return (
    <main className={`authPage authPage-${mode}`}>
      <section className="authFrame" aria-label="Autenticação Pé na Trilha">
        <aside className="authStory">
          <Link className="authBrand" to="/trilhas" aria-label="Pé na Trilha, página de trilhas">
            <img src={logo} alt="" />
            <span>Pé na <strong>Trilha</strong></span>
          </Link>

          <div className="authStoryCopy">
            <span className="authEyebrow"><i /> {eyebrow}</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>

          <div className="authTrailNote" aria-hidden="true">
            <span className="trailNoteLine" />
            <span>DESCUBRA · REGISTRE · COMPARTILHE</span>
          </div>
          <span className="authCoordinates" aria-hidden="true">27°35′S&nbsp; 48°32′W</span>
        </aside>

        <section className="authPanel">
          <div className="authPanelMobileBrand">
            <img src={logo} alt="" />
            <span>Pé na <strong>Trilha</strong></span>
          </div>
          {children}
        </section>
      </section>
      <footer className="authFooter">PÉ NA TRILHA <span>•</span> CAMINHOS QUE CONECTAM</footer>
    </main>
  );
}

export default AuthShell;
