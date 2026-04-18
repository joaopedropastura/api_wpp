import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Headers,
  Req,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WhatsAppService } from './whatsapp.service';
import { BotService } from '../bot/bot.service';
import { ConnectWhatsAppDto } from './dto/connect-whatsapp.dto';

interface RawRequest extends Request {
  rawBody?: Buffer;
  user: { id: string; email: string; name: string };
}

@Controller('webhooks/whatsapp')
export class WebhookController {
  constructor(
    private whatsappService: WhatsAppService,
    private botService: BotService,
  ) {}

  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.whatsappService.verifyWebhook(mode, token, challenge);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async receive(
    @Headers('x-hub-signature-256') signature: string,
    @Req() req: RawRequest,
    @Body() payload: unknown,
  ) {
    if (!req.rawBody) {
      throw new BadRequestException('Raw body not available');
    }

    const isValid = this.whatsappService.validateSignature(
      req.rawBody,
      signature,
    );

    if (!isValid) {
      throw new BadRequestException('Invalid signature');
    }

    // Process asynchronously — always return 200 immediately
    void this.botService
      .handleWebhook(payload as Parameters<BotService['handleWebhook']>[0])
      .catch((err: unknown) => {
        console.error('Webhook processing error:', err);
      });

    return { status: 'ok' };
  }
}

@Controller('whatsapp')
export class WhatsAppController {
  constructor(private whatsappService: WhatsAppService) {}

  @UseGuards(JwtAuthGuard)
  @Post('connect')
  connect(@Request() req: RawRequest, @Body() dto: ConnectWhatsAppDto) {
    return this.whatsappService.connectWhatsApp(req.user.id, dto);
  }
}
