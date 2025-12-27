import { Outlet, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/(auth)')({
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <div
      className='min-h-screen w-full grid lg:grid-cols-2'
      style={{
        background: '#030712',
        fontFamily: "'DM Sans', 'Figtree Variable', sans-serif",
      }}
    >
      <Outlet />
    </div>
  );
}
