-- Migration des données existantes du fichier pjsip_wizard.conf vers la table sip_trunks
-- À exécuter sur la base de données de production

INSERT INTO sip_trunks (
    name,
    tenant_id,
    remote_host,
    username,
    password,
    transport,
    context,
    sends_registrations,
    sends_auth,
    client_uri,
    server_uri,
    retry_interval,
    expiration,
    max_retries,
    forbidden_retry_interval,
    line,
    outbound_proxy,
    support_path,
    display_name,
    description,
    enabled,
    created_at,
    updated_at
) VALUES (
    'operator_trunk',                    -- name
    1,                                    -- tenant_id (Client A)
    '197.234.218.195:25060',             -- remote_host
    '62908521',                          -- username
    '167d458f-8',                        -- password
    'transport-udp',                     -- transport
    'from-trunk',                        -- context
    true,                                -- sends_registrations
    true,                                -- sends_auth
    'sip:62908521@197.234.218.195:25060', -- client_uri
    'sip:197.234.218.195:25060',         -- server_uri
    60,                                  -- retry_interval
    3600,                                -- expiration
    10,                                  -- max_retries
    0,                                   -- forbidden_retry_interval
    false,                               -- line
    NULL,                                -- outbound_proxy
    false,                               -- support_path
    'Trunk Opérateur Principal',        -- display_name
    'SIP trunk pour l''opérateur télécom principal', -- description
    true,                                -- enabled
    NOW(),                               -- created_at
    NOW()                                -- updated_at
)
ON CONFLICT (name) DO UPDATE SET
    remote_host = EXCLUDED.remote_host,
    username = EXCLUDED.username,
    password = EXCLUDED.password,
    transport = EXCLUDED.transport,
    context = EXCLUDED.context,
    sends_registrations = EXCLUDED.sends_registrations,
    sends_auth = EXCLUDED.sends_auth,
    client_uri = EXCLUDED.client_uri,
    server_uri = EXCLUDED.server_uri,
    retry_interval = EXCLUDED.retry_interval,
    expiration = EXCLUDED.expiration,
    max_retries = EXCLUDED.max_retries,
    updated_at = NOW();

-- Vérification
SELECT id, name, tenant_id, remote_host, username, enabled, created_at
FROM sip_trunks
WHERE name = 'operator_trunk';
