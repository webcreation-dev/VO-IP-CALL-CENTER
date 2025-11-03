// migrations/XXXXXX-create-ivr-tables.ts
import { MigrationInterface, QueryRunner, Table, TableForeignKey } from 'typeorm';

export class CreateIvrTables1234567890 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Table ivr_menus
    await queryRunner.createTable(
      new Table({
        name: 'ivr_menus',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'welcome_sound',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'invalid_sound',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'timeout_sound',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'timeout',
            type: 'int',
            default: 5,
          },
          {
            name: 'max_retries',
            type: 'int',
            default: 3,
          },
          {
            name: 'max_digits',
            type: 'int',
            default: 1,
          },
          {
            name: 'timeout_action',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'invalid_action',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
          {
            name: 'updated_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Index sur tenant_id
    await queryRunner.query(
      `CREATE INDEX idx_ivr_menus_tenant_id ON ivr_menus(tenant_id)`,
    );

    // Foreign key vers tenants
    await queryRunner.createForeignKey(
      'ivr_menus',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );

    // Table ivr_options
    await queryRunner.createTable(
      new Table({
        name: 'ivr_options',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'menu_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'digit',
            type: 'varchar',
            length: '1',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'description',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'priority',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Index et contraintes
    await queryRunner.query(
      `CREATE INDEX idx_ivr_options_menu_id ON ivr_options(menu_id)`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_ivr_options_menu_digit ON ivr_options(menu_id, digit) WHERE is_active = true`,
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'ivr_options',
      new TableForeignKey({
        columnNames: ['menu_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'ivr_menus',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ivr_options',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );

    // Table ivr_conditions
    await queryRunner.createTable(
      new Table({
        name: 'ivr_conditions',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'menu_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'condition_type',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'condition_config',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'jsonb',
            isNullable: false,
          },
          {
            name: 'priority',
            type: 'int',
            default: 0,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE INDEX idx_ivr_conditions_menu_id ON ivr_conditions(menu_id)`,
    );

    await queryRunner.createForeignKey(
      'ivr_conditions',
      new TableForeignKey({
        columnNames: ['menu_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'ivr_menus',
        onDelete: 'CASCADE',
      }),
    );

    // Table ivr_did_mappings
    await queryRunner.createTable(
      new Table({
        name: 'ivr_did_mappings',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'did',
            type: 'varchar',
            length: '50',
            isNullable: false,
          },
          {
            name: 'menu_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'is_active',
            type: 'boolean',
            default: true,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    // Index et contrainte unique
    await queryRunner.query(
      `CREATE UNIQUE INDEX idx_ivr_did_mappings_tenant_did ON ivr_did_mappings(tenant_id, did)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_ivr_did_mappings_menu_id ON ivr_did_mappings(menu_id)`,
    );

    // Foreign keys
    await queryRunner.createForeignKey(
      'ivr_did_mappings',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'ivr_did_mappings',
      new TableForeignKey({
        columnNames: ['menu_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'ivr_menus',
        onDelete: 'RESTRICT',
      }),
    );

    // Table ivr_audio_files
    await queryRunner.createTable(
      new Table({
        name: 'ivr_audio_files',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'filename',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'filepath',
            type: 'varchar',
            length: '500',
            isNullable: false,
          },
          {
            name: 'format',
            type: 'varchar',
            length: '10',
            isNullable: false,
          },
          {
            name: 'duration',
            type: 'float',
            default: 0,
          },
          {
            name: 'language',
            type: 'varchar',
            length: '10',
            isNullable: true,
          },
          {
            name: 'filesize',
            type: 'bigint',
            default: 0,
          },
          {
            name: 'created_at',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
          },
        ],
      }),
      true,
    );

    await queryRunner.query(
      `CREATE INDEX idx_ivr_audio_files_tenant_id ON ivr_audio_files(tenant_id)`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_ivr_audio_files_language ON ivr_audio_files(language)`,
    );

    await queryRunner.createForeignKey(
      'ivr_audio_files',
      new TableForeignKey({
        columnNames: ['tenant_id'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('ivr_audio_files');
    await queryRunner.dropTable('ivr_did_mappings');
    await queryRunner.dropTable('ivr_conditions');
    await queryRunner.dropTable('ivr_options');
    await queryRunner.dropTable('ivr_menus');
  }
}