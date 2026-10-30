import { Redirect } from 'expo-router';

import { ISLAND_HOME } from '@/constants/routes';

/** @deprecated Prefer `/(tabs)`. Kept so old links still land on the island. */
export default function HomeRedirect() {
  return <Redirect href={ISLAND_HOME} />;
}
