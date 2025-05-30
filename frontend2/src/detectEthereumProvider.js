let detectedProvider = null;

async function detectEthereumProvider() {
  if (typeof window.ethereum !== 'undefined') {
    detectedProvider = window.ethereum;
    try {
      // Request account access if needed
      await window.ethereum.request({ method: 'eth_requestAccounts' });
    } catch (error) {
      console.error('User denied account access:', error);
      throw error;
    }
  } else if (window.web3) {
    detectedProvider = window.web3.currentProvider;
  } else {
    console.log('No Ethereum browser extension detected!');
    throw new Error('No Ethereum provider detected');
  }
  return detectedProvider;
}

export default detectEthereumProvider;