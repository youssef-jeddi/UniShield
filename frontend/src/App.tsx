"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  IExecDataProtector,
  IExecDataProtectorCore,
} from "@iexec/dataprotector";
import { ethers } from "ethers";
import { supportedChains, SEPOLIA_CHAIN_ID, ARBITRUM_SEPOLIA_CHAIN_ID } from "./config/privyConfig";
import { normalizeChainId } from "./utils/normalizeChainId";
import KYCVerification, { type DepositAmounts } from "./components/KYCVerification";
import PoolsPage from "./components/PoolsPage";
import CompliancePage from "./components/CompliancePage";
import GovernancePage from "./components/GovernancePage";
import Header from "./components/Header";
import {
  POOL_MANAGER_ADDRESS,
  POOL_MODIFY_ROUTER_ADDRESS,
  CLEANPOOL_HOOK_ADDRESS,
  POOL_FEE,
  TICK_SPACING,
  ERC20_ABI,
  POOL_MODIFY_ROUTER_ABI,
  getSortedTokens
} from './config/contract';

// Hook ABI (only the functions we need)
const HOOK_ABI = [
  "function registerKYC(uint256 expiry, uint8 v, bytes32 r, bytes32 s) external",
  "function isKYCValid(address user) view returns (bool)",
  "function kycExpiry(address user) view returns (uint256)",
];

// Verification state machine
export type VerificationStatus =
  | "IDLE"
  | "KYC_CHECKING"     // Checking on-chain KYC status
  | "KYC_REGISTERED"   // Already KYC'd, show liquidity form
  | "UPLOADING"
  | "ENCRYPTING"
  | "GRANTING_ACCESS"
  | "VERIFYING_TEE"
  | "VERIFIED"
  | "DEPOSITING"
  | "COMPLETED"
  | "ERROR";

export interface KYCData {
  documentType: string;
  country: string;
  file: File | null;
}

export interface AttestationResult {
  success: boolean;
  user_address: string;
  expiry: number;
  signature: {
    r: string;
    s: string;
    v: number;
  };
  message_hash: string;
  signer_address: string;
}

