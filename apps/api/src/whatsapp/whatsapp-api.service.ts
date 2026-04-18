import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const META_API_VERSION = 'v21.0';
const META_GRAPH_URL = `https://graph.facebook.com/${META_API_VERSION}`;

@Injectable()
export class WhatsAppApiService {
  private readonly logger = new Logger(WhatsAppApiService.name);

  async sendTextMessage(
    phoneNumberId: string,
    accessToken: string,
    to: string,
    text: string,
  ): Promise<void> {
    await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { body: text },
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async markMessageAsRead(
    phoneNumberId: string,
    accessToken: string,
    wamid: string,
  ): Promise<void> {
    await axios.post(
      `${META_GRAPH_URL}/${phoneNumberId}/messages`,
      {
        messaging_product: 'whatsapp',
        status: 'read',
        message_id: wamid,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      },
    );
  }

  async exchangeCodeForToken(
    code: string,
    redirectUri: string,
  ): Promise<{ accessToken: string }> {
    const appId = process.env.META_APP_ID;
    const appSecret = process.env.META_APP_SECRET;

    const { data } = await axios.get<{ access_token: string }>(
      `${META_GRAPH_URL}/oauth/access_token`,
      {
        params: {
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        },
      },
    );

    return { accessToken: data.access_token };
  }

  async discoverWaba(accessToken: string): Promise<{
    wabaId: string;
    phoneNumberId: string;
    phoneNumber: string;
  }> {
    // Step 1: get all Business Manager accounts the user has access to
    const { data: businessesRes } = await axios.get<{
      data: Array<{ id: string; name: string }>;
    }>(`${META_GRAPH_URL}/me/businesses`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      params: { fields: 'id,name' },
    });

    console.log('bbbbbbbbbb');
    const businesses = businessesRes.data ?? [];
    this.logger.debug(`Found ${businesses.length} business(es) for user`);

    // Step 2: for each business, look for owned WhatsApp Business Accounts
    for (const business of businesses) {
      let wabas: Array<{ id: string }> = [];
      try {
        const { data: wabaRes } = await axios.get<{
          data: Array<{ id: string }>;
        }>(
          `${META_GRAPH_URL}/${business.id}/owned_whatsapp_business_accounts`,
          {
            headers: { Authorization: `Bearer ${accessToken}` },
            params: { fields: 'id' },
          },
        );
        wabas = wabaRes.data ?? [];
      } catch {
        this.logger.debug(
          `Business ${business.id} has no WABA access, skipping`,
        );
        continue;
      }

      if (!wabas.length) continue;

      const wabaId = wabas[0].id;

      // Step 3: get phone numbers registered in this WABA
      const { data: phoneRes } = await axios.get<{
        data: Array<{ id: string; display_phone_number: string }>;
      }>(`${META_GRAPH_URL}/${wabaId}/phone_numbers`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        params: { fields: 'id,display_phone_number' },
      });

      let phones = phoneRes.data ?? [];
      phones = phones.filter(
        (phone) => phone.display_phone_number != '+1 555-146-9053',
      );
      if (!phones.length) continue;

      this.logger.debug(
        `Discovered WABA ${wabaId} with phone ${phones[0].display_phone_number}`,
      );

      return {
        wabaId,
        phoneNumberId: phones[0].id,
        phoneNumber: phones[0].display_phone_number,
      };
    }

    throw new Error(
      'No WhatsApp Business Account with registered phone numbers was found. ' +
        'Make sure your Facebook account has access to a WhatsApp Business Account in Business Manager.',
    );
  }
}
