"""
Verify a signature from the iApp output.
This simulates what the Solidity Hook will do.
We can inspire ourselves from this file
"""
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

# Paste your output here
output = {
  "success": True,
  "user_address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
  "pool_id": "0x000000000000000000000000000000000000000000000000000000000000002a",
  "expiry": 1772237429,
  "signature": {
    "r": "0x4f42dd1d4ecf4994c15c8327e3402e76ce8b0a57ed58cd9e6f410c6852c804d6",
    "s": "0x1de6d656ceddb0bcfc60418ebbd2f13c07224e45986a010714dd456863021cb3",
    "v": 27
  },
  "message_hash": "e032ab75abd76a4c67aaccaef49ddadc022bea508d7fbf8f2e4878a236a0c59c"
}

# Expected signer (derived from the test private key)
EXPECTED_SIGNER = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

print("=" * 60)
print("Signature Verification")
print("=" * 60)

# Step 1: Reconstruct the message hash from inputs (like Solidity will do)
user_address = Web3.to_checksum_address(output["user_address"])
pool_id = output["pool_id"]
expiry = output["expiry"]

pool_id_clean = pool_id[2:] if pool_id.startswith('0x') else pool_id
pool_bytes = bytes.fromhex(pool_id_clean.zfill(64))

packed = (
    bytes.fromhex(user_address[2:]) +      # 20 bytes
    pool_bytes +                            # 32 bytes
    expiry.to_bytes(32, 'big')             # 32 bytes
)

reconstructed_hash = Web3.keccak(packed)
print(f"Reconstructed message hash: {reconstructed_hash.hex()}")
print(f"Output message hash:        {output['message_hash']}")
print(f"Hashes match: {reconstructed_hash.hex() == output['message_hash']}")
print()

# Step 2: Recover signer from signature
sig = output["signature"]
r = int(sig["r"], 16)
s = int(sig["s"], 16)
v = sig["v"]

# Recreate signature bytes
signature_bytes = r.to_bytes(32, 'big') + s.to_bytes(32, 'big') + v.to_bytes(1, 'big')

# Apply Ethereum signed message prefix (what encode_defunct does)
signable = encode_defunct(primitive=reconstructed_hash)

# Recover the signer
recovered_signer = Account.recover_message(signable, signature=signature_bytes)

print(f"Recovered signer:  {recovered_signer}")
print(f"Expected signer:   {EXPECTED_SIGNER}")
print(f"Signature valid:   {recovered_signer.lower() == EXPECTED_SIGNER.lower()}")
print()

if recovered_signer.lower() == EXPECTED_SIGNER.lower():
    print("✅ SUCCESS! The signature is valid and was signed by the expected TEE signer.")
else:
    print("❌ FAILED! The signature was NOT signed by the expected signer.")
print("=" * 60)
