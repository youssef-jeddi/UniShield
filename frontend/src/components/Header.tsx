import React from "react";

type PageType = 'dashboard' | 'pools' | 'faucet';

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
        { key: 'faucet', label: 'Faucet' },
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
                        <img
                            src="/logo.png"
                            alt="UniShield Logo"
                            className="w-8 h-8 rounded-lg"
                        />
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