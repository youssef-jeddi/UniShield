import React, { useRef } from "react";
import type { VerificationStatus, KYCData } from "../App";

interface KYCVerificationProps {
    kycData: KYCData;
    setKycData: React.Dispatch<React.SetStateAction<KYCData>>;
    verificationStatus: VerificationStatus;
    statusMessage: string;
    error: string;
    isKYCRegistered: boolean;
    kycExpiryDate: Date | null;
    onStartVerification: () => void;
    onNavigateToPools: () => void;
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
    isKYCRegistered,
    kycExpiryDate,
    onStartVerification,
    onNavigateToPools,
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
    ].includes(verificationStatus);

    const getStepStatus = (step: number) => {
        const steps: { [key: number]: VerificationStatus[] } = {
            1: ["UPLOADING", "ENCRYPTING"],
            2: ["GRANTING_ACCESS"],
            3: ["VERIFYING_TEE"],
        };

        const completedSteps: { [key: number]: VerificationStatus[] } = {
            1: ["GRANTING_ACCESS", "VERIFYING_TEE", "VERIFIED"],
            2: ["VERIFYING_TEE", "VERIFIED"],
            3: ["VERIFIED"],
        };

        if (completedSteps[step].includes(verificationStatus)) {
            return "completed";
        }
        if (steps[step].includes(verificationStatus)) {
            return "active";
        }
        return "pending";
    };

    // Check if KYC is completed (either already registered or just verified)
    const isKYCComplete = isKYCRegistered || verificationStatus === "KYC_REGISTERED" || verificationStatus === "VERIFIED";

    return (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-3 flex flex-col gap-6">
                <div className="card p-6">
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

                    {/* KYC Verified State - Show Status and Redirect Button */}
                    {isKYCComplete && (
                        <div className="text-center py-8">
                            <div className="w-20 h-20 bg-[#11d483]/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-10 h-10 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-5-5 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                                </svg>
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">KYC Verified</h3>
                            <p className="text-[#92c9b2] mb-6">
                                Your identity has been verified. You can now access KYC-protected liquidity pools.
                            </p>

                            {/* KYC Details */}
                            <div className="bg-[#10221a]/50 border border-[#234839] rounded-lg p-4 mb-6 max-w-md mx-auto">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[#92c9b2] text-sm">Status</span>
                                    <span className="text-[#11d483] font-bold flex items-center gap-2">
                                        <span className="w-2 h-2 bg-[#11d483] rounded-full"></span>
                                        Active
                                    </span>
                                </div>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[#92c9b2] text-sm">Verification Level</span>
                                    <span className="text-white font-bold">KYC Level 3</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[#92c9b2] text-sm">Valid Until</span>
                                    <span className="text-white font-mono text-sm">
                                        {kycExpiryDate?.toLocaleDateString('en-US', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric'
                                        }) || 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Call to Action - Navigate to Pools */}
                            <button
                                onClick={onNavigateToPools}
                                className="btn-primary py-4 px-8 text-lg flex items-center justify-center gap-3 mx-auto"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                                </svg>
                                Go to Pools
                            </button>
                            <p className="text-[#92c9b2] text-xs mt-4">
                                Deposit liquidity to earn fees on KYC-protected pools
                            </p>
                        </div>
                    )}

                    {/* Processing Steps - During KYC Verification */}
                    {isProcessing && (
                        <div>
                            <h3 className="text-white text-xl font-bold mb-6">Verifying Identity</h3>
                            <div className="space-y-8">
                                {[
                                    { num: 1, title: "Document Encryption", desc: "Encrypting your document with iExec DataProtector" },
                                    { num: 2, title: "Grant TEE Access", desc: "Granting secure access to verification service" },
                                    { num: 3, title: "TEE Verification", desc: "Processing inside secure enclave" },
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
                                            {index < 2 && (
                                                <div className={`absolute left-3.5 top-7 w-[2px] h-10 step-line ${status === "completed" ? "step-line-complete" : ""}`}></div>
                                            )}
                                            <div className="flex flex-col">
                                                <p className={`font-bold ${status === "pending" ? "text-white/50" : "text-white"}`}>{step.title}</p>
                                                <p className={`text-sm ${status === "pending" ? "text-[#92c9b2]/50" : "text-[#92c9b2]"}`}>{step.desc}</p>
                                                {status === "active" && (
                                                    <div className="mt-3">
                                                        <div className="progress-bar">
                                                            <div className="progress-bar-fill w-[65%]"></div>
                                                        </div>
                                                        <p className="text-[#92c9b2] text-xs mt-2">{statusMessage}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
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

                    {/* KYC Form - For users who need to verify */}
                    {verificationStatus === "IDLE" && (
                        <div className="space-y-6">
                            <h3 className="text-white text-xl font-bold">Identity Verification</h3>
                            <p className="text-[#92c9b2] text-sm">
                                Complete KYC verification to access institutional-grade DeFi liquidity pools.
                            </p>

                            <div className="space-y-8 mt-6">
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
                                        <p className="text-white font-bold">Identity Document</p>
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
                                    <div className="flex flex-col">
                                        <p className="text-white/50 font-bold">TEE Verification</p>
                                        <p className="text-[#92c9b2]/50 text-sm">Secure verification in isolated enclave</p>
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
                                    START VERIFICATION
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Column - Info Panel */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                <div className="card-highlight p-6 relative">
                    {/* Background Icon */}
                    <div className="absolute top-4 right-4 opacity-10">
                        <svg className="w-24 h-24 text-[#11d483]" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                        </svg>
                    </div>

                    <div className="flex items-center gap-3 mb-6">
                        <div className={`status-dot ${isKYCComplete ? 'status-dot-success glow-pulse' : 'status-dot-warning'}`}></div>
                        <h3 className="text-white text-xl font-bold">
                            {isKYCComplete ? "Verification Complete" : "Verification Required"}
                        </h3>
                    </div>

                    <div className="space-y-6 relative z-10">
                        {/* Status Badge */}
                        <div className={`flex items-center justify-between p-4 rounded-lg ${isKYCComplete ? 'bg-[#11d483]/10 border border-[#11d483]/30' : 'bg-yellow-500/10 border border-yellow-500/30'}`}>
                            <div className="flex flex-col">
                                <span className="text-[#92c9b2] text-xs font-bold uppercase tracking-widest">
                                    KYC Status
                                </span>
                                <span className={`font-bold text-lg ${isKYCComplete ? 'text-[#11d483]' : 'text-yellow-500'}`}>
                                    {isKYCComplete ? "Verified" : "Not Verified"}
                                </span>
                            </div>
                            <svg className={`w-8 h-8 ${isKYCComplete ? 'text-[#11d483]' : 'text-yellow-500'}`} fill="currentColor" viewBox="0 0 24 24">
                                {isKYCComplete ? (
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
                                ) : (
                                    <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
                                )}
                            </svg>
                        </div>

                        <hr className="border-[#234839]" />

                        {/* Features List */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className={`w-4 h-4 ${isKYCComplete ? 'text-[#11d483]' : 'text-[#92c9b2]'}`} fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                    <span className="text-sm text-white">iExec TEE Processing</span>
                                </div>
                                <span className={`text-[10px] font-mono uppercase ${isKYCComplete ? 'text-[#11d483]' : 'text-[#92c9b2]'}`}>
                                    {isKYCComplete ? "COMPLETE" : "PENDING"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className={`w-4 h-4 ${isKYCComplete ? 'text-[#11d483]' : 'text-[#92c9b2]'}`} fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                    <span className="text-sm text-white">On-Chain Attestation</span>
                                </div>
                                <span className={`text-[10px] font-mono uppercase ${isKYCComplete ? 'text-[#11d483]' : 'text-[#92c9b2]'}`}>
                                    {isKYCComplete ? "REGISTERED" : "PENDING"}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <svg className={`w-4 h-4 ${isKYCComplete ? 'text-[#11d483]' : 'text-[#92c9b2]'}`} fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                                    </svg>
                                    <span className="text-sm text-white">Pool Access</span>
                                </div>
                                <span className={`text-[10px] font-mono uppercase ${isKYCComplete ? 'text-[#11d483]' : 'text-[#92c9b2]'}`}>
                                    {isKYCComplete ? "GRANTED" : "LOCKED"}
                                </span>
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
                                Your sensitive documents are encrypted and processed inside a Trusted Execution Environment (TEE).
                                Only the verification result is stored on-chain - never your personal data.
                            </p>
                        </div>
                    </div>
                </div>

                {/* What Happens Next - Only show when not verified */}
                {!isKYCComplete && (
                    <div className="card p-6">
                        <h4 className="text-white font-bold mb-3">What happens next?</h4>
                        <ol className="space-y-2 text-[#92c9b2] text-sm">
                            <li className="flex gap-2">
                                <span className="text-[#11d483] font-bold">1.</span>
                                Your document is encrypted locally
                            </li>
                            <li className="flex gap-2">
                                <span className="text-[#11d483] font-bold">2.</span>
                                Processed in a secure TEE enclave
                            </li>
                            <li className="flex gap-2">
                                <span className="text-[#11d483] font-bold">3.</span>
                                KYC attestation registered on-chain
                            </li>
                            <li className="flex gap-2">
                                <span className="text-[#11d483] font-bold">4.</span>
                                Access granted to protected pools
                            </li>
                        </ol>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KYCVerification;
