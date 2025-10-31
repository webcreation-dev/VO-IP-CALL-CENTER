import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';

import { Cdr } from './entities/cdr.entity';
import { CdrFilterDto, CdrStatsDto } from './dto';

@Injectable()
export class CdrService {
  private readonly logger = new Logger(CdrService.name);

  constructor(
    @InjectRepository(Cdr)
    private readonly cdrRepository: Repository<Cdr>,
  ) {}

  /**
   * Find all CDR records with filtering and pagination
   */
  async findAll(
    tenantId: number,
    filter: CdrFilterDto,
  ): Promise<{ data: Cdr[]; total: number; page: number; limit: number }> {
    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.cdrRepository
      .createQueryBuilder('cdr')
      .where('cdr.tenantId = :tenantId', { tenantId });

    // Apply filters
    if (filter.src) {
      queryBuilder.andWhere('cdr.src LIKE :src', { src: `%${filter.src}%` });
    }

    if (filter.dst) {
      queryBuilder.andWhere('cdr.dst LIKE :dst', { dst: `%${filter.dst}%` });
    }

    if (filter.disposition) {
      queryBuilder.andWhere('cdr.disposition = :disposition', {
        disposition: filter.disposition,
      });
    }

    if (filter.startDate && filter.endDate) {
      queryBuilder.andWhere('cdr.calldate BETWEEN :startDate AND :endDate', {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    } else if (filter.startDate) {
      queryBuilder.andWhere('cdr.calldate >= :startDate', {
        startDate: filter.startDate,
      });
    } else if (filter.endDate) {
      queryBuilder.andWhere('cdr.calldate <= :endDate', {
        endDate: filter.endDate,
      });
    }

    if (filter.minDuration !== undefined) {
      queryBuilder.andWhere('cdr.duration >= :minDuration', {
        minDuration: filter.minDuration,
      });
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Get paginated data
    const data = await queryBuilder
      .orderBy('cdr.calldate', 'DESC')
      .skip(skip)
      .take(limit)
      .getMany();

    this.logger.log(`Found ${total} CDR records for tenant ${tenantId}`);

    return {
      data,
      total,
      page,
      limit,
    };
  }

  /**
   * Find a single CDR record by ID
   */
  async findOne(tenantId: number, id: number): Promise<Cdr | null> {
    return await this.cdrRepository.findOne({
      where: { id, tenantId },
    });
  }

  /**
   * Get CDR statistics for a tenant
   */
  async getStats(tenantId: number, filter: CdrFilterDto): Promise<CdrStatsDto> {
    const queryBuilder = this.cdrRepository
      .createQueryBuilder('cdr')
      .where('cdr.tenantId = :tenantId', { tenantId });

    // Apply date filters if provided
    if (filter.startDate && filter.endDate) {
      queryBuilder.andWhere('cdr.calldate BETWEEN :startDate AND :endDate', {
        startDate: filter.startDate,
        endDate: filter.endDate,
      });
    } else if (filter.startDate) {
      queryBuilder.andWhere('cdr.calldate >= :startDate', {
        startDate: filter.startDate,
      });
    } else if (filter.endDate) {
      queryBuilder.andWhere('cdr.calldate <= :endDate', {
        endDate: filter.endDate,
      });
    }

    const [totalCalls, answeredCalls, avgResult, totalBillsecResult] =
      await Promise.all([
        // Total calls
        queryBuilder.getCount(),

        // Answered calls
        this.cdrRepository
          .createQueryBuilder('cdr')
          .where('cdr.tenantId = :tenantId', { tenantId })
          .andWhere('cdr.disposition = :disposition', {
            disposition: 'ANSWERED',
          })
          .getCount(),

        // Average duration
        queryBuilder
          .select('AVG(cdr.duration)', 'avgDuration')
          .getRawOne(),

        // Total billsec
        queryBuilder
          .select('SUM(cdr.billsec)', 'totalBillsec')
          .getRawOne(),
      ]);

    const missedCalls = totalCalls - answeredCalls;
    const avgDuration = parseFloat(avgResult?.avgDuration || '0');
    const totalBillsec = parseInt(totalBillsecResult?.totalBillsec || '0', 10);
    const answerRate =
      totalCalls > 0 ? (answeredCalls / totalCalls) * 100 : 0;

    return {
      totalCalls,
      answeredCalls,
      missedCalls,
      avgDuration: Math.round(avgDuration * 100) / 100,
      totalBillsec,
      answerRate: Math.round(answerRate * 100) / 100,
    };
  }

  /**
   * Export CDR records to CSV format
   */
  async exportToCsv(tenantId: number, filter: CdrFilterDto): Promise<string> {
    const { data } = await this.findAll(tenantId, {
      ...filter,
      limit: 10000, // Max records for export
    });

    // CSV header
    const headers = [
      'ID',
      'Call Date',
      'Caller ID',
      'Source',
      'Destination',
      'Context',
      'Channel',
      'Dst Channel',
      'Last App',
      'Last Data',
      'Duration',
      'Bill Sec',
      'Disposition',
      'Account Code',
      'Unique ID',
    ];

    const csvRows = [headers.join(',')];

    // Add data rows
    for (const record of data) {
      const row = [
        record.id,
        record.calldate.toISOString(),
        `"${record.clid}"`,
        record.src,
        record.dst,
        record.dcontext,
        `"${record.channel}"`,
        `"${record.dstchannel}"`,
        record.lastapp,
        `"${record.lastdata}"`,
        record.duration,
        record.billsec,
        record.disposition,
        record.accountcode,
        record.uniqueid,
      ];
      csvRows.push(row.join(','));
    }

    this.logger.log(`Exported ${data.length} CDR records to CSV`);

    return csvRows.join('\n');
  }
}
