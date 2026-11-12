import { Redirect } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { Screen } from '../src/components/ui/Screen';
import { LoadingView } from '../src/components/ui/feedback';

// La app parte directo en el login (la landing page quedó solo en la web).
export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Screen scroll={false}>
        <LoadingView />
      </Screen>
    );
  }

  return <Redirect href={user ? '/dashboard' : '/login'} />;
}
