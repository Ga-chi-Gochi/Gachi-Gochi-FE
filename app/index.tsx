import { Redirect, type Href } from 'expo-router';

import { AUTH_ENABLED } from '@/constants/auth';
import { ISLAND_HOME } from '@/constants/routes';

export default function Index() {
  return <Redirect href={(AUTH_ENABLED ? '/login' : ISLAND_HOME) as Href} />;
}
