import React, { useRef } from "react";
import type { VerificationStatus, KYCData, AttestationResult } from "../App";

export interface DepositAmounts {
    token0Amount: string;
    token1Amount: string;
}

interface KYCVerificationProps {
    kycData: KYCData;
    setKycData: React.Dispatch<React.SetStateAction<KYCData>>;
    verificationStatus: VerificationStatus;
    statusMessage: string;
    error: string;
    attestation: AttestationResult | null;
    depositAmounts: DepositAmounts;
    setDepositAmounts: React.Dispatch<React.SetStateAction<DepositAmounts>>;
    isKYCRegistered: boolean;
    kycExpiryDate: Date | null;
    onStartVerification: () => void;
    onDeposit: () => void;
    onReset: () => void;
}

const DOCUMENT_TYPES = [
    { value: "passport", label: "Passport" },
    { value: "id_card", label: "National ID Card" },
    { value: "drivers_license", label: "Driver's License" },
    { value: "residence_permit", label: "Residence Permit" },
];

const COUNTRIES = [
    { value: "united_states", label: "United States" },
    { value: "united_kingdom", label: "United Kingdom" },
    { value: "germany", label: "Germany" },
    { value: "france", label: "France" },
    { value: "switzerland", label: "Switzerland" },
    { value: "singapore", label: "Singapore" },
    { value: "japan", label: "Japan" },
    { value: "canada", label: "Canada" },
    { value: "australia", label: "Australia" },
    { value: "netherlands", label: "Netherlands" },
    { value: "north korea", label: "North Korea" },
    { value: "iran", label: "Iran" }
];

