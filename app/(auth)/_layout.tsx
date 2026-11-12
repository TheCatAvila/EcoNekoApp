// Equivale a <GuestRoute />: solo usuarios sin sesión.
import { Redirect, Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { Screen } from '../../src/components/ui/Screen';
import { LoadingView } from '../../src/components/ui/feedback';

export default function GuestLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingView />
      </Screen>
    );
  }

  if (user) return <Redirect href="/dashboard" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
