import { CharacterSpec, buildCharacter, Character } from './CharacterBuilder';
import { waxPrintTexture, fabricTexture } from '../core/Textures';

/** Grace Okello, 42. Daniel's mother, market vendor. Patterned blouse, long skirt. */
export const GRACE_SPEC: CharacterSpec = {
  name: 'Grace',
  height: 1.62,
  sex: 'female',
  build: 'adult',
  skin: '#7a4a30',
  hair: { style: 'natural', color: '#15100d', band: '#e8a23a' },
  top: { type: 'blouse', color: '#ffffff', sleeve: 'short', accent: '#f2b632' },
  bottom: { type: 'skirt', color: '#6b1f3a' },
  shoes: '#3b2418',
  face: { noseWidth: 1.0, lipFullness: 1.15, eyeSize: 1.0, browThickness: 0.85, cheek: 0.7, jaw: 0.2, irisColor: '#2b1a10' },
};

export function createGrace(): Character {
  const spec = { ...GRACE_SPEC, top: { ...GRACE_SPEC.top, texture: waxPrintTexture() }, bottom: { ...GRACE_SPEC.bottom, texture: fabricTexture('#6b1f3a', [8, 4]) } };
  return buildCharacter(spec);
}
