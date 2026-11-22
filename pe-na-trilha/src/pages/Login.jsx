import { destinoAposLogin } from "../services/navegacaoSegura.js";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import { obterMensagemErro } from "../services/api";
import { calcularFimBloqueioLogin, guardarFimBloqueioLogin, lerFimBloqueioLogin } from "../services/limiteLogin.js";
import AuthShell from "../components/AuthShell";

function segundosAte(fim) {
  return Math.max(0, Math.ceil((fim - Date.now()) / 1000));
}

function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [identificador, setIdentificador] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [bloqueadoAte, setBloqueadoAte] = useState(lerFimBloqueioLogin);
  const [segundosRestantes, setSegundosRestantes] = useState(() => segundosAte(bloqueadoAte));
  const emAndamento = useRef(false);
  const bloqueado = segundosRestantes > 0;

  useEffect(() => {
    if (!bloqueado) return;
    const timer = setInterval(() => {
      setSegundosRestantes(segundosAte(bloqueadoAte));
    }, 250);
    return () => clearInterval(timer);
  }, [bloqueado, bloqueadoAte]);

  const handleSubmit = async (evento) => {
    evento.preventDefault();
    if (emAndamento.current || Date.now() < bloqueadoAte) return;
    emAndamento.current = true;
    setErro("");
    setEnviando(true);

    try {
      const usuario = await login({ identificador: identificador.trim(), senha });
      navigate(destinoAposLogin(location.state?.from, usuario), { replace: true });
    } catch (erroRequisicao) {
      if (erroRequisicao.response?.status === 429) {
        const fim = calcularFimBloqueioLogin(erroRequisicao.response.headers);
        guardarFimBloqueioLogin(fim);
        setBloqueadoAte(fim);
        setSegundosRestantes(segundosAte(fim));
      }
      setErro(obterMensagemErro(erroRequisicao));
    } finally {
      emAndamento.current = false;
      setEnviando(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Sua próxima aventura começa aqui"
      title="Entre no seu caminho."
      description="Acesse sua conta para compartilhar descobertas e cuidar das trilhas que você cadastrou."
      mode="login"
    >
      <div className="authFormHeading">
        <span className="authStep">BEM-VINDO DE VOLTA</span>
        <h2>Entrar</h2>
        <p>Use seu e-mail ou nome de usuário.</p>
      </div>

      {location.state?.mensagem ? (
        <div className="authNotice" role="status">
          {location.state.mensagem}
        </div>
      ) : null}

      {erro ? <div className="authError" role="alert">{erro}</div> : null}

      <form className="authForm" onSubmit={handleSubmit}>
        <label className="authField" htmlFor="identificador">
          <span>E-mail ou nome de usuário</span>
          <input
            autoComplete="username"
            id="identificador"
            name="identificador"
            type="text"
            value={identificador}
            onChange={(evento) => setIdentificador(evento.target.value)}
            placeholder="ex.: ana@email.com"
            required
            disabled={enviando}
          />
        </label>

        <label className="authField" htmlFor="senha">
          <span>Senha</span>
          <input
            autoComplete="current-password"
            id="senha"
            name="senha"
            type="password"
            value={senha}
            onChange={(evento) => setSenha(evento.target.value)}
            placeholder="Digite sua senha"
            required
            disabled={enviando}
          />
        </label>

        {bloqueado ? <p id="tempo-bloqueio-login" className="authNotice" role="timer">
          Você pode tentar novamente em {segundosRestantes} s.
        </p> : null}
        <button className="authSubmit" type="submit" disabled={enviando || bloqueado}
          aria-describedby={bloqueado ? "tempo-bloqueio-login" : undefined}>
          {enviando ? "Entrando..." : "Entrar na conta"}
          <span aria-hidden="true">↗</span>
        </button>
      </form>

      <p className="authSwitch">
        Ainda não tem uma conta? <Link to="/cadastro">Criar cadastro</Link>
      </p>
    </AuthShell>
  );
}

export default Login;
