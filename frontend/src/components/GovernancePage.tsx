import React from 'react';

interface Proposal {
    id: number;
    title: string;
    status: 'active' | 'passed' | 'rejected' | 'pending';
    votes: { for: number; against: number };
    endDate: string;
    description: string;
}

const proposals: Proposal[] = [
    {
        id: 1,
        title: 'UIP-001: Add WBTC/USDC Institutional Pool',
        status: 'active',
        votes: { for: 72, against: 28 },
        endDate: '2024-02-05',
        description: 'Proposal to add a new KYC-protected WBTC/USDC liquidity pool with 0.3% fee tier.',
    },
    {
        id: 2,
        title: 'UIP-002: Reduce KYC Verification Period to 14 Days',
        status: 'passed',
        votes: { for: 89, against: 11 },
        endDate: '2024-01-28',
        description: 'Reduce the KYC validity period from 30 days to 14 days for enhanced security.',
    },
    {
        id: 3,
        title: 'UIP-003: Integrate Chainalysis OFAC Screening',
        status: 'pending',
        votes: { for: 0, against: 0 },
        endDate: '2024-02-15',
        description: 'Add automatic OFAC sanctions screening for all pool participants.',
    },
];

const GovernancePage: React.FC = () => {
    const getStatusBadge = (status: Proposal['status']) => {
        switch (status) {
            case 'active':
                return <span className="badge badge-success">Active</span>;
            case 'passed':
                return <span className="badge badge-info">Passed</span>;
            case 'rejected':
                return <span className="badge badge-error">Rejected</span>;
            case 'pending':
                return <span className="badge badge-warning">Pending</span>;
        }
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between gap-4 items-center">
                <div>
                    <h1 className="text-white text-3xl font-black">Governance</h1>
                    <p className="text-[#92c9b2] text-sm mt-1">Participate in UniShield protocol governance and vote on proposals</p>
                </div>
                <button className="btn-primary">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Proposal
                </button>
            </div>

            {/* Voting Power */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Your Voting Power</p>
                    <p className="text-white text-2xl font-bold">1,250 UNS</p>
                    <p className="text-[#11d483] text-xs mt-1">Top 15% of holders</p>
                </div>
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Proposals Voted</p>
                    <p className="text-white text-2xl font-bold">12</p>
                    <p className="text-[#92c9b2] text-xs mt-1">All-time participation</p>
                </div>
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Active Proposals</p>
                    <p className="text-white text-2xl font-bold">1</p>
                    <p className="text-[#92c9b2] text-xs mt-1">Voting ends in 5 days</p>
                </div>
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Treasury</p>
                    <p className="text-white text-2xl font-bold">$2.4M</p>
                    <p className="text-[#92c9b2] text-xs mt-1">Community-controlled</p>
                </div>
            </div>

            {/* Proposals */}
            <div className="card">
                <div className="p-5 border-b border-[#234839] flex justify-between items-center">
                    <h2 className="text-white text-lg font-bold">Proposals</h2>
                    <div className="flex gap-2">
                        <button className="btn-ghost text-sm">All</button>
                        <button className="btn-ghost text-sm">Active</button>
                        <button className="btn-ghost text-sm">Passed</button>
                    </div>
                </div>
                <div className="divide-y divide-[#234839]">
                    {proposals.map((proposal) => (
                        <div key={proposal.id} className="p-5 hover:bg-[#234839]/20 transition-colors">
                            <div className="flex items-start justify-between gap-4 mb-3">
                                <div>
                                    <div className="flex items-center gap-3 mb-1">
                                        <h3 className="text-white font-bold">{proposal.title}</h3>
                                        {getStatusBadge(proposal.status)}
                                    </div>
                                    <p className="text-[#92c9b2] text-sm">{proposal.description}</p>
                                </div>
                                {proposal.status === 'active' && (
                                    <div className="flex gap-2 shrink-0">
                                        <button className="btn-primary py-2 px-4 text-sm">
                                            Vote For
                                        </button>
                                        <button className="btn-secondary py-2 px-4 text-sm">
                                            Vote Against
                                        </button>
                                    </div>
                                )}
                            </div>

                            {proposal.status !== 'pending' && (
                                <div className="mt-4">
                                    <div className="flex justify-between text-sm mb-2">
                                        <span className="text-[#11d483] font-bold">For: {proposal.votes.for}%</span>
                                        <span className="text-red-400 font-bold">Against: {proposal.votes.against}%</span>
                                    </div>
                                    <div className="h-2 bg-[#234839] rounded-full overflow-hidden flex">
                                        <div
                                            className="bg-[#11d483] h-full"
                                            style={{ width: `${proposal.votes.for}%` }}
                                        ></div>
                                        <div
                                            className="bg-red-500 h-full"
                                            style={{ width: `${proposal.votes.against}%` }}
                                        ></div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 mt-3 text-xs text-[#92c9b2]">
                                <span>Ends: {proposal.endDate}</span>
                                <span>•</span>
                                <span>Quorum: 10%</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default GovernancePage;
