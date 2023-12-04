/**
 * Get auto id
 */

import { getAutoIdFromSeed } from "../index";

async function main() {
  const seedPhrase =
    "lock frost nation imitate party medal knee cigar rough wine document immense";
  console.log("Seed phrase:", seedPhrase);

  const autoId = getAutoIdFromSeed(seedPhrase);
  console.log("Auto ID:", autoId);
}

main()
  .catch(console.error)
  .finally(() => process.exit());
