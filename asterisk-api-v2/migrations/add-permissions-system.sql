-- =====================================================
-- MIGRATION: Système de Permissions Multi-Niveaux
-- Date: 2025-01-07
-- Description: Ajout des tables et colonnes pour le système
--              de permissions basé sur rôles et contextes
-- =====================================================

BEGIN;

-- =====================================================
-- ÉTAPE 1: Créer la table endpoint_roles
-- =====================================================
CREATE TABLE IF NOT EXISTS endpoint_roles (
  -- Identifiant
  id SERIAL PRIMARY KEY,

  -- Tenant (chaque tenant a ses propres rôles)
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Identification du rôle
  name VARCHAR(50) NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  description TEXT,

  -- Hiérarchie
  level INTEGER NOT NULL DEFAULT 1,

  -- Permissions d'appel
  can_call_same_level BOOLEAN NOT NULL DEFAULT true,
  can_call_lower_level BOOLEAN NOT NULL DEFAULT false,
  can_call_higher_level BOOLEAN NOT NULL DEFAULT false,

  -- Métadonnées
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Contraintes
  CONSTRAINT uq_endpoint_roles_tenant_name UNIQUE(tenant_id, name),
  CONSTRAINT uq_endpoint_roles_tenant_level UNIQUE(tenant_id, level),
  CONSTRAINT chk_endpoint_roles_level CHECK (level >= 1 AND level <= 10)
);

-- Index pour performance
CREATE INDEX idx_endpoint_roles_tenant ON endpoint_roles(tenant_id);
CREATE INDEX idx_endpoint_roles_level ON endpoint_roles(level);
CREATE INDEX idx_endpoint_roles_active ON endpoint_roles(is_active);

-- Commentaires
COMMENT ON TABLE endpoint_roles IS 'Définition des rôles hiérarchiques pour les endpoints';
COMMENT ON COLUMN endpoint_roles.level IS 'Niveau hiérarchique (1=plus bas, 10=plus haut)';
COMMENT ON COLUMN endpoint_roles.can_call_same_level IS 'Autoriser les appels vers le même niveau hiérarchique';
COMMENT ON COLUMN endpoint_roles.can_call_lower_level IS 'Autoriser les appels vers les niveaux inférieurs';
COMMENT ON COLUMN endpoint_roles.can_call_higher_level IS 'Autoriser les appels vers les niveaux supérieurs';

-- =====================================================
-- ÉTAPE 2: Ajouter colonne role_id dans ps_endpoints
-- =====================================================
ALTER TABLE ps_endpoints
ADD COLUMN IF NOT EXISTS role_id INTEGER;

-- Ajouter la contrainte de clé étrangère
ALTER TABLE ps_endpoints
ADD CONSTRAINT fk_ps_endpoints_role
FOREIGN KEY (role_id)
REFERENCES endpoint_roles(id)
ON DELETE SET NULL;

-- Index pour jointures
CREATE INDEX IF NOT EXISTS idx_ps_endpoints_role ON ps_endpoints(role_id);

-- Commentaire
COMMENT ON COLUMN ps_endpoints.role_id IS 'Rôle assigné à cet endpoint pour la gestion des permissions d''appel';

