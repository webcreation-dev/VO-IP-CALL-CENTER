-- Supprimer toutes les données existantes pour repartir à zéro
TRUNCATE TABLE tenants, ps_endpoints, ps_auths, ps_aors, extensions RESTART IDENTITY CASCADE;

--
-- Création de deux clients (tenants)
--
INSERT INTO tenants (id, name) VALUES (1, 'Client A');
INSERT INTO tenants (id, name) VALUES (2, 'Client B');

--
-- Configuration pour le Client A
--

-- Utilisateur 101
INSERT INTO ps_endpoints (id, tenant_id, aors, auth, context, allow, callerid) VALUES ('101', 1, '101', '101-auth', 'client-a-dialplan', 'ulaw,alaw,g722', '"User 101" <101>');
INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) VALUES ('101-auth', 1, 'userpass', 'password101', '101');
INSERT INTO ps_aors (id, tenant_id, max_contacts) VALUES ('101', 1, 1);

-- Utilisateur 102
INSERT INTO ps_endpoints (id, tenant_id, aors, auth, context, allow, callerid) VALUES ('102', 1, '102', '102-auth', 'client-a-dialplan', 'ulaw,alaw,g722', '"User 102" <102>');
INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) VALUES ('102-auth', 1, 'userpass', 'password102', '102');
INSERT INTO ps_aors (id, tenant_id, max_contacts) VALUES ('102', 1, 1);

-- Dialplan pour le Client A (permet aux utilisateurs de s'appeler)
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata) VALUES
(1, 'client-a-dialplan', '_1XX', 1, 'Dial', 'PJSIP/${EXTEN},20');


--
-- Configuration pour le Client B
--

-- Utilisateur 201
INSERT INTO ps_endpoints (id, tenant_id, aors, auth, context, allow, callerid) VALUES ('201', 2, '201', '201-auth', 'client-b-dialplan', 'ulaw,alaw,g722', '"User 201" <201>');
INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) VALUES ('201-auth', 2, 'userpass', 'password201', '201');
INSERT INTO ps_aors (id, tenant_id, max_contacts) VALUES ('201', 2, 1);

-- Utilisateur 202
INSERT INTO ps_endpoints (id, tenant_id, aors, auth, context, allow, callerid) VALUES ('202', 2, '202', '202-auth', 'client-b-dialplan', 'ulaw,alaw,g722', '"User 202" <202>');
INSERT INTO ps_auths (id, tenant_id, auth_type, password, username) VALUES ('202-auth', 2, 'userpass', 'password202', '202');
INSERT INTO ps_aors (id, tenant_id, max_contacts) VALUES ('202', 2, 1);

-- Dialplan pour le Client B (permet aux utilisateurs de s'appeler)
INSERT INTO extensions (tenant_id, context, exten, priority, app, appdata) VALUES
(2, 'client-b-dialplan', '_2XX', 1, 'Dial', 'PJSIP/${EXTEN},20');