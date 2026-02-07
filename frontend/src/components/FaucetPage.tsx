import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import {
    TOKEN_A_ADDRESS,
    TOKEN_B_ADDRESS,
    ERC20_ABI,
} from '../config/contract';
import { normalizeChainId } from '../utils/normalizeChainId';
import { SEPOLIA_CHAIN_ID } from '../config/privyConfig';

interface FaucetPageProps {
    address?: string;
    isConnected: boolean;
    wallet?: any;
    onLogin: () => void;
}

// ABI for Minting (adding mint function to standard ERC20)
const MINTABLE_ERC20_ABI = [
    ...ERC20_ABI,
    "function mint(address to, uint256 amount) external"
];

const FaucetPage: React.FC<FaucetPageProps> = ({ address, isConnected, wallet, onLogin }) => {
    const [balances, setBalances] = useState<{ [key: string]: string }>({});
    const [minting, setMinting] = useState<string | null>(null);
    const [status, setStatus] = useState<{ type: 'success' | 'error' | '', message: string }>({ type: '', message: '' });
    
    // Default mint amounts
    const [amounts, setAmounts] = useState<{ [key: string]: string }>({
        [TOKEN_A_ADDRESS]: '10',
        [TOKEN_B_ADDRESS]: '1000'
    });

    const [tokenSymbols, setTokenSymbols] = useState<{ [key: string]: string }>({});
    const [tokenDecimals, setTokenDecimals] = useState<{ [key: string]: number }>({});

    useEffect(() => {
        if (isConnected && address) {
            fetchTokenInfo();
            fetchBalances();
        }
    }, [isConnected, address]);

    const fetchTokenInfo = async () => {
        try {
            // Use a read-only provider for info
            const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
            
            const tokenA = new ethers.Contract(TOKEN_A_ADDRESS, ERC20_ABI, provider);
            const tokenB = new ethers.Contract(TOKEN_B_ADDRESS, ERC20_ABI, provider);

            const [symbolA, decimalsA, symbolB, decimalsB] = await Promise.all([
                tokenA.symbol(),
                tokenA.decimals(),
                tokenB.symbol(),
                tokenB.decimals()
            ]);

            setTokenSymbols({
                [TOKEN_A_ADDRESS]: symbolA,
                [TOKEN_B_ADDRESS]: symbolB
            });

            setTokenDecimals({
                [TOKEN_A_ADDRESS]: Number(decimalsA),
                [TOKEN_B_ADDRESS]: Number(decimalsB)
            });

        } catch (error) {
            console.error("Error fetching token info:", error);
        }
    };

    const fetchBalances = async () => {
        if (!address) return;
        
        try {
            const provider = new ethers.JsonRpcProvider('https://ethereum-sepolia-rpc.publicnode.com');
            const tokenA = new ethers.Contract(TOKEN_A_ADDRESS, ERC20_ABI, provider);
            const tokenB = new ethers.Contract(TOKEN_B_ADDRESS, ERC20_ABI, provider);

            const [balA, balB] = await Promise.all([
                tokenA.balanceOf(address),
                tokenB.balanceOf(address)
            ]);

            // We need decimals to format correctly, but if not loaded yet, assume 18
            const decA = tokenDecimals[TOKEN_A_ADDRESS] || 18;
            const decB = tokenDecimals[TOKEN_B_ADDRESS] || 18;

            setBalances({
                [TOKEN_A_ADDRESS]: ethers.formatUnits(balA, decA),
                [TOKEN_B_ADDRESS]: ethers.formatUnits(balB, decB)
            });

        } catch (error) {
            console.error("Error fetching balances:", error);
        }
    };

    const handleMint = async (tokenAddress: string) => {
        if (!wallet || !address) return;

        const onSepolia = await ensureSepoliaNetwork();
        if (!onSepolia) {
            setStatus({ type: 'error', message: 'Please switch to Sepolia network to mint tokens.' });
            return;
        }

        setMinting(tokenAddress);
        setStatus({ type: '', message: '' });

        try {
            const provider = await wallet.getEthereumProvider();
            const ethersProvider = new ethers.BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();

            const tokenContract = new ethers.Contract(tokenAddress, MINTABLE_ERC20_ABI, signer);
            const decimals = tokenDecimals[tokenAddress] || 18;
            const amount = amounts[tokenAddress] || '10';
            
            const amountWei = ethers.parseUnits(amount, decimals);

            console.log(`Minting ${amount} ${tokenSymbols[tokenAddress]}...`);
            
            const tx = await tokenContract.mint(address, amountWei);
            setStatus({ type: '', message: 'Transaction sent, waiting for confirmation...' });
            
            await tx.wait();
            
            setStatus({ type: 'success', message: `Successfully minted ${amount} ${tokenSymbols[tokenAddress]}!` });
            fetchBalances();
            
        } catch (error: any) {
            console.error("Minting error:", error);
            setStatus({ type: 'error', message: error.message || "Failed to mint tokens." });
        } finally {
            setMinting(null);
        }
    };

    const ensureSepoliaNetwork = async (): Promise<boolean> => {
        if (!wallet) return false;
        const currentChainId = normalizeChainId(wallet.chainId);
        if (currentChainId !== SEPOLIA_CHAIN_ID) {
            try {
                await wallet.switchChain(SEPOLIA_CHAIN_ID);
                return true;
            } catch (error) {
                console.error('Failed to switch to Sepolia:', error);
                return false;
            }
        }
        return true;
    };

    const handleAmountChange = (tokenAddress: string, value: string) => {
        setAmounts(prev => ({ ...prev, [tokenAddress]: value }));
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-wrap justify-between gap-4 items-center">
                <div>
                    <h1 className="text-white text-3xl font-black">Testnet Faucet</h1>
                    <p className="text-[#92c9b2] text-sm mt-1">Mint free test tokens to try out UniShield</p>
                </div>
            </div>

            {!isConnected ? (
                <div className="card p-12 text-center">
                    <div className="w-16 h-16 bg-[#234839] rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-[#92c9b2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3">Wallet Not Connected</h2>
                    <p className="text-[#92c9b2] mb-6">Please connect your wallet to mint test tokens.</p>
                    <button onClick={onLogin} className="btn-primary">Connect Wallet</button>
                </div>
            ) : (
                <>
                    {status.message && (
                        <div className={`p-4 rounded-lg border ${status.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-[#11d483]/10 border-[#11d483]/30 text-[#11d483]'} mb-6`}>
                            {status.message}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Token A Card */}
                        <div className="card p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#627eea] flex items-center justify-center text-xs font-bold border-2 border-[#193328] text-white">
                                        {tokenSymbols[TOKEN_A_ADDRESS]?.slice(0, 3) || 'ETH'}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">{tokenSymbols[TOKEN_A_ADDRESS] || 'Loading...'}</h3>
                                        <p className="text-[#92c9b2] text-xs font-mono">{truncateAddress(TOKEN_A_ADDRESS)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#92c9b2] text-xs">Your Balance</p>
                                    <p className="text-white font-mono font-bold">
                                        {balances[TOKEN_A_ADDRESS] ? parseFloat(balances[TOKEN_A_ADDRESS]).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-2 block">Amount to Mint</label>
                                    <input 
                                        type="number" 
                                        value={amounts[TOKEN_A_ADDRESS]}
                                        onChange={(e) => handleAmountChange(TOKEN_A_ADDRESS, e.target.value)}
                                        className="w-full bg-[#10221a] border border-[#234839] rounded-lg p-3 text-white focus:outline-none focus:border-[#11d483]"
                                        placeholder="Amount"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleMint(TOKEN_A_ADDRESS)}
                                    disabled={minting === TOKEN_A_ADDRESS}
                                    className="btn-primary w-full py-3 flex justify-center items-center gap-2"
                                >
                                    {minting === TOKEN_A_ADDRESS ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Minting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Mint {tokenSymbols[TOKEN_A_ADDRESS]}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Token B Card */}
                        <div className="card p-6">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#2775ca] flex items-center justify-center text-xs font-bold border-2 border-[#193328] text-white">
                                        {tokenSymbols[TOKEN_B_ADDRESS]?.slice(0, 3) || 'USD'}
                                    </div>
                                    <div>
                                        <h3 className="text-white font-bold text-lg">{tokenSymbols[TOKEN_B_ADDRESS] || 'Loading...'}</h3>
                                        <p className="text-[#92c9b2] text-xs font-mono">{truncateAddress(TOKEN_B_ADDRESS)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[#92c9b2] text-xs">Your Balance</p>
                                    <p className="text-white font-mono font-bold">
                                        {balances[TOKEN_B_ADDRESS] ? parseFloat(balances[TOKEN_B_ADDRESS]).toLocaleString(undefined, { maximumFractionDigits: 6 }) : '0'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-[#92c9b2] text-xs font-bold uppercase tracking-wider mb-2 block">Amount to Mint</label>
                                    <input 
                                        type="number" 
                                        value={amounts[TOKEN_B_ADDRESS]}
                                        onChange={(e) => handleAmountChange(TOKEN_B_ADDRESS, e.target.value)}
                                        className="w-full bg-[#10221a] border border-[#234839] rounded-lg p-3 text-white focus:outline-none focus:border-[#11d483]"
                                        placeholder="Amount"
                                    />
                                </div>
                                <button 
                                    onClick={() => handleMint(TOKEN_B_ADDRESS)}
                                    disabled={minting === TOKEN_B_ADDRESS}
                                    className="btn-primary w-full py-3 flex justify-center items-center gap-2"
                                >
                                    {minting === TOKEN_B_ADDRESS ? (
                                        <>
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                            Minting...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Mint {tokenSymbols[TOKEN_B_ADDRESS]}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="card p-6 mt-6">
                         <h3 className="text-white font-bold mb-2">About Faucet</h3>
                         <p className="text-[#92c9b2] text-sm">
                             These tokens are for testing purposes only on the Sepolia testnet. 
                             They have no real value. You can mint as many as you need to test the UniShield functionality.
                         </p>
                    </div>
                </>
            )}
        </div>
    );
};

const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

export default FaucetPage;
