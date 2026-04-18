import { Module } from '@nestjs/common';
import { WebhookController, WhatsAppController } from './whatsapp.controller';
import { WhatsAppService } from './whatsapp.service';
import { WhatsAppApiService } from './whatsapp-api.service';
import { EncryptionService } from './encryption.service';
import { BotModule } from '../bot/bot.module';

@Module({
  imports: [BotModule],
  controllers: [WebhookController, WhatsAppController],
  providers: [WhatsAppService, WhatsAppApiService, EncryptionService],
  exports: [WhatsAppService, EncryptionService],
})
export class WhatsAppModule {}
