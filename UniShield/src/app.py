import json
import os
import sys
import protected_data
from eth_account import Account
from eth_account.messages import encode_defunct
from web3 import Web3

# ⚠️ Your Python code will be run in a python v3.8.3 environment

IEXEC_OUT = os.getenv('IEXEC_OUT')

#computed_json = {}

try:
    #messages = []

    ##### Parsing the Inputs #####
    args = sys.argv[1:]
    if len(args) < 3:
        raise ValueError("Missing args: user_address, pool_id, expiry_timestamp")
        
    user_address = args[0]
    pool_id = args[1]
    expiry_timestamp = int(args[2])
    
    print(f"User: {user_address}")
    print(f"Pool: {pool_id}")
    print(f"Expiry: {expiry_timestamp}")
    
    
    ##### Loading and Validating the Protected Data : the KYC Step #####
    
    """
    We need to decide on the structure of the protected data, then 
    the frontend should call protectData() with that structure.
    
    I propose something like this : 
    
    {
        document_data: "base64_encoded_file_or_hash",
        document_type: "passport", OR "bank_certification" OR any other official document
        is_verified: true  // For hackathon mock
    }
    
    Each field becomes accessible via protected_data.getValue()
    """

    try:
        document_data = protected_data.getValue('document_data', 'file')
        document_type = protected_data.getValue('document_type', 'string')
        is_verified = protected_data.getValue("is_verified", bool)
        
        # Here we need to decide how we will perform the KYC checks
        # For now, I just put a trivial check and return the result in a dict 
        if is_verified and document_type == "passport" and document_data:
            validation_result = {'is_valid': True}
        else :
            validation_result = {'is_valid': False}
    
        
    except Exception as e:
        print('It seems there is an issue with your protected data:', e)
        
        
        
    ##### Retrieving the Signing Key from App Secret #####
    
    
    # we need to add an app secret field to the iapp.config.json
    # Iapp will then retrieve that key only in the enclave, keeping it private
    
    
    
    
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
    
    Solidity equivalent:
    keccak256(abi.encodePacked(userAddress, poolId, expiry))
    """
    
    user_address = Web3.to_checksum_address(user_address)
    
    
    # Handle pool_id - could be an address or bytes32
    if len(pool_id) == 42:  # Address format
        pool_bytes = bytes.fromhex(user_address[2:]).rjust(32, b'\x00')
    else:  # bytes32
        pool_id_clean = pool_id[2:] if pool_id.startswith('0x') else pool_id
        pool_bytes = bytes.fromhex(pool_id_clean.zfill(64)) 
        
    
    # equivalent of abi.encodePacked
    packed = (
        bytes.fromhex(user_address[2:]) +  # 20 bytes (address)
        pool_bytes +                         # 32 bytes (bytes32)
        expiry_timestamp.to_bytes(32, 'big')          # 32 bytes (uint256)
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
    
    
    ##### Writing the Output #####
    
    result = {
            "success": True,
            "user_address": user_address,
            "pool_id": pool_id,
            "expiry": expiry_timestamp,
            "signature": {
                "r": signature['r'],
                "s": signature['s'],
                "v": signature['v']
            },
            "message_hash": message_hash.hex()
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
    
