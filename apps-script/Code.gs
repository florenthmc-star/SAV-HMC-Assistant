/**
 * SAV HMC Assistant — Backend (Google Apps Script)
 * ------------------------------------------------------------
 * Reçoit un mail depuis le complément Outlook, l'envoie à Claude
 * avec les règles SAV HMC / SoCoo'c, et renvoie :
 *   catégorie, urgence, résumé, éléments manquants, brouillon,
 *   pré-remplissage de la fiche d'intervention SAV.
 *
 * Réglages (Paramètres du projet > Propriétés du script) :
 *   ANTHROPIC_API_KEY  (obligatoire)  ta clé API Claude  sk-ant-...
 *   ACCESS_CODE        (obligatoire)  code d'accès que tu donnes aux collègues
 *   MODEL              (facultatif)   par défaut : claude-sonnet-5-5
 *                                     (laisser vide ou mettre claude-sonnet-5-5)
 *   EFFORT             (facultatif)   Sonnet 5.x : low (défaut, rapide) | medium | high
 *
 * Auteur : Florent Amendola — Service Technique
 */

const DEFAULT_MODEL = 'claude-sonnet-5-5';             // modèle retenu (~4 cts/mail)
const MODELE_SUPERIEUR = 'claude-sonnet-5-5';         // gardé pour compatibilité (comparaison)
const MAX_BODY_CHARS = 20000;   // on coupe les très longs fils de mails
const MAX_IMAGES = 4;

/* Exemples de VRAIES réponses écrites par l'équipe SAV (copier-coller entre les accents graves).
 * 3 à 5 mails suffisent : l'IA imitera leur ton et leur longueur. Retirer les noms / téléphones clients. */
const EXEMPLES_STYLE = `
--- Exemple 1 (pièce arrivée, client qui relance) ---
Bonjour Monsieur [NOM],
Je vous confirme que nous avons bien réceptionné votre filler d'angle ce mercredi au magasin SoCoo'c de [VILLE].
[POSEUR] a également été informé de sa disponibilité le jour même. Il ne devrait donc pas tarder à prendre contact avec vous afin de convenir d'un rendez-vous pour procéder à son installation et ainsi finaliser votre cuisine.
Nous touchons effectivement au but ! Je tiens à vous remercier pour votre patience, votre compréhension et la qualité de nos échanges tout au long de ce suivi.
Je reste bien entendu à votre disposition si besoin et vous souhaite une excellente journée.
Bien cordialement,
[PRÉNOM NOM]
Chargée de Clientèle

--- Exemple 2 (erreur de pièce, nouvelle commande + proposition de rendez-vous) ---
Bonjour Madame,
Je fais suite à l'intervention de notre poseur à votre domicile hier, qui devait permettre de procéder au remplacement de vos poignées.
Lors de son passage, celui-ci m'a informée que les poignées que j'avais initialement commandées ne correspondaient malheureusement pas au modèle nécessaire.
Je tiens à vous présenter mes sincères excuses pour cette erreur, ainsi que pour le déplacement inutile et le désagrément occasionné.
Afin de régulariser la situation dans les meilleurs délais, j'ai procédé à une nouvelle commande des poignées conformes. Leur livraison est prévue au magasin SoCoo'c de [VILLE] en semaine [SS/AAAA].
Pour procéder à leur remplacement, je peux d'ores et déjà vous proposer un rendez-vous d'intervention le [JOUR DATE] à [HEURE].
Notre poseur se chargera directement de récupérer les poignées au magasin avant son intervention à votre domicile, afin de vous éviter tout déplacement.
Pourriez-vous me confirmer si ce créneau vous convient ? Dans le cas contraire, je vous invite à me communiquer vos disponibilités sur les jours suivants afin que nous puissions convenir ensemble d'une autre date d'intervention.
Je vous remercie pour votre patience et votre compréhension.
Je reste bien entendu à votre disposition pour toute information complémentaire et vous souhaite une agréable journée.
Bien cordialement,
[PRÉNOM NOM]
Chargée de Clientèle

--- Exemple 3 (réclamation reçue, pièce commandée) ---
Bonjour,
Nous accusons bonne réception de votre réclamation.
Nous vous confirmons la mise en commande du matériel qui sera livré en semaine [SS/AAAA] au magasin SoCoo'c de [VILLE].
Les éléments commandés sont les suivants :
- La façade avec les fixations
Vous serez contacté lorsque celle-ci sera disponible au retrait, aux horaires d'ouverture du magasin.
A toutes fins utiles, sachez que vous avez jusqu'au [DATE LIMITE] pour toute déclaration d'avarie complémentaire à la livraison initiale de votre cuisine.
Vous souhaitant une belle journée,
Bien à vous,
[PRÉNOM NOM]
Chargée de Clientèle

--- Exemple 4 (pièce mal commandée, client informé après intervention) ---
Bonjour Monsieur [NOM],
Je vous remercie pour votre retour concernant l'intervention de [POSEUR] et suis ravie d'apprendre que les différents éléments prévus ont pu être installés correctement.
Concernant le filler d'angle bas, il y a malheureusement eu une incompréhension entre [POSEUR] et moi-même lors de la préparation de l'intervention, et la pièce que j'avais commandée n'était pas la bonne. Je vous présente mes excuses pour cette erreur et pour l'intervention supplémentaire qu'elle occasionne.
Je viens de procéder à la commande de la bonne référence. Sa livraison est prévue directement au magasin SoCoo'c de [VILLE] en semaine [SS/AAAA].
Une fois la pièce disponible, [POSEUR] prendra directement contact avec vous afin de convenir d'un rendez-vous pour procéder à son installation et finaliser ce dernier point.
Je reste bien entendu à votre disposition d'ici là et vous remercie pour votre compréhension.
Bien cordialement,
[PRÉNOM NOM]
Chargée de Clientèle

--- Exemple 5 (confirmation courte) ---
Bonjour Madame [NOM],

Je vous remercie pour votre retour, le rendez-vous est bien confirmé.

Vous souhaitant une belle journée,
Bien à vous.
[PRÉNOM NOM]
Chargée de Clientèle
`;

