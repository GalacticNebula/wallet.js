
export interface ETH_CONFNIG {
  symbol: string;
  step: number;
  collect_threshold: number;
}

export const eth_config: ETH_CONFNIG = {
  symbol: 'ETH',
  step: 300,
  collect_threshold: 0
};
