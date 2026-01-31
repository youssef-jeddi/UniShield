import React from "react";

const PoolStatus: React.FC = () => {
    // Mock data - replace with actual pool data
    const poolStats = {
        totalLiquidity: "$12,450,000",
        verifiedParticipants: 47,
        totalParticipants: 47,
        poolHealth: 100,
    };

    return (
        <div className="card p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-[#11d483] rounded-full animate-pulse"></div>
                    <h2 className="text-lg font-semibold text-white">
                        Pool Compliance Status
                    </h2>
                </div>
                <span className="badge badge-success">
                    FULLY COMPLIANT
                </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {/* Total Liquidity */}
                <div>
                    <p className="text-xs text-[#92c9b2] uppercase tracking-wider mb-1 font-bold">
                        Total Liquidity
                    </p>
                    <p className="text-2xl font-semibold text-white font-mono">
                        {poolStats.totalLiquidity}
                    </p>
                </div>

                {/* Verified Participants */}
                <div>
                    <p className="text-xs text-[#92c9b2] uppercase tracking-wider mb-1 font-bold">
                        Verified Participants
                    </p>
                    <p className="text-2xl font-semibold text-white font-mono">
                        {poolStats.verifiedParticipants}
                        <span className="text-[#92c9b2] text-lg">
                            /{poolStats.totalParticipants}
                        </span>
                    </p>
                </div>

                {/* Compliance Rate */}
                <div>
                    <p className="text-xs text-[#92c9b2] uppercase tracking-wider mb-1 font-bold">
                        Compliance Rate
                    </p>
                    <div className="flex items-center gap-2">
                        <p className="text-2xl font-semibold text-[#11d483] font-mono">
                            {poolStats.poolHealth}%
                        </p>
                        <svg
                            className="w-5 h-5 text-[#11d483]"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </div>
                </div>

                {/* Pool Status Indicator */}
                <div>
                    <p className="text-xs text-[#92c9b2] uppercase tracking-wider mb-1 font-bold">
                        Pool Status
                    </p>
                    <div className="flex items-center gap-2">
                        <span className="text-2xl font-semibold text-white">Protected</span>
                        <div className="w-6 h-6 bg-[#11d483]/20 rounded-full flex items-center justify-center">
                            <svg
                                className="w-4 h-4 text-[#11d483]"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                            </svg>
                        </div>
                    </div>
                </div>
            </div>

            {/* Compliance Bar */}
            <div className="mt-6 pt-6 border-t border-[#234839]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-[#92c9b2]">
                        All participants have valid KYC attestations
                    </span>
                    <span className="text-xs text-[#11d483] font-mono">
                        {poolStats.poolHealth}% verified
                    </span>
                </div>
                <div className="progress-bar">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${poolStats.poolHealth}%` }}
                    ></div>
                </div>
            </div>
        </div>
    );
};

export default PoolStatus;