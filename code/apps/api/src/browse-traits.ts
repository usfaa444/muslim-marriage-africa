import type { StoredProfile } from './profile-store.js'

export type SharedTrait = {
  field: string
  label: string
}

const CITY: Record<string, string> = {
  ouagadougou: 'Ouagadougou',
  bobo: 'Bobo-Dioulasso',
  koudougou: 'Koudougou',
  ouahigouya: 'Ouahigouya',
  banfora: 'Banfora',
  dedougou: 'Dédougou',
  fada: "Fada N'Gourma",
  autre: 'Autre localité',
}

const COUNTRY: Record<string, string> = {
  BF: '🇧🇫 Burkina Faso',
  CI: "🇨🇮 Côte d'Ivoire",
  ML: '🇲🇱 Mali',
  SN: '🇸🇳 Sénégal',
  NE: '🇳🇪 Niger',
  TG: '🇹🇬 Togo',
  BJ: '🇧🇯 Bénin',
  GN: '🇬🇳 Guinée',
  FR: '🇫🇷 France',
  CA: '🇨🇦 Canada',
  OTHER: 'Autre pays',
}

const MARITAL: Record<string, string> = {
  single: 'Célibataire',
  married: 'Marié(e)',
  divorced: 'Divorcé(e)',
  widowed: 'Veuf(ve)',
}

const MADHHAB: Record<string, string> = {
  maliki: 'Maliki',
  hanafi: 'Hanafi',
  shafii: "Shafi'i",
  hanbali: 'Hanbali',
  apprentissage: 'En apprentissage / Sans attachement strict',
}

const PRACTICE: Record<string, string> = {
  assidue: 'Pratique assidue',
  heure: "Prières à l'heure",
  cheminement: 'En cheminement',
}

const EDUCATION: Record<string, string> = {
  secondaire: 'Baccalauréat / Secondaire',
  licence: 'Licence / Bac+3',
  master_eco: 'Master en Sciences Économiques',
  master_autre: 'Master / Bac+5',
  doctorat: 'Doctorat / Études supérieures approfondies',
  autre: 'Autre / Formation spécialisée',
}

const PROFESSION: Record<string, string> = {
  finance: 'Cadre analyste financier',
  enseignement: 'Enseignant / Chercheur',
  ingenierie: 'Ingénieur / Technique',
  administration: 'Fonction publique / Administration',
  commerce: 'Commerce / Entrepreneuriat',
  sante: 'Santé / Médical',
  autre: 'Autre...',
}

const LIFE: Record<string, string> = {
  immediate: 'Immédiatement (brefs délais)',
  '6months': "D'ici 6 mois",
  '1year': "D'ici un an",
  serene: "Plus d'un an / Selon cheminement",
}

function equalText(left: string | null, right: string | null): string | null {
  if (left === null || right === null) {
    return null
  }
  const a = left.trim()
  const b = right.trim()
  if (a.length === 0 || a !== b) {
    return null
  }
  return a
}

function known(value: string | null, map: Record<string, string>): string | null {
  if (value === null) {
    return null
  }
  return map[value] ?? null
}

function lifeLabel(value: string): string | null {
  if (!value.startsWith('tf:')) {
    return null
  }
  const lineEnd = value.indexOf('\n')
  const head = (lineEnd === -1 ? value : value.slice(0, lineEnd)).slice(3)
  return LIFE[head] ?? null
}

function sharedLifeLabel(left: string | null, right: string | null): string | null {
  if (left === null || right === null) {
    return null
  }
  const leftLabel = lifeLabel(left)
  const rightLabel = lifeLabel(right)
  if (!leftLabel || leftLabel !== rightLabel) {
    return null
  }
  return leftLabel
}

/** Traits both profiles already store. Bio is not read. A missing field is omitted. */
export function sharedTraits(viewer: StoredProfile, target: StoredProfile): SharedTrait[] {
  const traits: SharedTrait[] = []
  const city = equalText(viewer.city, target.city)
  const cityLabel = known(city, CITY)
  if (city && city !== 'autre' && cityLabel) {
    traits.push({ field: 'city', label: `Même ville (${cityLabel})` })
  }
  if (viewer.polygamy_intent === 'yes' && target.polygamy_intent === 'yes') {
    traits.push({ field: 'polygamy_intent', label: 'Intention de polygamie : Oui' })
  }
  const marital = known(equalText(viewer.marital_status, target.marital_status), MARITAL)
  if (marital) {
    traits.push({ field: 'marital_status', label: marital })
  }
  const madhhab = known(equalText(viewer.madhhab, target.madhhab), MADHHAB)
  if (madhhab) {
    traits.push({ field: 'madhhab', label: `Madhhab : ${madhhab}` })
  }
  const practice = known(equalText(viewer.practice, target.practice), PRACTICE)
  if (practice) {
    traits.push({ field: 'practice', label: practice })
  }
  const lifeText = sharedLifeLabel(viewer.life_plans, target.life_plans)
  if (lifeText) {
    traits.push({ field: 'life_plans', label: lifeText })
  }
  const education = known(equalText(viewer.education, target.education), EDUCATION)
  if (education) {
    traits.push({ field: 'education', label: education })
  }
  const profession = known(equalText(viewer.profession, target.profession), PROFESSION)
  if (profession) {
    traits.push({ field: 'profession', label: profession })
  }
  const origin = equalText(viewer.origin, target.origin)
  if (origin) {
    traits.push({ field: 'origin', label: origin })
  }
  const countryToken = equalText(viewer.country, target.country)
  const country = known(countryToken, COUNTRY)
  if (countryToken && countryToken !== 'OTHER' && country) {
    traits.push({ field: 'country', label: country })
  }
  return traits
}
