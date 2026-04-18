'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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
  name: z.string().min(2, 'Name must be at least 2 characters'),
  type: z.enum(['barbershop', 'salon', 'store', 'restaurant', 'other']),
  description: z
    .string()
    .min(10, 'Describe your business (at least 10 characters)'),
});

type BusinessForm = z.infer<typeof businessSchema>;

const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'barbershop', label: 'Barbershop' },
  { value: 'salon', label: 'Beauty Salon' },
  { value: 'store', label: 'Store' },
  { value: 'restaurant', label: 'Restaurant' },
  { value: 'other', label: 'Other' },
];

const STEPS = ['Your business', 'Connect WhatsApp', 'Configure bot'];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [businessId, setBusinessId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<BusinessForm>({ resolver: zodResolver(businessSchema) });

  const createBusiness = useMutation({
    mutationFn: (data: BusinessForm) =>
      api.post<{ id: string }>('/businesses', data),
    onSuccess: (res) => {
      setBusinessId(res.data.id);
      setStep(1);
    },
  });

  const connectWhatsApp = useMutation({
    mutationFn: (code: string) =>
      api.post('/whatsapp/connect', { code, businessId }),
    onSuccess: () => setStep(2),
  });

  const handleEmbeddedSignup = () => {
    // The Embedded Signup popup is launched via the Meta JS SDK
    // When complete, it calls back with a code that we exchange for tokens
    // For now, we open the Meta Business login URL
    const metaAppId = process.env.NEXT_PUBLIC_META_APP_ID;
    const redirectUri = encodeURIComponent(
      `${window.location.origin}/onboarding/callback`,
    );
    window.open(
      `https://www.facebook.com/dialog/oauth?client_id=${metaAppId}&redirect_uri=${redirectUri}&scope=whatsapp_business_management,whatsapp_business_messaging`,
      'whatsapp_signup',
      'width=600,height=700',
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg space-y-8">
        {/* Step indicator */}
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
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
              {i < STEPS.length - 1 && (
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
              <CardTitle>Tell us about your business</CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit((data) => createBusiness.mutate(data))}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <Label htmlFor="name">Business name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. João's Barbershop"
                    {...register('name')}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-600">
                      {errors.name.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select
                    onValueChange={(v) =>
                      setValue('type', v as BusinessType, {
                        shouldValidate: true,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.type && (
                    <p className="text-xs text-red-600">
                      {errors.type.message}
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label htmlFor="description">What do you offer?</Label>
                  <Textarea
                    id="description"
                    placeholder="e.g. Haircuts, beard trims, eyebrow shaping. Open Mon–Sat."
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
                  {createBusiness.isPending ? 'Saving...' : 'Continue'}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Step 1: Connect WhatsApp */}
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Connect your WhatsApp</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Click the button below to connect your WhatsApp Business number.
                You&apos;ll be redirected to log in with your Facebook account —
                no tokens to copy, no technical setup required.
              </p>
              <Button
                className="w-full"
                onClick={handleEmbeddedSignup}
                disabled={connectWhatsApp.isPending}
              >
                Connect my WhatsApp
              </Button>
              {connectWhatsApp.isError && (
                <p className="text-sm text-red-600">
                  Connection failed. Please try again.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Configure bot */}
        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>Your bot is ready! 🎉</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">
                Your WhatsApp is connected and your AI assistant is active. You
                can now configure your FAQ and business hours from the dashboard.
              </p>
              <Button
                className="w-full"
                onClick={() => router.push('/dashboard')}
              >
                Go to dashboard
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
