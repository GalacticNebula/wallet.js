import _ from 'lodash';
import { usdt_abi } from "./abi";

export interface ERC20_CONFIG {
  symbol: string;
  abi: any;
  abi_from: string;
  abi_to: string;
  abi_value: string;
  step: number;
  collect_threshold: number;
}

export const erc20_configs: ERC20_CONFIG[] = [
  {
    symbol: 'USDT',
    abi: usdt_abi,
    abi_from: 'from',
    abi_to: 'to',
    abi_value: 'value',
    step: 300,
    collect_threshold: 0
  }
];

export function findErc20Config(symbol: string) {
  return _.find(erc20_configs, v => v.symbol == symbol);
}
