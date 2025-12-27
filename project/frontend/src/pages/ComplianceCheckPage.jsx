import { useState, useEffect } from 'react';
import axios from 'axios';
import { Modal } from '../components/Modal';
import { Shield, Activity, AlertTriangle, CheckCircle, Clock, Laptop } from 'lucide-react';

const ComplianceCheckPage = () => {
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [complianceReport, setComplianceReport] = useState(null);
    const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);

    // New state for historical data
    const [reports, setReports] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedReport, setSelectedReport] = useState(null);

    // Fetch historical compliance data on mount and periodically
    useEffect(() => {
        fetchHistoricalData();
        const interval = setInterval(fetchHistoricalData, 30000); // Refresh every 30 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchHistoricalData = async () => {
        try {
            const [reportsRes, statsRes] = await Promise.all([
                axios.get('http://localhost:5001/api/reports'),
                axios.get('http://localhost:5001/api/stats')
            ]);

            setReports(reportsRes.data.reports || []);
            setStats(statsRes.data.stats || null);
            setLoading(false);
        } catch (error) {
            console.error('Error fetching historical data:', error);
            setLoading(false);
        }
    };

    const runComplianceCheck = async () => {
        setIsCheckingCompliance(true);
        setComplianceReport(null);

        try {
            const res = await axios.post('http://localhost:5001/api/compliance/check');

            if (res.data.success) {
                setComplianceReport(res.data.report);

                const report = res.data.report;
                const status = report.status;
                const score = report.compliance_percentage;

                setModal({
                    isOpen: true,
                    title: `Compliance Check Complete`,
                    message: `Status: ${status}\nScore: ${score.toFixed(0)}%\n\nResults displayed below.`,
                    type: score >= 75 ? 'success' : 'warning'
                });

                // Refresh historical data after new check
                await fetchHistoricalData();
            } else {
                setModal({
                    isOpen: true,
                    title: 'Check Failed',
                    message: res.data.error || 'Failed to run compliance check',
                    type: 'error'
                });
            }
        } catch (error) {
            console.error('Compliance check error:', error);
            setModal({
                isOpen: true,
                title: 'Check Failed',
                message: error.response?.data?.error || 'Failed to run compliance check. Please try again.',
                type: 'error'
            });
        } finally {
            setIsCheckingCompliance(false);
        }
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getComplianceColor = (percentage) => {
        if (percentage >= 100) return '#10b981';
        if (percentage >= 75) return '#f59e0b';
        return '#ef4444';
    };

    const getComplianceStatus = (percentage) => {
        if (percentage >= 100) return 'Compliant';
        if (percentage >= 75) return 'Mostly Compliant';
        return 'Non-Compliant';
    };

    return (
        <div className="min-h-screen bg-gray-900 text-white p-6">
            <Modal
                isOpen={modal.isOpen}
                onClose={() => setModal({ ...modal, isOpen: false })}
                title={modal.title}
                message={modal.message}
                type={modal.type}
            />

            <div className="max-w-7xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-cyan-400 mb-2">
                        System Compliance Check
                    </h1>
                    <p className="text-gray-400">
                        Verify your system compliance with organizational security policies
                    </p>
                </div>

                {/* Compliance Check Section */}
                <div className="bg-gradient-to-br from-orange-900/40 to-red-900/40 rounded-lg p-6 border border-orange-500/50">
                    <h2 className="text-xl font-bold text-orange-300 mb-4">🔒 Run Compliance Audit</h2>
                    <p className="text-gray-300 text-sm mb-4">
                        Click the button below to perform a comprehensive compliance check on your system
                    </p>

                    <button
                        onClick={runComplianceCheck}
                        disabled={isCheckingCompliance}
                        className="w-full px-6 py-3 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition font-semibold flex items-center justify-center gap-2 mb-4"
                    >
                        {isCheckingCompliance ? (
                            <>
                                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                <span>Checking Compliance...</span>
                            </>
                        ) : (
                            <>
                                <span>🔒</span>
                                <span>Run Compliance Check</span>
                            </>
                        )}
                    </button>

                    {/* Compliance Results */}
                    {complianceReport && (
                        <div className="bg-gray-800/60 rounded-lg p-4 border border-orange-400/30">
                            <div className="mb-4">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-lg font-semibold">Compliance Score:</span>
                                    <span className={`text-2xl font-bold ${complianceReport.compliance_percentage >= 100 ? 'text-green-400' :
                                        complianceReport.compliance_percentage >= 75 ? 'text-yellow-400' :
                                            'text-red-400'
                                        }`}>
                                        {complianceReport.compliance_percentage.toFixed(0)}%
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-400">Status:</span>
                                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${complianceReport.status === 'FULLY COMPLIANT' ? 'bg-green-600/30 text-green-300' :
                                        complianceReport.status === 'MOSTLY COMPLIANT' ? 'bg-yellow-600/30 text-yellow-300' :
                                            'bg-red-600/30 text-red-300'
                                        }`}>
                                        {complianceReport.status}
                                    </span>
                                </div>
                                <div className="mt-2 text-xs text-gray-400">
                                    Device: {complianceReport.device_name} |
                                    Checked: {new Date(complianceReport.timestamp).toLocaleString()}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="text-sm font-semibold text-gray-300 mb-2">Check Details:</div>

                                {Object.entries(complianceReport.checks).map(([checkName, checkData]) => (
                                    <div key={checkName} className="bg-gray-700/50 rounded p-3">
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className={`text-lg ${checkData.passed ? 'text-green-400' : 'text-red-400'}`}>
                                                        {checkData.passed ? '✓' : '✗'}
                                                    </span>
                                                    <span className="font-medium capitalize">
                                                        {checkName.replace(/_/g, ' ')}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-gray-400 ml-7">
                                                    {checkData.message}
                                                </div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-semibold ${checkData.passed ? 'bg-green-600/30 text-green-300' : 'bg-red-600/30 text-red-300'
                                                }`}>
                                                {checkData.passed ? 'PASS' : 'FAIL'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="mt-4 text-xs text-gray-400 space-y-1">
                        <div>📋 <strong>Checks performed:</strong></div>
                        <div className="pl-6 space-y-0.5">
                            <div>• Proxy settings verification</div>
                            <div>• Blocked websites compliance</div>
                            <div>• Default shell configuration</div>
                            <div>• WiFi security status</div>
                        </div>
                    </div>
                </div>

                {/* Info Section */}
                <div className="mt-6 p-4 bg-blue-900/30 border border-blue-600 rounded-lg">
                    <div className="text-blue-400 font-semibold mb-2">ℹ️ About Compliance Checks:</div>
                    <ul className="text-sm text-gray-300 space-y-1">
                        <li>• Checks are performed in real-time on the server system</li>
                        <li>• Results are stored and can be accessed via API</li>
                        <li>• Four security compliance areas are verified</li>
                        <li>• Compliance score is calculated based on passing checks</li>
                    </ul>
                </div>

                {/* Statistics Cards */}
                {stats && (
                    <div className="mt-8">
                        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Compliance Statistics</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-gradient-to-br from-blue-900/40 to-blue-800/40 rounded-lg p-4 border border-blue-500/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-blue-600 rounded-lg">
                                        <Laptop size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Total Reports</p>
                                        <p className="text-2xl font-bold text-white">{stats.total_reports}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-green-900/40 to-green-800/40 rounded-lg p-4 border border-green-500/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-green-600 rounded-lg">
                                        <CheckCircle size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Compliant Devices</p>
                                        <p className="text-2xl font-bold text-white">{stats.compliant_devices}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-red-900/40 to-red-800/40 rounded-lg p-4 border border-red-500/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-red-600 rounded-lg">
                                        <AlertTriangle size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Non-Compliant</p>
                                        <p className="text-2xl font-bold text-white">{stats.non_compliant_devices}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-purple-900/40 to-purple-800/40 rounded-lg p-4 border border-purple-500/50">
                                <div className="flex items-center gap-3">
                                    <div className="p-3 bg-purple-600 rounded-lg">
                                        <Activity size={24} className="text-white" />
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-400">Avg. Compliance</p>
                                        <p className="text-2xl font-bold text-white">{stats.average_compliance}%</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Reports Table */}
                <div className="mt-8">
                    <h2 className="text-2xl font-bold text-cyan-400 mb-4">All Compliance Reports</h2>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Activity className="animate-spin text-cyan-400 mb-4" size={48} />
                            <p className="text-gray-400">Loading compliance data...</p>
                        </div>
                    ) : reports.length === 0 ? (
                        <div className="bg-gray-800/40 rounded-lg p-8 text-center border border-gray-700">
                            <AlertTriangle size={48} className="text-yellow-500 mx-auto mb-4" />
                            <p className="text-gray-300 font-semibold">No compliance reports yet</p>
                            <p className="text-gray-500 text-sm mt-2">Reports will appear here once devices are tested</p>
                        </div>
                    ) : (
                        <div className="bg-gray-800/40 rounded-lg overflow-hidden border border-gray-700">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-900/60">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Device Name
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Compliance
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Status
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Test Time
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-700">
                                        {reports.map((report) => (
                                            <tr key={report.id} className="hover:bg-gray-700/30 transition">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2">
                                                        <Laptop size={18} className="text-cyan-400" />
                                                        <span className="text-sm font-medium text-white">{report.device_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="w-32 bg-gray-700 rounded-full h-2 overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full transition-all"
                                                                style={{
                                                                    width: `${report.compliance_percentage}%`,
                                                                    backgroundColor: getComplianceColor(report.compliance_percentage)
                                                                }}
                                                            />
                                                        </div>
                                                        <span className="text-xs font-semibold" style={{ color: getComplianceColor(report.compliance_percentage) }}>
                                                            {report.compliance_percentage.toFixed(0)}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span
                                                        className="px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full"
                                                        style={{
                                                            backgroundColor: `${getComplianceColor(report.compliance_percentage)}20`,
                                                            color: getComplianceColor(report.compliance_percentage)
                                                        }}
                                                    >
                                                        {getComplianceStatus(report.compliance_percentage)}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center gap-2 text-sm text-gray-400">
                                                        <Clock size={16} />
                                                        <span>{formatDate(report.timestamp)}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <button
                                                        className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm font-medium rounded-lg transition"
                                                        onClick={() => setSelectedReport(report)}
                                                    >
                                                        View Details
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Report Detail Modal */}
            {selectedReport && (
                <div
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
                    onClick={() => setSelectedReport(null)}
                >
                    <div
                        className="bg-gray-900 border border-cyan-500/50 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="sticky top-0 bg-gray-900 border-b border-cyan-500/50 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-cyan-400">Compliance Report Details</h3>
                            <button
                                className="text-gray-400 hover:text-white text-3xl leading-none"
                                onClick={() => setSelectedReport(null)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between py-3 border-b border-gray-700">
                                <span className="text-gray-400">Device Name:</span>
                                <span className="text-white font-semibold">{selectedReport.device_name}</span>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-gray-700">
                                <span className="text-gray-400">Test Time:</span>
                                <span className="text-white">{formatDate(selectedReport.timestamp)}</span>
                            </div>

                            <div className="flex items-center justify-between py-3 border-b border-gray-700">
                                <span className="text-gray-400">Compliance Score:</span>
                                <span
                                    className="text-xl font-bold"
                                    style={{ color: getComplianceColor(selectedReport.compliance_percentage) }}
                                >
                                    {selectedReport.compliance_percentage.toFixed(0)}% - {getComplianceStatus(selectedReport.compliance_percentage)}
                                </span>
                            </div>

                            <h4 className="text-lg font-bold text-cyan-400 mt-6 mb-3">Compliance Checks:</h4>

                            <div className="space-y-3">
                                <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        {selectedReport.checks.proxy.passed ? (
                                            <CheckCircle size={20} className="text-green-400" />
                                        ) : (
                                            <AlertTriangle size={20} className="text-red-400" />
                                        )}
                                        <span className="font-semibold text-white">Proxy Settings</span>
                                    </div>
                                    <p className="text-sm text-gray-400 ml-7">{selectedReport.checks.proxy.message}</p>
                                </div>

                                <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        {selectedReport.checks.blocked_websites.passed ? (
                                            <CheckCircle size={20} className="text-green-400" />
                                        ) : (
                                            <AlertTriangle size={20} className="text-red-400" />
                                        )}
                                        <span className="font-semibold text-white">Website Blocking</span>
                                    </div>
                                    <p className="text-sm text-gray-400 ml-7">{selectedReport.checks.blocked_websites.message}</p>
                                </div>

                                <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        {selectedReport.checks.default_shell.passed ? (
                                            <CheckCircle size={20} className="text-green-400" />
                                        ) : (
                                            <AlertTriangle size={20} className="text-red-400" />
                                        )}
                                        <span className="font-semibold text-white">Default Shell</span>
                                    </div>
                                    <p className="text-sm text-gray-400 ml-7">{selectedReport.checks.default_shell.message}</p>
                                </div>

                                <div className="bg-gray-800/60 rounded-lg p-4 border border-gray-700">
                                    <div className="flex items-center gap-2 mb-2">
                                        {selectedReport.checks.wifi_security.passed ? (
                                            <CheckCircle size={20} className="text-green-400" />
                                        ) : (
                                            <AlertTriangle size={20} className="text-red-400" />
                                        )}
                                        <span className="font-semibold text-white">WiFi Security</span>
                                    </div>
                                    <p className="text-sm text-gray-400 ml-7">{selectedReport.checks.wifi_security.message}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComplianceCheckPage;
