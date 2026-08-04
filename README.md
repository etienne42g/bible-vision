# Bible Vision

Bible Vision est une PWA française de lecture, d’étude et d’annotation biblique,
préparée pour transmettre des passages vers
[Ancre](https://memoryverses.etiennegrz.fr).

## Fonctionnalités

- corpus complets Louis Segond 1910 et J.N. Darby, intégrés pour le hors-ligne ;
- navigation dans les 66 livres et recherche textuelle ou par référence ;
- sélection multiple, plages de versets, surlignages et notes ;
- comparaison des traductions et concordance Strong de base ;
- favoris, historique, bibliothèque et sauvegarde locale ;
- préparation de prédications avec export texte, Markdown et impression/PDF ;
- file locale d’import vers Ancre avec identifiants idempotents ;
- PWA installable, thèmes clair/sépia/sombre et contraste renforcé.

Les données personnelles sont conservées dans IndexedDB sur l’appareil. La
synchronisation multi-appareils nécessite le raccordement au projet Supabase
d’Ancre.

## Développement

Node.js `>=22.13.0` est requis.

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
```

`npm run data:refresh` régénère les corpus embarqués à partir des exports JSON
HelloAO, dont les métadonnées renvoient vers les licences des traductions.

## Traductions et licences

- Louis Segond 1910 : domaine public, source eBible.org.
- Bible J.N. Darby, révision JND v2.0 : domaine public, source Bibles et
  Publications Chrétiennes via eBible.org.

Les sources et empreintes SHA-256 sont incluses dans
`public/bibles/catalog.json`.
