// ivr.service.ts
import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IvrMenu } from '../entities/ivr-menu.entity';
import { IvrOption } from '../entities/ivr-option.entity';
import { IvrCondition } from '../entities/ivr-condition.entity';
import { IvrDidMapping } from '../entities/ivr-did-mapping.entity';
import { CreateIvrMenuDto } from '../dto/create-ivr-menu.dto';
import { UpdateIvrMenuDto } from '../dto/update-ivr-menu.dto';
import { CreateIvrOptionDto } from '../dto/create-ivr-option.dto';
import { UpdateIvrOptionDto } from '../dto/update-ivr-option.dto';
import { CreateIvrConditionDto } from '../dto/create-ivr-condition.dto';
import { CreateDidMappingDto } from '../dto/create-did-mapping.dto';
import { UpdateDidMappingDto } from '../dto/update-did-mapping.dto';

@Injectable()
export class IvrService {
  constructor(
    @InjectRepository(IvrMenu)
    private menuRepo: Repository<IvrMenu>,
    @InjectRepository(IvrOption)
    private optionRepo: Repository<IvrOption>,
    @InjectRepository(IvrCondition)
    private conditionRepo: Repository<IvrCondition>,
    @InjectRepository(IvrDidMapping)
    private didMappingRepo: Repository<IvrDidMapping>,
  ) {}

  // ========== MENUS ==========

  /**
   * Créer un menu IVR
   */
  async createMenu(tenantId: number, dto: CreateIvrMenuDto): Promise<IvrMenu> {
    const menu = this.menuRepo.create({
      tenant_id: tenantId,
      name: dto.name,
      description: dto.description,
      welcome_sound: dto.welcome_sound,
      invalid_sound: dto.invalid_sound,
      timeout_sound: dto.timeout_sound,
      timeout: dto.timeout,
      max_retries: dto.max_retries,
      max_digits: dto.max_digits,
      timeout_action: dto.timeout_action as any,
      invalid_action: dto.invalid_action as any,
      is_active: dto.is_active,
    });

    return this.menuRepo.save(menu);
  }

