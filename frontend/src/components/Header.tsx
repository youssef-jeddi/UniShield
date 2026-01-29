import React from "react";

interface HeaderProps {
    isConnected: boolean;
    address?: string;
    chainId: number;
    networks: { id: number; name: string }[];
    onLogin: () => void;
    onLogout: () => void;
    onChainChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const Header: React.FC<HeaderProps> = ({
    isConnected,
    address,
    chainId,
    networks,
    onLogin,
    onLogout,
    onChainChange,
}) => {
    const truncateAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 py-4">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                            <svg
                                className="w-6 h-6 text-white"
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
                        <div>
                            <h1 className="text-lg font-semibold text-slate-100 tracking-tight">
                                CleanPool
                            </h1>
                            <p className="text-xs text-slate-500">
                                Institutional DeFi Access
                            </p>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-8">
                        <a
                            href="#"
                            className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
                        >
                            Dashboard
                        </a>
                        <a
                            href="#"
                            className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
                        >
                            Pools
                        </a>
                        <a
                            href="#"
                            className="text-sm text-slate-400 hover:text-slate-100 transition-colors"
                        >
                            Documentation
                        </a>
                    </nav>

                    {/* Wallet Connection */}
                    <div className="flex items-center gap-4">
                        {isConnected && (
                            <>
                                {/* Chain Selector */}
                                <select
                                    value={chainId}
                                    onChange={onChainChange}
                                    className="bg-slate-800 border border-slate-700 text-slate-300 text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                                >
                                    {networks?.map((network) => (
                                        <option key={network.id} value={network.id}>
                                            {network.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Address Display */}
                                <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2">
                                    <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                                    <span className="text-sm font-mono text-slate-300">
                                        {address && truncateAddress(address)}
                                    </span>
                                </div>
                            </>
                        )}

                        {!isConnected ? (
                            <button onClick={onLogin} className="btn-primary">
                                Connect Wallet
                            </button>
                        ) : (
                            <button onClick={onLogout} className="btn-secondary">
                                Disconnect
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;