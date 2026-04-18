'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { BusinessType } from '@repo/types';

const businessSchema = z.object({
  name: z.string().min(2),
  type: z.enum(['barbershop', 'salon', 'store', 'restaurant', 'other']),
  description: z.string().min(10),
});

type BusinessForm = z.infer<typeof businessSchema>;

const BUSINESS_TYPE_KEYS: BusinessType[] = [
  'barbershop',
  'salon',
  'store',
  'restaurant',
  'other',
];

export default function OnboardingPage() {
  const t = useTranslations('onboarding');
  const locale = useLocale();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [connectError, setConnectError] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BusinessForm>({ resolver: zodResolver(businessSchema) });

  // Listen for postMessage from the OAuth callback popup
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === 'whatsapp_connected') {
        setIsConnecting(false);
        setStep(2);
      } else if (event.data?.type === 'whatsapp_error') {
        setIsConnecting(false);
        setConnectError(true);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const createBusiness = useMutation({
    mutationFn: (data: BusinessForm) =>
      api.post<{ id: string }>('/businesses', data),
    onSuccess: (res) => {
      setBusinessId(res.data.id);
      setStep(1);
    },
  });

  const handleConnect = () => {
    if (!businessId) return;
    setConnectError(false);
    setIsConnecting(true);

    const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/${locale}/onboarding/callback`,
    );

    window.open(
      `https://www.facebook.com/dialog/oauth` +
        `?client_id=${metaAppId}` +
        `&redirect_uri=${redirectUri}` +
        `&state=${businessId}` +
        `&scope=whatsapp_business_management,whatsapp_business_messaging,business_management`,
      'whatsapp_oauth',
      'width=600,height=700',
    );
  };

  const stepLabels = [
    t('steps.business'),
    t('steps.whatsapp'),
    t('steps.bot'),
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          {stepLabels.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  i < step
                    ? 'bg-green-500 text-white'
                    : i === step
                      ? 'bg-black text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {i < step ? '✓' : i + 1}
              </div>
              <span
                className={`text-sm hidden sm:block ${i === step ? 'font-medium' : 'text-gray-400'}`}
              >
                {label}
              </span>
              {i < stepLabels.length - 1 && (
                <div
                  className={`h-px w-8 sm:w-16 ${i < step ? 'bg-green-500' : 'bg-gray-200'}`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 0: Business details */}
        {step === 0 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('business.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit((data) => createBusiness.mutate(data))}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label htmlFor="name">{t('business.name')}</Label>
                  <Input
                    id="name"
                    placeholder={t('business.namePlaceholder')}
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>{t('business.type')}</Label>
                  <Select
                    onValueChange={(v) =>
                      setValue('type', v as BusinessType, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('business.typePlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPE_KEYS.map((key) => (
                        <SelectItem key={key} value={key}>
                          {t(`businessTypes.${key}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-xs text-red-600">{errors.type.message}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">{t('business.description')}</Label>
                  <Textarea
                    id="description"
                    placeholder={t('business.descriptionPlaceholder')}
                    rows={3}
                    {...register('description')}
                  />
                  {errors.description && (
                    <p className="text-xs text-red-600">
                      {errors.description.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={createBusiness.isPending}
                >
                  {createBusiness.isPending
                    ? t('business.saving')
                    : t('business.continue')}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Connect WhatsApp */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('whatsapp.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{t('whatsapp.description')}</p>
              <Button
                className="w-full"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? t('whatsapp.connecting') : t('whatsapp.connect')}
              </Button>
              {connectError && (
                <p className="text-sm text-red-600">{t('whatsapp.error')}</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Done */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>{t('done.title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">{t('done.description')}</p>
              <Button
                className="w-full"
                onClick={() => router.push(`/${locale}/dashboard`)}
              >
                {t('done.dashboard')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
