import { useState } from 'react';
import axios from 'axios';
import { Modal } from '../components/Modal';

const ComplianceCheckPage = () => {
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', type: 'info' });
    const [complianceReport, setComplianceReport] = useState(null);
    const [isCheckingCompliance, setIsCheckingCompliance] = useState(false);

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
            </div>
        </div>
    );
};

export default ComplianceCheckPage;
