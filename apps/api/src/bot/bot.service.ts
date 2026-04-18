import { Injectable, Logger, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WhatsAppApiService } from '../whatsapp/whatsapp-api.service';
import { EncryptionService } from '../whatsapp/encryption.service';
import type { AiProvider, AiMessage, FaqItem, WorkingHours } from '@repo/types';

const CONVERSATION_HISTORY_LIMIT = 10;

interface WebhookPayload {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        metadata: { phone_number_id: string };
        messages?: Array<{
          from: string;
          id: string;
          type: string;
          text?: { body: string };
        }>;
        contacts?: Array<{ profile: { name: string }; wa_id: string }>;
      };
    }>;
  }>;
}

@Injectable()
export class BotService {
  private readonly logger = new Logger(BotService.name);

  constructor(
    private prisma: PrismaService,
    private whatsappApi: WhatsAppApiService,
    private encryption: EncryptionService,
    @Inject('AI_PROVIDER') private aiProvider: AiProvider,
  ) {}

  async handleWebhook(payload: WebhookPayload): Promise<void> {
    for (const entry of payload.entry) {
      for (const change of entry.changes) {
        const { metadata, messages, contacts } = change.value;
        if (!messages?.length) continue;

        for (const message of messages) {
          if (message.type !== 'text' || !message.text?.body) continue;

          await this.processMessage({
            phoneNumberId: metadata.phone_number_id,
            from: message.from,
            wamid: message.id,
            text: message.text.body,
            customerName: contacts?.[0]?.profile?.name,
          });
        }
      }
    }
  }

  private async processMessage(params: {
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

    // Prevent duplicate processing
    const existingMessage = await this.prisma.message.findUnique({
      where: { wamid },
    });
    if (existingMessage) return;

    const accessToken = this.encryption.decrypt(whatsappAccount.accessToken);

    // Upsert conversation
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

    // Save incoming message
    await this.prisma.message.create({
      data: {
        conversationId: conversation.id,
        role: 'customer',
        content: text,
        wamid,
      },
    });

    // Mark as read
    await this.whatsappApi
      .markMessageAsRead(phoneNumberId, accessToken, wamid)
      .catch(() => {});

    // Check working hours
    if (!this.isWithinWorkingHours(botConfig.workingHours as WorkingHours | null)) {
      const offlineMsg =
        'We are currently outside of our business hours. We will get back to you as soon as possible!';
      await this.sendAndSaveReply(
        conversation.id,
        phoneNumberId,
        accessToken,
        from,
        offlineMsg,
      );
      return;
    }

    // Build conversation history
    const history = await this.prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: CONVERSATION_HISTORY_LIMIT,
    });

    const aiMessages: AiMessage[] = history.map((m) => ({
      role: (m.role === 'customer' ? 'user' : 'assistant') as AiMessage['role'],
      content: m.content,
    }));

    const systemPrompt = this.buildSystemPrompt(
      business.name,
      business.description,
      botConfig.faq as unknown as FaqItem[],
    );

    // Generate AI response
    const reply = await this.aiProvider.chat(aiMessages, systemPrompt);

    await this.sendAndSaveReply(
      conversation.id,
      phoneNumberId,
      accessToken,
      from,
      reply,
    );
  }

  private async sendAndSaveReply(
    conversationId: string,
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string,
  ): Promise<void> {
    await this.whatsappApi.sendTextMessage(phoneNumberId, accessToken, to, text);

    await this.prisma.message.create({
      data: { conversationId, role: 'bot', content: text },
    });
  }

  private buildSystemPrompt(
    businessName: string,
    description: string,
    faq: FaqItem[],
  ): string {
    const faqSection =
      faq.length > 0
        ? `\n\nFrequently Asked Questions:\n${faq.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join('\n\n')}`
        : '';

    return `You are a helpful virtual assistant for ${businessName}.

About the business: ${description}${faqSection}

Instructions:
- Answer questions about the business based on the information above.
- Be friendly, concise, and professional.
- If you don't know the answer, say so honestly and suggest the customer contact the business directly.
- Do not make up information about products, services, or prices not mentioned above.
- Respond in the same language the customer uses.`;
  }

  private isWithinWorkingHours(workingHours: WorkingHours | null): boolean {
    if (!workingHours) return true; // null = 24h

    const now = new Date();
    const day = now.getDay();

    if (!workingHours.days.includes(day)) return false;

    const [openH, openM] = workingHours.open.split(':').map(Number);
    const [closeH, closeM] = workingHours.close.split(':').map(Number);

    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;

    return currentMinutes >= openMinutes && currentMinutes <= closeMinutes;
  }
}
