'use client';

import { useParams } from 'next/navigation';
import { DashboardPage } from '../../../features/dashboard/dashboard-page';

export default function GroupHome() {
  const params = useParams<{ groupId: string }>();
  return <DashboardPage groupId={params.groupId} />;
}
