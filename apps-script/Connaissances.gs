/* ============================================================
 * BASE DE CONNAISSANCES SoCoo'c (statique, mise en cache côté Claude)
 * Sources : CGV SoCoo'c VCDGR 1.8 (16/06/2025) jointes aux BDC papier et numérique,
 * contrat de garantie commerciale, Guide d'entretien (juin 2024), Guide de pose (NOT_0000126_24).
 * Contenu générique uniquement : aucune donnée client.
 * Fichier à coller dans Apps Script à côté de Code.gs (même projet).
 * ============================================================ */
const BASE_CONNAISSANCES = `
# BASE DE CONNAISSANCES SOCOO'C (usage interne : sert à l'analyse et aux "points_attention" ; ne jamais citer d'article au client, ne rien promettre)

## Garantie commerciale SoCoo'c (contrat de garantie, gratuit, en plus des garanties légales)
- Prend effet à la date de LIVRAISON. Couvre le remplacement des PIÈCES pour pannes internes dûment constatées. Main d'œuvre, déplacement, livraison des pièces : NON couverts (à la charge du client).
- Durées : meubles SoCoo'c 10 ans (équipements électriques des meubles, ex. éclairage : 2 ans) ; charnières et coulisses 25 ans ; mécanismes (relevants, lifts) 5 ans ;
  plans SO'STRAT (Fournier), SO'QUARTZ, QUARTZ 10 ans ; SO'COMPACT 2 ans ; éviers, mitigeurs, tables, chaises, tabourets 2 ans sauf durée supérieure indiquée sur le BDC ;
  tuyau de vidange, flexibles, douchettes, mousseurs, tampons de chaises : 1 an. Électroménager : garantie du FABRICANT.
- NB : le guide d'entretien 2024 annonce « meubles et mécanismes 5 ans » et « éviers 2 ans à vie selon modèle » : en cas d'écart, la durée du contrat de garantie / du BDC du client fait foi → le signaler au conseiller.
- Pièces hors garantie : le vendeur peut fournir à titre payant les composants (identiques ou similaires) pendant 5 ans. Pièces détachées GEM : délai de fourniture 2 mois ; durée de disponibilité selon la marque (liste annexée au BDC, en général 10 à 15 ans).
- Produits d'exposition ou vendus aux enchères, produits achetés hors réseau SoCoo'c : pas de garantie commerciale. Territorialité : France métropolitaine et Corse.

## Garanties légales (aucun frais pour le client)
- Conformité : 2 ans à compter de la délivrance (livraison) ; le client prouve seulement l'existence du défaut. Réparation ou remplacement sous 30 jours ; si réparé : +6 mois de garantie ; si remplacé : nouvelle garantie de 2 ans. Réduction de prix ou résolution possibles dans certains cas.
- Vices cachés : 2 ans à compter de la découverte du vice (art. 1641 C. civ.).
- Valables si utilisation normale et conseils d'entretien suivis. Toute immobilisation pour réparation suspend la garantie restant à courir.

## Démarche du client en cas de panne / défaut
- S'adresser au magasin vendeur ou à serviceclients@socooc.com (Service Clients SoCoo'c, CS 10003, 74230 Thônes).
- Déclarer : nom, coordonnées, produit concerné, date, nature et circonstances du défaut. Le vendeur peut demander la facture détaillée.
- Lors de l'intervention : présenter le produit, la facture originale et le contrat de garantie ; numéros de série jamais enlevés ni modifiés ; dégager l'accès au produit.
- Le poseur / technicien ne fait aucun travail de maçonnerie, menuiserie, plomberie, électricité. Absence du client ou accès impossible : pas de responsabilité du vendeur.
- Recherche amiable puis médiation de la consommation possibles ; la démarche amiable n'interrompt pas les délais de garantie.

## Exclusions fréquentes (à vérifier avant d'accepter une prise en charge)
- Non-respect des guides de pose, d'entretien, d'utilisation, des règles de l'art ou des instructions du fabricant ; réparation par le client ou un tiers non autorisé ; meuble modifié ou déplacé.
- Excès de chaleur ou d'humidité, choc thermique (tache, brûlure, déformation, GONFLEMENT, corrosion) ; produits abrasifs ou corrosifs ; infiltrations d'eau, joints défectueux.
- Dommages esthétiques (rayures, égratignures, écaillements, coloration par vêtement ou teinture) ; singularités du bois (nœuds, veinage, teinte) ; variations de teinte dues à la lumière.
- Usure normale, consommables (ampoules…), nettoyage et entretien courant ; dommages causés par le client ou un tiers, cause extérieure ou accidentelle, force majeure, gel.
- Électroménager : défaut de mise en service, réglages accessibles à l'utilisateur, accessoires et pièces d'usure (joints, filtres, clayettes, paniers, boutons, charnières de porte d'appareil, vitres extérieures de four…).
- Robinetterie / sanitaire : fuites dans parties enterrées ou communes, accessoires (flexibles, douchettes, cartouches, broyeur), pompes, réducteurs de pression.
- Travaux de rénovation / gros œuvre, litiges relevant d'une assurance décennale ou dommage-ouvrage.

## Entretien (guide remis à la livraison) : causes typiques de refus
- Pièce ventilée, hygrométrie 40 à 70 %, température > 0 °C ; ne pas sécher de torchons contre les façades ; essuyer l'eau sur façades, chants, joints, socles.
- Lave-vaisselle : attendre ~30 min après le cycle avant d'ouvrir ; PARE-VAPEUR obligatoire sous le plan (réf. ADALU). Gonflement du plan au-dessus du lave-vaisselle sans pare-vapeur : PAS pris en charge en SAV.
- Hotte : protections inox (réf. PAHIX) préconisées ; sans elles, la dégradation des côtés de meubles près de la hotte n'est pas garantie. Filtre charbon à changer tous les 6 à 12 mois.
- Plan de travail : résiste à ~180 °C max, pas garanti contre les brûlures (dessous de plat) ; planche à découper obligatoire ; pas d'anticalcaire ni d'abrasif. Four sous plan : refermer la porte après usage.
- Façades : eau savonneuse / vinaigre blanc, pas de côté vert d'éponge ni crème à récurer ; brillant : jamais à sec, pas de solvant ; PET : pas de solvant ; acétone déconseillée sur stratifié « noir structuré ». Matériau : mélaminé MEZZO, MELT, MUSE ; stratifié SOGIA ; PET PIKY, PILA ; verre PILA, NOCTY, GLASSY.
- Tiroirs / coulissants : charge max 35 kg (40 à 60 cm), 70 kg (80 cm et plus). Charnières : aucun entretien ; un léger déréglage des façades avec le temps est normal → réglage (hauteur, largeur, profondeur), pas un défaut.
- Joints silicone : durée de vie limitée, à contrôler et refaire (silicone antifongique). Évier inox : pas de Javel ni anticalcaire (corrosion par piqûre). Mitigeur : goutte au mousseur → cartouche ; fuite → joints.

## Pose (guide de pose) : points utiles pour diagnostiquer un litige
- Pièce prête avant la pose : murs, sols, électricité, plomberie, gaz, ventilation mis en conformité par le client (corps de métier sous sa responsabilité). Température de pose 15 à 25 °C. Placo : NF DTU 25.41.
- Visserie murale non fournie (adaptée au mur, 65 kg par suspension). Meubles liés entre eux et mis de niveau ; îlot fixé au sol.
- Plan de travail : joint mural en silicone FONGICIDE obligatoire ; découpes d'angle arrondies, 7 cm mini du chant avant (8 cm si tiroir sous plaque gaz), 4 cm mini entre 2 découpes ; tranche des découpes protégée (adhésif alu, silicone ou colle néoprène) ; cuve d'évier sur un seul élément.
- Évier posé sur silicone + pattes de fixation (serrage modéré). Mitigeur : purge des tuyauteries AVANT branchement, flexibles serrés à la main.
- Lave-vaisselle : pare-vapeur obligatoire. Réfrigérateur intégrable : ne pas obstruer l'espace de ventilation, désactiver les amortisseurs des charnières de l'armoire. Plaque ≥ 80 cm : bandeau métallique retourné pour la ventilation. Hauteur et fixation de la hotte : notice fabricant, responsabilité du poseur. Niche : joint silicone sur le chant bas.
- Si le client a posé lui-même (« sans pose » / « pose futée ») et qu'un de ces points n'est pas respecté : la garantie commerciale peut être refusée → le signaler au conseiller, ne pas trancher dans la réponse au client.

## Livraison, délais, commande (CGV)
- Transfert des risques à la livraison (ou dès l'avis de mise à disposition si retard non imputable au vendeur). Anomalie à la livraison : à signaler au plus vite avec photos.
- Retard d'autres corps de métier : le client prévient le vendeur par e-mail ; nouvelle date par avenant écrit. Report de plus d'une semaine du fait du client : solde exigible à la date initiale ; frais de stockage possibles.
- Mise en fabrication 8 semaines avant la semaine de livraison : plus aucune modification possible ensuite. Électroménager fourni par le client : références à transmettre 12 semaines avant ; sinon SoCoo'c décline toute responsabilité sur cet appareil.
- Solde payable au plus tard 72 h avant la livraison. Vente à distance (BDC numérique) : rétractation 14 jours à compter du lendemain de la réception de la commande (hors produits sur mesure).

## Structure d'un bon de commande (BDC) SoCoo'c : où trouver l'information
- Page 1 : N° de commande (7 chiffres, = n° d'affaire / dossier) et date ; « Confirme et remplace le bon de commande n°… » si avenant ; Kitchener (vendeur) ; magasin (téléphone, e-mail, horaires) ; adresse client et ADRESSE D'INSTALLATION ; N° de pièce (BDC…).
- Ensuite : récapitulatif TTC par famille (meubles, plans, électroménager, sanitaires, fournitures, métré, livraison, pose) ; conditions de règlement et échéancier ; visite technique (semaine) ;
  Livraison (délai en n° de SEMAINE, enlèvement dépôt ou livraison) ; Pose (Oui / Non / Pose futée, semaine de pose) → renseigne « pose_initiale » ;
  détail par ligne : n°, article (référence), sens, descriptif, gamme / coloris façade / caisson / poignées / tiroirs (utile pour commander la bonne pièce SAV) ;
  « Avis important », « Bon pour commande » (date et lieu de signature), CGV, contrat de garantie, liste de disponibilité des pièces électroménager.
`;
