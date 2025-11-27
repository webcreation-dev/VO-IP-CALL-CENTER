import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTrunkRoutingFields1731260000000 implements MigrationInterface {
    name = 'AddTrunkRoutingFields1731260000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add routing configuration columns to sip_trunks table
        await queryRunner.query(`
            ALTER TABLE "sip_trunks"
            ADD COLUMN "destination_type" character varying(20),
            ADD COLUMN "destination_id" character varying(100),
            ADD COLUMN "did_pattern" character varying(100) DEFAULT '_X.'
        `);

        // Add comment to explain the purpose
        await queryRunner.query(`
            COMMENT ON COLUMN "sip_trunks"."destination_type"
            IS 'Type of destination for incoming calls: queue, extension, ivr, etc.'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "sip_trunks"."destination_id"
            IS 'ID or name of the destination (queue name, extension number, etc.)'
        `);

        await queryRunner.query(`
            COMMENT ON COLUMN "sip_trunks"."did_pattern"
            IS 'DID pattern to match incoming calls (default: _X. matches all)'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Remove the routing configuration columns
        await queryRunner.query(`
            ALTER TABLE "sip_trunks"
            DROP COLUMN "did_pattern",
            DROP COLUMN "destination_id",
            DROP COLUMN "destination_type"
        `);
    }
}
