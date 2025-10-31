import { MigrationInterface, QueryRunner, Table } from 'typeorm';

export class CreateRecordingsTable1730000005 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'recordings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'integer',
            isNullable: false,
          },
          {
            name: 'call_id',
            type: 'varchar',
            length: '32',
            isNullable: false,
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'file_path',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'format',
            type: 'varchar',
            length: '10',
            default: "'wav'",
          },
          {
            name: 'duration',
            type: 'integer',
            default: 0,
          },
          {
            name: 'file_size',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'src',
            type: 'varchar',
            length: '80',
            isNullable: true,
          },
          {
            name: 'dst',
            type: 'varchar',
            length: '80',
            isNullable: true,
          },
          {
            name: 'recorded_by',
            type: 'varchar',
            length: '100',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'is_deleted',
            type: 'boolean',
            default: false,
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.query(
      `CREATE INDEX idx_recordings_tenant_created ON recordings (tenant_id, created_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_recordings_tenant_call_id ON recordings (tenant_id, call_id)`,
    );

    // Ensure uuid-ossp extension is enabled for uuid_generate_v4()
    await queryRunner.query(
      `CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recordings_tenant_created`);
    await queryRunner.query(`DROP INDEX IF EXISTS idx_recordings_tenant_call_id`);
    await queryRunner.dropTable('recordings');
  }
}
