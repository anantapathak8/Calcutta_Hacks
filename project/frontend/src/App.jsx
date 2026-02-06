import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './components/Layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLoginPage from './pages/AdminLoginPage';
import DashboardPage from './pages/DashboardPage';
import NetworkPage from './pages/NetworkPage';
import AIPage from './pages/AIPage';
import NetworkConfigPage from './pages/NetworkConfigPage';
import AttackerConfigPage from './pages/AttackerConfigPage';
import NATForwardingPage from './pages/NATForwardingPage';
import ComplianceCheckPage from './pages/ComplianceCheckPage';
import SubnetDesignerPage from './pages/SubnetDesignerPage';
import HotspotGeneratorPage from './pages/HotspotGeneratorPage';
import HardwareKeySetupPage from './pages/HardwareKeySetupPage';
import './App.css';

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Public route - Login page */}
          <Route path="/login" element={<AdminLoginPage />} />

          {/* Protected routes - require USB authentication */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <MainLayout>
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/network" element={<NetworkPage />} />
                    <Route path="/ai-architect" element={<AIPage />} />
                    <Route path="/deauth-sim/net-config" element={<NetworkConfigPage />} />
                    <Route path="/deauth-sim/attacker-config" element={<AttackerConfigPage />} />
                    <Route path="/nat-forwarding" element={<NATForwardingPage />} />
                    <Route path="/compliance-check" element={<ComplianceCheckPage />} />
                    <Route path="/subnet-designer" element={<SubnetDesignerPage />} />
                    <Route path="/hotspot-generator" element={<HotspotGeneratorPage />} />
                    <Route path="/hardware-key-setup" element={<HardwareKeySetupPage />} />
                  </Routes>
                </MainLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
