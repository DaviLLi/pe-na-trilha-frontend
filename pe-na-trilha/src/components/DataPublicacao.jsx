const dataFormatada = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
const horaFormatada = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

export default function DataPublicacao({ createdAt }) {
  if (typeof createdAt !== "string" || !createdAt.trim()) return null;
  const data = new Date(createdAt);
  if (!Number.isFinite(data.getTime())) return null;
  const texto = `${dataFormatada.format(data)} · ${horaFormatada.format(data)}`;
  return <time className="publicationDate" dateTime={data.toISOString()} title="Data de publicação · horário local" aria-label={`Publicada em ${texto}`}>{texto}</time>;
}
