import { CharacterSpec, buildCharacter, Character } from './CharacterBuilder';
import { fabricTexture, denimTexture } from '../core/Textures';

/** Daniel Okello, 17. Slim teenager, blue hoodie, dark trousers. */
export const DANIEL_SPEC: CharacterSpec = {
  name: 'Daniel',
  height: 1.72,
  sex: 'male',
  build: 'slim',
  skin: '#6a4029',
  hair: { style: 'short', color: '#120c0a' },
  top: { type: 'hoodie', color: '#2454b8', sleeve: 'long', accent: '#163a86' },
  bottom: { type: 'trousers', color: '#23262e' },
  shoes: '#f0f0f0',
  face: { noseWidth: 1.05, lipFullness: 1.05, eyeSize: 1.05, browThickness: 1.0, cheek: 0.45, jaw: 0.25, irisColor: '#2b1a10' },
};

export function createDaniel(): Character {
  const spec = { ...DANIEL_SPEC, top: { ...DANIEL_SPEC.top, texture: fabricTexture('#2454b8') }, bottom: { ...DANIEL_SPEC.bottom, texture: denimTexture() } };
  return buildCharacter(spec);
}
