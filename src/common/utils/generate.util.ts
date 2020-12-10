import random from 'lodash/random';
import join from 'lodash/join';
import moment from 'moment';

const UPPER_CHAR_CODES = [
  'A',
  'B',
  'C',
  'D',
  'E',
  'F',
  'G',
  'H',
  'J',
  'K',
  'L',
  'M',
  'N',
  'P',
  'R',
  'S',
  'T',
  'U',
  'W',
  'X',
  'Y',
];
const LOWER_CHAR_CODES = [
  'a',
  'b',
  'c',
  'd',
  'e',
  'f',
  'g',
  'h',
  'j',
  'k',
  'm',
  'n',
  'p',
  'r',
  's',
  't',
  'u',
  'w',
  'x',
  'y',
];
const NUMBER_CODES = ['2', '3', '4', '5', '6', '7', '8', '9'];

function getRandomCode(codes: string[]) {
  return codes[random(0, codes.length - 1)];
}

export function generateSmsCode(len = 4) {
  return Math.round(Math.random() * Math.pow(10, len))
    .toString()
    .padStart(len, '0');
}

export function randomString(len = 12) {
  const chars = [];
  for (let i = 0; i < len; i++) {
    const randomChars = [getRandomCode(UPPER_CHAR_CODES), getRandomCode(LOWER_CHAR_CODES), getRandomCode(NUMBER_CODES)];
    chars.push(randomChars[random(0, randomChars.length - 1)]);
  }

  return join(chars, '');
}

export function dayAntOrdersCacheKey(): string {
  const now = moment().format('YYYYMMDD');
  return `DAY_${now}_ANT_ORDERS`;
}

if (require.main === module) {
  console.log(randomString(10));
}
