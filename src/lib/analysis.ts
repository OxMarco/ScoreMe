import { linearRegression } from 'simple-statistics';
import { Address } from "viem";
import { Chain, QuoteCurrency, TransferType, Transfer, getBlockHeight, getERC20Transfers, getPortfolioValueOverTime, getWalletAge } from './api';
import { isDateWithinRange, isNumberWithinRange } from './helpers';

export async function analysePortfolioTrend(chainName: string, walletAddress: Address, days: number, quoteCurrency: QuoteCurrency): Promise<{ trend: 'increasing' | 'decreasing' | 'neutral', endValueProjected: number, percentageChange: number }> {
  // Fetch the portfolio value over the last 30 days
  const historicalData = await getPortfolioValueOverTime(chainName, walletAddress, days, quoteCurrency);

  // Prepare the data for linear regression
  const dataForRegression = historicalData.items.map((token, index) => {
    // Assuming `quote` gives the USD value of the token
    const totalValue = token.holdings.reduce((acc, holding) => acc + holding.close.quote, 0);
    return [index, totalValue]; // [day, totalValue]
  });

  const regressionLine = linearRegression(dataForRegression);

  // Calculate the percentage change using the slope of the regression line
  const startValue = dataForRegression[0][1];
  const endValueProjected = startValue + (regressionLine.m * (days - 1)); // using y = mx + c, for the last day
  const percentageChange = ((endValueProjected - startValue) / startValue) * 100;

  // Determine the trend
  let trend: 'increasing' | 'decreasing' | 'neutral';
  if (regressionLine.m > 0) {
    trend = 'increasing';
  } else if (regressionLine.m < 0) {
    trend = 'decreasing';
  } else {
    trend = 'neutral';
  }

  return { trend, endValueProjected, percentageChange };
}

export async function analyseRecurrentTransfers(chainName: string, walletAddress: Address, days: number, tokenAddress: Address) {
  const currentDate = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(currentDate.getDate() - days);
  const startBlock = await getBlockHeight(chainName as string, ninetyDaysAgo);  // Using the function from your code
  const endBlock = await getBlockHeight(chainName as string, currentDate);  // Using the function from your code
  const transactions = await getERC20Transfers(chainName as string, walletAddress as string, tokenAddress, startBlock, endBlock, QuoteCurrency.EUR);
  const incoming: Transfer[] = [];
  const outgoing: Transfer[] = [];
  const incomingBySender: { [address: string]: Transfer[] } = {};
  const outgoingBySender: { [address: string]: Transfer[] } = {};

  for (const transaction of transactions.items) {
    const transfer = transaction.transfers[0]
    if (transfer.transfer_type === TransferType.IN) {
      incoming.push(transfer);
      if (!incomingBySender[transfer.from_address]) {
        incomingBySender[transfer.from_address] = [];
      }
      incomingBySender[transfer.from_address].push(transfer);
    } else {
      outgoing.push(transfer);
      if (!outgoingBySender[transfer.to_address]) {
        outgoingBySender[transfer.to_address] = [];
      }
      outgoingBySender[transfer.to_address].push(transfer);
    }
  }

  const recurringTransactions: Transfer[] = [];

  // Sort transactions by date
  incoming.sort((a, b) => new Date(a.block_signed_at).getTime() - new Date(b.block_signed_at).getTime());

  for (let i = 1; i < incoming.length; i++) {
    const currentTx = incoming[i];
    const previousTx = incoming[i - 1];
    
    const currentDate = new Date(currentTx.block_signed_at);
    const previousDate = new Date(previousTx.block_signed_at);
    
    const intervalInDays = (currentDate.getTime() - previousDate.getTime()) / (24 * 3600 * 1000);
  
    if (isDateWithinRange(previousDate, currentDate, intervalInDays) && isNumberWithinRange(previousTx.delta, currentTx.delta)) {
      recurringTransactions.push(currentTx);
    }
  }

  // TODO to be completed
}

export async function runScoringChecks(walletAddress: Address, chains: Chain[], quoteCurrency: QuoteCurrency): Promise<number> {
  console.log("---- runScoringChecks ----")

  console.log("wallet", walletAddress)

  let totalPoints = 0;

  for (const chain of chains) {
    console.log("\n")

    // 1. Check if number of transactions is > 20
    const walletSummary = await getWalletAge(chain.chainName, walletAddress);
    if (walletSummary.items === null || walletSummary.items[0].total_count <= 20) {
      console.log("Skipping chain "+chain.chainName+" because of too few transactions");
      continue;
    }
  
    // 2. Check if the wallet is at least 90 days old
    const walletCreationDate = new Date(walletSummary.items[0].earliest_transaction.block_signed_at);
    const currentDate = new Date();
    const ageInDays = (currentDate.getTime() - walletCreationDate.getTime()) / (1000 * 3600 * 24);
    if (ageInDays < 90) {
      console.log("Skipping chain "+chain.chainName+" because of a too fresh wallet")
      continue;
    }
  
    // 3. Check if the latest transaction is at max 30 days old
    const latestTransactionDate = new Date(walletSummary.items[0].latest_transaction.block_signed_at);
    const daysSinceLastTransaction = (currentDate.getTime() - latestTransactionDate.getTime()) / (1000 * 3600 * 24);
    if (daysSinceLastTransaction > 30) {
      console.log("Skipping chain "+chain.chainName+" because of an idle wallet");
      continue;
    }

    console.log("******** Starting analysis for chain : " + chain.chainName + " ********")
  
    // 4. Check if the wallet has a positive balance trend in the last 90 days
    console.log("Check if the wallet has a positive balance trend in the last 90 days")
    const { trend, endValueProjected, percentageChange } = await analysePortfolioTrend(chain.chainName, walletAddress, 90, quoteCurrency);
    console.log("trend", trend)
    console.log("percentageChange", percentageChange)

    // 5. Check if the wallet has received recurrent transfers (a salary) in the last 90 days
    for(const token of chain.tokens) {
      console.log("Check if the wallet has received recurrent transfers (a salary) in the last 90 days for token "+token.contract_ticker_symbol)
      //await analyseRecurrentTransfers(chain.chainName, walletAddress, 90, token.contract_address);
    }

    console.log("******** Completed analysis for chain : " + chain.chainName + " ********")
  
    // 6. Scoring
    if (walletSummary.items[0].total_count > 50) {
      totalPoints += 10;
    }

    if (ageInDays > 360) {
      totalPoints += 20;
    } else if (ageInDays > 180) {
      totalPoints += 10;
    }

    if (daysSinceLastTransaction < 30) {
      totalPoints += 20;
    } else if (daysSinceLastTransaction < 60) {
      totalPoints += 10;
    }

    if (trend === 'increasing') {
      totalPoints += 20;
    } else if (trend === 'decreasing') {
      totalPoints -= 10;
    }

    if (endValueProjected > 100000) {
      totalPoints += 30;
    } else if (endValueProjected > 10000) {
      totalPoints += 10;
    } else if (endValueProjected < 5000) {
      totalPoints -= 10;
    }
  }

  return totalPoints / chains.length;
}
