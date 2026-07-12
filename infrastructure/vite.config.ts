import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
// Uses vitest/config's defineConfig (not plain vite's) — only that
// re-export's UserConfig type is merged with Vitest's own `test` key,
// so this is the correct import for a config file that needs both.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    globals: false,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    // Dummy, non-secret values only — real credentials are never
    // needed for unit tests, since every repository call in every
    // test file is mocked via vi.mock(). These exist purely because
    // vi.mock()'s auto-mocking still evaluates the real module graph
    // (to discover what shape to mock) before substituting stubs, and
    // that evaluation reaches src/lib/supabase/client.ts's/
    // src/lib/env/env.ts's eager, fail-fast environment validation —
    // without these, every test suite would crash before a single
    // test runs, not because of a real missing-config problem.
    env: {
      VITE_SUPABASE_URL: 'https://test-project.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'test-anon-key',
      VITE_APP_URL: 'https://test.example.com',
      VITE_IMAGEKIT_URL_ENDPOINT: 'https://ik.imagekit.io/test',
      VITE_IMAGEKIT_PUBLIC_KEY: 'test-imagekit-public-key',
      VITE_RAZORPAY_KEY_ID: 'rzp_test_dummy',
    },
  },
});