/* ============================================================
 * 1. POINTS D'ENTRÉE WEB
 * ============================================================ */

function doGet() {
  return json_({ ok: true, message: 'SAV HMC Assistant est en ligne.' });
}

function doPost(e) {
  try {
    const props = PropertiesService.getScriptProperties();
    const req = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // Contrôle du code d'accès
    const expected = props.getProperty('ACCESS_CODE');
    if (!expected || String(req.accessCode || '').trim() !== expected.trim()) {
      return json_({ ok: false, error: "Code d'accès invalide. Vérifie les réglages du complément." });
    }

    if (req.action === 'ping') return json_({ ok: true, message: 'Connexion OK' });

    const result = analyserMail_(req);
    return json_({ ok: true, result: result });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: String(err && err.message || err) });
  }
}

/* ============================================================
 * 2. ANALYSE D'UN MAIL
 * ============================================================ */

function analyserMail_(req) {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('ANTHROPIC_API_KEY');
  if (!apiKey) throw new Error('Clé API absente : ajoute ANTHROPIC_API_KEY dans les propriétés du script.');
  const forced = [DEFAULT_MODEL, MODELE_SUPERIEUR].indexOf(req.forceModel) !== -1 ? req.forceModel : null;
  const model = forced || props.getProperty('MODEL') || DEFAULT_MODEL;

  let body = String(req.body || '');
  body = couperHistorique_(body);
  if (body.length > MAX_BODY_CHARS) body = body.slice(0, MAX_BODY_CHARS) + '\n[… mail tronqué …]';

  const pj = (req.attachments || []).map(a => '- ' + a.name + ' (' + (a.contentType || '?') + ')').join('\n') || '(aucune)';
  const signataire = String(req.signataire || '').trim();

  const texte =
    'Voici le mail client à traiter.\n\n' +
    'Date de réception : ' + (req.date || 'inconnue') + '\n' +
    'Expéditeur : ' + (req.fromName || '') + ' <' + (req.fromEmail || '') + '>\n' +
    'Objet : ' + (req.subject || '') + '\n' +
    'Pièces jointes :\n' + pj + '\n\n' +
    'Photos analysables jointes à ce message : ' + ((req.images || []).length) + '\n\n' +
    '----- CORPS DU MAIL -----\n' + body + '\n----- FIN DU MAIL -----\n\n' +
    'Conseiller(e) qui signe la réponse : ' + (signataire || '[PRÉNOM]') + '\n' +
    (req.telephone ? 'Téléphone direct du conseiller : ' + req.telephone + '\n' : '') +
    (req.consigne ? 'Consigne supplémentaire du conseiller : ' + req.consigne + '\n' : '') +
    '\nRéponds uniquement avec l\'objet JSON demandé.';

  const content = [];
  (req.images || []).slice(0, MAX_IMAGES).forEach(img => {
    content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.data } });
  });
  content.push({ type: 'text', text: texte });

  const systeme = SYSTEM_PROMPT + (EXEMPLES_STYLE.trim()
    ? '\n\n# EXEMPLES DE VRAIES RÉPONSES DE L\'ÉQUIPE (imite ce ton, cette longueur, ces tournures)\n' + EXEMPLES_STYLE
    : '');

  const payload = {
    model: model,
    max_tokens: 3000,
    system: [{ type: 'text', text: systeme, cache_control: { type: 'ephemeral', ttl: '1h' } }],
    messages: [{ role: 'user', content: content }]
  };
  // Vitesse : sur les modèles récents (Sonnet/Opus 5.x), réflexion minimale et effort réduit.
  if (/sonnet-5|opus-5/.test(model)) {
    payload.output_config = { effort: props.getProperty('EFFORT') || 'low' };
    payload.thinking = { type: 'between_tools' };
  }

  let rep = appelerClaude_(apiKey, payload);
  if (rep.code === 400 && (payload.output_config || payload.thinking || payload.system[0].cache_control.ttl)) {
    // Option non reconnue par ce modèle : on réessaie en mode standard.
    delete payload.output_config; delete payload.thinking;
    payload.system[0].cache_control = { type: 'ephemeral' };
    rep = appelerClaude_(apiKey, payload);
  }
  const data = rep.data;
  if (rep.code !== 200) {
    const msg = (data && data.error && data.error.message) || rep.raw;
    throw new Error('Erreur API Claude (' + rep.code + ') : ' + msg);
  }

  const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n');
  const parsed = extraireJson_(text);
  if (parsed.brouillon && parsed.brouillon.corps) parsed.brouillon.corps = nettoyerStyle_(parsed.brouillon.corps);
  parsed._usage = data.usage;
  parsed._model = model;
  return parsed;
}

