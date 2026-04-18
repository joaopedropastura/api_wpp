import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppApiService } from './whatsapp-api.service';
import { EncryptionService } from './encryption.service';
import { ConnectWhatsAppDto } from './dto/connect-whatsapp.dto';
import { isAxiosError } from 'axios';

interface IncomingMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  contacts?: Array<{ profile: { name: string } }>;
}

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        metadata: { phone_number_id: string };
        messages?: IncomingMessage[];
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      };
    }>;
  }>;
}

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappApi: WhatsAppApiService,
    private encryption: EncryptionService,
  ) {}

  verifyWebhook(mode: string, token: string, challenge: string): string {
    const verifyToken = process.env.WEBHOOK_VERIFY_TOKEN;
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge;
    }
    throw new BadRequestException('Invalid webhook verification');
  }

  validateSignature(rawBody: Buffer, signature: string): boolean {
    const appSecret = process.env.META_APP_SECRET ?? '';
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');
    return crypto.timingSafeEqual(
      Buffer.from(`sha256=${expected}`),
      Buffer.from(signature),
    );
  }

  async processWebhook(payload: WebhookPayload): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { metadata, messages, contacts } = change.value;
        if (!messages?.length) continue;

        for (const message of messages) {
          if (message.type !== 'text' || !message.text?.body) continue;

          const customerName = contacts?.[0]?.profile?.name;

          await this.handleIncomingMessage({
            phoneNumberId: metadata.phone_number_id,
            from: message.from,
            wamid: message.id,
            text: message.text.body,
            customerName,
          });
        }
      }
    }
  }

  private async handleIncomingMessage(params: {
    phoneNumberId: string;
    from: string;
    wamid: string;
    text: string;
    customerName?: string;
  }): Promise<void> {
    const { phoneNumberId, from, wamid, text, customerName } = params;

    const whatsappAccount = await this.prisma.whatsAppAccount.findFirst({
      where: { phoneNumberId, isActive: true },
      include: {
        business: {
          include: { botConfig: true },
        },
      },
    });

    if (!whatsappAccount) {
      this.logger.warn(`No active account for phoneNumberId: ${phoneNumberId}`);
      return;
    }

    const { business } = whatsappAccount;
    const botConfig = business.botConfig;

    if (!botConfig?.isEnabled) return;

    const existingMessage = await this.prisma.message.findUnique({
      where: { wamid },
    });
    if (existingMessage) return;

    const conversation = await this.prisma.conversation.upsert({
      where: {
        businessId_customerPhone: {
          businessId: business.id,
          customerPhone: from,
        },
      },
      create: { businessId: business.id, customerPhone: from, customerName },
      update: {
        lastMessageAt: new Date(),
        ...(customerName && { customerName }),
      },
    });

    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'customer',
        content: text,
        wamid,
      },
    });

    const accessToken = this.encryption.decrypt(whatsappAccount.accessToken);

    // Emit event for bot to process asynchronously
    // BotService listens and sends the reply
    this.logger.log(
      `Message received from ${from} for business ${business.id}`,
    );

    // Store context for BotService to pick up
    await this.emitForBotProcessing({
      conversationId: conversation.id,
      businessId: business.id,
      phoneNumberId,
      accessToken,
      customerPhone: from,
    });

    await this.whatsappApi.markMessageAsRead(phoneNumberId, accessToken, wamid);
  }

  // This method is called by BotService after generating the reply
  async sendBotReply(
    conversationId: string,
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string,
  ): Promise<void> {
    await this.whatsappApi.sendTextMessage(
      phoneNumberId,
      accessToken,
      to,
      text,
    );

    await this.prisma.message.create({
      data: {
        conversationId,
        role: 'bot',
        content: text,
      },
    });
  }

  private async emitForBotProcessing(params: {
    conversationId: string;
    businessId: string;
    phoneNumberId: string;
    accessToken: string;
    customerPhone: string;
  }): Promise<void> {
    // This will be called by BotService via direct injection
    // Kept as a hook point for future event-driven architecture
    this.logger.debug(
      `Bot processing queued for conversation ${params.conversationId}`,
    );
  }

  async connectWhatsApp(userId: string, dto: ConnectWhatsAppDto) {
    const business = await this.prisma.business.findFirst({
      where: { id: dto.businessId, userId },
    });

    if (!business) throw new NotFoundException('Business not found');

    const { accessToken } = await this.whatsappApi.exchangeCodeForToken(
      dto.code,
      dto.redirectUri,
    );

    try {
      const { wabaId, phoneNumberId, phoneNumber } =
        await this.whatsappApi.discoverWaba(accessToken);

      const encryptedToken = this.encryption.encrypt(accessToken);

      const account = await this.prisma.whatsAppAccount.upsert({
        where: { businessId: dto.businessId },
        create: {
          businessId: dto.businessId,
          wabaId,
          phoneNumberId,
          accessToken: encryptedToken,
          phoneNumber,
          isActive: true,
        },
        update: {
          wabaId,
          phoneNumberId,
          accessToken: encryptedToken,
          phoneNumber,
          isActive: true,
        },
      });

      return {
        phoneNumber: account.phoneNumber,
        isActive: account.isActive,
      };
    } catch (err) {
      if (isAxiosError(err)) {
        console.log(err.response?.data || err.message);
      }
      throw new BadRequestException('Failed to connect WhatsApp account');
    }
  }
}
