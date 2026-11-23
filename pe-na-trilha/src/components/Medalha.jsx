import { medalhas } from "../data/medalhas.js";

const rotulos = {
  transparente: "Medalha Transparente",
  verde: "Medalha Verde",
  bronze: "Medalha Bronze",
  prata: "Medalha Prata",
  ouro: "Medalha Ouro",
};

export default function Medalha({ nivel, className = "", ...props }) {
  const src = medalhas[nivel];
  if (!src) return null;

  return <img className={className} src={src} alt={rotulos[nivel]} {...props} />;
}
