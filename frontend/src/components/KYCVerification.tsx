import React, { useRef } from "react";
import type { VerificationStatus, KYCData, AttestationResult } from "../App";

interface KYCVerificationProps {
    kycData: KYCData;
    setKycData: React.Dispatch<React.SetStateAction<KYCData>>;
    verificationStatus: VerificationStatus;
    statusMessage: string;
    error: string;
    attestation: AttestationResult | null;
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

    // Add more countries as needed
];

const KYCVerification: React.FC<KYCVerificationProps> = ({
    kycData,
    setKycData,
    verificationStatus,
    statusMessage,
    error,
    attestation,
    onStartVerification,
    onDeposit,
    onReset,
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            // Validate file size (max 10MB)
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

    const isFormValid =
        kycData.documentType && kycData.country && kycData.file;

    const isProcessing = [
        "UPLOADING",
        "ENCRYPTING",
        "GRANTING_ACCESS",
        "VERIFYING_TEE",
        "DEPOSITING",
    ].includes(verificationStatus);

    const getStatusIcon = () => {
        switch (verificationStatus) {
            case "VERIFIED":
            case "COMPLETED":
                return (
                    <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-emerald-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    </div>
                );
            case "ERROR":
                return (
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center">
                        <svg
                            className="w-8 h-8 text-red-500"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </div>
                );
            default:
                return null;
        }
    };

    const getStepStatus = (step: number) => {
        const steps: { [key: number]: VerificationStatus[] } = {
            1: ["UPLOADING", "ENCRYPTING"],
            2: ["GRANTING_ACCESS"],
            3: ["VERIFYING_TEE"],
            4: ["VERIFIED", "DEPOSITING", "COMPLETED"],
        };

        const completedSteps: { [key: number]: VerificationStatus[] } = {
            1: [
                "GRANTING_ACCESS",
                "VERIFYING_TEE",
                "VERIFIED",
                "DEPOSITING",
                "COMPLETED",
            ],
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

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-lg">
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-800">
                <h2 className="text-lg font-semibold text-slate-100">
                    KYC Verification
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                    Upload your identity document to verify your eligibility for
                    institutional pools
                </p>
            </div>

            <div className="p-6">
                {/* Progress Steps */}
                {isProcessing && (
                    <div className="mb-8">
                        <div className="flex items-center justify-between mb-4">
                            {[
                                { num: 1, label: "Encrypt" },
                                { num: 2, label: "Grant Access" },
                                { num: 3, label: "TEE Verify" },
                                { num: 4, label: "Complete" },
                            ].map((step, index) => (
                                <React.Fragment key={step.num}>
                                    <div className="flex flex-col items-center">
                                        <div
                                            className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all ${getStepStatus(step.num) === "completed"
                                                ? "bg-emerald-500 text-white"
                                                : getStepStatus(step.num) === "active"
                                                    ? "bg-blue-500 text-white animate-pulse"
                                                    : "bg-slate-800 text-slate-500"
                                                }`}
                                        >
                                            {getStepStatus(step.num) === "completed" ? (
                                                <svg
                                                    className="w-5 h-5"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M5 13l4 4L19 7"
                                                    />
                                                </svg>
                                            ) : (
                                                step.num
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500 mt-2">
                                            {step.label}
                                        </span>
                                    </div>
                                    {index < 3 && (
                                        <div
                                            className={`flex-1 h-0.5 mx-2 ${getStepStatus(step.num) === "completed"
                                                ? "bg-emerald-500"
                                                : "bg-slate-800"
                                                }`}
                                        />
                                    )}
                                </React.Fragment>
                            ))}
                        </div>

                        {/* Status Message */}
                        <div className="bg-slate-800/50 rounded-lg p-4 flex items-center gap-3">
                            <div className="w-5 h-5">
                                <svg
                                    className="animate-spin text-blue-500"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            </div>
                            <span className="text-sm text-slate-300">{statusMessage}</span>
                        </div>
                    </div>
                )}

                {/* Success State */}
                {(verificationStatus === "VERIFIED" ||
                    verificationStatus === "COMPLETED") && (
                        <div className="text-center py-8">
                            {getStatusIcon()}
                            <h3 className="text-xl font-semibold text-slate-100 mt-4">
                                {verificationStatus === "COMPLETED"
                                    ? "Deposit Successful!"
                                    : "Verification Complete!"}
                            </h3>
                            <p className="text-slate-400 mt-2">
                                {verificationStatus === "COMPLETED"
                                    ? "Your liquidity has been deposited to the pool."
                                    : "Your KYC attestation is valid for 30 days."}
                            </p>

                            {verificationStatus === "VERIFIED" && (
                                <div className="mt-6 space-y-3">
                                    <button onClick={onDeposit} className="btn-primary">
                                        Deposit Liquidity
                                    </button>
                                    <button
                                        onClick={onReset}
                                        className="btn-secondary block mx-auto"
                                    >
                                        Start New Verification
                                    </button>
                                </div>
                            )}

                            {verificationStatus === "COMPLETED" && (
                                <button onClick={onReset} className="btn-secondary mt-6">
                                    Start New Verification
                                </button>
                            )}
                        </div>
                    )}

                {/* Error State */}
                {verificationStatus === "ERROR" && (
                    <div className="text-center py-8">
                        {getStatusIcon()}
                        <h3 className="text-xl font-semibold text-slate-100 mt-4">
                            Verification Failed
                        </h3>
                        <p className="text-red-400 mt-2 font-mono text-sm">{error}</p>
                        <button onClick={onReset} className="btn-secondary mt-6">
                            Try Again
                        </button>
                    </div>
                )}

                {/* Form State */}
                {verificationStatus === "IDLE" && (
                    <div className="space-y-6">
                        {/* Document Type */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Document Type
                            </label>
                            <select
                                value={kycData.documentType}
                                onChange={(e) =>
                                    setKycData((prev) => ({
                                        ...prev,
                                        documentType: e.target.value,
                                    }))
                                }
                                className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                            >
                                <option value="">Select document type</option>
                                {DOCUMENT_TYPES.map((type) => (
                                    <option key={type.value} value={type.value}>
                                        {type.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Country */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Country of Issuance
                            </label>
                            <select
                                value={kycData.country}
                                onChange={(e) =>
                                    setKycData((prev) => ({ ...prev, country: e.target.value }))
                                }
                                className="w-full bg-slate-800 border border-slate-700 text-slate-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500"
                            >
                                <option value="">Select country</option>
                                {COUNTRIES.map((country) => (
                                    <option key={country.value} value={country.value}>
                                        {country.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* File Upload */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Upload Document
                            </label>
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                onDrop={handleDrop}
                                onDragOver={(e) => e.preventDefault()}
                                className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${kycData.file
                                    ? "border-emerald-500/50 bg-emerald-500/5"
                                    : "border-slate-700 hover:border-slate-600 hover:bg-slate-800/50"
                                    }`}
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
                                        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-3">
                                            <svg
                                                className="w-6 h-6 text-emerald-500"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        </div>
                                        <p className="text-slate-300 font-medium">
                                            {kycData.file.name}
                                        </p>
                                        <p className="text-slate-500 text-sm mt-1">
                                            {(kycData.file.size / 1024 / 1024).toFixed(2)} MB
                                        </p>
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
                                                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                                />
                                            </svg>
                                        </div>
                                        <p className="text-slate-300">
                                            Drop your document here or{" "}
                                            <span className="text-blue-400">browse</span>
                                        </p>
                                        <p className="text-slate-500 text-sm mt-1">
                                            PDF, PNG, JPG up to 10MB
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Privacy Notice */}
                        <div className="bg-slate-800/50 rounded-lg p-4 flex gap-3">
                            <svg
                                className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5"
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
                            <div>
                                <p className="text-sm text-slate-300 font-medium">
                                    Privacy Protected by iExec TEE
                                </p>
                                <p className="text-xs text-slate-500 mt-1">
                                    Your document is encrypted and processed inside a secure
                                    enclave. No one—not even CleanPool—can see your data.
                                </p>
                            </div>
                        </div>

                        {/* Submit Button */}
                        <button
                            onClick={onStartVerification}
                            disabled={!isFormValid}
                            className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Start Verification
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default KYCVerification;