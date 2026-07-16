import type { Metadata } from 'next';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';

export const metadata: Metadata = {
  title: 'Team Task Tracker',
  description: 'Daily task tracking, verification and monthly reporting for the team',
};

// Every page here is either auth-gated or auth-dependent, so there's no benefit to Next's static
// full-route cache — and it was actively harmful: a statically pre-rendered page gets served with
// a year-long Cache-Control by default, so it keeps pointing at a prior deploy's hashed CSS/JS
// filenames after they're rotated out, 404ing them and rendering the page unstyled.
export const dynamic = 'force-dynamic';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
