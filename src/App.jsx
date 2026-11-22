import { Navigate, Route, Routes } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './auth.jsx';
import BottomNav from './components/BottomNav.jsx';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Inventory from './pages/Inventory.jsx';
import ItemDetail from './pages/ItemDetail.jsx';
import AddItem from './pages/AddItem.jsx';
import Scan from './pages/Scan.jsx';
import Alerts from './pages/Alerts.jsx';
import Settings from './pages/Settings.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="app loading">
        <Loader2 className="spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <Routes>
          <Route path="/register" element={<Auth mode="register" />} />
          <Route path="*" element={<Auth mode="login" />} />
        </Routes>
      </div>
    );
  }

  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/items/new" element={<AddItem />} />
        <Route path="/items/:id" element={<ItemDetail />} />
        <Route path="/scan" element={<Scan />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </div>
  );
}
