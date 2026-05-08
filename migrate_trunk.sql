-- =============================================================
-- MIGRATION : Ajout du support SIP Trunk inter-serveurs
-- =============================================================
-- À exécuter UNE SEULE FOIS sur chaque serveur AVANT sip_trunk.sql
-- =============================================================

-- 1. Créer la table ps_identifies (authentification par IP)
CREATE TABLE IF NOT EXISTS ps_identifies (
    id          VARCHAR(40) NOT NULL,
    endpoint    VARCHAR(40) NOT NULL,
    match       VARCHAR(80) NOT NULL,
    PRIMARY KEY (id)
);

-- 2. Ajouter les colonnes manquantes à ps_aors pour les trunks
--    (contact = l'adresse SIP distante, qualify_frequency = ping de vie)
ALTER TABLE ps_aors
    ADD COLUMN IF NOT EXISTS contact           VARCHAR(255),
    ADD COLUMN IF NOT EXISTS qualify_frequency SMALLINT DEFAULT 0;

-- 3. Rendre tenant_id optionnel pour les trunks (pas de tenant propriétaire)
ALTER TABLE ps_endpoints ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE ps_auths     ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE ps_aors      ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE extensions   ALTER COLUMN tenant_id DROP NOT NULL;

-- 4. Ajouter les colonnes manquantes à ps_endpoints pour les trunks
ALTER TABLE ps_endpoints
    ADD COLUMN IF NOT EXISTS trust_id_inbound VARCHAR(5) DEFAULT 'no',
    ADD COLUMN IF NOT EXISTS send_pai         VARCHAR(5) DEFAULT 'no',
    ADD COLUMN IF NOT EXISTS from_domain      VARCHAR(80);
