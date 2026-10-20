// Imported (not in public/) so Vite fingerprints them: a replaced image gets a new URL and bypasses stale caches.
import bitrockPng from '../assets/bitrock.png'
import lsditaPng from '../assets/lsdita.png'
import waterstreamColorPng from '../assets/waterstream-color.png'
import waterstreamWhitePng from '../assets/waterstream-white.png'
import confluentColorPng from '../assets/confluent-color.png'
import confluentWhitePng from '../assets/confluent-white.png'
import radicalbitColorPng from '../assets/radicalbit-color.png'
import radicalbitWhitePng from '../assets/radicalbit-white.png'
import databricksColorPng from '../assets/databricks-color.png'
import databricksWhitePng from '../assets/databricks-white.png'

export { bitrockPng }

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
  { id: 'lsdita', name: 'LSDITA', logo: lsditaPng, texSrc: lsditaPng, tint: '#b44dff', eyebrow: 'Progetto personale · Giuseppe Figliuolo', desc: 'Un progetto nato fuori orario e cresciuto un commit alla volta. Il codice è pubblico su GitHub.', stack: ['Open source', 'Web'], link: 'https://github.com/giuseppefigliuolo/LSDita', linkLabel: 'Vedi su GitHub' },
  { id: 'waterstream', name: 'Waterstream', logo: waterstreamColorPng, texSrc: waterstreamWhitePng, tint: '#1ec8ff', eyebrow: 'Prodotto · Bitrock', desc: 'Broker MQTT che usa Apache Kafka come unico storage: i messaggi dei dispositivi IoT arrivano direttamente negli stream, senza connettori intermedi.', stack: ['Kotlin', 'Apache Kafka', 'MQTT', 'Kubernetes'], link: 'https://waterstream.io', linkLabel: 'Vai al sito' },
  { id: 'confluent', name: 'Confluent', logo: confluentColorPng, texSrc: confluentWhitePng, tint: '#ffb000', eyebrow: 'Premier Partner dal 2018 · Bitrock', desc: 'Progettiamo e gestiamo piattaforme di data streaming su Apache Kafka e Confluent, on-premise o in cloud, per clienti in retail, utility, assicurazioni e finanza.', stack: ['Apache Kafka', 'Kafka Streams', 'ksqlDB', 'Apache Flink'], link: 'https://bitrock.it/confluent-en', linkLabel: 'Scopri di più' },
  { id: 'radicalbit', name: 'Radicalbit', logo: radicalbitColorPng, texSrc: radicalbitWhitePng, tint: '#2fe0a0', eyebrow: 'Prodotto · Fortitude Group', desc: 'Piattaforma per gestire modelli ML e LLM in produzione: monitoraggio di drift e qualità delle risposte, AI Gateway multi-provider e strumenti per la conformità all’AI Act.', stack: ['MLOps', 'AI Observability', 'AI Gateway', 'LLM'], link: 'https://bitrock.it/radicalbit-en', linkLabel: 'Scopri di più' },
  { id: 'databricks', name: 'Databricks', logo: databricksColorPng, texSrc: databricksWhitePng, tint: '#ff6a00', eyebrow: 'Partner dal 2022 · Bitrock', desc: 'Architetture dati su misura sulla Data Intelligence Platform di Databricks: ETL, analytics in tempo reale, machine learning e governance centralizzata dei dati.', stack: ['Lakehouse', 'Unity Catalog', 'Delta Sharing', 'Databricks SQL'], link: 'https://bitrock.it/databricks-en', linkLabel: 'Scopri di più' }
]

export const BITROCK: Project = { id: 'bitrock', name: 'Chi siamo', logo: bitrockPng, tint: '#fff0d6', eyebrow: 'Bitrock', desc: 'Bitrock è un’azienda di consulenza informatica. Progettiamo e sviluppiamo software, piattaforme dati e prodotti digitali insieme ai nostri clienti. Labs raccoglie i progetti nati dalla curiosità del team.', stack: ['Consulenza IT', 'Sviluppo software', 'Data platform', 'Cloud'], link: 'https://bitrock.it', linkLabel: 'Scopri Bitrock', stackLabel: 'Di cosa ci occupiamo' }

export const CTA_HREF = 'https://bitrock.it'