export default function App() {
  const { login: privyLogin, logout: privyLogout, authenticated } = usePrivy();
  const { wallets } = useWallets();

  const wallet =
    wallets.find((w) => w.walletClientType === "privy") || wallets[0];
  const address = wallet?.address;
  const isConnected = authenticated && !!wallet;

  const [chainId, setChainId] = useState<number>(
    normalizeChainId(wallet?.chainId)
  );

  useEffect(() => {
    setChainId(normalizeChainId(wallet?.chainId));
  }, [wallet?.chainId]);

  const [dataProtectorCore, setDataProtectorCore] =
    useState<IExecDataProtectorCore | null>(null);

  // KYC State
  const [kycData, setKycData] = useState<KYCData>({
    documentType: "",
    country: "",
    file: null,
  });
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("IDLE");
  const [statusMessage, setStatusMessage] = useState("");
  const [protectedDataAddress, setProtectedDataAddress] = useState<string>("");
  const [attestation, setAttestation] = useState<AttestationResult | null>(
    null
  );
  const [error, setError] = useState<string>("");

  // Deposit amounts state
  const [depositAmounts, setDepositAmounts] = useState<DepositAmounts>({
    token0Amount: "",
    token1Amount: "",
  });

  // On-chain KYC status
  const [isKYCRegistered, setIsKYCRegistered] = useState<boolean>(false);
  const [kycExpiryDate, setKycExpiryDate] = useState<Date | null>(null);

  // Navigation state
  type PageType = 'dashboard' | 'pools' | 'compliance' | 'governance';
  const [currentPage, setCurrentPage] = useState<PageType>('dashboard');

  // iApp address (replace with your deployed iApp address)
  const IAPP_ADDRESS = "0xe4651C6F9354debbfFF077E1E64b5A6cA00B615D";


  const networks = supportedChains;

  const handleLogin = () => privyLogin();
  const handleLogout = async () => {
    try {
      await privyLogout();
      resetState();
    } catch (err) {
      console.error("Failed to logout:", err);
    }
  };

  const resetState = () => {
    setVerificationStatus("IDLE");
    setStatusMessage("");
    setProtectedDataAddress("");
    setAttestation(null);
    setError("");
    setKycData({ documentType: "", country: "", file: null });
    setIsKYCRegistered(false);
    setKycExpiryDate(null);
  };

  const handleChainChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedChainId = parseInt(event.target.value);
    console.log("Attempting to switch to chain:", selectedChainId, "from:", chainId);

    if (selectedChainId && selectedChainId !== chainId && wallet) {
      try {
        console.log("Calling wallet.switchChain...");
        await wallet.switchChain(selectedChainId);
        console.log("Chain switch successful!");
      } catch (error: any) {
        console.error("Failed to switch chain:", error);
        console.error("Error message:", error?.message);
        event.target.value = chainId.toString();
      }
    } else {
      console.log("Switch conditions not met - selectedChainId:", selectedChainId, "chainId:", chainId, "wallet:", !!wallet);
    }
  };

  useEffect(() => {
    const initializeDataProtector = async () => {
      if (isConnected && wallet) {
        // DataProtector only works on Arbitrum Sepolia (or Bellecour)
        const currentChainId = normalizeChainId(wallet.chainId);
        if (currentChainId === ARBITRUM_SEPOLIA_CHAIN_ID || currentChainId === 134) {
          try {
            const provider = await wallet.getEthereumProvider();
            const dataProtector = new IExecDataProtector(provider, {
              allowExperimentalNetworks: true,
            });
            setDataProtectorCore(dataProtector.core);
            console.log("DataProtector initialized on chain:", currentChainId);
          } catch (error) {
            console.error("Failed to initialize data protector:", error);
            setDataProtectorCore(null);
          }
        } else {
          // Not on a supported iExec chain, clear the instance
          console.log("Not on iExec-supported chain, DataProtector not initialized");
          setDataProtectorCore(null);
        }
      } else {
        setDataProtectorCore(null);
      }
    };
    initializeDataProtector();
  }, [isConnected, wallet, chainId]);

  const checkKYCStatus = async () => {
    if (!address) return;

    setVerificationStatus("KYC_CHECKING");
    setStatusMessage("Checking KYC status...");

    console.log("Checking KYC status for address:", address);
    console.log("Hook address:", CLEANPOOL_HOOK_ADDRESS);

    try {
      // Use a static provider for Sepolia - no need to switch user's chain
      // This is a read-only call, so we can use any public RPC
      const sepoliaRpc = "https://1rpc.io/sepolia";
      const sepoliaProvider = new ethers.JsonRpcProvider(sepoliaRpc);

      const hook = new ethers.Contract(CLEANPOOL_HOOK_ADDRESS, HOOK_ABI, sepoliaProvider);

      console.log("Calling isKYCValid...");
      const isValid = await hook.isKYCValid(address);
      console.log("isKYCValid result:", isValid);

      if (isValid) {
        // Get expiry date
        const expiry = await hook.kycExpiry(address);
        const expiryDate = new Date(Number(expiry) * 1000);

        setIsKYCRegistered(true);
        setKycExpiryDate(expiryDate);
        setVerificationStatus("KYC_REGISTERED");
        setStatusMessage(`KYC valid until ${expiryDate.toLocaleDateString()}`);
        console.log("User is KYC registered, expiry:", expiryDate);
      } else {
        setIsKYCRegistered(false);
        setKycExpiryDate(null);
        setVerificationStatus("IDLE");
        setStatusMessage("");
        console.log("User is not KYC registered");
      }
    } catch (error: any) {
      console.error("Failed to check KYC status:", error);
      console.error("Error details:", error.message);
      // If check fails, assume not registered and show KYC form
      setIsKYCRegistered(false);
      setVerificationStatus("IDLE");
      setStatusMessage("");
    }
  };

  // Check KYC status when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      // Small delay to ensure wallet is ready
      const timer = setTimeout(() => {
        checkKYCStatus();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address]);

  // Convert file to ArrayBuffer for DataProtector
  const fileToArrayBuffer = (file: File): Promise<ArrayBuffer> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Main verification flow
  const startVerification = async () => {
    if (!dataProtectorCore || !address || !kycData.file || !wallet) {
      setError("Missing required data");
      return;
    }

    setError("");
    setVerificationStatus("UPLOADING");
    setStatusMessage("Preparing...");

    try {
      // Step 0: Ensure we're on Arbitrum Sepolia for iExec DataProtector
      const currentChainId = normalizeChainId(wallet.chainId);
      if (currentChainId !== ARBITRUM_SEPOLIA_CHAIN_ID) {
        setStatusMessage("Switching to Arbitrum Sepolia for iExec...");
        try {
          await wallet.switchChain(ARBITRUM_SEPOLIA_CHAIN_ID);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError: any) {
          console.error("Failed to switch to Arbitrum Sepolia:", switchError);
          throw new Error("Please switch to Arbitrum Sepolia network for KYC verification");
        }
      }

      // Step 1: Convert file to ArrayBuffer
      setStatusMessage("Preparing document...");
      const fileBuffer = await fileToArrayBuffer(kycData.file);

      // Step 2: Protect data
      setVerificationStatus("ENCRYPTING");
      setStatusMessage("Encrypting document with iExec DataProtector...");

      const protectedData = await dataProtectorCore.protectData({
        name: `KYC-${address.slice(0, 8)}`,
        data: {
          document_data: new Uint8Array(fileBuffer),
          document_type: kycData.documentType,
          country: kycData.country,
        },
      });

      console.log("Protected Data:", protectedData);
      setProtectedDataAddress(protectedData.address);

      // Step 3: Grant access to iApp
      setVerificationStatus("GRANTING_ACCESS");
      setStatusMessage("Granting access to verification enclave...");

      await dataProtectorCore.grantAccess({
        protectedData: protectedData.address,
        authorizedApp: IAPP_ADDRESS,
        authorizedUser: address,
        numberOfAccess: 1,
      });

      // Step 4: Process in TEE (this is where you'd call processProtectedData)
      setVerificationStatus("VERIFYING_TEE");
      setStatusMessage("Analyzing in Secure Enclave... This may take 30-60 seconds.");

      console.log(protectedData.address)
      console.log(IAPP_ADDRESS)
      console.log(address)

      // iExec task execution
      const result = await dataProtectorCore.processProtectedData({
        protectedData: protectedData.address,
        app: IAPP_ADDRESS,
        args: address,
        dataMaxPrice: Number.MAX_SAFE_INTEGER,
        appMaxPrice: Number.MAX_SAFE_INTEGER,
        workerpoolMaxPrice: Number.MAX_SAFE_INTEGER,
        onStatusUpdate: ({ title, isDone }) => {
          console.log(`TEE Status: ${title}, Done: ${isDone}`);
          setStatusMessage(title);
        },
      });

      // Mock TEE response for development
      //await new Promise((resolve) => setTimeout(resolve, 3000));

      //const mockAttestation: AttestationResult = {
      //  success: true,
      //  user_address: address,
      //  expiry: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
      //  signature: {
      //    r: "0x" + "a".repeat(64),
      //    s: "0x" + "b".repeat(64),
      //    v: 27,
      //  },
      //  message_hash: "0x" + "c".repeat(64),
      //  signer_address: "0xTEESignerAddress",
      //};

      console.log("Process Response:", result);
      // processResponse = { txHash, dealId, taskId, result }

      // Get the actual result from the completed task
      // The result is a ZIP file, we need to extract result.json
      const completedTaskResult = await dataProtectorCore.getResultFromCompletedTask({
        taskId: result.taskId,
        path: "result.json",  // Path to extract from the ZIP
        onStatusUpdate: ({ title, isDone }) => {
          console.log(`Result fetch: ${title}, Done: ${isDone}`);
        },
      });

      // The result is inside completedTaskResult.result
      const resultBuffer = completedTaskResult.result;


      // Parse the result
      const resultText = new TextDecoder().decode(resultBuffer);
      const teeOutput: AttestationResult = JSON.parse(resultText);

      console.log("TEE Output:", teeOutput);

      // Validate the response
      if (!teeOutput.success) {
        throw new Error(teeOutput.error || "TEE verification failed");
      }

      setAttestation(teeOutput);
      setVerificationStatus("VERIFIED");
      setStatusMessage("KYC verification complete!");

    } catch (err: any) {
      console.error("Verification error:", err);
      setError(err.message || "Verification failed");
      setVerificationStatus("ERROR");
      setStatusMessage("");
    }
  };

  // Register KYC on-chain
  const registerKYCOnChain = async (
    attestation: AttestationResult,
    signer: ethers.Signer
  ): Promise<boolean> => {
    const hook = new ethers.Contract(
      CLEANPOOL_HOOK_ADDRESS,
      HOOK_ABI,
      signer
    );

    // Check if already registered and still valid
    const userAddress = await signer.getAddress();
    const isValid = await hook.isKYCValid(userAddress);

    if (isValid) {
      console.log("Already KYC registered on-chain, skipping...");
      return true;
    }

    console.log("Registering KYC on-chain...");
    console.log("Attestation:", {
      expiry: attestation.expiry,
      v: attestation.signature.v,
      r: attestation.signature.r,
      s: attestation.signature.s,
    });

    const tx = await hook.registerKYC(
      attestation.expiry,
      attestation.signature.v,
      attestation.signature.r,
      attestation.signature.s
    );

    await tx.wait();
    console.log("KYC registered on-chain!");
    return true;
  };

  // Deposit liquidity (works for both newly verified and already KYC'd users)
  const depositLiquidity = async () => {
    // Allow if user has attestation (just verified) OR is already registered on-chain
    if ((!attestation && !isKYCRegistered) || !wallet) return;

    // Validate deposit amounts
    const amount0 = parseFloat(depositAmounts.token0Amount);
    const amount1 = parseFloat(depositAmounts.token1Amount);
    if (isNaN(amount0) || isNaN(amount1) || amount0 <= 0 || amount1 <= 0) {
      setError("Please enter valid deposit amounts");
      return;
    }

    setVerificationStatus("DEPOSITING");
    setStatusMessage("Preparing transaction...");

    try {
      // Step 0: Switch to Sepolia (where the hook is deployed)
      const currentChainId = normalizeChainId(wallet.chainId);
      if (currentChainId !== SEPOLIA_CHAIN_ID) {
        setStatusMessage("Switching to Sepolia network...");
        try {
          await wallet.switchChain(SEPOLIA_CHAIN_ID);
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (switchError: any) {
          console.error("Failed to switch to Sepolia:", switchError);
          throw new Error("Please switch to Sepolia network manually");
        }
      }

      const provider = await wallet.getEthereumProvider();
      const ethersProvider = new ethers.BrowserProvider(provider);
      const signer = await ethersProvider.getSigner();

      // Step 1: Register KYC on-chain (only if we have a fresh attestation)
      if (attestation && !isKYCRegistered) {
        setStatusMessage("Registering KYC on-chain...");
        await registerKYCOnChain(attestation, signer);
      } else {
        setStatusMessage("KYC already registered...");
      }

      // Step 2: Get sorted tokens first (Uniswap v4 requires currency0 < currency1)
      const { currency0, currency1 } = getSortedTokens();
      console.log("Sorted tokens - currency0:", currency0, "currency1:", currency1);

      // Approve tokens to BOTH the router AND the PoolManager
      // (PoolModifyLiquidityTest uses the PoolManager for settlement)
      setStatusMessage("Approving tokens...");

      const token0Contract = new ethers.Contract(currency0, ERC20_ABI, signer);
      const token1Contract = new ethers.Contract(currency1, ERC20_ABI, signer);

      const token0Decimals = await token0Contract.decimals();
      const token1Decimals = await token1Contract.decimals();
      const token0Symbol = await token0Contract.symbol();
      const token1Symbol = await token1Contract.symbol();

      console.log("Token0:", token0Symbol, "decimals:", token0Decimals);
      console.log("Token1:", token1Symbol, "decimals:", token1Decimals);

      // Determine amounts based on which token is which
      // currency0 is USDC (6 decimals), currency1 is WETH (18 decimals)
      let amount0Wei, amount1Wei;
      if (token0Symbol === "USDC") {
        amount0Wei = ethers.parseUnits(depositAmounts.token1Amount, token0Decimals); // USDC amount
        amount1Wei = ethers.parseEther(depositAmounts.token0Amount); // WETH amount
      } else {
        amount0Wei = ethers.parseEther(depositAmounts.token0Amount);
        amount1Wei = ethers.parseUnits(depositAmounts.token1Amount, token1Decimals);
      }

      console.log("Amount0 (wei):", amount0Wei.toString());
      console.log("Amount1 (wei):", amount1Wei.toString());

      // Check balances
      const balance0 = await token0Contract.balanceOf(await signer.getAddress());
      const balance1 = await token1Contract.balanceOf(await signer.getAddress());
      console.log("Balance0:", balance0.toString(), "needed:", amount0Wei.toString());
      console.log("Balance1:", balance1.toString(), "needed:", amount1Wei.toString());

      // Approve to BOTH router AND PoolManager (v4 needs approvals to multiple contracts)
      const maxApproval = ethers.MaxUint256;

      // Force fresh approvals - don't rely on allowance checks
      setStatusMessage(`Approving ${token0Symbol} for router...`);
      console.log(`Approving ${token0Symbol} for router...`);
      const approveTx0Router = await token0Contract.approve(POOL_MODIFY_ROUTER_ADDRESS, maxApproval);
      await approveTx0Router.wait();
      console.log(token0Symbol, "approved for router");

      setStatusMessage(`Approving ${token0Symbol} for PoolManager...`);
      console.log(`Approving ${token0Symbol} for PoolManager...`);
      const approveTx0PM = await token0Contract.approve(POOL_MANAGER_ADDRESS, maxApproval);
      await approveTx0PM.wait();
      console.log(token0Symbol, "approved for PoolManager");

      setStatusMessage(`Approving ${token1Symbol} for router...`);
      console.log(`Approving ${token1Symbol} for router...`);
      const approveTx1Router = await token1Contract.approve(POOL_MODIFY_ROUTER_ADDRESS, maxApproval);
      await approveTx1Router.wait();
      console.log(token1Symbol, "approved for router");

      setStatusMessage(`Approving ${token1Symbol} for PoolManager...`);
      console.log(`Approving ${token1Symbol} for PoolManager...`);
      const approveTx1PM = await token1Contract.approve(POOL_MANAGER_ADDRESS, maxApproval);
      await approveTx1PM.wait();
      console.log(token1Symbol, "approved for PoolManager");

      // Step 3: Add liquidity via the router
      setStatusMessage("Adding liquidity to pool...");

      // Create the pool key
      const poolKey = {
        currency0: currency0,
        currency1: currency1,
        fee: POOL_FEE,
        tickSpacing: TICK_SPACING,
        hooks: CLEANPOOL_HOOK_ADDRESS,
      };

      // Create the liquidity params
      // Using a smaller tick range for testing
      const tickLower = -600; // Closer to current tick (0)
      const tickUpper = 600;

      // Use an EXTREMELY small liquidity amount - Uniswap v4 liquidity units can require lots of tokens
      // 1e6 worked, 1e10 failed - trying 1e8 as a middle ground
      const liquidityDelta = BigInt(1e8); // Testing larger liquidity

      console.log("Using liquidityDelta:", liquidityDelta.toString());

      const modifyParams = {
        tickLower: tickLower,
        tickUpper: tickUpper,
        liquidityDelta: liquidityDelta,
        salt: ethers.zeroPadBytes(ethers.toUtf8Bytes("UniShield"), 32),
      };

      console.log("Pool Key:", poolKey);
      console.log("Modify Params:", modifyParams);

      // Call the router
      const router = new ethers.Contract(
        POOL_MODIFY_ROUTER_ADDRESS,
        POOL_MODIFY_ROUTER_ABI,
        signer
      );

      const tx = await router.modifyLiquidity(
        poolKey,
        modifyParams,
        "0x", // Empty hook data
        { gasLimit: 500000 }
      );

      setStatusMessage("Waiting for confirmation...");
      const receipt = await tx.wait();
      console.log("Liquidity added! Tx:", receipt.hash);

      setVerificationStatus("COMPLETED");
      setStatusMessage("Liquidity deposited successfully!");

    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.message || "Deposit failed");
      setVerificationStatus("ERROR");
    }
  };

  return (
    <div className="min-h-screen bg-[#10221a] text-white flex flex-col">
      <Header
        isConnected={isConnected}
        address={address}
        chainId={chainId}
        networks={networks}
        isKYCRegistered={isKYCRegistered}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onChainChange={handleChainChange}
      />

      <main className="flex-1 px-6 lg:px-10 py-8 crypto-grid">
        <div className="max-w-[1200px] mx-auto">
          {/* Render page based on navigation */}
          {currentPage === 'pools' ? (
            <PoolsPage />
          ) : currentPage === 'compliance' ? (
            <CompliancePage />
          ) : currentPage === 'governance' ? (
            <GovernancePage />
          ) : (
            <>
              {/* Dashboard / KYC Page */}
              {/* Breadcrumbs */}
              <div className="flex flex-wrap gap-2 pb-4">
                <span className="text-[#92c9b2] text-sm font-medium">Dashboard</span>
                <span className="text-[#92c9b2] text-sm font-medium">/</span>
                <span className="text-white text-sm font-medium">
                  {isKYCRegistered || verificationStatus === "KYC_REGISTERED" ? "Add Liquidity" : "Compliance Onboarding"}
                </span>
              </div>

              {/* Page Heading */}
              <div className="flex flex-wrap justify-between gap-3 pb-8">
                <div className="flex min-w-72 flex-col gap-2">
                  <p className="text-white text-4xl font-black leading-tight tracking-tight">
                    {isKYCRegistered || verificationStatus === "KYC_REGISTERED" ? "Add Liquidity" : "Compliance Onboarding"}
                  </p>
                  <p className="text-[#92c9b2] text-base font-normal leading-normal">
                    {isKYCRegistered || verificationStatus === "KYC_REGISTERED"
                      ? "Institutional-grade privacy-preserving liquidity provision via TEE signatures."
                      : "Establish your identity and asset provenance for private liquidity access."}
                  </p>
                </div>
              </div>

              {/* Main Content */}
              {!isConnected ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <div className="card p-12 text-center max-w-md">
                    <div className="w-16 h-16 bg-[#234839] rounded-full flex items-center justify-center mx-auto mb-6">
                      <svg className="w-8 h-8 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold text-white mb-3">
                      Connect to UniShield
                    </h2>
                    <p className="text-[#92c9b2] mb-8 text-sm leading-relaxed">
                      Connect your wallet to access institutional-grade DeFi liquidity
                      with privacy-preserving KYC verification.
                    </p>
                    <button onClick={handleLogin} className="btn-primary w-full">
                      Connect Wallet
                    </button>
                  </div>
                </div>
              ) : (
                <KYCVerification
                  kycData={kycData}
                  setKycData={setKycData}
                  verificationStatus={verificationStatus}
                  statusMessage={statusMessage}
                  error={error}
                  attestation={attestation}
                  depositAmounts={depositAmounts}
                  setDepositAmounts={setDepositAmounts}
                  isKYCRegistered={isKYCRegistered}
                  kycExpiryDate={kycExpiryDate}
                  onStartVerification={startVerification}
                  onDeposit={depositLiquidity}
                  onReset={resetState}
                />
              )}
            </>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 lg:px-10 py-6 border-t border-[#234839] flex justify-between items-center text-xs text-[#92c9b2]">
        <div className="flex items-center gap-4">
          <span>© 2024 UniShield Institutional</span>
          <span className="w-1 h-1 bg-[#234839] rounded-full"></span>
          <a className="hover:text-[#11d483] transition-colors" href="#">Privacy Policy</a>
          <span className="w-1 h-1 bg-[#234839] rounded-full"></span>
          <a className="hover:text-[#11d483] transition-colors" href="#">Terms of Service</a>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 bg-[#11d483] rounded-full glow-pulse"></span>
          <span className="text-white font-medium">Sepolia Testnet</span>
        </div>
      </footer>
    </div>
  );
}