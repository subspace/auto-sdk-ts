/* eslint-disable @typescript-eslint/no-unused-vars */
/**
 * Wallet module for Auto.
 * This module creates
 * - a new wallet with a random seed phrase with
 * addresses for relay chain and EVM chains (based on BIP-32) and
 * an Auto ID (based on Semaphore Identity).
 * - an unified account with a unique Auto ID (based on Semaphore Identity) added
 * on-chain to one of the EVM domains (where DID registry is deployed).
 *
 * Doc: https://www.notion.so/subspacelabs/Subspace-Unified-Account-Technical-6b73858668984751bc3e10356721990b
 */

import { Keyring } from '@polkadot/api';
import { mnemonicGenerate } from '@polkadot/util-crypto';
import { ethers, Wallet, Contract } from 'ethers';
import { JsonRpcProvider } from '@ethersproject/providers';
import { deferTask, checkBalance } from './utils';
import { getAutoIdFromSeed, getIdentityFromSeed } from './did';
import { generateSssSharesFrom } from './recovery';
import {
  SIGNER_PRIVATE_KEY,
  NOVA_RPC_URL,
  DID_REGISTRY_ADDRESS,
} from './constants';

// Import the DidRegistry ABI from the JSON file
import DidRegistryJson from '../../abi/DidRegistry.json';
const abi = DidRegistryJson.abi;

/**
 * TODO: Check for Auto ID if added on-chain to one of the EVM domains
 * (where DID registry is deployed).
 *
 * @param api The RPC API URL of the main EVM domain
 * @param seedPhrase The seed phrase used to generate the addresses to derive the identity
 * @returns True if the Auto ID exists on-chain, false otherwise
 */
async function checkIfAutoIdExistsOnChain(
  provider: JsonRpcProvider,
  seedPhrase: string
): Promise<boolean> {
  // TODO: connect to the main EVM domain (where DID registry is deployed)
  // apply `is-user-verified` script here after there is 100% certainty that
  // it would not throw any timeout error due to collecting event logs from the chain

  // get the identity from seed phrase
  const identity = getIdentityFromSeed(seedPhrase);

  // get the commitment
  const commitment = identity.commitment;

  // get the nullifier hash (poseidon)
  const nullifier = identity.nullifier;
  // get nullifier hash (poseidon) from the identity

  // call the DID registry contract to check if the identity exists

  // console.log({ api, commitment, nullifier });
  // doesn't exist by default
  return false;
}

/**
 * Generates Ethereum addresses from a given seed phrase following BIP-32.
 *
 * @param seedPhrase - The seed phrase used to generate the addresses.
 * @param numOfAddresses - The number of addresses to generate.
 * @returns An array of generated Ethereum addresses.
 */
export function generateEvmAddressesFromSeed(
  seedPhrase: string,
  numOfAddresses: number
): string[] {
  const addresses: string[] = [];
  const masterNode = ethers.utils.HDNode.fromMnemonic(seedPhrase); // Create a master node from the seed phrase

  for (let i = 0; i < numOfAddresses; i++) {
    const path = `m/44'/60'/0'/0/${i}`; // Standard Ethereum derivation path according to BIP-44
    const childNode = masterNode.derivePath(path); // Derive child node
    addresses.push(childNode.address); // Extract address from child node
  }

  return addresses;
}

/**
 * Generates a Subspace address from a given seed phrase.
 *
 * @param seedPhrase - The seed phrase used to generate the address.
 * @returns The Subspace address generated from the seed phrase.
 */
function generateSubspaceAddress(seedPhrase: string): string {
  // Create a keyring instance from the seed for the Subspace relay chain
  const keyring = new Keyring({ type: 'sr25519' });

  // Add the user to the keyring from the seed phrase
  const user = keyring.addFromUri(seedPhrase);

  // Get the SS58 address from the keyring
  return user.address;
}

/**
 * Represents an AutoWallet object.
 */
export interface AutoWallet {
  subspaceAddress: string;
  evmAddresses: string[];
  autoId: string | bigint;
}

/**
 * Generate a new wallet with a random seed
 * returning the SS58 address and the EVM addresses
 * NOTE: for simplicity, considered only EVM based domains
 *
 * @param mainEvmDomainRpcApiUrl The RPC API URL of the main EVM domain
 * @param numOfEvmChains The number of EVM chains to generate addresses for
 * @returns The AutoWallet object
 */
export async function generateAutoWallet(
  numOfEvmChains: number
): Promise<AutoWallet> {
  try {
    let seedPhrase = '';

    // client
    const provider = new ethers.providers.JsonRpcProvider(NOVA_RPC_URL);

    // Loop until a valid Auto ID is generated
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // Generate a new random seed phrase
      seedPhrase = await deferTask(() => mnemonicGenerate());

      // TODO: Check for a valid Auto ID
      const isAutoIdPreExist = await checkIfAutoIdExistsOnChain(
        provider,
        seedPhrase
      );

      if (!isAutoIdPreExist) {
        // break the loop if the Auto ID doesn't pre-exist onchain
        break;
      }
    }

    // store the seed phrase
    await generateSssSharesFrom(seedPhrase);

    // get the Auto ID (valid that doesn't pre-existed onchain) from the seed phrase
    const autoId = await deferTask(() => getAutoIdFromSeed(seedPhrase));

    // TODO: add the Auto ID on-chain to one of the EVM domains (where DID registry is deployed) i.e. Nova domain
    const signer: Wallet = new Wallet(`0x${SIGNER_PRIVATE_KEY}`, provider);
    await checkBalance(signer);

    // instantiate the DID Registry contract instance via the address & provider
    // contract instance
    const didRegistryContract: Contract = new ethers.Contract(
      DID_REGISTRY_ADDRESS,
      abi,
      provider
    );

    // send the transaction to add the user to the group
    const tx = await didRegistryContract.connect(signer).addToGroup(autoId);
    console.log(`Transaction hash for adding a new user to group: ${tx.hash}`);

    // Get the Subspace address from seed phrase
    const subspaceAddress = await deferTask(() =>
      generateSubspaceAddress(seedPhrase)
    );

    // Get the EVM addresses from the seed phrase (BIP-32)
    const evmAddresses = await deferTask(() =>
      generateEvmAddressesFromSeed(seedPhrase, numOfEvmChains)
    );

    return { subspaceAddress, evmAddresses, autoId };
  } catch (error) {
    throw new Error(`Error thrown during Auto account generation: ${error}`);
  }
}
