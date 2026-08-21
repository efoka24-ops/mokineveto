# Specification Quality Checklist: Mise en conformité de l'application mobile avec la SFD et le design de référence

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2026-08-21
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

### Itération 1 — corrections appliquées

Trois manquements relevés à la première passe et corrigés avant validation :

1. **Fuites d'implémentation dans les critères de succès.** Des seuils étaient formulés en termes
   techniques (« latence < 500 ms », « APK < 30 Mo »). Reformulés du point de vue de l'utilisateur
   (SC-013, SC-015) ; les valeurs chiffrées correspondantes restent portées par la SFD §5 et seront
   reprises telles quelles dans le plan.
2. **Nommage de technologies dans les exigences.** Les mentions d'outils et de prestataires
   (messagerie temps réel, cartographie, transcription vocale) ont été déplacées des exigences vers
   la section Dependencies, formulées comme des besoins de service et non comme des choix de
   fournisseur.
3. **Périmètre non borné.** Ajout d'une section *Out of Scope* explicite, la SFD mêlant des éléments
   de phase 1, 2 et 3 sans les séparer.

### Réserve bloquante pour la suite

**FR-051 à FR-054 (conformité au design) ne sont pas vérifiables en l'état.** Le fichier de maquettes
de référence n'est pas accessible au compte utilisé : l'accès en lecture seule ne suffit pas à
l'outillage, qui exige un accès éditeur. Les exigences sont écrites et testables *sur le principe*,
mais aucune vérification — manuelle ou automatisée — ne peut être conduite tant que l'accès n'est pas
ouvert. SC-026 et SC-027 restent donc non mesurables.

**Action requise du propriétaire du produit** : ouvrir l'accès éditeur au fichier de maquettes, ou
fournir un export des écrans de référence.

### Points laissés à l'arbitrage, sans blocage

Trois décisions ont été tranchées par défaut documenté plutôt que par question bloquante, afin de ne
pas retarder la planification. Elles restent révisables :

- **Langues** : phase courante limitée aux trois langues déjà implémentées ; swahili et arabe
  reportés (cf. Assumptions et Out of Scope).
- **Module de vente de produits** : maintenu dans le produit par défaut, sa réconciliation avec la
  SFD étant elle-même érigée en exigence (FR-055) plutôt que résolue arbitrairement.
- **Répartition mobile / back-office** : le portail des institutions partenaires est placé hors
  périmètre de cette feature, la SFD ne le rattachant pas à l'application mobile.
