-- =============================================================
-- SIP TRUNK UNIDIRECTIONNEL — Configuration PJSIP via PostgreSQL
-- =============================================================
-- Projet : VO-IP-CALL-CENTER (webcreation-dev)
-- Architecture : Asterisk + PostgreSQL (PJSIP realtime)
--
-- AVANT D'EXECUTER : remplacez IP_SERVEUR_B par l'IP de l'autre serveur
--
-- Flux :
--   Vos endpoints (1XX) s'enregistrent chez vous
--   -> appellent un 2XX
--   -> votre serveur route via le trunk
--   -> l'autre serveur fait sonner l'extension 2XX
--
-- =============================================================


-- =============================================================
-- PARTIE 1 : A EXECUTER SUR VOTRE SERVEUR (extensions 1XX)
-- =============================================================

-- 1/2 — AOR : ou envoyer les appels (adresse IP du serveur distant)
INSERT INTO ps_aors (id, contact, qualify_frequency)
VALUES (
    'trunk_serveur_b',
    'sip:IP_SERVEUR_B:5060',
    60
);

-- 2/2 — ENDPOINT : declarer le trunk sortant
--       auth = NULL car pas d'authentification requise pour les appels sortants
--       context = 'from-trunk-serveur-b' pour les eventuels appels entrants (non utilise ici)
INSERT INTO ps_endpoints (
    id,
    aors,
    auth,
    context,
    allow,
    direct_media,
    trust_id_inbound,
    send_pai
)
VALUES (
    'trunk_serveur_b',
    'trunk_serveur_b',
    NULL,
    'from-trunk-serveur-b',
    'ulaw,alaw,g722',
    'no',
    'yes',
    'yes'
);

-- NOTE : Pas besoin de ps_identifies car vous n'acceptez pas d'appels entrants du trunk
-- Le routage des appels _2XX est configure dans extensions.conf


-- =============================================================
-- PARTIE 2 : INFORMATIONS A COMMUNIQUER A L'AUTRE PERSONNE
-- =============================================================
--
-- Donnez-lui ces informations :
--   - Votre adresse IP : XXX.XXX.XXX.XXX
--   - Port SIP : 5060
--   - Protocole : UDP
--   - Codecs : ulaw, alaw, g722
--
-- =============================================================


-- =============================================================
-- PARTIE 3 : CE QUE L'AUTRE PERSONNE DOIT CONFIGURER CHEZ LUI
-- =============================================================
-- (A titre de reference - a executer sur le serveur distant)

-- 1/3 — AOR (optionnel, pas de contact car vous initiez les appels)
-- INSERT INTO ps_aors (id, qualify_frequency)
-- VALUES ('trunk_depuis_vous', 60);

-- 2/3 — ENDPOINT pour recevoir vos appels
-- INSERT INTO ps_endpoints (id, aors, auth, context, allow, direct_media, trust_id_inbound, send_pai)
-- VALUES ('trunk_depuis_vous', 'trunk_depuis_vous', NULL, 'appels-entrants-trunk', 'ulaw,alaw,g722', 'no', 'yes', 'yes');

-- 3/3 — IDENTIFY : reconnaitre les appels venant de votre IP
-- INSERT INTO ps_identifies (id, endpoint, match)
-- VALUES ('identify_vous', 'trunk_depuis_vous', 'VOTRE_IP_ICI');

-- DIALPLAN chez l'autre :
-- [appels-entrants-trunk]
-- exten => _2XX,1,Dial(PJSIP/${EXTEN},20)


-- =============================================================
-- VERIFICATION — CLI Asterisk (apres pjsip reload)
-- =============================================================
--
--  Entrer dans le conteneur :
--    docker exec -it <nom_du_conteneur_asterisk> asterisk -rvvv
--
--  Commandes a taper dans le CLI :
--    pjsip reload
--    pjsip show endpoint trunk_serveur_b
--    pjsip qualify trunk_serveur_b
--
--  Resultat attendu :
--    Contact trunk_serveur_b/sip:IP_SERVEUR_B:5060   Status: Reachable
--
--  Tester un appel depuis le CLI :
--    channel originate PJSIP/101 application Dial PJSIP/201@trunk_serveur_b
-- =============================================================
