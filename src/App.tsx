import { BrowserRouter, Routes, Route } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Dossiers from './pages/Dossiers';
import DossierDetail from './pages/DossierDetail';
import Clients from './pages/Clients';
import Agenda from './pages/Agenda';
import Taches from './pages/Taches';
import Finances from './pages/Finances';
import Contacts from './pages/Contacts';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dossiers" element={<Dossiers />} />
          <Route path="/dossiers/:id" element={<DossierDetail />} />
          <Route path="/clients" element={<Clients />} />
          <Route path="/agenda" element={<Agenda />} />
          <Route path="/taches" element={<Taches />} />
          <Route path="/finances" element={<Finances />} />
          <Route path="/contacts" element={<Contacts />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
