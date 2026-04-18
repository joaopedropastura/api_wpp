import { IsString } from 'class-validator';

export class ConnectWhatsAppDto {
  @IsString()
  code: string;

  @IsString()
  businessId: string;

  /** Must match the redirect_uri used in the OAuth dialog exactly */
  @IsString()
  redirectUri: string;
}
