import { Suspense } from 'react';
import SubscriptionListPage from '@/views/subscription/SubscriptionListPage';

export default function SubscriptionsPage() {
  return (
    <Suspense>
      <SubscriptionListPage />
    </Suspense>
  );
}
