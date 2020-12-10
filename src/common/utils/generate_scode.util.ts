import _ from 'lodash';

const CHARS = 'ABCDEFGHJKLMNPQRSTUWXYZ';

export function generateScode(length = 4) {
  const scodes = [];
  const charLength = CHARS.length;
  for (let i = 0; i < length; i++) {
    scodes.push(CHARS[_.random(0, charLength - 1)]);
  }

  return _.concat(scodes);
}