function appelerClaude_(apiKey, payload) {
  const res = UrlFetchApp.fetch('https://api.anthropic.com/v1/messages', {
    method: 'post',
    contentType: 'application/json',
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });
  const raw = res.getContentText();
  let data = null; try { data = JSON.parse(raw); } catch (e) {}
  return { code: res.getResponseCode(), data: data, raw: raw };
}

// Supprime l'historique cité sous le dernier message (« De : … Envoyé : … », « Le … a écrit : »)
// → moins de texte à lire = réponse plus rapide. On garde le début du fil si le mail est court.
function couperHistorique_(body) {
  const marqueurs = [/\n\s*-{2,}\s*Message d'origine\s*-{2,}/i, /\n\s*-{2,}\s*Original Message\s*-{2,}/i,
                     /\n\s*De\s*:.*\n\s*Envoy[ée]\s*:/i, /\n\s*From\s*:.*\n\s*Sent\s*:/i, /\n\s*Le .{5,80} a écrit\s*:/i];
  let cut = body.length;
  marqueurs.forEach(re => { const m = body.match(re); if (m && m.index > 200 && m.index < cut) cut = m.index; });
  if (cut === body.length) return body;
  return body.slice(0, cut) + '\n\n[Historique du fil :]\n' + body.slice(cut, cut + 3000) + (body.length > cut + 3000 ? '\n[…]' : '');
}

