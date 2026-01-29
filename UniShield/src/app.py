import json
import os
import sys
import time
import protected_data
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

# ⚠️ Your Python code will be run in a python v3.8.3 environment

IEXEC_OUT = os.getenv('IEXEC_OUT')

ACCEPTED_DOCUMENT_TYPES = ['passport', 'id_card', 'residence_permit']
SANCTIONED_COUNTRIES = ['north korea', 'iran']

# Attestation validity period (30 days in seconds, we can change it)
ATTESTATION_VALIDITY_SECONDS = 30 * 24 * 60 * 60

try:

    ##### Parsing the Inputs #####
    # Global KYC: only need user_address (no pool_id in signature)
    args = sys.argv[1:]
    if len(args) < 1:
        raise ValueError("Missing args: user_address")
        
    user_address = args[0]
    
    # Expiry is set by the TEE, not the user
    expiry_timestamp = int(time.time()) + ATTESTATION_VALIDITY_SECONDS
    
    print(f"User: {user_address}")
    print(f"Expiry: {expiry_timestamp}")
    
    
    ##### KYC Validation Step #####
    
    """
    TODO: Implement real KYC validation using protected data.
    For now, we assume the user is always verified.
    
    Future implementation will use:
    - document_data = protected_data.getValue('document_data', 'file')
    - document_type = protected_data.getValue('document_type', 'string')
    - is_verified = protected_data.getValue("is_verified", 'bool')
    """
    
    # For now, always consider the user as verified
    is_kyc_valid = True
    
    document_data = protected_data.getValue('document_data', 'file')
    document_type = protected_data.getValue('document_type', 'string')
    country = protected_data.getValue('country', 'string')
    
    print(f"Document type: {document_type}")
    print(f"Country: {country}")
    print(f"Document size: {len(document_data) if document_data else 0} bytes")
    
    # Check 1: Document exists and has content
    if not document_data or len(document_data) < 1000:  # At least 1KB
        raise ValueError("Invalid document: file is missing or too small")
    
    # Check 2: Document type is accepted
    if document_type.lower() not in ACCEPTED_DOCUMENT_TYPES:
        raise ValueError(f"Invalid document type: {document_type}. Accepted: {ACCEPTED_DOCUMENT_TYPES}")
    
    # Check 3: Country is not sanctioned
    if country.lower() in SANCTIONED_COUNTRIES:
        raise ValueError(f"Country is sanctioned: {country}")
    
    print("KYC validation passed!")
        
    ##### Retrieving the Signing Key from App Secret #####
    
    
    # we need to add an app secret field to the iapp.config.json
    # Iapp will then retrieve that key only in the enclave, keeping it private
    # IEXEC_APP_DEVELOPER_SECRET is the app secret, it's set in the iapp.config.json which is "private"
    
    
    app_secret = os.getenv("IEXEC_APP_DEVELOPER_SECRET")
    if not app_secret:
        raise ValueError("App secret not configured")
    
        
    secrets = json.loads(app_secret)
    signing_key = secrets.get('SIGNING_PRIVATE_KEY')
    if not signing_key:
        raise ValueError("SIGNING_PRIVATE_KEY not found in app secret")

        
    ##### Creating and Signing the Attestation #####
    """
    Create the hash that will be signed.
    It must match exactly what the solidity Hook reconstructs.
    
    Global KYC - Solidity equivalent:
    keccak256(abi.encodePacked(userAddress, expiry))
    """
    
    user_address = Web3.to_checksum_address(user_address)
    
    # Global KYC: sign only userAddress + expiry (no poolId)
    # This allows one KYC attestation to work for all pools
    packed = (
        bytes.fromhex(user_address[2:]) +      # 20 bytes (address)
        expiry_timestamp.to_bytes(32, 'big')   # 32 bytes (uint256)
    )
    
    
    message_hash = Web3.keccak(packed)
    account = Account.from_key(signing_key)
    
    signable = encode_defunct(primitive=message_hash)
    signed = account.sign_message(signable)
    signature = {
        'r': hex(signed.r),
        's': hex(signed.s),
        'v': signed.v
    }
    
    print(f"Attestation signature generated successfully")
    print(f"Signer address: {account.address}")
    
    
    ##### Writing the Output #####
    
    result = {
            "success": True,
            "user_address": user_address,
            "expiry": expiry_timestamp,
            "signature": {
                "r": signature['r'],
                "s": signature['s'],
                "v": signature['v']
            },
            "message_hash": message_hash.hex(),
            "signer_address": account.address
        }
    
    
except Exception as e:
    print(f"Error: {e}")
    result = {
        "success": False,
        "error": str(e)
    }
    
# Write result
output_path = os.path.join(IEXEC_OUT, 'result.json')
with open(output_path, 'w') as f:
    json.dump(result, f, indent=2)

# Write computed.json 
computed_json = {'deterministic-output-path': output_path}
with open(os.path.join(IEXEC_OUT, 'computed.json'), 'w') as f:
    json.dump(computed_json, f)
    