  /**
   * Récupérer tous les menus d'un tenant
   */
  async findAllMenus(tenantId: number): Promise<IvrMenu[]> {
    return this.menuRepo.find({
      where: { tenant_id: tenantId },
      relations: ['options', 'conditions'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Récupérer un menu par ID
   */
  async findMenuById(id: number, tenantId: number): Promise<IvrMenu> {
    const menu = await this.menuRepo.findOne({
      where: { id, tenant_id: tenantId },
      relations: ['options', 'conditions'],
    });

    if (!menu) {
      throw new NotFoundException(`Menu IVR ${id} introuvable`);
    }

    return menu;
  }

  /**
   * Mettre à jour un menu
   */
  async updateMenu(
    id: number,
    tenantId: number,
    dto: UpdateIvrMenuDto,
  ): Promise<IvrMenu> {
    const menu = await this.findMenuById(id, tenantId);

    Object.assign(menu, dto);

    return this.menuRepo.save(menu);
  }

  /**
   * Supprimer un menu
   */
  async removeMenu(id: number, tenantId: number): Promise<void> {
    const menu = await this.findMenuById(id, tenantId);

    // Vérifier qu'aucun DID ne pointe vers ce menu
    const mappings = await this.didMappingRepo.count({
      where: { menu_id: id, tenant_id: tenantId },
    });

    if (mappings > 0) {
      throw new ConflictException(
        `Impossible de supprimer ce menu : ${mappings} DID(s) y sont associés`,
      );
    }

    await this.menuRepo.remove(menu);
  }

  /**
   * Dupliquer un menu
   */
  async duplicateMenu(
    menuId: number,
    tenantId: number,
    newName: string,
  ): Promise<IvrMenu> {
    const originalMenu = await this.findMenuById(menuId, tenantId);

    // Créer le nouveau menu (sans les relations)
    const newMenu = this.menuRepo.create({
      tenant_id: tenantId,
      name: newName,
      description: originalMenu.description
        ? `${originalMenu.description} (Copie)`
        : undefined,
      welcome_sound: originalMenu.welcome_sound,
      invalid_sound: originalMenu.invalid_sound,
      timeout_sound: originalMenu.timeout_sound,
      timeout: originalMenu.timeout,
      max_retries: originalMenu.max_retries,
      max_digits: originalMenu.max_digits,
      timeout_action: originalMenu.timeout_action as any,
      invalid_action: originalMenu.invalid_action as any,
      is_active: false, // Désactivé par défaut
    });

    const savedMenu = await this.menuRepo.save(newMenu);

    // Dupliquer les options
    const options = await this.optionRepo.find({
      where: { menu_id: menuId, tenant_id: tenantId },
    });

    for (const option of options) {
      const newOption = this.optionRepo.create({
        menu_id: savedMenu.id,
        tenant_id: tenantId,
        digit: option.digit,
        action: option.action as any,
        description: option.description,
        priority: option.priority,
        is_active: option.is_active,
      });
      await this.optionRepo.save(newOption);
    }

    // Dupliquer les conditions
    const conditions = await this.conditionRepo.find({
      where: { menu_id: menuId, tenant_id: tenantId },
    });

    for (const condition of conditions) {
      const newCondition = this.conditionRepo.create({
        menu_id: savedMenu.id,
        tenant_id: tenantId,
        condition_type: condition.condition_type,
        condition_config: condition.condition_config,
        action: condition.action as any,
        priority: condition.priority,
        is_active: condition.is_active,
      });
      await this.conditionRepo.save(newCondition);
    }

    return this.findMenuById(savedMenu.id, tenantId);
  }

  /**
   * Tester la configuration d'un menu
   */
  async testMenuConfiguration(
    menuId: number,
    tenantId: number,
    testData: { callerId?: string; did?: string; datetime?: string },
  ): Promise<any> {
    const menu = await this.findMenuById(menuId, tenantId);
    const options = await this.findOptionsByMenu(menuId, tenantId);
    const conditions = await this.findConditionsByMenu(menuId, tenantId);

    const context = {
      callerId: testData.callerId || '+1234567890',
      did: testData.did || '+22997123456',
      datetime: testData.datetime ? new Date(testData.datetime) : new Date(),
    };

    // Évaluer les conditions (logique simplifiée)
    let activeMenu = menu;
    for (const condition of conditions.filter((c) => c.is_active)) {
      // Simuler l'évaluation (sans l'orchestrateur)
      if (condition.condition_type === 'time') {
        const config = condition.condition_config;
        const hour = context.datetime.getHours();
        const day = context.datetime.getDay();

        if (
          config.days &&
          config.days.includes(day) &&
          config.start_time &&
          config.end_time
        ) {
          const [startH] = config.start_time.split(':').map(Number);
          const [endH] = config.end_time.split(':').map(Number);

          if (hour >= startH && hour <= endH) {
            const actionTarget = (condition.action as any).target;
            if (condition.action.type === 'submenu' && actionTarget) {
              activeMenu = await this.findMenuById(
                Number(actionTarget),
                tenantId,
              );
            }
          }
        }
      }
    }

    return {
      original_menu: {
        id: menu.id,
        name: menu.name,
      },
      evaluated_menu: {
        id: activeMenu.id,
        name: activeMenu.name,
      },
      conditions_matched: activeMenu.id !== menu.id,
      available_options: options
        .filter((opt) => opt.is_active)
        .map((opt) => ({
          digit: opt.digit,
          description: opt.description,
          action_type: opt.action.type,
          action_target: (opt.action as any).target || (opt.action as any).sounds,
        })),
      test_context: context,
    };
  }

  // ========== OPTIONS ==========

  /**
   * Ajouter une option à un menu
   */
  async addOption(
    menuId: number,
    tenantId: number,
    dto: CreateIvrOptionDto,
  ): Promise<IvrOption> {
    // Vérifier que le menu existe
    await this.findMenuById(menuId, tenantId);

    // Vérifier qu'aucune option active n'utilise déjà ce digit
    const existingOption = await this.optionRepo.findOne({
      where: {
        menu_id: menuId,
        tenant_id: tenantId,
        digit: dto.digit,
        is_active: true,
      },
    });

    if (existingOption) {
      throw new ConflictException(
        `Le digit "${dto.digit}" est déjà utilisé dans ce menu`,
      );
    }

    const option = this.optionRepo.create({
      menu_id: menuId,
      tenant_id: tenantId,
      digit: dto.digit,
      action: dto.action as any,
      description: dto.description,
      priority: dto.priority,
      is_active: dto.is_active,
    });

    return this.optionRepo.save(option);
  }

  /**
   * Récupérer toutes les options d'un menu
   */
  async findOptionsByMenu(menuId: number, tenantId: number): Promise<IvrOption[]> {
    return this.optionRepo.find({
      where: { menu_id: menuId, tenant_id: tenantId },
      order: { priority: 'ASC', digit: 'ASC' },
    });
  }

  /**
   * Trouver une option par digit
   */
  async findOptionByDigit(
    menuId: number,
    digit: string,
  ): Promise<IvrOption | null> {
    return this.optionRepo.findOne({
      where: { menu_id: menuId, digit, is_active: true },
    });
  }

  /**
   * Mettre à jour une option
   */
  async updateOption(
    optionId: number,
    tenantId: number,
    dto: UpdateIvrOptionDto,
  ): Promise<IvrOption> {
    const option = await this.optionRepo.findOne({
      where: { id: optionId, tenant_id: tenantId },
    });

    if (!option) {
      throw new NotFoundException(`Option IVR ${optionId} introuvable`);
    }

    // Si le digit change, vérifier qu'il n'est pas déjà utilisé
    if (dto.digit && dto.digit !== option.digit) {
      const existingOption = await this.optionRepo.findOne({
        where: {
          menu_id: option.menu_id,
          tenant_id: tenantId,
          digit: dto.digit,
          is_active: true,
        },
      });

      if (existingOption && existingOption.id !== optionId) {
        throw new ConflictException(
          `Le digit "${dto.digit}" est déjà utilisé dans ce menu`,
        );
      }
    }

    Object.assign(option, dto);

    return this.optionRepo.save(option);
  }

  /**
   * Supprimer une option
   */
  async removeOption(optionId: number, tenantId: number): Promise<void> {
    const option = await this.optionRepo.findOne({
      where: { id: optionId, tenant_id: tenantId },
    });

    if (!option) {
      throw new NotFoundException(`Option IVR ${optionId} introuvable`);
    }

    await this.optionRepo.remove(option);
  }

  // ========== CONDITIONS ==========

  /**
   * Ajouter une condition à un menu
   */
  async addCondition(
    menuId: number,
    tenantId: number,
    dto: CreateIvrConditionDto,
  ): Promise<IvrCondition> {
    // Vérifier que le menu existe
    await this.findMenuById(menuId, tenantId);

    const condition = this.conditionRepo.create({
      menu_id: menuId,
      tenant_id: tenantId,
      condition_type: dto.condition_type,
      condition_config: dto.condition_config,
      action: dto.action as any,
      priority: dto.priority,
      is_active: dto.is_active,
    });

    return this.conditionRepo.save(condition);
  }

  /**
   * Récupérer toutes les conditions d'un menu
   */
  async findConditionsByMenu(menuId: number, tenantId?: number): Promise<IvrCondition[]> {
    const where: any = { menu_id: menuId };
    if (tenantId) {
      where.tenant_id = tenantId;
    }
    return this.conditionRepo.find({
      where,
      order: { priority: 'ASC' },
    });
  }

  /**
   * Mettre à jour une condition
   */
  async updateCondition(
    conditionId: number,
    tenantId: number,
    dto: Partial<CreateIvrConditionDto>,
  ): Promise<IvrCondition> {
    const condition = await this.conditionRepo.findOne({
      where: { id: conditionId, tenant_id: tenantId },
    });

    if (!condition) {
      throw new NotFoundException(`Condition IVR ${conditionId} introuvable`);
    }

    Object.assign(condition, dto);

    return this.conditionRepo.save(condition);
  }

  /**
   * Supprimer une condition
   */
  async removeCondition(conditionId: number, tenantId: number): Promise<void> {
    const condition = await this.conditionRepo.findOne({
      where: { id: conditionId, tenant_id: tenantId },
    });

    if (!condition) {
      throw new NotFoundException(`Condition IVR ${conditionId} introuvable`);
    }

    await this.conditionRepo.remove(condition);
  }

  // ========== DID MAPPINGS ==========

  /**
   * Créer un mapping DID → Menu
   */
  async createDidMapping(
    tenantId: number,
    dto: CreateDidMappingDto,
  ): Promise<IvrDidMapping> {
    // Vérifier que le menu existe
    await this.findMenuById(Number(dto.menu_id), tenantId);

    // Vérifier qu'aucun mapping n'existe déjà pour ce DID
    const existing = await this.didMappingRepo.findOne({
      where: { tenant_id: tenantId, did: dto.did },
    });

    if (existing) {
      throw new ConflictException(
        `Le DID ${dto.did} est déjà associé à un menu IVR`,
      );
    }

    const mapping = this.didMappingRepo.create({
      tenant_id: tenantId,
      did: dto.did,
      menu_id: dto.menu_id,
      is_active: dto.is_active,
    });

    return this.didMappingRepo.save(mapping);
  }

  /**
   * Récupérer tous les mappings d'un tenant
   */
  async findAllDidMappings(tenantId: number): Promise<IvrDidMapping[]> {
    return this.didMappingRepo.find({
      where: { tenant_id: tenantId },
      relations: ['menu'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Trouver le mapping pour un DID
   */
  async findDidMapping(did: string, tenantId?: number): Promise<IvrDidMapping | null> {
    const where: any = { did, is_active: true };
    if (tenantId) {
      where.tenant_id = tenantId;
    }
    return this.didMappingRepo.findOne({
      where,
      relations: ['menu'],
    });
  }

  /**
   * Mettre à jour un mapping
   */
  async updateDidMapping(
    id: number,
    tenantId: number,
    dto: UpdateDidMappingDto,
  ): Promise<IvrDidMapping> {
    const mapping = await this.didMappingRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping DID ${id} introuvable`);
    }

    // Si le menu_id change, vérifier qu'il existe
    if (dto.menu_id) {
      await this.findMenuById(Number(dto.menu_id), tenantId);
    }

    Object.assign(mapping, dto);

    return this.didMappingRepo.save(mapping);
  }

  /**
   * Supprimer un mapping
   */
  async removeDidMapping(id: number, tenantId: number): Promise<void> {
    const mapping = await this.didMappingRepo.findOne({
      where: { id, tenant_id: tenantId },
    });

    if (!mapping) {
      throw new NotFoundException(`Mapping DID ${id} introuvable`);
    }

    await this.didMappingRepo.remove(mapping);
  }

  /**
 * Récupérer une option par son ID
 */
async findOptionById(optionId: number, tenantId: number): Promise<IvrOption> {
    const option = await this.optionRepo.findOne({
      where: { id: optionId, tenant_id: tenantId },
      relations: ['menu'],
    });
  
    if (!option) {
      throw new NotFoundException(`Option IVR ${optionId} introuvable`);
    }
  
    return option;
  }
  
  /**
   * Réorganiser les priorités de toutes les options d'un menu
   */
  async reorderOptions(
    menuId: number,
    tenantId: number,
    order: Array<{ optionId: number; priority: number }>,
  ): Promise<IvrOption[]> {
    await this.findMenuById(menuId, tenantId);
  
    // Mettre à jour toutes les priorités
    for (const item of order) {
      await this.optionRepo.update(
        { id: item.optionId, tenant_id: tenantId },
        { priority: item.priority },
      );
    }
  
    return this.findOptionsByMenu(menuId, tenantId);
  }
  
  /**
   * Activer/Désactiver une option
   */
  async toggleOption(optionId: number, tenantId: number): Promise<IvrOption> {
    const option = await this.findOptionById(optionId, tenantId);
    option.is_active = !option.is_active;
    return this.optionRepo.save(option);
  }
  
  /**
   * Valider qu'une action est valide
   */
  async validateAction(action: any, tenantId: number): Promise<boolean> {
    switch (action.type) {
      case 'queue':
        // Vérifier que la queue existe
        if (!action.target) return false;
        // TODO: Vérifier dans QueuesService
        return true;
  
      case 'endpoint':
        // Vérifier que l'endpoint existe
        if (!action.target) return false;
        // TODO: Vérifier dans EndpointsService
        return true;
  
      case 'submenu':
        // Vérifier que le sous-menu existe
        if (!action.target) return false;
        try {
          await this.findMenuById(action.target, tenantId);
          return true;
        } catch {
          return false;
        }
  
      case 'playback':
        // Vérifier que les fichiers audio existent
        if (!action.sounds || action.sounds.length === 0) return false;
        // TODO: Vérifier dans IvrAudioService
        return true;
  
      case 'hangup':
      case 'voicemail':
      case 'callback':
      case 'external_api':
        return true;
  
      default:
        return false;
    }
  }
}