-- =====================================================
-- ÉTAPE 3: Créer la table call_audit_logs
-- =====================================================
CREATE TABLE IF NOT EXISTS call_audit_logs (
  -- Identifiant
  id BIGSERIAL PRIMARY KEY,

  -- Tenant
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  -- Appelant
  caller_endpoint_id VARCHAR(40),
  caller_role_id INTEGER REFERENCES endpoint_roles(id) ON DELETE SET NULL,

  -- Appelé
  called_endpoint_id VARCHAR(40),
  called_role_id INTEGER REFERENCES endpoint_roles(id) ON DELETE SET NULL,

  -- Contextes
  caller_context VARCHAR(128),
  called_context VARCHAR(128),

  -- Résultat de la validation
  action VARCHAR(20) NOT NULL CHECK (action IN ('allowed', 'denied')),
  deny_reason VARCHAR(100),

  -- Métadonnées Asterisk
  channel_id VARCHAR(100),
  uniqueid VARCHAR(100),
  caller_number VARCHAR(40),
  called_number VARCHAR(40),

  -- Données additionnelles (optionnel)
  metadata JSONB,

  -- Timestamp
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index pour requêtes fréquentes
CREATE INDEX idx_call_audit_tenant ON call_audit_logs(tenant_id);
CREATE INDEX idx_call_audit_caller ON call_audit_logs(caller_endpoint_id);
CREATE INDEX idx_call_audit_called ON call_audit_logs(called_endpoint_id);
CREATE INDEX idx_call_audit_action ON call_audit_logs(action);
CREATE INDEX idx_call_audit_date ON call_audit_logs(created_at DESC);
CREATE INDEX idx_call_audit_deny_reason ON call_audit_logs(deny_reason) WHERE action = 'denied';

-- Index composites pour requêtes complexes
CREATE INDEX idx_call_audit_tenant_date ON call_audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_call_audit_tenant_action ON call_audit_logs(tenant_id, action, created_at DESC);

-- Commentaires
COMMENT ON TABLE call_audit_logs IS 'Journal d''audit des tentatives d''appels (autorisés et refusés)';
COMMENT ON COLUMN call_audit_logs.action IS 'Résultat: allowed (autorisé) ou denied (refusé)';
COMMENT ON COLUMN call_audit_logs.deny_reason IS 'Raison du refus: role_permission_denied, inter_context_denied, etc.';
COMMENT ON COLUMN call_audit_logs.metadata IS 'Données additionnelles au format JSON';

-- =====================================================
-- ÉTAPE 4: Créer le trigger pour updated_at
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur endpoint_roles
DROP TRIGGER IF EXISTS trg_endpoint_roles_updated_at ON endpoint_roles;
CREATE TRIGGER trg_endpoint_roles_updated_at
BEFORE UPDATE ON endpoint_roles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- ÉTAPE 5: Insérer les rôles par défaut (Call Center Standard)
-- =====================================================

-- Pour tous les tenants actifs, créer les rôles de base
INSERT INTO endpoint_roles (tenant_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level)
SELECT
  t.id,
  'agent',
  'Agent',
  'Agent de base gérant les appels clients',
  1,
  true,   -- Peut appeler autres agents
  false,  -- Ne peut pas appeler niveau inférieur (n'existe pas)
  false   -- Ne peut pas appeler superviseurs
FROM tenants t
WHERE t.is_active = true
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO endpoint_roles (tenant_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level)
SELECT
  t.id,
  'team_leader',
  'Team Leader',
  'Responsable d''une petite équipe d''agents',
  3,
  true,   -- Peut appeler autres team leaders
  true,   -- Peut appeler agents
  false   -- Ne peut pas appeler superviseurs
FROM tenants t
WHERE t.is_active = true
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO endpoint_roles (tenant_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level)
SELECT
  t.id,
  'supervisor',
  'Superviseur',
  'Superviseur d''équipe avec accès monitoring',
  5,
  true,   -- Peut appeler autres superviseurs
  true,   -- Peut appeler team leaders et agents
  false   -- Ne peut pas appeler managers
FROM tenants t
WHERE t.is_active = true
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO endpoint_roles (tenant_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level)
SELECT
  t.id,
  'manager',
  'Manager',
  'Manager de service ou département',
  8,
  true,   -- Peut appeler autres managers
  true,   -- Peut appeler tous les niveaux inférieurs
  false   -- Ne peut pas appeler directeurs
FROM tenants t
WHERE t.is_active = true
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO endpoint_roles (tenant_id, name, display_name, description, level, can_call_same_level, can_call_lower_level, can_call_higher_level)
SELECT
  t.id,
  'director',
  'Directeur',
  'Directeur du centre d''appels',
  10,
  true,   -- Peut appeler autres directeurs
  true,   -- Peut appeler tous les niveaux
  true    -- Peut tout appeler
FROM tenants t
WHERE t.is_active = true
ON CONFLICT (tenant_id, name) DO NOTHING;

-- =====================================================
-- ÉTAPE 6: Créer une vue pour simplifier les requêtes
-- =====================================================
CREATE OR REPLACE VIEW v_endpoints_with_roles AS
SELECT
  e.id,
  e.tenant_id,
  e.context,
  e.display_name,
  e.transport,
  e.aors,
  e.auth,
  e.callerid,
  e.role_id,
  r.name AS role_name,
  r.display_name AS role_display_name,
  r.level AS role_level,
  r.can_call_same_level,
  r.can_call_lower_level,
  r.can_call_higher_level
FROM ps_endpoints e
LEFT JOIN endpoint_roles r ON e.role_id = r.id;

COMMENT ON VIEW v_endpoints_with_roles IS 'Vue combinant les endpoints avec leurs rôles assignés';

-- =====================================================
-- ÉTAPE 7: Créer une fonction pour nettoyer les logs anciens
-- =====================================================
CREATE OR REPLACE FUNCTION cleanup_old_audit_logs(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM call_audit_logs
  WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_audit_logs IS 'Nettoie les logs d''audit plus anciens que X jours (défaut: 90)';

-- =====================================================
-- ÉTAPE 8: Statistiques de la migration
-- =====================================================
DO $$
DECLARE
  tenants_count INTEGER;
  roles_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO tenants_count FROM tenants WHERE is_active = true;
  SELECT COUNT(*) INTO roles_count FROM endpoint_roles;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Migration terminée avec succès !';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Tenants actifs: %', tenants_count;
  RAISE NOTICE 'Rôles créés: %', roles_count;
  RAISE NOTICE 'Rôles par tenant: %', roles_count / NULLIF(tenants_count, 0);
  RAISE NOTICE '========================================';
END $$;

COMMIT;

-- =====================================================
-- VÉRIFICATIONS POST-MIGRATION
-- =====================================================

-- Vérifier que les tables existent
SELECT
  'endpoint_roles' AS table_name,
  COUNT(*) AS row_count
FROM endpoint_roles
UNION ALL
SELECT
  'call_audit_logs' AS table_name,
  COUNT(*) AS row_count
FROM call_audit_logs;

-- Vérifier que la colonne role_id existe dans ps_endpoints
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'ps_endpoints'
  AND column_name = 'role_id';

-- Afficher les rôles créés par tenant
SELECT
  t.name AS tenant_name,
  r.name AS role_name,
  r.display_name,
  r.level,
  r.can_call_same_level,
  r.can_call_lower_level,
  r.can_call_higher_level
FROM endpoint_roles r
JOIN tenants t ON r.tenant_id = t.id
ORDER BY t.id, r.level;
