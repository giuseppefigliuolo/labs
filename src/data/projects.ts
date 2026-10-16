export const asset = (name: string) => `${import.meta.env.BASE_URL}assets/${name}`

export type Project = {
  id: string
  name: string
  /** Logo shown in the popup. Without it the popup renders `word` + accent dot. */
  logo?: string
  /** Image painted on the bubble. Without it a wordmark is drawn from `word`. */
  texSrc?: string
  word?: string
  accent?: string
  tint: string
  eyebrow: string
  desc: string
  stack: string[]
  stackLabel?: string
  link?: string
  linkLabel?: string
}

export const PROJECTS: Project[] = [
  { id: 'lsdita', name: 'LSDITA', logo: asset('lsdita.png'), texSrc: asset('lsdita.png'), tint: '#ff4800', eyebrow: 'Progetto personale · Giuseppe Figliuolo', desc: 'Un progetto nato fuori orario e cresciuto un commit alla volta. Il codice è pubblico su GitHub.', stack: ['Open source', 'Web'], link: 'https://github.com/giuseppefigliuolo/LSDita', linkLabel: 'Vedi su GitHub' },
  { id: 'waterstream', name: 'Waterstream', logo: asset('waterstream-color.png'), texSrc: asset('waterstream-white.png'), tint: '#ffb000', eyebrow: 'Prodotto · Bitrock', desc: 'Broker MQTT che usa Apache Kafka come unico storage: i messaggi dei dispositivi IoT arrivano direttamente negli stream, senza connettori intermedi.', stack: ['Kotlin', 'Apache Kafka', 'MQTT', 'Kubernetes'], link: 'https://waterstream.io', linkLabel: 'Vai al sito' },
  { id: 'tidewatch', name: 'Tidewatch', word: 'tidewatch', accent: '#ff9a00', tint: '#ff9a00', eyebrow: '2025 · Team Data Engineering', desc: 'Osservabilità in tempo reale per pipeline di eventi: latenze, lag dei consumer e anomalie in un’unica vista.', stack: ['Kafka Streams', 'OpenTelemetry', 'Grafana', 'React'] },
  { id: 'sintesi', name: 'Sintesi', word: 'sintesi', accent: '#ff6a00', tint: '#ff6a00', eyebrow: '2025 · Team AI', desc: 'Assistente basato su LLM che risponde alle domande sulla documentazione interna e cita sempre le fonti delle risposte.', stack: ['Python', 'RAG', 'pgvector', 'Next.js'] },
  { id: 'orbita', name: 'Orbita', word: 'orbita', accent: '#ffc04d', tint: '#ffc04d', eyebrow: '2024 · Team Frontend', desc: 'Digital twin 3D di un magazzino: sensori IoT, stato dei macchinari e flussi di merci visualizzati nel browser in tempo reale.', stack: ['Three.js', 'WebSocket', 'MQTT', 'Scala'] },
  { id: 'scia', name: 'Scia', word: 'scia', accent: '#ff8a3d', tint: '#ff8a3d', eyebrow: '2023 · Team Mobile', desc: 'App per il car pooling aziendale: abbina colleghi con percorsi simili e calcola la CO₂ risparmiata a ogni viaggio.', stack: ['React Native', 'Akka', 'GraphQL'] }
]

export const BITROCK: Project = { id: 'bitrock', name: 'Chi siamo', logo: asset('bitrock.png'), tint: '#fff0d6', eyebrow: 'Bitrock', desc: 'Bitrock è un’azienda di consulenza informatica. Progettiamo e sviluppiamo software, piattaforme dati e prodotti digitali insieme ai nostri clienti. Labs raccoglie i progetti nati dalla curiosità del team.', stack: ['Consulenza IT', 'Sviluppo software', 'Data platform', 'Cloud'], link: 'https://bitrock.it', linkLabel: 'Scopri Bitrock', stackLabel: 'Di cosa ci occupiamo' }

export const CTA_HREF = 'https://bitrock.it'
