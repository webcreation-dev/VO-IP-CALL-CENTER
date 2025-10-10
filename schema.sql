-- Supprime les tables dans le bon ordre pour éviter les problèmes de dépendances
DROP TABLE IF EXISTS extensions, ps_aors, ps_auths, ps_endpoints, tenants CASCADE;

--
-- Table des clients (tenants)
--
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

--
-- Tables PJSIP pour Asterisk Realtime
-- ps_endpoints: Représente un téléphone/appareil
-- ps_auths: Gère l'authentification (login/mot de passe)
-- ps_aors: Indique à Asterisk comment trouver un appareil (Address of Record)
--

CREATE TABLE ps_endpoints (
    id VARCHAR(40) NOT NULL,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    transport VARCHAR(40),
    aors VARCHAR(200) NOT NULL,
    auth VARCHAR(40),
    context VARCHAR(40) NOT NULL, -- Crucial pour l'isolation
    disallow VARCHAR(200) DEFAULT 'all',
    allow VARCHAR(200),
    direct_media VARCHAR(5) DEFAULT 'no',
    callerid VARCHAR(80),
    UNIQUE (id)
);

CREATE TABLE ps_auths (
    id VARCHAR(40) NOT NULL,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    auth_type VARCHAR(10) DEFAULT 'userpass',
    password VARCHAR(80),
    username VARCHAR(40) NOT NULL,
    UNIQUE (id)
);

CREATE TABLE ps_aors (
    id VARCHAR(40) NOT NULL,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    max_contacts SMALLINT DEFAULT 1,
    remove_existing VARCHAR(5) DEFAULT 'yes',
    UNIQUE (id)
);

--
-- Table pour le plan de numérotation (dialplan) dynamique
--
CREATE TABLE extensions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    context VARCHAR(40) NOT NULL,
    exten VARCHAR(40) NOT NULL,
    priority SMALLINT NOT NULL,
    app VARCHAR(40) NOT NULL,
    appdata VARCHAR(256),
    UNIQUE (tenant_id, context, exten, priority)
);

