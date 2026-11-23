import { Component, Suspense, type ReactNode } from 'react';

function StartupError({ configurationError }: { configurationError: boolean }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-4 px-6" role="alert">
      <h1 className="text-2xl font-black text-[#111111]">BRIDGE를 시작하지 못했어요</h1>
      <p className="text-sm text-[#475569]">
        {configurationError
          ? 'Supabase 연결 설정(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)을 확인해 주세요. 로컬 설정을 수정했다면 개발 서버를 다시 시작해 주세요.'
          : '앱을 불러오는 중 오류가 발생했어요. 페이지를 새로고침해 주세요.'}
      </p>
      <button type="button" onClick={() => window.location.reload()}
        className="self-start rounded-lg bg-[#7D39EB] px-4 py-2 text-sm font-bold text-white">
        새로고침
      </button>
    </main>
  );
}

class AppErrorBoundary extends Component<{ children: ReactNode }, { failure: 'configuration' | 'app' | null }> {
  state: { failure: 'configuration' | 'app' | null } = { failure: null };

  static getDerivedStateFromError(error: unknown) {
    const failure = error instanceof Error && error.name === 'SupabaseConfigurationError'
      ? 'configuration'
      : 'app';
    return { failure };
  }

  render() {
    if (this.state.failure) return <StartupError configurationError={this.state.failure === 'configuration'} />;
    return this.props.children;
  }
}

export function AppStartup({ children }: { children: ReactNode }) {
  return (
    <AppErrorBoundary>
      <Suspense fallback={<p role="status" className="p-6 text-sm text-[#475569]">BRIDGE를 불러오는 중이에요.</p>}>
        {children}
      </Suspense>
    </AppErrorBoundary>
  );
}
