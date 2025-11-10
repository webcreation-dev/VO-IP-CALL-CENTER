-- =====================================================
-- MIGRATION: Context-Specific Roles Support
-- Date: 2025-01-10
-- Description: Add context_id column to endpoint_roles table
--              to support both tenant-wide and context-specific roles
-- =====================================================

BEGIN;

-- =====================================================
-- ÉTAPE 1: Ajouter la colonne context_id
-- =====================================================
ALTER TABLE endpoint_roles
ADD COLUMN IF NOT EXISTS context_id INTEGER;

-- Ajouter la contrainte de clé étrangère
ALTER TABLE endpoint_roles
ADD CONSTRAINT fk_endpoint_roles_context
FOREIGN KEY (context_id)
REFERENCES tenant_contexts(id)
ON DELETE CASCADE;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_endpoint_roles_context ON endpoint_roles(context_id);

-- Commentaire
COMMENT ON COLUMN endpoint_roles.context_id IS 'Context ID (NULL = tenant-wide role, non-NULL = context-specific role)';

-- =====================================================
-- ÉTAPE 2: Supprimer les anciennes contraintes d'unicité
-- =====================================================
-- Les anciennes contraintes ne supportent pas les rôles context-specific
-- car elles ne prennent pas en compte context_id

ALTER TABLE endpoint_roles
DROP CONSTRAINT IF EXISTS uq_endpoint_roles_tenant_name;

ALTER TABLE endpoint_roles
DROP CONSTRAINT IF EXISTS uq_endpoint_roles_tenant_level;

-- =====================================================
-- ÉTAPE 3: Créer de nouvelles contraintes avec context_id
-- =====================================================
-- Utilise COALESCE(context_id, -1) pour supporter les valeurs NULL
-- Cela permet d'avoir:
-- - Un seul rôle "agent" tenant-wide (context_id = NULL) pour le tenant 1
-- - Un rôle "agent" context-specific (context_id = 1) pour le contexte 1
-- - Un rôle "agent" context-specific (context_id = 2) pour le contexte 2

-- Contrainte d'unicité pour le nom du rôle (tenant_id + context_id + name)
CREATE UNIQUE INDEX uq_endpoint_roles_tenant_context_name
ON endpoint_roles(tenant_id, COALESCE(context_id, -1), name);

-- Contrainte d'unicité pour le niveau du rôle (tenant_id + context_id + level)
CREATE UNIQUE INDEX uq_endpoint_roles_tenant_context_level
ON endpoint_roles(tenant_id, COALESCE(context_id, -1), level);

