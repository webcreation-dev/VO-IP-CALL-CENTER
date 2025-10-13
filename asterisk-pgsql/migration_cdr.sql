-- Migration : Ajout de la table CDR avec support multi-tenant
-- À exécuter sur la base de données existante

BEGIN;

-- Vérifier si la table cdr existe déjà
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'cdr') THEN
        -- Créer la table CDR
        CREATE TABLE cdr (
            id BIGSERIAL PRIMARY KEY,
            tenant_id INTEGER REFERENCES tenants(id) ON DELETE CASCADE,
            accountcode VARCHAR(80),
            src VARCHAR(80),
            dst VARCHAR(80),
            dcontext VARCHAR(80),
            clid VARCHAR(80),
            channel VARCHAR(80),
            dstchannel VARCHAR(80),
            lastapp VARCHAR(80),
            lastdata VARCHAR(80),
            calldate TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            answerdate TIMESTAMP WITH TIME ZONE,
            enddate TIMESTAMP WITH TIME ZONE,
            duration INTEGER DEFAULT 0,
            billsec INTEGER DEFAULT 0,
            disposition VARCHAR(45),
            amaflags VARCHAR(45),
            uniqueid VARCHAR(150),
            userfield VARCHAR(255),
            peeraccount VARCHAR(80),
            linkedid VARCHAR(150),
            sequence INTEGER
        );

        -- Créer les index pour performance
        CREATE INDEX cdr_tenant_id ON cdr (tenant_id);
        CREATE INDEX cdr_calldate ON cdr (calldate);
        CREATE INDEX cdr_uniqueid ON cdr (uniqueid);
        CREATE INDEX cdr_linkedid ON cdr (linkedid);
        CREATE INDEX cdr_accountcode ON cdr (accountcode);
        CREATE INDEX cdr_tenant_calldate ON cdr (tenant_id, calldate);

        RAISE NOTICE 'Table CDR créée avec succès';
    ELSE
        RAISE NOTICE 'Table CDR existe déjà';
    END IF;
END $$;

-- Mettre à jour la version d'alembic si elle existe
UPDATE alembic_version SET version_num='cdr_realtime_tenant' WHERE version_num = 'fbb7766f17bc';

COMMIT;

