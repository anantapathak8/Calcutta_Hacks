import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/Layout/MainLayout';
import DashboardPage from './pages/DashboardPage';
import NetworkPage from './pages/NetworkPage';
import AIPage from './pages/AIPage';
import NetworkConfigPage from './pages/NetworkConfigPage';
import AttackerConfigPage from './pages/AttackerConfigPage';
import NATForwardingPage from './pages/NATForwardingPage';
import './App.css';

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/network" element={<NetworkPage />} />
          <Route path="/ai-architect" element={<AIPage />} />
          <Route path="/deauth-sim/net-config" element={<NetworkConfigPage />} />
          <Route path="/deauth-sim/attacker-config" element={<AttackerConfigPage />} />
          <Route path="/nat-forwarding" element={<NATForwardingPage />} />
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;
