-- Supprimer les tables existantes si elles existent pour un redémarrage propre
DROP TABLE IF EXISTS extensions, dids, sip_peers, tenants CASCADE;

-- Table pour les clients (tenants)
CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    domain VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour les comptes SIP (utilisateurs/peers)
-- C'est la structure qu'Asterisk Realtime lira
CREATE TABLE sip_peers (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Champs requis par Asterisk
    name VARCHAR(80) NOT NULL,            -- Le nom d'utilisateur SIP (ex: '1001')
    secret VARCHAR(80),                  -- Le mot de passe
    context VARCHAR(80) NOT NULL,        -- Le contexte du dialplan (ex: 'tenant-1') - crucial pour l'isolation
    host VARCHAR(31) DEFAULT 'dynamic',
    type VARCHAR(6) DEFAULT 'friend',
    callerid VARCHAR(80),                -- L'ID de l'appelant (ex: "John Doe <1001>")
    nat VARCHAR(20) DEFAULT 'force_rport,comedia',
    disallow VARCHAR(100) DEFAULT 'all',
    allow VARCHAR(100) DEFAULT 'ulaw,alaw,gsm',
    mailbox VARCHAR(80),                 -- Pour la messagerie vocale (ex: '1001@default')
    
    -- Contrainte pour s'assurer qu'un nom d'utilisateur est unique par tenant
    UNIQUE(tenant_id, name)
);

-- Table pour les numéros externes (DIDs)
CREATE TABLE dids (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    did VARCHAR(50) UNIQUE NOT NULL,     -- Le numéro de téléphone public (ex: '+33123456789')
    destination_context VARCHAR(80) NOT NULL, -- Contexte de destination
    destination_exten VARCHAR(80) NOT NULL,   -- Extension de destination
    destination_priority INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table pour le plan de numérotation (dialplan)
CREATE TABLE extensions (
    id SERIAL PRIMARY KEY,
    context VARCHAR(80) NOT NULL,        -- Le contexte (doit correspondre à celui des sip_peers)
    exten VARCHAR(80) NOT NULL,          -- L'extension (le numéro composé)
    priority INTEGER NOT NULL,
    app VARCHAR(80) NOT NULL,            -- L'application Asterisk à exécuter (ex: 'Dial')
    appdata VARCHAR(255)                 -- Les arguments de l'application (ex: 'SIP/${EXTEN}')
);

-- Insérer quelques données de test pour commencer
INSERT INTO tenants (id, name, domain) VALUES (1, 'Client A', 'clienta.example.com');
INSERT INTO tenants (id, name, domain) VALUES (2, 'Client B', 'clientb.example.com');

-- Utilisateurs pour le Client A (contexte 'tenant-1')
INSERT INTO sip_peers (tenant_id, name, secret, context, callerid, mailbox) VALUES
(1, '1001', 'password1001', 'tenant-1', '"Alice" <1001>', '1001@tenant-1'),
(1, '1002', 'password1002', 'tenant-1', '"Bob" <1002>', '1002@tenant-1');

-- Utilisateurs pour le Client B (contexte 'tenant-2')
INSERT INTO sip_peers (tenant_id, name, secret, context, callerid, mailbox) VALUES
(2, '2001', 'password2001', 'tenant-2', '"Charlie" <2001>', '2001@tenant-2'),
(2, '2002', 'password2002', 'tenant-2', '"David" <2002>', '2002@tenant-2');

-- Numéro externe pour le Client A
INSERT INTO dids (tenant_id, did, destination_context, destination_exten) VALUES
(1, '+33123456789', 'from-outside', '1001');

-- Règles de numérotation pour le Client A (contexte 'tenant-1')
-- Permet aux utilisateurs du tenant 1 de s'appeler entre eux (numéros à 4 chiffres commençant par 1)
INSERT INTO extensions (context, exten, priority, app, appdata) VALUES
('tenant-1', '_1XXX', 1, 'Dial', 'SIP/${EXTEN},20');

-- Règles de numérotation pour le Client B (contexte 'tenant-2')
-- Permet aux utilisateurs du tenant 2 de s'appeler entre eux (numéros à 4 chiffres commençant par 2)
INSERT INTO extensions (context, exten, priority, app, appdata) VALUES
('tenant-2', '_2XXX', 1, 'Dial', 'SIP/${EXTEN},20');
