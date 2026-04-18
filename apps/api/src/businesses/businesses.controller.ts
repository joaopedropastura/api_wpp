import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BusinessesService } from './businesses.service';
import { CreateBusinessDto } from './dto/create-business.dto';
import { UpdateBotConfigDto } from './dto/update-bot-config.dto';

interface AuthRequest extends Request {
  user: { id: string; email: string; name: string };
}

@UseGuards(JwtAuthGuard)
@Controller('businesses')
export class BusinessesController {
  constructor(private businessesService: BusinessesService) {}

  @Post()
  create(@Request() req: AuthRequest, @Body() dto: CreateBusinessDto) {
    return this.businessesService.create(req.user.id, dto);
  }

  @Get()
  findAll(@Request() req: AuthRequest) {
    return this.businessesService.findAllByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Request() req: AuthRequest) {
    return this.businessesService.findOne(id, req.user.id);
  }

  @Patch(':id/bot-config')
  updateBotConfig(
    @Param('id') id: string,
    @Request() req: AuthRequest,
    @Body() dto: UpdateBotConfigDto,
  ) {
    return this.businessesService.updateBotConfig(id, req.user.id, dto);
  }
}
