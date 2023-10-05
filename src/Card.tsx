import { useState } from "react";
import { Box, Text, Button, Input, Toast, useToast } from "@chakra-ui/react";
import { runScoringChecks } from "./lib/analysis";
import { QuoteCurrency } from "./lib/api";

const Card = () => {
  const [wallet, setWallet] = useState<string>()
  const [loading, setLoading] = useState<boolean>(false)
  const [score, setScore] = useState<string>()
  const toast = useToast()

  const execute = async () => {
    if(wallet != null && wallet.startsWith('0x')) {
      setLoading(true)
      toast({
        title: "Executing",
        description: "Scoring in progress, will take a while",
        status: "info",
        duration: 2000,
        isClosable: true,
      })
      setScore(await runScoringChecks(wallet as any, ['bitfinity', 'arbitrum', 'ethereum'], QuoteCurrency.USD))
      setLoading(false)
    } else {
      toast({
        title: "Error",
        description: "Please enter a valid wallet address",
        status: "error",
        duration: 4000,
        isClosable: true,
      })
    }
  }

  return (
    <Box maxW="md" borderWidth="1px" borderRadius="lg" overflow="hidden">      
      <Box p="6">
        <Text fontWeight="semibold" fontSize="xl" mb="4">
          ScoreMe
        </Text>
        <Text color="gray.500" mb="4">
          Get a score based on your on-chain activity
        </Text>
        { score != null && (
          <Text color="red.500" mb="4">
            {score}
          </Text>
        )}
        <Input placeholder="Your wallet..." mb="4" onChange={(e) => setWallet(e.target.value)} />
        { !loading ? (
        <Button colorScheme="blue" onClick={async () => await execute()}>Execute</Button>
        ) : (
          <Button colorScheme="blue">Loading...</Button>
        )}
      </Box>
    </Box>
  );
};

export default Card;
