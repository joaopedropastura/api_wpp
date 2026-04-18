import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBotConfigDto } from './dto/update-bot-config.dto';

@Injectable()
export class BusinessesService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBusinessDto) {
    return this.prisma.business.create({
      data: {
        userId,
        name: dto.name,
        type: dto.type,
        description: dto.description,
        botConfig: {
          create: {
            welcomeMessage: `Hi! I'm the virtual assistant for ${dto.name}. How can I help you?`,
            faq: [],
            isEnabled: false,
          },
        },
      },
      include: { botConfig: true },
    });
  }

  async findAllByUser(userId: string) {
    return this.prisma.business.findMany({
      where: { userId },
      include: {
        whatsapp: {
          select: {
            phoneNumber: true,
            isActive: true,
          },
        },
        botConfig: {
          select: { isEnabled: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const business = await this.prisma.business.findUnique({
      where: { id },
      include: {
        whatsapp: {
          select: {
            phoneNumber: true,
            isActive: true,
            createdAt: true,
          },
        },
        botConfig: true,
      },
    });

    if (!business) throw new NotFoundException('Business not found');
    if (business.userId !== userId) throw new ForbiddenException();

    return business;
  }

  async updateBotConfig(
    businessId: string,
    userId: string,
    dto: UpdateBotConfigDto,
  ) {
    await this.findOne(businessId, userId);

    return this.prisma.botConfig.update({
      where: { businessId },
      data: {
        ...(dto.welcomeMessage !== undefined && {
          welcomeMessage: dto.welcomeMessage,
        }),
        ...(dto.faq !== undefined && {
          faq: dto.faq as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.workingHours !== undefined && {
          workingHours: dto.workingHours as unknown as Prisma.InputJsonValue,
        }),
        ...(dto.isEnabled !== undefined && { isEnabled: dto.isEnabled }),
      },
    });
  }
}
