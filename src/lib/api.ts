import axios from 'axios';
import { Address } from "viem";

const COVALENT_API_KEY = process.env.COVALENT_API_KEY;
const COVALENT_URL = 'https://api.covalenthq.com/v1';
const CHAINALYSIS_URL = 'https://public.chainalysis.com/api/v1';
const CHAINALYSIS_API_KEY = process.env.CHAINALYSIS_API_KEY;

export enum QuoteCurrency {
  EUR = "EUR",
  USD = "USD",
  GBP = "GBP",
}

export type TransactionBase = {
  block_signed_at: string;
  tx_hash: string;
}

export enum TransferType {
  IN = "IN",
  OUT = "OUT",
}

export type Transfer = {
  transfer_type: TransferType;
  from_address: Address;
  from_address_label?: string;
  to_address: Address;
  to_address_label?: string;
  delta: string;
  balance?: number;
  balance_quote?: number;
  delta_quote?: number;
  quote_rate?: number;
} & TransactionBase;

export type TransactionExtended = {
  block_height: number;
  successful: boolean;
  value: string;
  value_quote: number;
  from_address: Address;
  from_address_label?: string;
  to_address: Address;
  to_address_label?: string;
  transfers: Transfer[];
} & TransactionBase;

export type Summary = {
  total_count: number;
  earliest_transaction: TransactionBase;
  latest_transaction: TransactionBase;
}

export type TransactionsSummary = {
  items: Summary[];
}

export type Erc20Transfers = {
  items: TransactionExtended[];
}

export type Value = {
  balance: string;
  quote: number;
  pretty_quote: string;
};

export type TokenHoldingValue = {
  quote_rate: number;
  timestamp: number;
  close: Value;
  high: Value;
  low: Value;
  open: Value;
}

export type Token = {
  contract_decimals: number;
  contract_name: string;
  contract_ticker_symbol: string;
  contract_address: Address;
  logo_url: string;
  holdings: TokenHoldingValue[];
}

export type Chain = {
  chainName: string,
  chainId: number,
  tokens: Token[]
}

export type HistoricalPortfolioBalance = {
  items: Token[]
}

export async function getBlockHeight(chainName: string, date: Date): Promise<number> {
  const formattedStartDate = date.toISOString().split('T')[0]; // Extracts "YYYY-MM-DD" date format
  const endDateTime = new Date(date);
  endDateTime.setDate(endDateTime.getDate() + 1); // Add one day to the date
  const formattedEndDate = endDateTime.toISOString().split('T')[0]; // Extracts "YYYY-MM-DD" date format

  const url = `${COVALENT_URL}/${chainName}/block_v2/${formattedStartDate}/${formattedEndDate}/`;
  const response = await axios.get(url, {
    params: { key: COVALENT_API_KEY },
    timeout: 10000
  });
  return response.data.data.items[0].height;
}

export async function getWalletAge(chainName: string, AddressAddress: string): Promise<TransactionsSummary> {
  const url = `${COVALENT_URL}/${chainName}/address/${AddressAddress}/transactions_summary/`;
  const response = await axios.get(url, {
    params: { key: COVALENT_API_KEY },
    timeout: 10000
  });
  return response.data.data;
}

export async function getERC20Transfers(chainName: string , AddressAddress: string, tokenAddress: string, startBlock: number, endBlock: number, quoteCurrency: QuoteCurrency): Promise<Erc20Transfers> {
  const url = `${COVALENT_URL}/${chainName}/address/${AddressAddress}/transfers_v2/`;
  const response = await axios.get(url, {
    params: {
      key: COVALENT_API_KEY,
      'quote-currency': quoteCurrency,
      'contract-address': tokenAddress,
      'starting-block': startBlock,
      'ending-block': endBlock,
    },
    timeout: 60000
  });
  return response.data.data;
}

export async function getPortfolioValueOverTime(chainName: string , AddressAddress: string, days: number, quoteCurrency: QuoteCurrency): Promise<HistoricalPortfolioBalance> {
  const url = `${COVALENT_URL}/${chainName}/address/${AddressAddress}/portfolio_v2/`;
  const response = await axios.get(url, {
    params: {
      key: COVALENT_API_KEY,
      'quote-currency': quoteCurrency,
      days,
    },
    timeout: 60000
  });
  return response.data.data;
}

export async function isWalletSanctioned(address: string): Promise<boolean> {
  const url = `${CHAINALYSIS_URL}/address/${address}`;
  const response = await axios.get(url, {
    headers: {
      "X-API-Key": CHAINALYSIS_API_KEY,
      "Accept": "application/json"
    },
    timeout: 10000
  });
  return (response.data.identifications.length !== 0);
}


export async function getPrice(slug: string, currency: QuoteCurrency): Promise<number> {
  return 1;
}