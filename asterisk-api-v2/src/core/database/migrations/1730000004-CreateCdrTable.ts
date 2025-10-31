import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateCdrTable1730000004 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // CDR table may already exist from Asterisk, so we check first
    const tableExists = await queryRunner.hasTable('cdr');

    if (!tableExists) {
      await queryRunner.createTable(
        new Table({
          name: 'cdr',
          columns: [
            {
              name: 'id',
              type: 'serial',
              isPrimary: true,
            },
            {
              name: 'tenant_id',
              type: 'integer',
              isNullable: true,
            },
            {
              name: 'calldate',
              type: 'timestamp',
              default: 'CURRENT_TIMESTAMP',
            },
            {
              name: 'clid',
              type: 'varchar',
              length: '80',
              default: "''",
            },
            {
              name: 'src',
              type: 'varchar',
              length: '80',
              default: "''",
            },
            {
              name: 'dst',
              type: 'varchar',
              length: '80',
              default: "''",
            },
            {
              name: 'dcontext',
              type: 'varchar',
              length: '80',
              default: "''",
            },
            {
              name: 'channel',
              type: 'varchar',
              length: '80',
              default: "''",
            },
            {
              name: 'dstchannel',
              type: 'varchar',
              length: '80',
              default: "''",
            },
            {
              name: 'lastapp',
              type: 'varchar',
              length: '80',
              default: "''",
            },
            {
              name: 'lastdata',
              type: 'varchar',
              length: '80',
              default: "''",
            },
            {
              name: 'duration',
              type: 'integer',
              default: 0,
            },
            {
              name: 'billsec',
              type: 'integer',
              default: 0,
            },
            {
              name: 'disposition',
              type: 'varchar',
              length: '45',
              default: "''",
            },
            {
              name: 'amaflags',
              type: 'integer',
              default: 0,
            },
            {
              name: 'accountcode',
              type: 'varchar',
              length: '50',
              default: "''",
            },
            {
              name: 'uniqueid',
              type: 'varchar',
              length: '32',
              default: "''",
            },
            {
              name: 'userfield',
              type: 'varchar',
              length: '150',
              default: "''",
            },
            {
              name: 'peeraccount',
              type: 'varchar',
              length: '32',
              isNullable: true,
            },
            {
              name: 'linkedid',
              type: 'varchar',
              length: '32',
              isNullable: true,
            },
            {
              name: 'sequence',
              type: 'integer',
              isNullable: true,
            },
          ],
        }),
        true,
      );
    } else {
      // Table exists, check if tenant_id column exists, add if not
      const hasColumn = await queryRunner.hasColumn('cdr', 'tenant_id');
      if (!hasColumn) {
        await queryRunner.query(
          `ALTER TABLE cdr ADD COLUMN tenant_id INTEGER`,
        );
      }
    }

    // Create indexes for better query performance
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cdr_tenant_calldate ON cdr (tenant_id, calldate)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cdr_tenant_src ON cdr (tenant_id, src)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cdr_tenant_dst ON cdr (tenant_id, dst)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cdr_tenant_disposition ON cdr (tenant_id, disposition)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cdr_tenant_calldate`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cdr_tenant_src`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cdr_tenant_dst`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_cdr_tenant_disposition`);

    // Note: We don't drop the table as it may be managed by Asterisk
    // Only remove tenant_id column if it was added
    const hasColumn = await queryRunner.hasColumn('cdr', 'tenant_id');
    if (hasColumn) {
      await queryRunner.query(`ALTER TABLE cdr DROP COLUMN tenant_id`);
    }
  }
}
