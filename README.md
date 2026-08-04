# Bible Vision

Bible Vision est une PWA française de lecture, d’étude et d’annotation biblique,
préparée pour transmettre des passages vers
[Ancre](https://memoryverses.etiennegrz.fr).

## Fonctionnalités

- corpus complets Louis Segond 1910 et J.N. Darby, intégrés pour le hors-ligne ;
- navigation dans les 66 livres et recherche textuelle ou par référence ;
- sélection multiple, plages de versets, surlignages et notes ;
- comparaison des traductions et mots Strong liés aux versets sélectionnés ;
- favoris, historique, bibliothèque et sauvegarde locale ;
- préparation de prédications avec export texte, Markdown et impression/PDF ;
- file locale d’import vers Ancre avec identifiants idempotents ;
- connexion par code e-mail avec le même compte Supabase qu’Ancre ;
- PWA installable, thèmes clair/sépia/sombre et contraste renforcé.

Les données personnelles sont conservées dans IndexedDB sur l’appareil. La
connexion partage bien la même identité qu’Ancre, mais la synchronisation des
notes, favoris et préférences Bible Vision n’est pas encore activée.

## Développement

Node.js `>=22.13.0` est requis.

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
```

`npm run data:refresh` régénère les corpus bibliques et les données Strong
embarquées. `npm run data:strong` ne rafraîchit que les données Strong.

## Traductions et licences

- Louis Segond 1910 : domaine public, source eBible.org.
- Bible J.N. Darby, révision JND v2.0 : domaine public, source Bibles et
  Publications Chrétiennes via eBible.org.
- Textes grec et hébreu balisés et lexiques Strong : STEP Bible / Tyndale
  House, Cambridge, sous licence CC BY 4.0.
- Mots français alignés avec les Strong : Segond 1910, domaine public.
  Numéros Strong affectés en 2026 par « Concordances et Traductions de la
  Bible » (concordance.bible).

Les sources et empreintes SHA-256 sont incluses dans
`public/bibles/catalog.json`. Les sources et l’attribution Strong figurent dans
`public/strong/catalog.json`. Le Nouveau Testament suit le texte principal
NA28, avec repli sur le texte traditionnel pour les versets absents ; le
contexte textuel doit toujours être vérifié.
