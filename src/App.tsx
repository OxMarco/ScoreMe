import React from 'react';
import Card from './Card';
import { Flex } from "@chakra-ui/react";

function App() {
  return (
    <Flex
      justifyContent="center"
      alignItems="center"
      height="100vh"       
    >
      <Card />
    </Flex>
  );
}

export default App;
