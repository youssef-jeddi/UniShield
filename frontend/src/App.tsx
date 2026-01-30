"use client";

import { useEffect, useState } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";
import {
  IExecDataProtector,
  IExecDataProtectorCore,
  type GetResultFromCompletedTaskParams,
  type ProtectedData,
} from "@iexec/dataprotector";
import { supportedChains } from "./config/privyConfig";
import { normalizeChainId } from "./utils/normalizeChainId";
import KYCVerification from "./components/KYCVerification";
import PoolStatus from "./components/PoolStatus";
import Header from "./components/Header";

// Verification state machine
export type VerificationStatus =
  | "IDLE"
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
  };

  const handleChainChange = async (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const selectedChainId = parseInt(event.target.value);
    if (selectedChainId && selectedChainId !== chainId && wallet) {
      try {
        await wallet.switchChain(selectedChainId);
      } catch (error) {
        console.error("Failed to switch chain:", error);
        event.target.value = chainId.toString();
      }
    }
  };

  useEffect(() => {
    const initializeDataProtector = async () => {
      if (isConnected && wallet) {
        try {
          const provider = await wallet.getEthereumProvider();
          const dataProtector = new IExecDataProtector(provider, {
            allowExperimentalNetworks: true,
          });
          setDataProtectorCore(dataProtector.core);
        } catch (error) {
          console.error("Failed to initialize data protector:", error);
          setDataProtectorCore(null);
        }
      } else {
        setDataProtectorCore(null);
      }
    };
    initializeDataProtector();
  }, [isConnected, wallet, chainId]);

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
    if (!dataProtectorCore || !address || !kycData.file) {
      setError("Missing required data");
      return;
    }

    setError("");
    setVerificationStatus("UPLOADING");
    setStatusMessage("Preparing document...");

    try {
      // Step 1: Convert file to ArrayBuffer
      const fileBuffer = await fileToArrayBuffer(kycData.file);

      // Step 2: Protect data
      setVerificationStatus("ENCRYPTING");
      setStatusMessage("Encrypting document with iExec DataProtector...");

      const protectedData = await dataProtectorCore.protectData({
        name: `KYC-${address.slice(0, 8)}-${Date.now()}`,
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

  // Deposit liquidity with attestation
  const depositLiquidity = async () => {
    if (!attestation) return;

    setVerificationStatus("DEPOSITING");
    setStatusMessage("Submitting to liquidity pool...");

    try {
      // TODO: Implement actual Uniswap v4 deposit
      // const hookData = ethers.utils.defaultAbiCoder.encode(
      //   ["bytes32", "bytes32", "uint8", "uint256"],
      //   [attestation.signature.r, attestation.signature.s, attestation.signature.v, attestation.expiry]
      // );
      // await poolManager.modifyLiquidity(..., hookData);

      await new Promise((resolve) => setTimeout(resolve, 2000));

      setVerificationStatus("COMPLETED");
      setStatusMessage("Liquidity deposited successfully!");

    } catch (err: any) {
      console.error("Deposit error:", err);
      setError(err.message || "Deposit failed");
      setVerificationStatus("ERROR");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <Header
        isConnected={isConnected}
        address={address}
        chainId={chainId}
        networks={networks}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onChainChange={handleChainChange}
      />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Pool Status Banner */}
        <PoolStatus />

        {/* Main Content */}
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-24">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-12 text-center max-w-md">
              <div className="w-16 h-16 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg
                  className="w-8 h-8 text-slate-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-100 mb-3">
                Connect to CleanPool
              </h2>
              <p className="text-slate-400 mb-8 text-sm leading-relaxed">
                Connect your wallet to access institutional-grade DeFi liquidity
                with privacy-preserving KYC verification.
              </p>
              <button onClick={handleLogin} className="btn-primary w-full">
                Connect Wallet
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* KYC Verification Panel */}
            <div className="lg:col-span-2">
              <KYCVerification
                kycData={kycData}
                setKycData={setKycData}
                verificationStatus={verificationStatus}
                statusMessage={statusMessage}
                error={error}
                attestation={attestation}
                onStartVerification={startVerification}
                onDeposit={depositLiquidity}
                onReset={resetState}
              />
            </div>

            {/* Attestation Details Panel */}
            <div className="lg:col-span-1">
              <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
                <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-4">
                  Attestation Details
                </h3>

                {attestation ? (
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Status</p>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full"></span>
                        <span className="text-emerald-400 font-medium">
                          Verified
                        </span>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Expiry</p>
                      <p className="text-slate-300 font-mono text-sm">
                        {new Date(attestation.expiry * 1000).toLocaleDateString()}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Message Hash</p>
                      <p className="text-slate-300 font-mono text-xs break-all">
                        {attestation.message_hash}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-500 mb-1">Signer</p>
                      <p className="text-slate-300 font-mono text-xs break-all">
                        {attestation.signer_address}
                      </p>
                    </div>

                    {protectedDataAddress && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">
                          Protected Data
                        </p>
                        <p className="text-slate-300 font-mono text-xs break-all">
                          {protectedDataAddress}
                        </p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                      <svg
                        className="w-6 h-6 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                        />
                      </svg>
                    </div>
                    <p className="text-slate-500 text-sm">
                      Complete KYC verification to view attestation
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}