-- =====================================================
-- ÉTAPE 4: Créer la table role_presets
-- =====================================================
CREATE TABLE IF NOT EXISTS role_presets (
  id SERIAL PRIMARY KEY,
  preset_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE role_presets IS 'Presets de rôles prédéfinis pour faciliter la configuration';
COMMENT ON COLUMN role_presets.preset_id IS 'Identifiant unique du preset (ex: call_center_standard)';

-- =====================================================
-- ÉTAPE 5: Créer la table role_preset_roles
-- =====================================================
CREATE TABLE IF NOT EXISTS role_preset_roles (
  id SERIAL PRIMARY KEY,
  preset_id INTEGER NOT NULL REFERENCES role_presets(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,
  level INTEGER NOT NULL,
  can_call_same_level BOOLEAN NOT NULL DEFAULT true,
  can_call_lower_level BOOLEAN NOT NULL DEFAULT false,
  can_call_higher_level BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT chk_role_preset_roles_level CHECK (level >= 1 AND level <= 10)
);

-- Index pour performance
CREATE INDEX idx_role_preset_roles_preset ON role_preset_roles(preset_id);

COMMENT ON TABLE role_preset_roles IS 'Définition des rôles dans les presets';

-- =====================================================
-- ÉTAPE 6: Créer le trigger pour updated_at sur role_presets
-- =====================================================
DROP TRIGGER IF EXISTS trg_role_presets_updated_at ON role_presets;
CREATE TRIGGER trg_role_presets_updated_at
BEFORE UPDATE ON role_presets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÉTAPE 7: Insérer les presets par défaut
-- =====================================================

-- Preset: Call Center Standard (5 niveaux)
INSERT INTO role_presets (preset_id, name, description)
VALUES (
  'call_center_standard',
  'Call Center Standard',
  'Configuration standard pour un centre d''appels avec 5 niveaux hiérarchiques'
) ON CONFLICT (preset_id) DO NOTHING;

-- Rôles du preset Call Center Standard
INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'agent',
  'Agent',
  'Agent de base gérant les appels clients',
  1,
  true,   -- Peut appeler autres agents
  false,  -- Ne peut pas appeler niveau inférieur (n''existe pas)
  false,  -- Ne peut pas appeler superviseurs
  0
FROM role_presets p
WHERE p.preset_id = 'call_center_standard'
ON CONFLICT DO NOTHING;

INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'team_leader',
  'Team Leader',
  'Responsable d''une petite équipe d''agents',
  3,
  true,   -- Peut appeler autres team leaders
  true,   -- Peut appeler agents
  false,  -- Ne peut pas appeler superviseurs
  1
FROM role_presets p
WHERE p.preset_id = 'call_center_standard'
ON CONFLICT DO NOTHING;

INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'supervisor',
  'Superviseur',
  'Superviseur d''équipe avec accès monitoring',
  5,
  true,   -- Peut appeler autres superviseurs
  true,   -- Peut appeler team leaders et agents
  false,  -- Ne peut pas appeler managers
  2
FROM role_presets p
WHERE p.preset_id = 'call_center_standard'
ON CONFLICT DO NOTHING;

INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'manager',
  'Manager',
  'Manager de service ou département',
  8,
  true,   -- Peut appeler autres managers
  true,   -- Peut appeler tous les niveaux inférieurs
  false,  -- Ne peut pas appeler directeurs
  3
FROM role_presets p
WHERE p.preset_id = 'call_center_standard'
ON CONFLICT DO NOTHING;

INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'director',
  'Directeur',
  'Directeur du centre d''appels',
  10,
  true,   -- Peut appeler autres directeurs
  true,   -- Peut appeler tous les niveaux
  true,   -- Peut tout appeler
  4
FROM role_presets p
WHERE p.preset_id = 'call_center_standard'
ON CONFLICT DO NOTHING;

-- Preset: Flat Organization (1 niveau)
INSERT INTO role_presets (preset_id, name, description)
VALUES (
  'flat_organization',
  'Organisation Plate',
  'Tous les membres au même niveau avec permissions complètes'
) ON CONFLICT (preset_id) DO NOTHING;

INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'member',
  'Membre',
  'Membre de l''organisation avec accès complet',
  5,
  true,   -- Peut appeler autres membres
  true,   -- Peut tout appeler
  true,   -- Peut tout appeler
  0
FROM role_presets p
WHERE p.preset_id = 'flat_organization'
ON CONFLICT DO NOTHING;

-- Preset: Simple Hierarchy (3 niveaux)
INSERT INTO role_presets (preset_id, name, description)
VALUES (
  'simple_hierarchy',
  'Hiérarchie Simple',
  'Hiérarchie simple avec 3 niveaux: Agent, Manager, Directeur'
) ON CONFLICT (preset_id) DO NOTHING;

INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'agent',
  'Agent',
  'Agent de base',
  1,
  true,
  false,
  false,
  0
FROM role_presets p
WHERE p.preset_id = 'simple_hierarchy'
ON CONFLICT DO NOTHING;

INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'manager',
  'Manager',
  'Manager d''équipe',
  5,
  true,
  true,
  false,
  1
FROM role_presets p
WHERE p.preset_id = 'simple_hierarchy'
ON CONFLICT DO NOTHING;

INSERT INTO role_preset_roles (preset_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level, sort_order)
SELECT
  p.id,
  'director',
  'Directeur',
  'Directeur avec accès complet',
  10,
  true,
  true,
  true,
  2
FROM role_presets p
WHERE p.preset_id = 'simple_hierarchy'
ON CONFLICT DO NOTHING;

-- =====================================================
-- ÉTAPE 8: Migration des rôles existants
-- =====================================================
-- Tous les rôles existants deviennent tenant-wide (context_id = NULL)
-- Pas besoin de faire quoi que ce soit car la colonne context_id est déjà NULL par défaut

-- =====================================================
-- ÉTAPE 9: Statistiques de la migration
-- =====================================================
DO $$
DECLARE
  roles_count INTEGER;
  presets_count INTEGER;
  preset_roles_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO roles_count FROM endpoint_roles;
  SELECT COUNT(*) INTO presets_count FROM role_presets;
  SELECT COUNT(*) INTO preset_roles_count FROM role_preset_roles;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration terminée avec succès !';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Rôles existants (maintenant tenant-wide): %', roles_count;
  RAISE NOTICE 'Presets créés: %', presets_count;
  RAISE NOTICE 'Rôles de presets créés: %', preset_roles_count;
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- VÉRIFICATIONS POST-MIGRATION
-- =====================================================

-- Vérifier que la colonne context_id existe
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'endpoint_roles'
  AND column_name = 'context_id';

-- Vérifier les contraintes d'unicité
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'endpoint_roles'
  AND indexname LIKE 'uq_endpoint_roles%';

-- Afficher les presets créés
SELECT
  preset_id,
  name,
  description,
  (SELECT COUNT(*) FROM role_preset_roles WHERE preset_id = p.id) AS roles_count
FROM role_presets p
ORDER BY preset_id;
