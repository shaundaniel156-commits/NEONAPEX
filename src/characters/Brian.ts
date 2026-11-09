import { CharacterSpec, buildCharacter, Character } from './CharacterBuilder';
import { fabricTexture } from '../core/Textures';

/** Brian Ssali, 18. Daniel's best friend. Yellow jacket, dark trousers. */
export const BRIAN_SPEC: CharacterSpec = {
  name: 'Brian',
  height: 1.76,
  sex: 'male',
  build: 'slim',
  skin: '#5a3521',
  hair: { style: 'short', color: '#0e0a08' },
  top: { type: 'jacket', color: '#e8b325', sleeve: 'long', accent: '#2a2a2a' },
  bottom: { type: 'trousers', color: '#1d1f24' },
  shoes: '#2d2d2d',
  face: { noseWidth: 1.1, lipFullness: 1.0, eyeSize: 1.0, browThickness: 1.15, cheek: 0.4, jaw: 0.28, irisColor: '#20140c' },
};

export function createBrian(): Character {
  const spec = { ...BRIAN_SPEC, top: { ...BRIAN_SPEC.top, texture: fabricTexture('#e8b325') }, bottom: { ...BRIAN_SPEC.bottom, texture: fabricTexture('#1d1f24', [4, 8]) } };
  return buildCharacter(spec);
}
