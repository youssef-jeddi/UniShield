import React from "react";

type PageType = 'dashboard' | 'pools' | 'compliance' | 'governance';

interface HeaderProps {
    isConnected: boolean;
    address?: string;
    chainId: number;
    networks: { id: number; name: string }[];
    isKYCRegistered?: boolean;
    currentPage: PageType;
    onPageChange: (page: PageType) => void;
    onLogin: () => void;
    onLogout: () => void;
    onChainChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}

const Header: React.FC<HeaderProps> = ({
    isConnected,
    address,
    chainId,
    networks,
    isKYCRegistered = false,
    currentPage,
    onPageChange,
    onLogin,
    onLogout,
    onChainChange,
}) => {
    const truncateAddress = (addr: string) => {
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    const navItems: { key: PageType; label: string }[] = [
        { key: 'dashboard', label: 'Dashboard' },
        { key: 'pools', label: 'Pools' },
        { key: 'compliance', label: 'Compliance' },
        { key: 'governance', label: 'Governance' },
    ];

    return (
        <header className="border-b border-[#234839] bg-[#10221a] sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 lg:px-10 py-3">
                <div className="flex items-center justify-between">
                    {/* Logo */}
                    <div
                        className="flex items-center gap-4 cursor-pointer"
                        onClick={() => onPageChange('dashboard')}
                    >
                        <div className="w-8 h-8 bg-[#11d483] rounded-lg flex items-center justify-center">
                            <svg
                                className="w-5 h-5 text-[#10221a]"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z" />
                            </svg>
                        </div>
                        <h2 className="text-white text-lg font-bold tracking-tight">
                            UniShield
                        </h2>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center gap-9">
                        {navItems.map((item) => (
                            <button
                                key={item.key}
                                onClick={() => onPageChange(item.key)}
                                className={`nav-link ${currentPage === item.key ? 'nav-link-active' : ''}`}
                            >
                                {item.label}
                            </button>
                        ))}
                    </nav>

                    {/* Wallet Connection */}
                    <div className="flex items-center gap-3">
                        {isConnected && (
                            <>
                                {/* Chain Selector */}
                                <select
                                    value={chainId}
                                    onChange={onChainChange}
                                    className="bg-[#234839] border-none text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#11d483]/50"
                                >
                                    {networks?.map((network) => (
                                        <option key={network.id} value={network.id}>
                                            {network.name}
                                        </option>
                                    ))}
                                </select>

                                {/* Address Display */}
                                <button className="wallet-btn">
                                    <span className="truncate">
                                        {address && truncateAddress(address)}
                                    </span>
                                </button>

                                {/* Verified Badge */}
                                {isKYCRegistered && (
                                    <div className="verified-badge">
                                        <svg className="w-4 h-4 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                                        </svg>
                                        <span className="text-[#11d483]">Verified</span>
                                    </div>
                                )}
                            </>
                        )}

                        {!isConnected ? (
                            <button onClick={onLogin} className="wallet-btn">
                                Connect Wallet
                            </button>
                        ) : (
                            <button onClick={onLogout} className="btn-ghost text-white hover:text-red-400">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;