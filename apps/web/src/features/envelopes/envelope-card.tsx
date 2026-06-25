import { Badge, Card, Group, Stack, Text } from '@mantine/core';
import type { EnvelopeSummary } from '../dashboard/types';

interface EnvelopeCardProps {
  envelope: EnvelopeSummary;
  currency: string;
}


export function EnvelopeCard({ envelope, currency }: EnvelopeCardProps) {
  const isOverspent = envelope.balanceMinor < 0;

  return (
    <Card withBorder radius="md" padding="lg">
      <Stack gap="xs">
        <Group justify="space-between" align="start">
          <Text fw={700}>{envelope.name}</Text>
          {envelope.archivedAt ? <Badge color="gray">Archived</Badge> : null}
        </Group>
        <Text size="xs" tt="uppercase" c="dimmed" fw={700}>Available</Text>
        <Text fw={800} size="xl" c={isOverspent ? 'red' : 'teal'}>
          {new Intl.NumberFormat('en-IN', { style: 'currency', currency }).format(envelope.balanceMinor / 100)}
        </Text>
        <Text size="sm" c={isOverspent ? 'red' : 'dimmed'}>
          {isOverspent ? 'This envelope needs attention before more spending.' : 'Ready for planned spending.'}
        </Text>
      </Stack>
    </Card>
  );
}
