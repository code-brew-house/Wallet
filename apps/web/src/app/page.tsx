'use client';

import { Button, Container, Stack, Text, Title } from '@mantine/core';
import Link from 'next/link';

export default function LandingPage() {
  return (
    <Container size="sm" py="xl">
      <Stack gap="md">
        <Title>Wallet</Title>
        <Text c="dimmed">Family envelope budgeting for shared spending.</Text>
        <Button component={Link} href="/login">Get started</Button>
      </Stack>
    </Container>
  );
}
