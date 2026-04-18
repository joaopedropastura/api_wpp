'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Business {
  id: string;
  name: string;
  type: string;
  description: string;
  whatsapp: { phoneNumber: string; isActive: boolean } | null;
  botConfig: { isEnabled: boolean } | null;
}

export default function DashboardPage() {
  const router = useRouter();

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['businesses'],
    queryFn: () => api.get<Business[]>('/businesses').then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold">WhatsApp AI</h1>
        <Button
          variant="outline"
          onClick={() => {
            localStorage.removeItem('token');
            router.push('/login');
          }}
        >
          Sign out
        </Button>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Your businesses</h2>
          <Link href="/onboarding">
            <Button>Add business</Button>
          </Link>
        </div>

        {businesses?.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              <p className="mb-4">You haven&apos;t set up any business yet.</p>
              <Link href="/onboarding">
                <Button>Get started</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          {businesses?.map((business) => (
            <Card key={business.id}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{business.name}</CardTitle>
                  <Badge variant={business.botConfig?.isEnabled ? 'default' : 'secondary'}>
                    {business.botConfig?.isEnabled ? 'Bot on' : 'Bot off'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-gray-600 line-clamp-2">
                  {business.description}
                </p>
                {business.whatsapp ? (
                  <p className="text-sm font-medium">
                    📱 {business.whatsapp.phoneNumber}
                  </p>
                ) : (
                  <p className="text-sm text-amber-600">
                    ⚠ WhatsApp not connected
                  </p>
                )}
                <Link href={`/settings/${business.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    Configure
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
}
