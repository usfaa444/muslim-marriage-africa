'use client'

import { useState } from 'react'

export function LandingPage() {
  const [cookiesOpen, setCookiesOpen] = useState(true)
  return (
    <div className="bg-sand text-ink-primary font-sans antialiased min-h-screen flex flex-col selection:bg-gold-soft selection:text-indigo-deep">
<header className="w-full bg-sand/95 border-b border-border-hairline sticky top-0 z-40 backdrop-blur-sm">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 min-h-20 py-2 flex items-center justify-between gap-3">
      
      <a href="#hero" className="flex items-center gap-3.5 group focus:outline-none focus:ring-2 focus:ring-focus-ring rounded-md p-1">
        <div className="w-10 h-10 rounded-full border border-indigo flex items-center justify-center bg-raised text-indigo shadow-xs">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c-4.5 0-8 3.5-8 8v10h16V11c0-4.5-3.5-8-8-8z"/>
            <path d="M12 7c-2 0-4 1.5-4 4v10h8V11c0-2.5-2-4-4-4z"/>
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="font-serif font-semibold text-xl text-indigo tracking-tight leading-none">AnKanu</span>
          <span className="font-sans text-[11px] tracking-wider text-ink-secondary uppercase font-medium mt-1">Ta'aruf honorable · Burkina</span>
        </div>
      </a>

      
      <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-ink-secondary">
        <a href="#vision" className="hover:text-indigo focus:outline-none focus:ring-2 focus:ring-focus-ring rounded px-1.5 py-1 transition-colors">La Vision</a>
        <a href="#academie" className="hover:text-indigo focus:outline-none focus:ring-2 focus:ring-focus-ring rounded px-1.5 py-1 transition-colors">Académie</a>
        <a href="#board" className="hover:text-indigo focus:outline-none focus:ring-2 focus:ring-focus-ring rounded px-1.5 py-1 transition-colors">Board consultatif</a>
        <a href="#showcase" className="hover:text-indigo focus:outline-none focus:ring-2 focus:ring-focus-ring rounded px-1.5 py-1 transition-colors">Médiation & Tuteur</a>
        <a href="#tarifs" className="hover:text-indigo focus:outline-none focus:ring-2 focus:ring-focus-ring rounded px-1.5 py-1 transition-colors">Tarifs transparents</a>
      </nav>

      
      <div className="flex flex-col items-end justify-center gap-1 shrink-0">
        <nav aria-label="Compte">
          <a href="/auth?mode=login" className="block max-w-[11rem] text-right text-[13px] leading-tight font-medium text-ink-secondary hover:text-indigo focus:outline-none focus:ring-2 focus:ring-focus-ring rounded px-1 py-0.5">
            Déjà inscrit·e ? Se connecter
          </a>
        </nav>
        <a href="#auth-inscription" className="inline-flex items-center justify-center min-h-[48px] px-5 rounded-md bg-indigo text-ink-on-indigo font-sans font-semibold text-[15px] hover:bg-indigo-deep focus:outline-none focus:ring-2 focus:ring-gold-soft transition-colors shadow-xs">
          Commencer l'inscription
        </a>
      </div>
    </div>
  </header>

  
  <main className="flex-1">
    
    
    <section id="hero" className="relative pt-12 pb-16 md:pt-16 md:pb-24 border-b border-border-hairline overflow-hidden">
      
      <div className="absolute inset-x-0 top-0 h-96 bg-gradient-to-b from-mihrab/15 via-sand to-sand pointer-events-none -z-10"></div>
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
        
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-raised border border-border-hairline mb-8 shadow-2xs">
          <span className="w-2 h-2 rounded-full bg-gold"></span>
          <span className="text-xs font-medium text-ink-secondary tracking-wide uppercase">Cadre de foi et de dignité familiale</span>
        </div>

        <h1 className="font-serif font-semibold text-3xl sm:text-4xl md:text-5xl text-indigo-deep tracking-tight leading-[1.2] mb-6">
          Le chemin honorable vers le nikah, sous le regard bienveillant de la famille.
        </h1>

        <p className="font-sans text-lg sm:text-xl text-ink-secondary max-w-2xl mx-auto leading-relaxed mb-10">
          AnKanu propose une médiation noble pour le mariage et la khitba au Burkina Faso et en Afrique de l'Ouest. Une démarche préservée, sans artifice, respectueuse de la pudeur et de l'implication sincère des tuteurs légaux (Wali).
        </p>

        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-14">
          <a href="#auth-inscription" className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-8 rounded-md bg-indigo text-ink-on-indigo font-sans font-semibold text-base hover:bg-indigo-deep focus:outline-none focus:ring-2 focus:ring-gold-soft transition-colors shadow-sm">
            Déposer une demande de ta'aruf
          </a>
          <a href="#vision" className="w-full sm:w-auto inline-flex items-center justify-center min-h-[48px] px-6 rounded-md bg-raised text-indigo border border-border-strong font-sans font-medium text-base hover:bg-sand focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors">
            Comprendre le protocole
          </a>
        </div>

        
        <div className="max-w-md mx-auto bg-raised border border-border-strong rounded-md p-6 shadow-xs text-center">
          <div className="text-xs font-semibold uppercase tracking-wider text-ink-secondary mb-1">
            Transparence intégrale de la plateforme
          </div>
          <div className="font-serif text-2xl sm:text-3xl font-bold text-indigo-deep my-2">
            Mariages confirmés : 0
          </div>
          <p className="text-xs text-ink-secondary leading-relaxed">
            Chaque union sera enregistrée publiquement uniquement après confirmation mutuelle et validation solennelle des familles. Aucun chiffre inventé, aucune précipitation.
          </p>
        </div>
      </div>
    </section>

    
    <section id="vision" className="py-16 md:py-20 border-b border-border-hairline">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-indigo-deep mb-3">
            Un sanctuaire d'honneur, non un catalogue
          </h2>
          <p className="text-base text-ink-secondary">
            Trois fondements inaltérables pour protéger les croyants et honorer les foyers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="bg-raised border border-border-hairline rounded-md p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-sand text-indigo flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
              </div>
              <h3 className="font-serif text-lg font-semibold text-indigo-deep mb-2">Préservation de la pudeur</h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Les photographies ne sont jamais étalées publiquement. Le floutage sécurisé protège chaque profil, et le dévoilement nécessite un accord bilatéral et le consentement du tuteur.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border-hairline text-xs text-ink-secondary font-medium">
              Sceau de discrétion absolue
            </div>
          </div>

          
          <div className="bg-raised border border-border-hairline rounded-md p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-sand text-indigo flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
              </div>
              <h3 className="font-serif text-lg font-semibold text-indigo-deep mb-2">Présence centrale du Wali</h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Le tuteur légal fait partie intégrante du cheminement. Dès l'acceptation de l'échange, les correspondances se déroulent en pleine visibilité de la famille pour sceller la droiture du ta'aruf.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border-hairline text-xs text-ink-secondary font-medium">
              Protection contre l'isolement illicite
            </div>
          </div>

          
          <div className="bg-raised border border-border-hairline rounded-md p-6 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-md bg-sand text-indigo flex items-center justify-center mb-4">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <h3 className="font-serif text-lg font-semibold text-indigo-deep mb-2">Zéro reconduction cachée</h3>
              <p className="text-sm text-ink-secondary leading-relaxed">
                Aucun prélèvement automatique ou système commercial prédateur. Le mariage est une responsabilité spirituelle et sociale sacrée, rémunérée à l'acte d'étude et de modération humaine.
              </p>
            </div>
            <div className="mt-6 pt-4 border-t border-border-hairline text-xs text-ink-secondary font-medium">
              Paiement unique par forfait
            </div>
          </div>
        </div>
      </div>
    </section>

    
    <section id="academie" className="py-16 md:py-20 bg-raised border-b border-border-hairline">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo uppercase tracking-wider mb-3">
              <span>Formation & Conscience</span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-indigo-deep mb-4">
              L'Académie AnKanu : Préparer son âme au contrat du mariage
            </h2>
            <p className="text-base text-ink-secondary leading-relaxed mb-6">
              Le mariage en Islam (nikah) est un engagement solennel nécessitant clairvoyance, maturité émotionnelle et droiture légale. Nos modules pré-maritaux accompagnent chaque candidat dans la compréhension des droits, devoirs et de la médiation bienveillante.
            </p>
            <ul className="space-y-3 mb-8 text-sm text-ink-primary">
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                <span>Droits et devoirs réciproques selon le fiqh de la famille.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                <span>Communication constructive et gestion bienveillante des désaccords.</span>
              </li>
              <li className="flex items-center gap-3">
                <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                <span>Rôle protecteur du tuteur et clarté patrimoniale préalable.</span>
              </li>
            </ul>
            <a href="#auth-inscription" className="inline-flex items-center justify-center min-h-[48px] px-6 rounded-md bg-indigo text-ink-on-indigo font-sans font-semibold text-sm hover:bg-indigo-deep focus:outline-none focus:ring-2 focus:ring-gold-soft transition-colors">
              Découvrir les modules de l'Académie
            </a>
          </div>

          <div className="w-full md:w-80 bg-sand border border-border-strong rounded-md p-6 shadow-2xs">
            <div className="font-serif text-lg font-semibold text-indigo-deep mb-4 pb-2 border-b border-border-hairline">
              Cycle d'Élévation
            </div>
            <div className="space-y-4 text-xs text-ink-secondary">
              <div className="p-3 bg-raised rounded border border-border-hairline">
                <span className="font-semibold text-indigo block mb-1">Module I</span>
                L'Intention sincère et les fondations du nikah selon la Sunnah.
              </div>
              <div className="p-3 bg-raised rounded border border-border-hairline">
                <span className="font-semibold text-indigo block mb-1">Module II</span>
                La dot (Mahr), le logement et l'entretien du foyer.
              </div>
              <div className="p-3 bg-raised rounded border border-border-hairline">
                <span className="font-semibold text-indigo block mb-1">Module III</span>
                L'alliance entre familles et la bénédiction parentale.
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    
    <section id="board" className="py-16 md:py-20 border-b border-border-hairline">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <div className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Gouvernance & Éthique</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-indigo-deep mb-3">
            Le Comité Consultatif Indépendant
          </h2>
          <p className="text-sm sm:text-base text-ink-secondary">
            Des érudits et médiateurs familiaux veillent scrupuleusement à l'alignement de notre protocole sur les valeurs morales et canoniques.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-raised border border-border-hairline rounded-md p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-sand border border-border-hairline mx-auto mb-3 flex items-center justify-center text-indigo font-serif font-bold text-lg">
              TM
            </div>
            <div className="font-serif font-semibold text-base text-indigo-deep">Dr. Tareq Al-Mansoor</div>
            <div className="text-xs text-ink-secondary mt-1 mb-3">Docteur en Droit Musulman & Jurisprudence</div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Supervision des protocoles d'engagement et conformité de la délégation de tuteur.
            </p>
          </div>

          <div className="bg-raised border border-border-hairline rounded-md p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-sand border border-border-hairline mx-auto mb-3 flex items-center justify-center text-indigo font-serif font-bold text-lg">
              NB
            </div>
            <div className="font-serif font-semibold text-base text-indigo-deep">Nadia Benjelloun</div>
            <div className="text-xs text-ink-secondary mt-1 mb-3">Psychologue Clinicienne & Médiatrice</div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Supervision des ateliers de l'Académie et accompagnement des équilibres conjugaux.
            </p>
          </div>

          <div className="bg-raised border border-border-hairline rounded-md p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-sand border border-border-hairline mx-auto mb-3 flex items-center justify-center text-indigo font-serif font-bold text-lg">
              KI
            </div>
            <div className="font-serif font-semibold text-base text-indigo-deep">M. Karim El-Idrissi</div>
            <div className="text-xs text-ink-secondary mt-1 mb-3">Médiateur Agréé & Conseiller d'Alliance</div>
            <p className="text-xs text-ink-secondary leading-relaxed">
              Expert en conciliation et intégration active des tuteurs au sein de la messagerie.
            </p>
          </div>
        </div>
      </div>
    </section>

    
    <section id="showcase" className="py-16 md:py-20 bg-raised border-b border-border-hairline">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Démonstration du Processus</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-indigo-deep mb-3">
            L'Expérience de la Carte Unique Focalisée
          </h2>
          <p className="text-sm text-ink-secondary max-w-xl mx-auto">
            Conformément aux directives AnKanu, point de défilement frénétique ni de grille de supermarché. Une seule fiche biographique est étudiée à la fois, avec recueillement.
          </p>
        </div>

        
        <div className="max-w-md mx-auto bg-sand border border-border-strong rounded-md p-6 shadow-xs">
          
          <div className="h-44 rounded-md bg-[#C8BBA6] border border-border-hairline flex flex-col items-center justify-center relative overflow-hidden mb-5">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#15283F" strokeWidth="1.6" className="mb-2">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <span className="text-xs font-medium text-indigo-deep px-3 py-1 bg-raised/85 rounded-full border border-border-hairline">
              Photo protégée par le sceau de pudeur
            </span>
          </div>

          
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="px-2.5 py-1 bg-sand border border-border-hairline rounded-sm text-xs text-ink-secondary font-medium">
              Ouagadougou
            </span>
            <span className="px-2.5 py-1 bg-sand border border-border-hairline rounded-sm text-xs text-ink-secondary font-medium">
              Pratique assidue
            </span>
            <span className="px-2.5 py-1 bg-sand border border-border-hairline rounded-sm text-xs text-ink-secondary font-medium">
              Accord tuteur enregistré
            </span>
          </div>

          
          <p className="text-xs text-ink-secondary leading-relaxed mb-6">
            « Recherche une union durable fondée sur le respect mutuel, la vertu et la piété (*taqwa*). Démarche concertée avec le tuteur légal. »
          </p>

          
          <div className="flex items-center gap-3">
            <button className="flex-1 min-h-[44px] px-3 rounded-md bg-transparent text-ink-secondary text-xs font-medium hover:text-ink-primary focus:outline-none focus:ring-2 focus:ring-focus-ring text-center">
              Décliner discrètement
            </button>
            <button className="flex-1 min-h-[48px] px-4 rounded-md bg-indigo text-ink-on-indigo text-xs font-semibold hover:bg-indigo-deep focus:outline-none focus:ring-2 focus:ring-gold-soft text-center shadow-2xs">
              Inviter au ta'aruf
            </button>
          </div>
        </div>
      </div>
    </section>

    
    <section id="tarifs" className="py-16 md:py-20 border-b border-border-hairline">
      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-xl mx-auto mb-12">
          <div className="text-xs font-semibold text-ink-secondary uppercase tracking-wider mb-2">Transparence Économique</div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-indigo-deep mb-3">
            Forfaits clairs, sans prélèvement tacite
          </h2>
          <p className="text-sm text-ink-secondary">
            Rémunération de la modération manuelle, de l'authentification et de la sécurité des familles.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          
          <div className="bg-raised border border-border-strong rounded-md p-6 flex flex-col justify-between">
            <div>
              <div className="font-serif text-lg font-semibold text-indigo-deep">Forfait Étude & Médiation</div>
              <div className="text-xs text-ink-secondary mt-0.5 mb-4">Engagement 6 mois · Vérification d'identité</div>
              <div className="font-serif text-3xl font-bold text-indigo-deep mb-4">
                190 € <span className="text-xs font-sans font-normal text-ink-secondary">/ cycle unique</span>
              </div>
              <ul className="text-xs text-ink-secondary space-y-2.5 mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                  Vérification manuelle des pièces et statut
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                  Intégration du Wali avec accès dédié
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                  Protection intégrale des photographies
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t border-border-hairline text-center text-xs font-medium text-ink-secondary">
              Pas de renouvellement automatique
            </div>
          </div>

          
          <div className="bg-raised border-2 border-indigo rounded-md p-6 flex flex-col justify-between relative shadow-xs">
            <div className="absolute -top-3 right-4 px-2.5 py-0.5 bg-indigo text-ink-on-indigo text-[11px] font-semibold rounded">
              Recommandé
            </div>
            <div>
              <div className="font-serif text-lg font-semibold text-indigo-deep">Alliance & Mentorat</div>
              <div className="text-xs text-ink-secondary mt-0.5 mb-4">Accompagnement éthique avec médiateur</div>
              <div className="font-serif text-3xl font-bold text-indigo-deep mb-4">
                380 € <span className="text-xs font-sans font-normal text-ink-secondary">/ cycle unique</span>
              </div>
              <ul className="text-xs text-ink-secondary space-y-2.5 mb-6">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                  Toutes les fonctionnalités de modération
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                  Accès complet aux 4 modules de l'Académie
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-gold"></span>
                  Séances de préparation aux rencontres avec Wali
                </li>
              </ul>
            </div>
            <div className="pt-4 border-t border-border-hairline text-center text-xs font-medium text-indigo">
              Pas de renouvellement automatique
            </div>
          </div>
        </div>
      </div>
    </section>

    
    <section id="auth-inscription" className="pt-16 pb-36 md:py-20 bg-indigo-deep text-sand">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="font-serif text-2xl sm:text-3xl font-semibold mb-4 text-sand">
          Initier votre démarche de nikah avec convenance
        </h2>
        <p className="text-base text-sand/80 max-w-xl mx-auto mb-8 leading-relaxed">
          Rejoignez un cadre où votre pudeur et l'honneur de votre famille sont sanctuarisés. La première étape consiste à soumettre votre folio biographique d'admissibilité.
        </p>
        <div className="flex flex-col items-center gap-4">
          <div className="inline-flex flex-col sm:flex-row items-center gap-4">
            <a href="/auth?mode=signup" className="inline-flex items-center justify-center min-h-[48px] px-8 rounded-md bg-gold-soft text-indigo-deep font-sans font-semibold text-base hover:bg-gold focus:outline-none focus:ring-2 focus:ring-focus-ring transition-colors shadow-sm">
              Déposer mon dossier de ta'aruf
            </a>
            <span className="text-xs text-sand/60">Réservé aux personnes majeures de 19 ans et plus.</span>
          </div>
          <a href="/auth?mode=login" className="text-sm font-medium text-sand underline underline-offset-4 hover:text-gold-soft focus:outline-none focus:ring-2 focus:ring-gold-soft rounded px-1.5 py-1">
            Déjà inscrit·e ? Se connecter
          </a>
        </div>
      </div>
    </section>

  </main>

      {cookiesOpen ? (
<aside id="cookie-consent" className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-raised border border-border-strong rounded-md p-5 shadow-lg z-50">
    <div className="flex items-start gap-3.5">
      <div className="text-indigo mt-0.5">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 16v-4"></path>
          <path d="M12 8h.01"></path>
        </svg>
      </div>
      <div className="flex-1">
        <h4 className="font-serif font-semibold text-sm text-indigo-deep mb-1">Confidentialité & Mesure Souveraine</h4>
        <p className="text-xs text-ink-secondary leading-relaxed mb-4">
          AnKanu refuse les traceurs publicitaires invasifs (bannissement des pixels tiers). Seules les mesures techniques strictement nécessaires et d'audience souveraine anonymisée sont actives.
        </p>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => setCookiesOpen(false)} className="min-h-[40px] px-4 rounded-md bg-indigo text-ink-on-indigo text-xs font-semibold hover:bg-indigo-deep focus:outline-none focus:ring-2 focus:ring-gold-soft transition-colors">
            Accepter les paramètres stricts
          </button>
          <a href="#legal" className="text-xs text-ink-secondary underline hover:text-indigo focus:outline-none">
            En savoir plus
          </a>
        </div>
      </div>
    </div>
  </aside>
      ) : null}
<footer id="legal" className="w-full bg-sand border-t border-border-hairline py-12">
    <div className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-8 border-b border-border-hairline">
        <div>
          <div className="font-serif font-semibold text-lg text-indigo">AnKanu</div>
          <p className="text-xs text-ink-secondary mt-1">
            Plateforme d'alliance et de médiation familiale honorable (Burkina Faso / Afrique de l'Ouest).
          </p>
        </div>
        <div className="flex flex-wrap gap-6 text-xs text-ink-secondary font-medium">
          <a href="#faq" className="hover:text-indigo underline underline-offset-4 focus:outline-none">Foire Aux Questions (FAQ)</a>
          <a href="#legal" className="hover:text-indigo underline underline-offset-4 focus:outline-none">Mentions Légales & Registre CIL</a>
          <a href="#legal" className="hover:text-indigo underline underline-offset-4 focus:outline-none">Politique de Pudeur & RGPD</a>
          <a href="#legal" className="hover:text-indigo underline underline-offset-4 focus:outline-none">Conditions Générales (CGU)</a>
        </div>
      </div>
      <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] text-ink-secondary">
        <div>
          © 2026 AnKanu. Tous droits réservés.
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-success"></span>
          <span>Protocole d'honneur validé · Sans algorithme de rencontre profane</span>
        </div>
      </div>
    </div>
  </footer>

    </div>
  )
}
