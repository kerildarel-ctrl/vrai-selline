import { useLocation } from 'react-router-dom'
import PageHeader from '../components/PageHeader'

const pages: Record<string, { title: string; sections: [string, string][] }> = {
  '/help': {
    title: 'Aide & FAQ',
    sections: [
      ['Comment passer commande ?', 'Ajoutez les produits à votre panier, choisissez votre adresse de livraison et votre mode de paiement, puis confirmez.'],
      ['Quels modes de paiement ?', 'Mobile Money (MTN / Orange), carte bancaire ou paiement à la livraison.'],
      ['Comment suivre ma commande ?', 'Rendez-vous dans « Commandes » : chaque commande affiche son statut en temps réel.'],
      ['Je suis vendeur, comment démarrer ?', 'Ouvrez une boutique depuis votre compte, puis ajoutez vos produits depuis le tableau de bord vendeur.'],
    ],
  },
  '/contact': {
    title: 'Contact',
    sections: [['Nous écrire', 'Une question sur une commande, un paiement ou votre boutique ? Notre équipe vous répond dans les meilleurs délais.']],
  },
  '/about': {
    title: 'À propos',
    sections: [['Selline', 'Selline est une place de marché pensée pour le Cameroun : un prix total clair, livraison comprise, des paiements adaptés au Mobile Money et des vendeurs vérifiés.']],
  },
  '/terms': {
    title: "Conditions d'utilisation",
    sections: [['Utilisation du service', "En utilisant Selline, vous acceptez de fournir des informations exactes et de respecter les règles de la plateforme. Les conditions complètes seront publiées ici."]],
  },
  '/privacy': {
    title: 'Confidentialité',
    sections: [['Vos données', 'Vos données personnelles sont utilisées uniquement pour gérer votre compte et vos commandes. La politique complète sera publiée ici.']],
  },
  '/returns': {
    title: 'Politique de retour',
    sections: [['Retours', "Si un article ne correspond pas à votre commande, contactez la boutique puis notre équipe. Les modalités détaillées seront publiées ici."]],
  },
}

export default function Info() {
  const { pathname } = useLocation()
  const page = pages[pathname] ?? pages['/about']
  return (
    <>
      <PageHeader title={page.title} />
      <div className="page py-4 md:pt-0">
        <div className="card mx-auto max-w-2xl divide-y divide-slate-100">
          {page.sections.map(([h, t]) => (
            <section key={h} className="p-5">
              <h2 className="font-semibold">{h}</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{t}</p>
            </section>
          ))}
        </div>
      </div>
    </>
  )
}
