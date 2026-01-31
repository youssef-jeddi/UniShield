import React from 'react';

interface ComplianceItem {
    title: string;
    status: 'verified' | 'pending' | 'expired';
    description: string;
    date: string;
}

const complianceItems: ComplianceItem[] = [
    {
        title: 'Identity Verification (KYC)',
        status: 'verified',
        description: 'Government-issued ID verified via TEE',
        date: '2024-01-15',
    },
    {
        title: 'Accredited Investor Status',
        status: 'pending',
        description: 'Proof of accredited investor qualification',
        date: '—',
    },
    {
        title: 'Source of Funds Declaration',
        status: 'verified',
        description: 'Origin of assets documented and verified',
        date: '2024-01-15',
    },
    {
        title: 'Tax Compliance (W-8/W-9)',
        status: 'pending',
        description: 'Tax documentation for regulatory compliance',
        date: '—',
    },
];

const CompliancePage: React.FC = () => {
    const getStatusBadge = (status: ComplianceItem['status']) => {
        switch (status) {
            case 'verified':
                return <span className="badge badge-success">Verified</span>;
            case 'pending':
                return <span className="badge badge-warning">Pending</span>;
            case 'expired':
                return <span className="badge badge-error">Expired</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-white text-3xl font-black">Compliance Center</h1>
                <p className="text-[#92c9b2] text-sm mt-1">Manage your institutional compliance and verification status</p>
            </div>

            {/* Status Overview */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compliance Score Card */}
                <div className="card-highlight p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-white text-lg font-bold">Compliance Score</h2>
                        <svg className="w-6 h-6 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                    </div>
                    <div className="flex items-end gap-4 mb-4">
                        <span className="text-5xl font-black text-[#11d483]">75</span>
                        <span className="text-[#92c9b2] text-lg mb-1">/ 100</span>
                    </div>
                    <div className="progress-bar">
                        <div className="progress-bar-fill" style={{ width: '75%' }}></div>
                    </div>
                    <p className="text-[#92c9b2] text-sm mt-3">Complete pending items to unlock full pool access</p>
                </div>

                {/* Quick Stats */}
                <div className="card p-6">
                    <h2 className="text-white text-lg font-bold mb-4">Verification Status</h2>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[#92c9b2]">Verified Items</span>
                            <span className="text-white font-bold">2 / 4</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#92c9b2]">TEE Sessions</span>
                            <span className="text-white font-bold">3</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#92c9b2]">Last Verification</span>
                            <span className="text-white font-mono text-sm">2024-01-15</span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[#92c9b2]">KYC Expiry</span>
                            <span className="text-white font-mono text-sm">2024-02-14</span>
                        </div>
                    </div>
                </div>

                {/* Privacy Notice */}
                <div className="card p-6">
                    <div className="flex gap-3 mb-4">
                        <svg className="w-6 h-6 text-[#11d483] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                        </svg>
                        <h2 className="text-white text-lg font-bold">Privacy Guarantee</h2>
                    </div>
                    <p className="text-[#92c9b2] text-sm leading-relaxed">
                        All sensitive data is processed in a Trusted Execution Environment (TEE).
                        Your personal information never leaves the secure enclave and is never
                        stored on public blockchains.
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-[#11d483]">
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                        <span className="text-sm font-bold">Powered by iExec TEE</span>
                    </div>
                </div>
            </div>

            {/* Compliance Items List */}
            <div className="card">
                <div className="p-5 border-b border-[#234839]">
                    <h2 className="text-white text-lg font-bold">Compliance Requirements</h2>
                </div>
                <div className="divide-y divide-[#234839]">
                    {complianceItems.map((item, index) => (
                        <div key={index} className="p-5 flex items-center justify-between hover:bg-[#234839]/20 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'verified' ? 'bg-[#11d483]/20' : 'bg-[#234839]'
                                    }`}>
                                    {item.status === 'verified' ? (
                                        <svg className="w-5 h-5 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-5 h-5 text-[#92c9b2]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                        </svg>
                                    )}
                                </div>
                                <div>
                                    <p className="text-white font-bold">{item.title}</p>
                                    <p className="text-[#92c9b2] text-sm">{item.description}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-[#92c9b2] text-sm font-mono">{item.date}</span>
                                {getStatusBadge(item.status)}
                                {item.status === 'pending' && (
                                    <button className="btn-primary py-2 px-4 text-sm">
                                        Verify Now
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default CompliancePage;
