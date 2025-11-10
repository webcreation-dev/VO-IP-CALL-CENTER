import { MigrationInterface, QueryRunner } from "typeorm";
import * as fs from 'fs';
import * as path from 'path';

/**
 * Migration pour importer les presets JSON existants dans la base de données
 *
 * Lit tous les fichiers .json dans src/roles/presets/ et les insère dans
 * les tables role_presets et role_preset_roles
 */
export class MigratePresetsJsonToDB1731250000001 implements MigrationInterface {
    name = 'MigratePresetsJsonToDB1731250000001'

    public async up(queryRunner: QueryRunner): Promise<void> {
        const presetsDir = path.join(__dirname, '../../../roles/presets');

        // Vérifier que le dossier existe
        if (!fs.existsSync(presetsDir)) {
            console.log('⚠️  Presets directory not found, skipping JSON migration');
            return;
        }

        // Lire tous les fichiers .json
        const files = fs.readdirSync(presetsDir).filter(file => file.endsWith('.json'));

        if (files.length === 0) {
            console.log('⚠️  No JSON preset files found, skipping migration');
            return;
        }

        console.log(`📦 Migrating ${files.length} preset(s) from JSON to database...`);

        for (const file of files) {
            const filePath = path.join(presetsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const preset = JSON.parse(content);

            // Insérer le preset
            const presetResult = await queryRunner.query(`
                INSERT INTO "role_presets"
                    ("preset_id", "name", "description", "is_active", "created_at", "updated_at")
                VALUES
                    ($1, $2, $3, true, NOW(), NOW())
                ON CONFLICT ("preset_id") DO NOTHING
                RETURNING "id"
            `, [preset.id, preset.name, preset.description]);

            if (presetResult.length === 0) {
                console.log(`⏭️  Preset "${preset.id}" already exists, skipping...`);
                continue;
            }

            const presetId = presetResult[0].id;
            console.log(`✅ Inserted preset "${preset.name}" (ID: ${presetId})`);

            // Insérer les rôles du preset
            let sortOrder = 0;
            for (const role of preset.roles) {
                await queryRunner.query(`
                    INSERT INTO "role_preset_roles"
                        ("preset_id", "name", "display_name", "description", "level",
                         "can_call_same_level", "can_call_lower_level", "can_call_higher_level", "sort_order")
                    VALUES
                        ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                `, [
                    presetId,
                    role.name,
                    role.displayName,
                    role.description || null,
                    role.level,
                    role.canCallSameLevel ?? true,
                    role.canCallLowerLevel ?? false,
                    role.canCallHigherLevel ?? false,
                    sortOrder++
                ]);

                console.log(`   ↳ Added role "${role.displayName}" (level ${role.level})`);
            }
        }

        console.log('✅ Preset migration completed successfully!');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Supprimer les presets migrés depuis JSON
        // On identifie les presets migrés par leurs preset_id qui correspondent aux noms de fichiers
        const presetsDir = path.join(__dirname, '../../../roles/presets');

        if (!fs.existsSync(presetsDir)) {
            console.log('⚠️  Presets directory not found, skipping rollback');
            return;
        }

        const files = fs.readdirSync(presetsDir).filter(file => file.endsWith('.json'));

        for (const file of files) {
            const filePath = path.join(presetsDir, file);
            const content = fs.readFileSync(filePath, 'utf-8');
            const preset = JSON.parse(content);

            await queryRunner.query(`
                DELETE FROM "role_presets" WHERE "preset_id" = $1
            `, [preset.id]);

            console.log(`🗑️  Deleted preset "${preset.name}"`);
        }

        console.log('✅ Preset rollback completed');
    }
}
