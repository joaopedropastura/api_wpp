import { Module } from '@nestjs/common';
import { BotService } from './bot.service';
import { GeminiProvider } from './providers/gemini.provider';
import { WhatsAppApiService } from '../whatsapp/whatsapp-api.service';
import { EncryptionService } from '../whatsapp/encryption.service';

const aiProviderFactory = {
  provide: 'AI_PROVIDER',
  useFactory: () => {
    const provider = process.env.AI_PROVIDER ?? 'gemini';

    switch (provider) {
      case 'gemini':
        return new GeminiProvider();
      default:
        return new GeminiProvider();
    }
  },
};

@Module({
  providers: [
    BotService,
    WhatsAppApiService,
    EncryptionService,
    aiProviderFactory,
  ],
  exports: [BotService],
})
export class BotModule {}
