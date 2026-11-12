import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthShell from "../components/AuthShell";
import { obterMensagemErro } from "../services/api";
import { cadastrarUsuario } from "../services/authService";
import { validarCadastro } from "../services/authValidation";

const camposIniciais = {
  nomeCompleto: "",
  nomeUsuario: "",
  email: "",
  senha: "",
};

function CadastroUsuario() {
  const navigate = useNavigate();
  const [campos, setCampos] = useState(camposIniciais);
  const [errosCampos, setErrosCampos] = useState({});
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleChange = (evento) => {
    const { name, value } = evento.target;
    setCampos((atuais) => ({ ...atuais, [name]: value }));
    setErrosCampos((atuais) => ({ ...atuais, [name]: "" }));
  };

  const handleSubmit = async (evento) => {
    evento.preventDefault();
    const novosErros = validarCadastro(campos);
    setErrosCampos(novosErros);
    setErro("");

    if (Object.keys(novosErros).length > 0) return;

    setEnviando(true);
    try {
      await cadastrarUsuario({
        nomeCompleto: campos.nomeCompleto.trim(),
        nomeUsuario: campos.nomeUsuario.trim(),
        email: campos.email.trim(),
        senha: campos.senha,
      });
      navigate("/login", {
        replace: true,
        state: { mensagem: "Cadastro concluído. Entre com sua nova conta." },
      });
    } catch (erroRequisicao) {
      setErro(obterMensagemErro(erroRequisicao));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <AuthShell
      eyebrow="Um passo mais perto da natureza"
      title="Abra espaço para novas trilhas."
      description="Crie sua conta para registrar percursos, reunir informações e compartilhar o que encontrou pelo caminho."
      mode="cadastro"
    >
      <div className="authFormHeading">
        <span className="authStep">COMECE POR AQUI</span>
        <h2>Criar conta</h2>
        <p>Leva só alguns instantes.</p>
      </div>

      {erro ? <div className="authError" role="alert">{erro}</div> : null}

      <form className="authForm authFormCompact" onSubmit={handleSubmit} noValidate>
        <label className="authField" htmlFor="nomeCompleto">
          <span>Nome completo</span>
          <input
            autoComplete="name"
            id="nomeCompleto"
            name="nomeCompleto"
            type="text"
            value={campos.nomeCompleto}
            onChange={handleChange}
            placeholder="Como podemos chamar você?"
            required
            disabled={enviando}
            aria-invalid={Boolean(errosCampos.nomeCompleto)}
            aria-describedby={errosCampos.nomeCompleto ? "erro-nomeCompleto" : undefined}
          />
          {errosCampos.nomeCompleto ? <small id="erro-nomeCompleto">{errosCampos.nomeCompleto}</small> : null}
        </label>

        <label className="authField" htmlFor="nomeUsuario">
          <span>Nome de usuário</span>
          <input
            autoComplete="username"
            id="nomeUsuario"
            name="nomeUsuario"
            type="text"
            value={campos.nomeUsuario}
            onChange={handleChange}
            placeholder="Somente letras"
            required
            disabled={enviando}
            aria-invalid={Boolean(errosCampos.nomeUsuario)}
            aria-describedby={errosCampos.nomeUsuario ? "erro-nomeUsuario" : undefined}
          />
          {errosCampos.nomeUsuario ? <small id="erro-nomeUsuario">{errosCampos.nomeUsuario}</small> : null}
        </label>

        <label className="authField" htmlFor="email">
          <span>E-mail</span>
          <input
            autoComplete="email"
            id="email"
            name="email"
            type="email"
            value={campos.email}
            onChange={handleChange}
            placeholder="voce@email.com"
            required
            disabled={enviando}
            aria-invalid={Boolean(errosCampos.email)}
            aria-describedby={errosCampos.email ? "erro-email" : undefined}
          />
          {errosCampos.email ? <small id="erro-email">{errosCampos.email}</small> : null}
        </label>

        <label className="authField" htmlFor="senha">
          <span>Senha</span>
          <input
            autoComplete="new-password"
            id="senha"
            name="senha"
            type="password"
            value={campos.senha}
            onChange={handleChange}
            placeholder="Crie uma senha segura"
            required
            disabled={enviando}
            aria-invalid={Boolean(errosCampos.senha)}
            aria-describedby={errosCampos.senha ? "erro-senha" : "ajuda-senha"}
          />
          {errosCampos.senha ? (
            <small id="erro-senha">{errosCampos.senha}</small>
          ) : (
            <small id="ajuda-senha">8+ caracteres, maiúscula, minúscula, número e símbolo. Até 72 bytes.</small>
          )}
        </label>

        <button className="authSubmit" type="submit" disabled={enviando}>
          {enviando ? "Criando conta..." : "Criar minha conta"}
          <span aria-hidden="true">↗</span>
        </button>
      </form>

      <p className="authSwitch">
        Já tem uma conta? <Link to="/login">Entrar</Link>
      </p>
    </AuthShell>
  );
}

export default CadastroUsuario;