const KYCVerification: React.FC<KYCVerificationProps> = ({
    kycData,
    setKycData,
    verificationStatus,
    statusMessage,
    error,
    attestation,
    depositAmounts,
    setDepositAmounts,
    isKYCRegistered,
    kycExpiryDate,
    onStartVerification,
    onDeposit,
    onReset,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert("File size must be less than 10MB");
                return;
            }
            setKycData((prev) => ({ ...prev, file }));
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        const file = e.dataTransfer.files?.[0];
        if (file) {
            if (file.size > 10 * 1024 * 1024) {
                alert("File size must be less than 10MB");
                return;
            }
            setKycData((prev) => ({ ...prev, file }));
        }
    };

    const isFormValid = kycData.documentType && kycData.country && kycData.file;

    const isProcessing = [
        "UPLOADING",
        "ENCRYPTING",
        "GRANTING_ACCESS",
        "VERIFYING_TEE",
        "DEPOSITING",
    ].includes(verificationStatus);

    const getStepStatus = (step: number) => {
        const steps: { [key: number]: VerificationStatus[] } = {
            1: ["UPLOADING", "ENCRYPTING"],
            2: ["GRANTING_ACCESS"],
            3: ["VERIFYING_TEE"],
            4: ["VERIFIED", "DEPOSITING", "COMPLETED"],
        };

        const completedSteps: { [key: number]: VerificationStatus[] } = {
            1: ["GRANTING_ACCESS", "VERIFYING_TEE", "VERIFIED", "DEPOSITING", "COMPLETED"],
            2: ["VERIFYING_TEE", "VERIFIED", "DEPOSITING", "COMPLETED"],
            3: ["VERIFIED", "DEPOSITING", "COMPLETED"],
            4: ["COMPLETED"],
        };

        if (completedSteps[step].includes(verificationStatus)) {
            return "completed";
        }
        if (steps[step].includes(verificationStatus)) {
            return "active";
        }
        return "pending";
    };

    const showLiquidityForm = isKYCRegistered || verificationStatus === "KYC_REGISTERED" || verificationStatus === "VERIFIED";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Main Form */}
            <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="card p-6">
                    <h3 className="text-white text-xl font-bold mb-6">
                        {showLiquidityForm ? "Step 1: Configure Liquidity" : "Identity Verification"}
                    </h3>

                    {/* KYC Checking State */}
                    {verificationStatus === "KYC_CHECKING" && (
                        <div className="text-center py-12">
                            <div className="w-12 h-12 mx-auto mb-4">
                                <svg className="animate-spin text-[#11d483] w-12 h-12" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                            </div>
                            <p className="text-[#92c9b2]">{statusMessage || "Checking KYC status..."}</p>
                        </div>
                    )}

                    {/* Liquidity Form - shown when KYC is registered */}
                    {showLiquidityForm && (
                        <div className="space-y-4">
                            {/* Token 0 Input */}
                            <div className="p-4 rounded-lg bg-[#10221a]/50 border border-[#234839]">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-[#92c9b2]">Deposit Amount</span>
                                    <span className="text-xs text-[#92c9b2]">Balance: 12.45 ETH</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        step="0.001"
                                        min="0"
                                        placeholder="0.00"
                                        value={depositAmounts.token0Amount}
                                        onChange={(e) => setDepositAmounts((prev) => ({ ...prev, token0Amount: e.target.value }))}
                                        className="bg-transparent border-none text-2xl font-bold text-white focus:ring-0 w-full p-0 focus:outline-none"
                                    />
                                    <div className="token-badge shrink-0">
                                        <div className="token-icon bg-[#627eea]">ETH</div>
                                        <span className="font-bold text-sm">WETH</span>
                                    </div>
                                </div>
                            </div>

                            {/* Token 1 Input */}
                            <div className="p-4 rounded-lg bg-[#10221a]/50 border border-[#234839]">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm font-medium text-[#92c9b2]">Deposit Amount</span>
                                    <span className="text-xs text-[#92c9b2]">Balance: 45,230.00 USDC</span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="0.00"
                                        value={depositAmounts.token1Amount}
                                        onChange={(e) => setDepositAmounts((prev) => ({ ...prev, token1Amount: e.target.value }))}
                                        className="bg-transparent border-none text-2xl font-bold text-white focus:ring-0 w-full p-0 focus:outline-none"
                                    />
                                    <div className="token-badge shrink-0">
                                        <div className="token-icon bg-[#2775ca]">USD</div>
                                        <span className="font-bold text-sm">USDC</span>
                                    </div>
                                </div>
                            </div>

                            {/* Price Range Display */}
                            <div className="mt-6">
                                <div className="flex justify-between items-center mb-4">
                                    <p className="text-white font-bold">Price Range</p>
                                    <div className="flex gap-2">
                                        <button className="text-xs font-bold px-2 py-1 rounded bg-[#234839] hover:bg-[#11d483]/20 text-[#92c9b2]">Full Range</button>
                                        <button className="text-xs font-bold px-2 py-1 rounded bg-[#11d483] text-[#10221a]">Manual</button>
                                    </div>
                                </div>

                                {/* Price Chart Placeholder */}
                                <div className="h-24 w-full bg-[#10221a]/30 rounded-lg relative overflow-hidden flex items-end px-2 gap-1 border border-[#234839]/50">
                                    <div className="w-full h-8 bg-[#11d483]/20 rounded-t-sm"></div>
                                    <div className="w-full h-12 bg-[#11d483]/20 rounded-t-sm"></div>
                                    <div className="w-full h-16 bg-[#11d483]/30 rounded-t-sm border-t-2 border-[#11d483]"></div>
                                    <div className="w-full h-20 bg-[#11d483]/40 rounded-t-sm border-t-2 border-[#11d483]"></div>
                                    <div className="w-full h-14 bg-[#11d483]/20 rounded-t-sm"></div>
                                    <div className="w-full h-10 bg-[#11d483]/10 rounded-t-sm"></div>
                                </div>

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <div className="p-3 rounded-lg bg-[#10221a]/50 border border-[#234839] text-center">
                                        <p className="text-[10px] text-[#92c9b2] uppercase font-bold tracking-wider">Min Price</p>
                                        <p className="text-lg font-bold">2,145.20</p>
                                        <p className="text-[10px] text-[#92c9b2]">USDC per ETH</p>
                                    </div>
                                    <div className="p-3 rounded-lg bg-[#10221a]/50 border border-[#234839] text-center">
                                        <p className="text-[10px] text-[#92c9b2] uppercase font-bold tracking-wider">Max Price</p>
                                        <p className="text-lg font-bold">2,850.15</p>
                                        <p className="text-[10px] text-[#92c9b2]">USDC per ETH</p>
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="mt-6 space-y-3">
                                <button
                                    onClick={onDeposit}
                                    disabled={!depositAmounts.token0Amount || !depositAmounts.token1Amount}
                                    className="btn-primary w-full"
                                >
                                    ADD LIQUIDITY
                                </button>
                                <p className="text-center text-[#92c9b2] text-xs font-medium">
                                    Transaction will include TEE proof for Hook validation
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Processing Steps */}
                    {isProcessing && (
                        <div className="space-y-8">
                            {[
                                { num: 1, title: "Document Encryption", desc: "Encrypting your document with iExec DataProtector" },
                                { num: 2, title: "Grant TEE Access", desc: "Granting secure access to verification service" },
                                { num: 3, title: "TEE Verification", desc: "Processing inside secure enclave" },
                                { num: 4, title: "Blockchain Registration", desc: "Registering KYC attestation on-chain" },
                            ].map((step, index) => {
                                const status = getStepStatus(step.num);
                                return (
                                    <div key={step.num} className="relative pl-10">
                                        <div className={`absolute left-0 top-0 step-indicator ${status === "completed" ? "step-indicator-complete" :
                                            status === "active" ? "step-indicator-active" : "step-indicator-pending"
                                            }`}>
                                            {status === "completed" ? (
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : step.num}
                                        </div>
                                        {index < 3 && (
                                            <div className={`absolute left-3.5 top-7 w-[2px] h-10 step-line ${status === "completed" ? "step-line-complete" : ""}`}></div>
                                        )}
                                        <div className="flex flex-col">
                                            <p className={`font-bold ${status === "pending" ? "text-white/50" : "text-white"}`}>{step.title}</p>
                                            <p className={`text-sm ${status === "pending" ? "text-[#92c9b2]/50" : "text-[#92c9b2]"}`}>{step.desc}</p>
                                            {status === "active" && (
                                                <div className="progress-bar mt-4">
                                                    <div className="progress-bar-fill w-[65%]"></div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Error State */}
                    {verificationStatus === "ERROR" && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mt-4">Verification Failed</h3>
                            <p className="text-red-400 mt-2 font-mono text-sm">{error}</p>
                            <button onClick={onReset} className="btn-secondary mt-6">Try Again</button>
                        </div>
                    )}

                    {/* Completed State */}
                    {verificationStatus === "COMPLETED" && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-[#11d483]/20 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8 text-[#11d483]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-semibold text-white mt-4">Deposit Successful!</h3>
                            <p className="text-[#92c9b2] mt-2">Your liquidity has been deposited to the pool.</p>
                            <button onClick={onReset} className="btn-secondary mt-6">Add More Liquidity</button>
                        </div>
                    )}

                    {/* KYC Form */}
                    {verificationStatus === "IDLE" && (
                        <div className="space-y-6">
                            <div className="space-y-8">
                                {/* Step 1: Wallet Connected */}
                                <div className="relative pl-10">
                                    <div className="absolute left-0 top-0 step-indicator step-indicator-complete">
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                        </svg>
                                    </div>
                                    <div className="absolute left-3.5 top-7 w-[2px] h-10 step-line step-line-complete"></div>
                                    <div className="flex flex-col">
                                        <p className="text-white font-bold">Wallet Connection</p>
                                        <p className="text-[#92c9b2] text-sm">Connected via Privy wallet</p>
                                    </div>
                                </div>

                                {/* Step 2: Document Upload - Active */}
                                <div className="relative pl-10">
                                    <div className="absolute left-0 top-0 step-indicator step-indicator-active">2</div>
                                    <div className="absolute left-3.5 top-7 w-[2px] h-32 step-line"></div>
                                    <div className="flex flex-col">
                                        <p className="text-white font-bold">Identity Verification (KYC)</p>
                                        <p className="text-[#92c9b2] text-sm">Upload your identity document for TEE verification</p>

                                        {/* Document Type & Country Selection */}
                                        <div className="grid grid-cols-2 gap-4 mt-4">
                                            <select
                                                value={kycData.documentType}
                                                onChange={(e) => setKycData((prev) => ({ ...prev, documentType: e.target.value }))}
                                            >
                                                <option value="">Document Type</option>
                                                {DOCUMENT_TYPES.map((type) => (
                                                    <option key={type.value} value={type.value}>{type.label}</option>
                                                ))}
                                            </select>
                                            <select
                                                value={kycData.country}
                                                onChange={(e) => setKycData((prev) => ({ ...prev, country: e.target.value }))}
                                            >
                                                <option value="">Country</option>
                                                {COUNTRIES.map((country) => (
                                                    <option key={country.value} value={country.value}>{country.label}</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* File Upload */}
                                        <div
                                            onClick={() => fileInputRef.current?.click()}
                                            onDrop={handleDrop}
                                            onDragOver={(e) => e.preventDefault()}
                                            className={`file-upload-zone mt-4 ${kycData.file ? "success" : ""}`}
                                        >
                                            <input
                                                ref={fileInputRef}
                                                type="file"
                                                accept="image/*,.pdf"
                                                onChange={handleFileChange}
                                                className="hidden"
                                            />

                                            {kycData.file ? (
                                                <div>
                                                    <div className="w-12 h-12 bg-[#11d483]/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <svg className="w-6 h-6 text-[#11d483]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-white font-medium">{kycData.file.name}</p>
                                                    <p className="text-[#92c9b2] text-sm mt-1">{(kycData.file.size / 1024 / 1024).toFixed(2)} MB</p>
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setKycData((prev) => ({ ...prev, file: null }));
                                                        }}
                                                        className="text-red-400 text-sm mt-2 hover:text-red-300"
                                                    >
                                                        Remove file
                                                    </button>
                                                </div>
                                            ) : (
                                                <div>
                                                    <div className="w-12 h-12 bg-[#234839] rounded-full flex items-center justify-center mx-auto mb-3">
                                                        <svg className="w-6 h-6 text-[#92c9b2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                    </div>
                                                    <p className="text-white">Drop your document here or <span className="text-[#11d483]">browse</span></p>
                                                    <p className="text-[#92c9b2] text-sm mt-1">PDF, PNG, JPG up to 10MB</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Step 3: TEE Processing - Pending */}
                                <div className="relative pl-10">
                                    <div className="absolute left-0 top-0 step-indicator step-indicator-pending">3</div>
                                    <div className="absolute left-3.5 top-7 w-[2px] h-10 step-line"></div>
                                    <div className="flex flex-col">
                                        <p className="text-white/50 font-bold">TEE Processing</p>
                                        <p className="text-[#92c9b2]/50 text-sm">Secure verification in isolated enclave</p>
                                    </div>
                                </div>

                                {/* Step 4: Add Liquidity - Pending */}
                                <div className="relative pl-10">
                                    <div className="absolute left-0 top-0 step-indicator step-indicator-pending">4</div>
                                    <div className="flex flex-col">
                                        <p className="text-white/50 font-bold">Add Liquidity</p>
                                        <p className="text-[#92c9b2]/50 text-sm">Deposit to UniShield protected pool</p>
                                    </div>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="mt-8">
                                <button
                                    onClick={onStartVerification}
                                    disabled={!isFormValid}
                                    className="btn-primary w-full flex items-center justify-center gap-2"
                                >
                                    CONTINUE VERIFICATION
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column - Verification Vault */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="card-highlight p-6 relative">
                    {/* Background Icon */}
                    <div className="absolute top-4 right-4 opacity-10">
                        <svg className="w-24 h-24 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className="status-dot status-dot-success glow-pulse"></div>
                        <h3 className="text-white text-xl font-bold">
                            {showLiquidityForm ? "Compliance Verification" : "Verification Vault"}
                        </h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {/* Status Badge */}
                        <div className="flex items-center justify-between p-4 rounded-lg bg-[#11d483]/10 border border-[#11d483]/30">
                            <div className="flex flex-col">
                                <span className="text-[#92c9b2] text-xs font-bold uppercase tracking-widest">
                                    {showLiquidityForm ? "TEE Status" : "Active TEE Session"}
                                </span>
                                <span className="text-[#11d483] font-bold text-lg">
                                    {showLiquidityForm ? "Signature Valid" : "Ready for Upload"}
                                </span>
                            </div>
                            <svg className="w-8 h-8 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                            </svg>
                        </div>

                        {/* Technical Details */}
                        <div className="space-y-4">
                            {showLiquidityForm && attestation && (
                                <div>
                                    <p className="text-[#92c9b2] text-xs font-bold uppercase mb-2">Cryptographic Hash</p>
                                    <div className="bg-black/40 p-3 rounded font-mono text-xs text-[#11d483] break-all border border-[#234839]">
                                        {attestation.message_hash || "0x7f2a1b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1"}
                                    </div>
                                </div>
                            )}

                            {showLiquidityForm && (
                                <div>
                                    <p className="text-[#92c9b2] text-xs font-bold uppercase mb-2">Attestation Timestamp</p>
                                    <div className="flex items-center gap-2 text-white font-mono text-sm">
                                        <svg className="w-4 h-4 text-[#92c9b2]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        {kycExpiryDate?.toISOString().replace('T', ' ').substring(0, 19) + ' UTC' || '2024-01-31 14:22:01 UTC'}
                                    </div>
                                </div>
                            )}

                            <hr className="border-[#234839]" />

                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                        <span className="text-sm text-white">iExec TEE Worker Node</span>
                                    </div>
                                    <span className="text-[10px] text-[#92c9b2] font-mono">ID: #4920</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                        <span className="text-sm text-white">Identity Hook Validated</span>
                                    </div>
                                    <span className="text-[10px] text-[#11d483] font-mono uppercase">
                                        {showLiquidityForm ? "KYC-LEVEL-3" : "PENDING"}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                        </svg>
                                        <span className="text-sm text-white">Asset Origin Provenance</span>
                                    </div>
                                    <span className="text-[10px] text-[#92c9b2] font-mono uppercase">
                                        {showLiquidityForm ? "CLEAR" : "PENDING"}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Privacy Info Card */}
                <div className="card p-6">
                    <div className="flex gap-4">
                        <svg className="w-6 h-6 text-[#11d483] flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                        </svg>
                        <div className="flex flex-col gap-1">
                            <p className="text-white text-sm font-bold">Privacy-Preserving Compliance</p>
                            <p className="text-[#92c9b2] text-xs leading-relaxed">
                                Your sensitive onboarding data is never revealed to the public blockchain. We use confidential computing to generate proofs that satisfy regulatory requirements while maintaining participant privacy.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default KYCVerification;