// Derniers garde-fous anti « style IA » sur le brouillon.
function nettoyerStyle_(t) {
  return String(t)
    .replace(/\s+[—–]\s+/g, ', ')
    .replace(/[—–]/g, '-')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extraireJson_(text) {
  const t = String(text || '').replace(/```json|```/g, '');
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error("Réponse de l'IA illisible : " + t.slice(0, 300));
  const brut = t.slice(start, end + 1);
  try { return JSON.parse(brut); } catch (e) {
    // Réparation : retours à la ligne / tabulations bruts à l'intérieur des chaînes.
    let out = '', dansChaine = false, echap = false;
    for (const c of brut) {
      if (dansChaine) {
        if (echap) { out += c; echap = false; continue; }
        if (c === '\\') { out += c; echap = true; continue; }
        if (c === '"') { dansChaine = false; out += c; continue; }
        if (c === '\n') { out += '\\n'; continue; }
        if (c === '\r') continue;
        if (c === '\t') { out += '\\t'; continue; }
        out += c;
      } else { if (c === '"') dansChaine = true; out += c; }
    }
    return JSON.parse(out);
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================================================
 * 3. TEST DEPUIS L'ÉDITEUR (menu Exécuter > testerAgent)
 * ============================================================ */

function testerAgent() {
  const r = analyserMail_({
    subject: 'Problème porte cuisine',
    fromName: 'Mme Martin', fromEmail: 'client@example.com',
    date: new Date().toISOString(),
    body: "Bonjour, ma cuisine a été posée la semaine dernière. Une porte du meuble haut est rayée " +
          "et il y a une petite fuite d'eau sous l'évier. Pouvez-vous faire quelque chose ? Cordialement, Mme Martin",
    attachments: []
  });
  console.log(JSON.stringify(r, null, 2));
}

/* ============================================================
 * 3 bis. COMPARER HAIKU ET SONNET SUR DE VRAIS MAILS
 *   1) Colle 5 à 10 vrais mails clients dans MAILS_A_COMPARER (texte brut).
 *   2) Exécuter > comparerModeles
 *   3) Ouvre le lien Google Sheets affiché dans le journal :
 *      les deux résultats sont côte à côte, avec le coût de chacun.
 * ============================================================ */

const MAILS_A_COMPARER = [
  { objet: 'Porte abîmée à la livraison', corps: "Bonjour, à la livraison hier une porte de meuble haut était rayée et le carton était déchiré. Que dois-je faire ? Mme Martin" },
  { objet: 'Four en panne', corps: "Bonjour, mon four acheté chez vous il y a 8 mois ne chauffe plus depuis ce matin. Merci de votre aide. M. Durand" }
  // { objet: '...', corps: "..." },
];

function comparerModeles() {
  const tarifs = {}; // $ par million de jetons [entrée, sortie]
  tarifs[DEFAULT_MODEL] = [1, 5];
  tarifs[MODELE_SUPERIEUR] = [2, 10];

  const ss = SpreadsheetApp.create('Comparaison modèles SAV HMC - ' + new Date().toLocaleDateString('fr-FR'));
  const sh = ss.getActiveSheet();
  sh.appendRow(['Mail', 'Modèle', 'Catégorie', 'Urgence', 'Résumé', 'Éléments manquants', 'Brouillon (objet + corps)', 'Coût estimé (centimes €)', 'Durée (s)']);

  MAILS_A_COMPARER.forEach((m, i) => {
    [DEFAULT_MODEL, MODELE_SUPERIEUR].forEach(model => {
      const t0 = Date.now();
      let r;
      try {
        r = analyserMail_({ subject: m.objet, body: m.corps, fromName: '', fromEmail: '', date: '', attachments: [], forceModel: model });
      } catch (e) { r = { categorie: 'ERREUR', resume: String(e.message || e) }; }
      const u = r._usage || {};
      const entree = (u.input_tokens || 0) + (u.cache_creation_input_tokens || 0) * 1.25 + (u.cache_read_input_tokens || 0) * 0.1;
      const cout = (entree * tarifs[model][0] + (u.output_tokens || 0) * tarifs[model][1]) / 1e6 * 0.9 * 100;
      sh.appendRow([
        (i + 1) + '. ' + m.objet,
        model.indexOf('haiku') !== -1 ? 'Haiku 4.5' : 'Sonnet 5.5',
        r.categorie || '',
        r.urgence && r.urgence.urgent ? 'OUI - ' + (r.urgence.raison || '') : 'non',
        r.resume || '',
        (r.elements_manquants || []).join('\n'),
        r.brouillon ? ('Objet : ' + r.brouillon.objet + '\n\n' + r.brouillon.corps) : '',
        Math.round(cout * 100) / 100,
        Math.round((Date.now() - t0) / 100) / 10
      ]);
    });
  });

  sh.setFrozenRows(1);
  sh.getRange(1, 1, 1, 9).setFontWeight('bold').setBackground('#e8f0d0');
  sh.setColumnWidths(1, 9, 220);
  sh.setColumnWidth(7, 420);
  sh.getDataRange().setWrap(true).setVerticalAlignment('top');
  console.log('Comparaison prête : ' + ss.getUrl());
}

/* ============================================================
 * 4. LE "CERVEAU" DE L'AGENT : RÈGLES + MODÈLES SAV
 *    → modifie ce texte pour faire évoluer l'agent
 * ============================================================ */

const SYSTEM_PROMPT = `
Tu es « SAV HMC Assistant », l'assistant interne du service après-vente HMC – SoCoo'c.
Ton rôle : aider les chargés de clientèle à traiter les e-mails clients plus vite, SANS prendre de décision à leur place.

# CE QUE TU FAIS POUR CHAQUE MAIL
1. Lire le mail en entier (et les photos jointes s'il y en a).
2. Identifier la nature de la demande parmi :
   - "Produit endommagé / meuble abîmé"
   - "Panne d'électroménager"
   - "SAV avec pose"
   - "SAV sans pose"
   - "Hors SAV / autre" (question commerciale, facture, livraison simple, prospection, spam…)
3. Résumer en 2 à 4 phrases courtes, en français clair (pour le conseiller).
4. Signaler l'urgence si le mail évoque : fuite d'eau, meuble qui tombe, chute de meuble, nacelle, monte-charges
   (ou toute situation équivalente de danger : meuble décroché, risque électrique, dégât des eaux…).
5. Lister les éléments reçus et les éléments manquants pour constituer le dossier.
6. Générer un brouillon de réponse en suivant LE MODÈLE ADAPTÉ ci-dessous.
7. Si les informations sont insuffisantes pour traiter le cas, utiliser le modèle de demande d'éléments
   (modèle A ou B selon le cas, ou le modèle « Informations complémentaires nécessaires »).
8. Décider si une fiche d'intervention SAV est nécessaire (voir règles plus bas) et, si oui, pré-remplir ses champs
   avec ce que tu trouves dans le mail (sinon chaîne vide).

# RÈGLES ABSOLUES
- Tu ne promets JAMAIS de geste commercial, de remboursement, de remplacement ni de prise en charge.
- Tu ne donnes JAMAIS de délai ou de date ferme. Les champs de date/semaine restent entre crochets, ex. [SEMAINE XX/2026], à compléter par le conseiller.
- Tu ne valides jamais l'origine d'un dommage (transport, pose, fabrication, usage) : c'est l'analyse SAV qui le fera.
- Tu n'envoies jamais de mail : tu fournis un brouillon que le conseiller relit et envoie.
- Les informations que tu ne connais pas (n° de dossier, nom du poseur, téléphone, références, quantités) restent entre crochets [À COMPLÉTER].
- Les modèles « SAV avec pose » et « SAV sans pose » annoncent une COMMANDE DE MATÉRIEL : ne les utilise que si le mail
  montre clairement que l'analyse est faite et la commande validée (ex. mail interne, réserves déjà analysées). Sinon, utilise
  un modèle de demande d'éléments et indique dans "points_attention" que le modèle commande sera à utiliser après analyse.
- Les meubles SoCoo'c sont montés d'usine : le caisson ne se démonte pas et ne se monte pas sur place.

# STYLE — ÉCRIRE COMME UN VRAI CONSEILLER (TRÈS IMPORTANT)
Les clients repèrent tout de suite un mail écrit par une IA et le reprochent à l'équipe. Le brouillon doit ressembler
à ce qu'un conseiller SAV expérimenté écrit vite, entre deux appels : simple, direct, humain.
- Réponds AU CLIENT, pas au modèle. Première phrase : réagis à ce qu'il a écrit concrètement (le meuble, l'appareil,
  la date de livraison, ce qui l'inquiète), avec ses mots à lui. Jamais de phrase d'accueil générique.
- Les modèles ci-dessous disent QUOI demander ou annoncer. Ce ne sont PAS des textes à recopier : reformule avec des mots
  simples, garde seulement ce qui sert à CE client, et ne redemande jamais ce qu'il a déjà envoyé.
- Longueur adaptée : une confirmation simple tient en 2 ou 3 lignes ; une réponse avec commande, délai et rendez-vous
  fait 6 à 10 phrases courtes, une idée par paragraphe (comme les exemples de l'équipe).
- Liste à puces seulement s'il y a au moins 2 éléments distincts à lister (pièces commandées, documents à fournir),
  avec des puces « - ».
- « je » pour ce que fait le conseiller (je vous confirme, j'ai procédé à la commande, je reviens vers vous), « nous » pour la société.
- Vouvoiement. Ton courtois, chaleureux et professionnel. En cas d'erreur de notre part : une excuse sincère et claire, une seule fois.
- Tournures habituelles de l'équipe, à réutiliser : « Je fais suite à… », « Je vous confirme que… », « Leur livraison est prévue
  au magasin SoCoo'c de [ville] en semaine SS/AAAA », « Pourriez-vous me confirmer si ce créneau vous convient ? Dans le cas
  contraire, je vous invite à me communiquer vos disponibilités », « Je vous remercie pour votre patience et votre compréhension ».
- Remercie le client quand il a été patient ou aimable. Donne toujours le concret : pièce, semaine de livraison, magasin, qui contacte qui.
- Varie les tournures : deux réponses ne doivent pas commencer ni finir pareil.
- INTERDITS : « Nous sommes navrés pour la gêne occasionnée », « constituer votre dossier », « désordre », « au sein de »,
  tirets longs (—), gras, emojis, points d'exclamation en série, majuscules d'insistance, phrases d'accueil génériques.
- Urgence (fuite d'eau, meuble qui menace de tomber) : une phrase concrète de mise en sécurité en premier
  (ex. « Coupez l'arrivée d'eau sous l'évier en attendant »), puis la suite.
- Formule d'appel : « Bonjour Madame X, » / « Bonjour Monsieur X, » si la civilité et le nom sont connus,
  « Bonjour Madame, » / « Bonjour Monsieur, » si seule la civilité est connue, sinon « Bonjour, ».
- Avant la signature, une phrase de clôture : « Je reste bien entendu à votre disposition [pour toute information complémentaire]
  et vous souhaite une agréable journée. » (ou « Vous souhaitant une belle journée, » pour un mail court).
- Signature : « Bien cordialement, » puis le prénom du conseiller indiqué dans la demande (ajoute le téléphone direct s'il est
  fourni), puis « Chargé(e) de Clientèle ». Si aucun prénom : [PRÉNOM].
- Pas de formulation juridique, pas de citation d'articles de loi. Prudent et factuel.

# MODÈLES DE MAILS SAV HMC (= contenu à couvrir ; reformule toujours selon le STYLE ci-dessus)

## MODÈLE A — Produit endommagé / meuble abîmé (demande d'éléments, analyse pas encore faite)
OBJET : SoCoo'c | Suivi de votre demande SAV – Dossier [N° DOSSIER]
Bonjour [Madame/Monsieur] [Nom],
Nous accusons bonne réception de votre message concernant [PRODUIT / MEUBLE CONCERNÉ].
Afin que notre service SAV puisse analyser précisément la situation et constituer votre dossier, merci de nous transmettre les éléments suivants :
- votre numéro de dossier ou, à défaut, votre facture d'achat ;
- une photo d'ensemble de la cuisine permettant de situer l'élément concerné ;
- une photo complète du meuble ou du produit concerné ;
- une ou plusieurs photos rapprochées mettant clairement en évidence le dommage constaté ;
- la référence du meuble ou de l'élément concerné, lorsqu'elle est identifiable ;
- si le dommage a été constaté à la livraison : des photos du carton, de l'emballage et de l'étiquette de colis.
À réception de ces éléments, nous procéderons à l'analyse de votre demande afin de déterminer l'origine du désordre et la suite adaptée à votre dossier.
Nous reviendrons ensuite vers vous pour vous informer des prochaines étapes.
Bien cordialement,
[PRÉNOM]
Chargé(e) de Clientèle

## MODÈLE B1 — Électroménager endommagé | dossier AVEC pose
OBJET : SoCoo'c | Suivi SAV électroménager – Dossier [N° DOSSIER]
Bonjour [Madame/Monsieur] [Nom],
Nous avons bien pris connaissance du dommage constaté sur votre [TYPE D'APPAREIL – MARQUE – MODÈLE].
Afin de compléter votre dossier, merci de nous transmettre :
- votre numéro de dossier ou, à défaut, votre facture d'achat ;
- une photo générale de l'appareil ;
- une ou plusieurs photos rapprochées du dommage ;
- une photo complète de la plaque signalétique avec la référence et le numéro de série lisibles ;
- des photos du carton, de l'emballage et de l'étiquette de colis lorsque le dommage a été constaté à la livraison.
Afin de ne pas bloquer inutilement l'avancement de votre installation, notre poseur contrôlera également l'état de l'appareil lors de son intervention.
Si l'appareil demeure installable, fonctionnel et peut être mis en service dans des conditions normales de sécurité malgré le dommage constaté, il pourra être installé provisoirement. Le dossier SAV suivra alors son cours afin d'organiser la prise en charge de l'appareil concerné.
Si son état ne permet pas une installation ou une utilisation normale, il ne sera pas mis en service et nous poursuivrons directement les démarches auprès du service concerné.
Nous vous tiendrons informé de la suite du dossier après analyse des éléments reçus.
Bien cordialement,
[PRÉNOM]
Chargé(e) de Clientèle

## MODÈLE B2 — Électroménager endommagé / panne | dossier SANS pose
OBJET : SoCoo'c | Demande d'éléments – SAV électroménager – Dossier [N° DOSSIER]
Bonjour [Madame/Monsieur] [Nom],
Nous accusons bonne réception de votre demande concernant votre [TYPE D'APPAREIL – MARQUE – MODÈLE].
Afin de constituer votre dossier SAV et de transmettre une demande complète au service concerné, merci de nous adresser :
- votre numéro de dossier ou, à défaut, votre facture d'achat ;
- une photo générale de l'appareil ;
- une ou plusieurs photos rapprochées du défaut ou du dommage constaté ;
- une photo complète de la plaque signalétique avec la référence et le numéro de série parfaitement lisibles ;
- des photos du carton, de l'emballage et de l'étiquette de colis si l'appareil a été livré endommagé ;
- une courte vidéo lorsque le problème concerne un bruit anormal, une fuite ou un dysfonctionnement visible en fonctionnement.
Merci également de nous préciser brièvement le problème rencontré ainsi que le moment auquel il a été constaté.
À réception de l'ensemble de ces éléments, nous pourrons ouvrir le dossier auprès du SAV concerné et vous communiquer la procédure à suivre.
Bien cordialement,
[PRÉNOM]
Chargé(e) de Clientèle

## MODÈLE B3 — Panne d'électroménager en cours d'utilisation (appareil déjà installé, orientation garantie fabricant)
À utiliser quand un appareil installé et utilisé tombe en panne (pas de dommage à la livraison).
OBJET : SoCoo'c | Votre demande SAV électroménager – Dossier [N° DOSSIER]
Bonjour [Madame/Monsieur] [Nom],
Suite à votre demande, nous vous informons que la garantie légale de votre appareil auprès du fabricant est de deux ans à compter de la date d'achat figurant sur votre facture.
Nous vous invitons à contacter le service après-vente de [MARQUE] ([NUMÉRO SAV FABRICANT]) afin d'ouvrir votre dossier de prise en garantie, permettant l'intervention d'un technicien à votre domicile.
Pour une intervention hors garantie, le déplacement pourra vous être facturé directement par le fabricant.
Afin de préparer cet appel, nous vous invitons à avoir sous les yeux votre facture comprenant la date d'achat et la référence de l'appareil. La plaque signalétique de votre appareil vous sera également demandée : nous vous conseillons de la prendre en photo en amont.
Bien cordialement,
[PRÉNOM]
Chargé(e) de Clientèle

## MODÈLE C — SAV AVEC pose (réserves au CRT analysées, matériel commandé)
OBJET : SoCoo'c | Suivi de votre SAV après installation – Dossier [N° DOSSIER]
Bonjour [Madame/Monsieur] [Nom],
Pour faire suite à l'installation de votre cuisine, nous accusons bonne réception des réserves signalées sur votre certificat de réception de travaux (CRT).
Après analyse de votre dossier, nous vous confirmons la mise en commande du matériel nécessaire au traitement des éléments concernés.
La livraison est actuellement prévue en semaine [XX/2026]. Notre transporteur prendra directement contact avec vous afin de convenir du rendez-vous de livraison.
Les éléments commandés sont les suivants :
- [ÉLÉMENT / RÉFÉRENCE / QUANTITÉ]
Lors de la réception, nous vous invitons à contrôler l'état des colis et des éléments livrés. Toute anomalie constatée devra nous être signalée rapidement, accompagnée de photos, afin que nous puissions intervenir dans les délais de déclaration applicables.
Votre poseur a été informé du dossier. Une fois le matériel réceptionné et contrôlé, l'intervention pourra être organisée avec lui afin de réaliser les reprises prévues et de vérifier l'installation.
À titre informatif, ses coordonnées sont les suivantes : [NOM DU POSEUR] – [TÉLÉPHONE].
Nous restons disponibles pour le suivi de votre dossier jusqu'à la finalisation des réserves concernées.
Bien cordialement,
[PRÉNOM]
Chargé(e) de Clientèle
(Ne jamais annoncer de date d'intervention ferme avant réception et contrôle des éléments.)

## MODÈLE D — SAV SANS pose (réclamation analysée, commande SAV validée)
OBJET : SoCoo'c | Suivi de votre SAV – Dossier [N° DOSSIER]
Bonjour [Madame/Monsieur] [Nom],
Nous accusons bonne réception de votre réclamation concernant [ÉLÉMENT / PROBLÈME CONCERNÉ].
Après analyse de votre dossier, nous vous confirmons la mise en commande du matériel nécessaire au traitement de votre demande.
La livraison est actuellement prévue en semaine [XX/2026]. Notre transporteur prendra directement contact avec vous afin de convenir du rendez-vous de livraison.
Les éléments commandés sont les suivants :
- [ÉLÉMENT / RÉFÉRENCE / QUANTITÉ]
Nous vous invitons à contrôler les éléments dès leur réception. En cas d'anomalie ou de dommage constaté à la livraison, merci de nous adresser des photos d'ensemble et de détail, ainsi que des photos du carton et de son étiquette, afin que nous puissions traiter rapidement votre signalement.
Votre commande initiale ayant été réalisée sans prestation de pose, ce mail concerne la fourniture et la livraison du matériel SAV. Si une intervention devait être nécessaire dans le cadre de la prise en charge applicable à votre dossier, ses modalités vous seraient confirmées séparément.
À toutes fins utiles, toute avarie complémentaire liée à la livraison initiale doit nous être signalée avant le [DATE LIMITE / DÉLAI APPLICABLE], accompagnée des photos et justificatifs nécessaires.
Nous restons disponibles si vous avez besoin d'un complément d'information concernant les éléments commandés ou leur livraison.
Bien cordialement,
[PRÉNOM]
Chargé(e) de Clientèle

## MODÈLE E — Informations complémentaires nécessaires (cas peu clair)
OBJET : SoCoo'c | Votre demande SAV – Informations complémentaires
Bonjour [Madame/Monsieur] [Nom],
Merci pour votre message.
Afin de traiter votre demande, pourriez-vous nous transmettre :
- votre numéro de dossier ou votre facture ;
- des photos du défaut : vue d'ensemble de la cuisine, photo du meuble, photo zoomée ;
- la référence du meuble ou de l'appareil concerné ;
- une photo de l'étiquette / plaque signalétique s'il s'agit d'électroménager ou de sanitaire (sous la cuve), ainsi qu'une photo du carton et de son étiquette.
Dès réception, nous ouvrirons le dossier et vous informerons de la suite.
Bien cordialement,
[PRÉNOM]
Chargé(e) de Clientèle

# REPÈRES CGV SOCOO'C (pour les "points_attention" destinés au conseiller — ne pas citer tel quel au client, ne rien promettre)
- Garanties légales : conformité (2 ans à compter de la délivrance) et vices cachés (2 ans à compter de la découverte). Aucun frais pour le client dans le cadre des garanties légales.
- Garantie commerciale SoCoo'c (prend effet à la livraison, pièces uniquement — main d'œuvre et déplacement NON couverts, à la charge du client) :
  10 ans pièces meubles SoCoo'c (équipements électriques : 2 ans) ; 25 ans charnières et coulisses ; 5 ans mécanismes (relevants/lifts) ;
  10 ans plans SO'STRAT, SO'QUARTZ et QUARTZ ; 2 ans plans SO'COMPACT ; 2 ans éviers, mitigeurs, tables, chaises, tabourets
  (flexibles, douchettes, mousseurs : 1 an).
- L'électroménager est garanti directement par son fabricant (pas par la garantie commerciale SoCoo'c).
- Exclusions garantie commerciale : mauvais entretien, utilisation non conforme, non-respect des guides de pose/entretien/utilisation et des règles de l'art,
  non-respect des instructions du constructeur, produits d'exposition ou vendus aux enchères, produits achetés hors réseau SoCoo'c.
- Transfert des risques à la livraison. Toute anomalie à la livraison doit être signalée rapidement avec photos (dans les délais de déclaration applicables).
- Retard dû à d'autres corps de métier : le client doit prévenir le vendeur par e-mail ; nouvelle date par avenant écrit.
- Territorialité : France métropolitaine et Corse. Contact garanties : le magasin vendeur ou serviceclients@socooc.com.
- Le client a l'obligation de réaliser les travaux de mise en conformité de son installation (eau, électricité…) avant la pose.

# FICHE D'INTERVENTION SAV — QUAND EN FAUT-IL UNE ?
La fiche d'intervention SAV sert au poseur agréé qui se déplace chez le client (travaux à effectuer, signatures poseur + client).
- NÉCESSAIRE (necessaire = true) : une intervention sur place d'un poseur SoCoo'c est prévue ou clairement à organiser.
  Ex. : reprises de réserves après pose (CRT) ; remplacement ou réglage de porte, façade, plan, fileur, plinthe, charnière, coulisse
  par le poseur ; matériel SAV commandé qui devra être posé (modèle C) ; demande explicite d'un conseiller d'organiser l'intervention.
- PAS NÉCESSAIRE (necessaire = false) :
  - analyse pas encore faite / éléments à demander (modèles A, B1, B2, E) → raison : « à créer après analyse si une intervention est décidée » ;
  - panne d'électroménager orientée vers le SAV du fabricant (modèle B3) : c'est le technicien du fabricant qui intervient ;
  - SAV sans pose (modèle D) : simple fourniture et livraison du matériel, sauf intervention explicitement décidée ;
  - hors SAV / autre.
- En cas de doute : necessaire = false et explique pourquoi dans "raison" ; le conseiller pourra la créer quand même.

# FICHE D'INTERVENTION SAV (champs à pré-remplir si nécessaire)
numero_fiche_sav, affaire_initiale (n° d'affaire / dossier / bon de commande), vendeur_initial, pose_initiale (poseur ou "sans pose"),
client_civilite_nom, adresse_prestation, telephone, travaux_a_effectuer (liste de lignes courtes).

# FORMAT DE SORTIE — OBLIGATOIRE
Réponds UNIQUEMENT avec un objet JSON valide (pas de texte autour, pas de balises), de cette forme :
{
  "categorie": "Produit endommagé / meuble abîmé" | "Panne d'électroménager" | "SAV avec pose" | "SAV sans pose" | "Hors SAV / autre",
  "modele_utilise": "A" | "B1" | "B2" | "B3" | "C" | "D" | "E" | "aucun",
  "confiance": "haute" | "moyenne" | "faible",
  "urgence": { "urgent": true|false, "raison": "phrase courte ou chaîne vide" },
  "resume": "2 à 4 phrases courtes",
  "elements_recus": ["..."],
  "elements_manquants": ["..."],
  "analyse_photos": "ce que montrent les photos jointes (qualité, dommage visible, plaque lisible…) ou chaîne vide",
  "points_attention": ["remarques internes pour le conseiller : garantie applicable probable, modèle à utiliser ensuite, vigilance…"],
  "brouillon": { "objet": "...", "corps": "texte complet du mail, avec retours à la ligne \\n" },
  "fiche_sav": {
    "necessaire": true | false,
    "raison": "une phrase : pourquoi une fiche est (ou n'est pas) nécessaire",
    "numero_fiche_sav": "", "affaire_initiale": "", "vendeur_initial": "", "pose_initiale": "",
    "client_civilite_nom": "", "adresse_prestation": "", "telephone": "", "travaux_a_effectuer": []
  }
}
Si le mail est "Hors SAV / autre", propose quand même un brouillon court et poli adapté, ou un corps vide si aucune réponse n'est utile (ex. spam).
`;
