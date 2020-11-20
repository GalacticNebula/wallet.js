import _ from 'lodash';
import { trc20_abi } from "./abi";

export interface TRC20_CONFIG {
  symbol: string;
  abi: any;
  abi_from: string;
  abi_to: string;
  abi_value: string;
  step: number;
  collect_threshold: number;
}

export const trc20_configs: TRC20_CONFIG[] = [
  {
    symbol: 'USDT',
    abi: trc20_abi,
    abi_from: 'from',
    abi_to: 'to',
    abi_value: 'value',
    step: 300,
    collect_threshold: 0
  }
];

export function findTrc20Config(symbol: string) {
  return _.find(trc20_configs, v => v.symbol == symbol);
}
