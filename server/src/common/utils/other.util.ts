import _ from 'lodash';

export function min(nums: number[]) {
  return _.min(nums) || 0;
}

export function max(nums: number[]) {
  return _.max(nums) || 0;
}