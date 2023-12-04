/**
 * Generate EVM addresses (following BIP-32) from a seed phrase
 */

import { generateEvmAddressesFromSeed } from "../index";

async function main() {
  const seedPhrase =
    "lock frost nation imitate party medal knee cigar rough wine document immense";
  console.log("Seed phrase:", seedPhrase);

  const addresses = generateEvmAddressesFromSeed(seedPhrase, 5);
  console.log("Addresses:", addresses);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
