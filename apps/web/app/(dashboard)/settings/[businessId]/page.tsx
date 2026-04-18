'use client';

import { use, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const botConfigSchema = z.object({
  welcomeMessage: z.string().min(1, 'Required').max(500),
  isEnabled: z.boolean(),
  faq: z
    .array(
      z.object({
        question: z.string().min(1, 'Question is required'),
        answer: z.string().min(1, 'Answer is required'),
      }),
    )
    .max(10),
});

type BotConfigForm = z.infer<typeof botConfigSchema>;

interface BotConfig {
  welcomeMessage: string;
  isEnabled: boolean;
  faq: { question: string; answer: string }[];
}

interface PageProps {
  params: Promise<{ businessId: string }>;
}

export default function SettingsPage({ params }: PageProps) {
  const { businessId } = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: business } = useQuery({
    queryKey: ['business', businessId],
    queryFn: () =>
      api
        .get<{ name: string; botConfig: BotConfig }>(`/businesses/${businessId}`)
        .then((r) => r.data),
  });

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BotConfigForm>({
    resolver: zodResolver(botConfigSchema),
    defaultValues: { faq: [], isEnabled: true },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'faq' });

  useEffect(() => {
    if (business?.botConfig) {
      reset({
        welcomeMessage: business.botConfig.welcomeMessage,
        isEnabled: business.botConfig.isEnabled,
        faq: business.botConfig.faq,
      });
    }
  }, [business, reset]);

  const mutation = useMutation({
    mutationFn: (data: BotConfigForm) =>
      api.patch(`/businesses/${businessId}/bot-config`, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['business', businessId] });
      void queryClient.invalidateQueries({ queryKey: ['businesses'] });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/dashboard')}>
          ← Back
        </Button>
        <h1 className="text-xl font-semibold">
          {business?.name ?? 'Bot settings'}
        </h1>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-8">
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
          {/* Bot toggle */}
          <Card>
            <CardContent className="pt-6 flex items-center justify-between">
              <div>
                <p className="font-medium">AI Bot</p>
                <p className="text-sm text-gray-500">
                  Automatically answer customer messages
                </p>
              </div>
              <Switch
                checked={watch('isEnabled')}
                onCheckedChange={(v) => setValue('isEnabled', v)}
              />
            </CardContent>
          </Card>

          {/* Welcome message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Welcome message</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                rows={3}
                placeholder="Hi! I'm the virtual assistant for your business..."
                {...register('welcomeMessage')}
              />
              {errors.welcomeMessage && (
                <p className="text-xs text-red-600 mt-1">
                  {errors.welcomeMessage.message}
                </p>
              )}
            </CardContent>
          </Card>

          {/* FAQ */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">
                Frequently asked questions
              </CardTitle>
              {fields.length < 10 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => append({ question: '', answer: '' })}
                >
                  + Add question
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {fields.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">
                  No questions yet. Add the most common questions your customers ask.
                </p>
              )}
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-2 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-gray-500 uppercase tracking-wide">
                      Question {index + 1}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-red-500 h-auto p-0"
                      onClick={() => remove(index)}
                    >
                      Remove
                    </Button>
                  </div>
                  <Input
                    placeholder="e.g. What are your hours?"
                    {...register(`faq.${index}.question`)}
                  />
                  {errors.faq?.[index]?.question && (
                    <p className="text-xs text-red-600">
                      {errors.faq[index]?.question?.message}
                    </p>
                  )}
                  <Textarea
                    rows={2}
                    placeholder="e.g. We're open Monday to Saturday, 9am to 7pm."
                    {...register(`faq.${index}.answer`)}
                  />
                  {errors.faq?.[index]?.answer && (
                    <p className="text-xs text-red-600">
                      {errors.faq[index]?.answer?.message}
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {mutation.isSuccess && (
            <p className="text-sm text-green-600 text-center">
              Settings saved successfully!
            </p>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Saving...' : 'Save settings'}
          </Button>
        </form>
      </main>
    </div>
  );
}
