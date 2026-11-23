import { createBrowserClient } from "@supabase/ssr";

export function clienteNavegador(url: string, key: string) {
  return createBrowserClient(url, key);
}
