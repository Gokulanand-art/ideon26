/**
 * Generate an scrypt password hash for ADMIN_PASSWORD_HASH.
 * Usage: npm run hash-password -- "your-password"
 */
import { hashPassword } from "../lib/auth";

async function main() {
  const pw = process.argv[2];
  if (!pw) {
    console.error("Usage: npm run hash-password -- \"<password>\"");
    process.exit(1);
  }
  console.log(hashPassword(pw));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
