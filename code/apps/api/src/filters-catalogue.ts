/** Screen 14 basic filters. A null value means the client sends no key. */

export const FILTERS_CATALOGUE = {
  filters: [
    {
      key: 'city',
      options: [
        { value: 'ouagadougou', label: 'Ouagadougou' },
        { value: 'bobo', label: 'Bobo-Dioulasso' },
        { value: 'koudougou', label: 'Koudougou' },
        { value: 'autre', label: 'Autre ville / Diaspora' },
      ],
    },
    {
      key: 'radius_km',
      requires_city: ['ouagadougou', 'bobo', 'koudougou'],
      options: [
        { value: '10', label: '10 km' },
        { value: '25', label: '25 km' },
        { value: '50', label: '50 km' },
        { value: null, label: 'Toute la ville' },
      ],
    },
    {
      key: 'marital_status',
      options: [
        { value: 'single', label: 'Célibataire' },
        { value: 'married', label: 'Marié(e)' },
        { value: 'divorced', label: 'Divorcé(e)' },
        { value: 'widowed', label: 'Veuf/Veuve' },
      ],
    },
    {
      key: 'polygamy_intent',
      options: [
        { value: 'yes', label: 'Oui' },
        { value: 'no', label: 'Non' },
      ],
    },
    {
      key: 'practice',
      options: [
        { value: 'assidue', label: 'Pratique assidue' },
        { value: 'heure', label: "Prières à l'heure" },
        { value: 'cheminement', label: 'En cheminement sincère' },
      ],
    },
    {
      key: 'madhhab',
      options: [
        { value: 'maliki', label: 'Maliki (courant majoritaire burkinabè)' },
        { value: 'hanafi', label: 'Hanafi' },
        { value: 'shafii', label: "Shafi'i" },
        { value: 'hanbali', label: 'Hanbali' },
        { value: 'apprentissage', label: 'Sans attachement strict' },
      ],
    },
    {
      key: 'life_plans',
      options: [
        { value: 'ready_now', label: 'Prêt(e) immédiatement' },
        { value: 'within_year', label: "D'ici un an" },
        { value: 'exploring', label: "En démarche d'exploration sereine" },
      ],
    },
  ],
} as const
