import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useAuth } from "../contexts/useAuth.js";
import { calcularMedalha, niveisMedalhas } from "../data/niveisMedalhas.js";
import { contarPublicacoesProprias } from "../services/estatisticasPublicacoes.js";
import { listarMinhasTrilhas } from "../services/trilhasService.js";
import Medalha from "./Medalha.jsx";
import "../styles/galeriaMedalhas.css";

const consultaDesktop = "(min-width: 861px) and (hover: hover) and (pointer: fine)";

function observarDesktop(atualizar) {
  const consulta = window.matchMedia(consultaDesktop);
  consulta.addEventListener("change", atualizar);
  return () => consulta.removeEventListener("change", atualizar);
}

function emDesktop() {
  return window.matchMedia(consultaDesktop).matches;
}

function EstadoMedalha({ estado }) {
  return (
    <span className="medalCollectionState" data-state={estado}>
      {estado === "Bloqueada" ? (
        <svg aria-hidden="true" width="14" height="14" viewBox="0 0 16 16" fill="none"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
          <rect x="3.5" y="7" width="9" height="6.5" rx="1.5" />
          <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" />
        </svg>
      ) : (
        <span className="medalCollectionDot" aria-hidden="true" />
      )}
      <span className="medalCollectionStateText">{estado}</span>
    </span>
  );
}

function PainelMedalha({ nivel, expandida, estado, selecionar, registrarBotao, navegar }) {
  const id = useId();
  const cartao = useRef(null);
  const quadro = useRef(0);

  useEffect(() => () => cancelAnimationFrame(quadro.current), []);

  function limparBrilho() {
    cancelAnimationFrame(quadro.current);
    const estilo = cartao.current?.style;
    if (!estilo) return;
    for (const variavel of ["--foil-x", "--foil-y", "--tilt-x", "--tilt-y"]) {
      estilo.removeProperty(variavel);
    }
  }

  function moverBrilho(evento) {
    if (!expandida || evento.pointerType !== "mouse") return;
    const { clientX, clientY, currentTarget } = evento;
    cancelAnimationFrame(quadro.current);
    quadro.current = requestAnimationFrame(() => {
      if (!cartao.current || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      const { left, top, width, height } = currentTarget.getBoundingClientRect();
      const x = (clientX - left) / width;
      const y = (clientY - top) / height;
      const estilo = cartao.current.style;
      estilo.setProperty("--foil-x", `${x * 100}%`);
      estilo.setProperty("--foil-y", `${y * 100}%`);
      estilo.setProperty("--tilt-x", `${(0.5 - y) * 8}deg`);
      estilo.setProperty("--tilt-y", `${(x - 0.5) * 10}deg`);
    });
  }

  return (
    <li className="medalCollectionPanel" data-medal={nivel.medalha} data-expanded={expandida}
      data-locked={estado === "Bloqueada"} onPointerLeave={limparBrilho}>
      <button
        ref={registrarBotao}
        id={`${id}-botao`}
        type="button"
        className="medalCollectionTab"
        aria-label={`${nivel.nivel}, ${estado.toLowerCase()}`}
        aria-expanded={expandida}
        aria-controls={`${id}-painel`}
        onFocus={selecionar}
        onClick={selecionar}
        onKeyDown={navegar}
        onPointerEnter={(evento) => { if (evento.pointerType === "mouse") selecionar(); }}
        onPointerMove={moverBrilho}
      >
        {expandida ? null : (
          <span className="medalCollectionTabContent" aria-hidden="true">
            <Medalha nivel={nivel.medalha} className="medalCollectionThumb" alt="" />
            <span>{nivel.nivel}</span>
            <EstadoMedalha estado={estado} />
          </span>
        )}
      </button>
      <div className="medalCollectionRegion" id={`${id}-painel`} role="region"
        aria-labelledby={`${id}-botao`} hidden={!expandida}>
        {expandida ? (
          <div className="medalHolo" ref={cartao}>
            <div className="medalHoloArtwork">
              <Medalha nivel={nivel.medalha} className="medalHoloImage" />
            </div>
            <div className="medalHoloCopy">
              <EstadoMedalha estado={estado} />
              <h3>{nivel.nivel}</h3>
              <strong>{nivel.titulo}</strong>
              <p>{nivel.faixa}</p>
            </div>
          </div>
        ) : null}
      </div>
    </li>
  );
}

function ColecaoMedalhas({ usuarioId }) {
  const id = useId();
  const botoes = useRef([]);
  const titulo = useRef(null);
  const botaoTentarNovamente = useRef(null);
  const [escolha, setEscolha] = useState(null);
  const [tentativa, setTentativa] = useState(0);
  const [situacao, setSituacao] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    async function consultar() {
      const publicacoes = await listarMinhasTrilhas({ signal: controller.signal }).catch(() => null);
      if (controller.signal.aborted) return;
      const estatisticas = contarPublicacoesProprias(publicacoes, usuarioId);
      const conquista = calcularMedalha(estatisticas?.aprovadas);
      if (conquista && document.activeElement === botaoTentarNovamente.current) {
        titulo.current?.focus({ preventScroll: true });
      }
      setSituacao({ conquista, tentativa });
    }
    void consultar();
    return () => controller.abort();
  }, [usuarioId, tentativa]);

  const conquista = situacao?.conquista;
  const carregando = situacao?.tentativa !== tentativa;
  const quantidade = niveisMedalhas.indexOf(conquista?.atual) + 1;
  const ativa = escolha ?? conquista?.atual.medalha ?? niveisMedalhas[0].medalha;
  const status = carregando ? "Verificando conquistas…" : "Progresso indisponível";

  function tentarNovamente() {
    if (!carregando) setTentativa(tentativa + 1);
  }

  function moverFoco(evento, indice) {
    const total = niveisMedalhas.length;
    const destinos = {
      ArrowLeft: (indice + total - 1) % total,
      ArrowRight: (indice + 1) % total,
      Home: 0,
      End: total - 1,
    };
    if (!Object.hasOwn(destinos, evento.key)) return;
    evento.preventDefault();
    botoes.current[destinos[evento.key]]?.focus();
  }

  return (
    <section className="medalCollection" aria-labelledby={id}>
      <header className="medalCollectionHeading">
        <h2 id={id} ref={titulo} tabIndex={-1}>Sua coleção</h2>
        <div className="medalCollectionProgress">
          <p role="status">{conquista ? `${quantidade} de ${niveisMedalhas.length} conquistadas` : status}</p>
          {situacao && !conquista ? (
            <button className="medalCollectionRetry" ref={botaoTentarNovamente} type="button"
              aria-disabled={carregando} onClick={tentarNovamente}>
              Tentar novamente
            </button>
          ) : null}
        </div>
      </header>
      <ul className="medalCollectionPanels" role="list">
        {niveisMedalhas.map((nivel, indice) => (
          <PainelMedalha
            key={nivel.medalha}
            nivel={nivel}
            expandida={ativa === nivel.medalha}
            estado={conquista ? (indice < quantidade ? "Conquistada" : "Bloqueada") : "Status desconhecido"}
            selecionar={() => setEscolha(nivel.medalha)}
            registrarBotao={(botao) => { botoes.current[indice] = botao; }}
            navegar={(evento) => moverFoco(evento, indice)}
          />
        ))}
      </ul>
    </section>
  );
}

export default function GaleriaMedalhas() {
  const desktop = useSyncExternalStore(observarDesktop, emDesktop, () => false);
  const { usuario } = useAuth();
  if (!desktop || !usuario?._id) return null;
  return <ColecaoMedalhas key={usuario._id} usuarioId={usuario._id} />;
}
