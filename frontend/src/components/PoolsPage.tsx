import React from 'react';

interface Pool {
    name: string;
    tokens: [string, string];
    tvl: string;
    apr: string;
    volume24h: string;
    kycRequired: boolean;
}

const mockPools: Pool[] = [
    {
        name: 'WETH / USDC',
        tokens: ['WETH', 'USDC'],
        tvl: '$12,450,320',
        apr: '8.4%',
        volume24h: '$2,340,000',
        kycRequired: true,
    },
    {
        name: 'WBTC / USDC',
        tokens: ['WBTC', 'USDC'],
        tvl: '$8,920,150',
        apr: '6.2%',
        volume24h: '$1,120,000',
        kycRequired: true,
    },
    {
        name: 'USDC / DAI',
        tokens: ['USDC', 'DAI'],
        tvl: '$5,230,400',
        apr: '4.1%',
        volume24h: '$890,000',
        kycRequired: false,
    },
    {
        name: 'WETH / WBTC',
        tokens: ['WETH', 'WBTC'],
        tvl: '$3,120,800',
        apr: '5.8%',
        volume24h: '$540,000',
        kycRequired: true,
    },
];

const PoolsPage: React.FC = () => {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-wrap justify-between gap-4 items-center">
                <div>
                    <h1 className="text-white text-3xl font-black">Institutional Pools</h1>
                    <p className="text-[#92c9b2] text-sm mt-1">Browse KYC-protected liquidity pools with institutional-grade compliance</p>
                </div>
                <div className="flex gap-3">
                    <select className="bg-[#234839] border-none text-white text-sm rounded-lg px-4 py-2.5">
                        <option>All Pools</option>
                        <option>KYC Required</option>
                        <option>Public Pools</option>
                    </select>
                    <button className="btn-primary py-2.5 px-4 text-sm">+ Create Pool</button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Total Value Locked</p>
                    <p className="text-white text-2xl font-bold">$29.7M</p>
                    <p className="text-[#11d483] text-xs mt-1">+12.4% this week</p>
                </div>
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">24h Volume</p>
                    <p className="text-white text-2xl font-bold">$4.89M</p>
                    <p className="text-[#11d483] text-xs mt-1">+8.2% vs yesterday</p>
                </div>
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Active Pools</p>
                    <p className="text-white text-2xl font-bold">4</p>
                    <p className="text-[#92c9b2] text-xs mt-1">3 KYC-protected</p>
                </div>
                <div className="card p-5">
                    <p className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-1">Avg APR</p>
                    <p className="text-white text-2xl font-bold">6.1%</p>
                    <p className="text-[#92c9b2] text-xs mt-1">Across all pools</p>
                </div>
            </div>

            {/* Pools Table */}
            <div className="card overflow-hidden">
                <div className="p-5 border-b border-[#234839]">
                    <h2 className="text-white text-lg font-bold">All Pools</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-[#10221a]/50">
                            <tr>
                                <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Pool</th>
                                <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">TVL</th>
                                <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">APR</th>
                                <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">24h Volume</th>
                                <th className="text-left text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Status</th>
                                <th className="text-right text-[#92c9b2] text-xs font-bold uppercase tracking-wider px-5 py-3">Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {mockPools.map((pool, index) => (
                                <tr key={index} className="border-t border-[#234839]/50 hover:bg-[#234839]/20 transition-colors">
                                    <td className="px-5 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex -space-x-2">
                                                <div className="w-8 h-8 rounded-full bg-[#627eea] flex items-center justify-center text-[10px] font-bold border-2 border-[#193328]">
                                                    {pool.tokens[0].slice(0, 2)}
                                                </div>
                                                <div className="w-8 h-8 rounded-full bg-[#2775ca] flex items-center justify-center text-[10px] font-bold border-2 border-[#193328]">
                                                    {pool.tokens[1].slice(0, 2)}
                                                </div>
                                            </div>
                                            <span className="text-white font-bold">{pool.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-5 py-4 text-white font-mono">{pool.tvl}</td>
                                    <td className="px-5 py-4 text-[#11d483] font-bold">{pool.apr}</td>
                                    <td className="px-5 py-4 text-white font-mono">{pool.volume24h}</td>
                                    <td className="px-5 py-4">
                                        {pool.kycRequired ? (
                                            <span className="badge badge-success">
                                                <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 24 24">
                                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                                </svg>
                                                KYC Protected
                                            </span>
                                        ) : (
                                            <span className="badge badge-warning">Public</span>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-right">
                                        <button className="btn-secondary py-2 px-4 text-sm">
                                            Add Liquidity
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default PoolsPage;
