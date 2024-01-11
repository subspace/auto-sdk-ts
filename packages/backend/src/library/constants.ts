import { ethers } from 'ethers';

// SSS related constants
export const NUM_OF_SHARES = 255;
export const THRESHOLD = 10;
export const SECRET_SHARES = 'secret-shares';

// Onchain related constants
export const NOVA_RPC_URL = 'https://nova.gemini-3g.subspace.network/ws';
export const DID_REGISTRY_ADDRESS =
  '0x1596BFd8023ED65C887Fffd35Fd9345776Ed4b22';
export const NOVA_EXPLORER_URL = 'https://nova.subspace.network';
export const PROVIDER = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);
