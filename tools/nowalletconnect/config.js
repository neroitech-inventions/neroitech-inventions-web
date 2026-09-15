// ===============================
// NoWalletConnect shared config
// ===============================

const API =
  "https://nowalletconnect.nyerhowoisuru.workers.dev";

const USDT_POLYGON =
  "0xc2132D05D31c914a87C6611C10748AEb04B58e8F";

const USDT_SOLANA =
  "Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB";

const SHEETS = {
  // Used by index.html
  NWC_SHEET_ID:
    "1jqDkywSOl9p4deRwB1DW13gdArxP0XhFaiSLSAB533A",

  NWC_API_KEY:
    "AIzaSyCs8fSiITdfU4WyZRgKsWRlbhAKeJaVC0Q",

  NWC_MERCHANTS:
    "MERCHANTS!A:G",

  NWC_PAYMENTS:
    "PAYMENTS!A:H",

  // Used by merchant.html
  SHEET_ID:
    "1jqDkywSOl9p4deRwB1DW13gdArxP0XhFaiSLSAB533A",

  API_KEY:
    "AIzaSyCs8fSiITdfU4WyZRgKsWRlbhAKeJaVC0Q",

  RANGE:
    "MERCHANTS!A:G"
};

const PAYMENTS = {
  SHEET_ID:
    "1taoinvOhzoILkt-y1mViX8P2hvGWtpI8y8Jp-ZMYtUo",

  RANGE:
    "PAYMENTS!A:H"
};

const PAYMENTS_SHEET_ID =
  PAYMENTS.SHEET_ID;

// Your index.html currently uses this second payments database
const PAYMENTS_FETCH_SHEET_ID =
  "1W6r8bcMl41HvYF2PJ0OyEicg11bcv1DjGNkQMSH85qw";