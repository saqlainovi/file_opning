import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './components/Login';
import FileRegister from './components/FileRegister';

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[#f8fafc]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium text-sm">লোড হচ্ছে...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return <FileRegister />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
