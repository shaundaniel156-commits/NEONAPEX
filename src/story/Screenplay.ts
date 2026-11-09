/**
 * THE LAST PROMISE - screenplay.
 *
 * Every spoken line of the film lives here so the dialogue can be edited in one
 * place. Scene scripts reference these lines by index; the DialogueManager and
 * SubtitleManager read exactly this text, so subtitles always match the speech.
 */
import { Speaker } from '../dialogue/DialogueManager';

export interface Line {
  speaker: Speaker;
  text: string;
}
const L = (speaker: Speaker, text: string): Line => ({ speaker, text });

export const SCREENPLAY = {
  title: 'The Last Promise',
  logline: 'In Kampala, a teenage coder, his market-vendor mother and his best friend discover that keeping a promise matters more than winning.',

  /** SCENE 1 - A PROMISE (45 s). Daniel's home, early morning. */
  scene1: [
    L('narrator', 'Kampala. Half past six in the morning. In a small house in Kabalagala, a promise is about to be made.'),
    L('Grace', 'Daniel, the eggs are getting cold. That computer will not feed you.'),
    L('Daniel', 'Two minutes, Mama. The app is almost working. Look. Market prices, live.'),
    L('Grace', 'Mm. Your father was also like this. Always building something.'),
    L('Daniel', 'He made me promise, Mama. Before he died. Finish what you start.'),
    L('Grace', 'Then promise me too. Whatever happens, you do not give up.'),
    L('Daniel', 'I promise.'),
    L('Grace', 'Good. Now eat. I am late for the market.'),
  ],

  /** SCENE 2 - THE OPPORTUNITY (50 s). Kabalagala Road, afternoon. */
  scene2: [
    L('narrator', 'That afternoon, on Kabalagala Road.'),
    L('Brian', 'Daniel! Daniel, wait!'),
    L('Daniel', 'Brian? Why are you running like a thief?'),
    L('Brian', 'Look at this. Kampala Youth Tech Challenge. Build an app for the community. The winner gets a new laptop and a full scholarship.'),
    L('Daniel', 'A scholarship. Brian, this is it. Market Link is exactly this.'),
    L('Brian', 'Deadline is Friday, nine in the morning.'),
    L('Daniel', 'Entry fee, fifty thousand shillings. Brian, I do not have fifty thousand.'),
    L('Brian', 'Then find it. You have been waiting for a chance like this your whole life.'),
    L('Daniel', 'Friday. Okay. I will find it.'),
  ],

  /** SCENE 3 - THE SACRIFICE (50 s). Nakasero market, late afternoon. */
  scene3: [
    L('narrator', 'Nakasero Market, where Grace has sold tomatoes for nineteen years.'),
    L('Grace', 'Daniel? Why are you not at home? Is something wrong?'),
    L('Daniel', 'Nothing is wrong, Mama. There is a competition for apps. The winner gets a scholarship. University, Mama.'),
    L('Grace', 'A scholarship. And what does it cost?'),
    L('Daniel', 'Fifty thousand. By Friday. I will find it, I only wanted to tell you.'),
    L('Grace', 'This was for the new stock on Saturday.'),
    L('Daniel', 'Mama, no. That is your stock money. I cannot take it.'),
    L('Grace', 'Stock can wait one week. Your dream cannot. Take it.'),
    L('Daniel', 'I will pay you back. Every shilling.'),
    L('Grace', 'Pay me back by finishing. Now go. Friday is coming.'),
  ],

  /** SCENE 4 - THE UNEXPECTED PROBLEM (65 s). Daniel's bedroom, Thursday night, rain. */
  scene4: [
    L('narrator', 'Thursday night. Nine hours to the deadline.'),
    L('Brian', 'Prices page works. Map works. What is left?'),
    L('Daniel', 'Only the upload. Ten minutes, then we submit tonight and sleep like kings.'),
    L('Brian', 'Umeme! Power is gone.'),
    L('Daniel', 'It is fine, the battery has... wait.'),
    L('Daniel', 'No. No, no, no. Come on. Come on!'),
    L('Brian', 'What happened?'),
    L('Daniel', 'The hard disk. It is dead. Everything. Market Link is gone, Brian. Three months.'),
    L('Brian', 'We can rebuild it. We have the notebook, we have the design.'),
    L('Daniel', 'In nine hours? On what? This laptop is finished! It is over.'),
    L('Brian', 'Daniel.'),
    L('Daniel', 'Just go home, Brian. It is over.'),
  ],

  /** SCENE 5 - THE FINAL ATTEMPT (65 s). Bedroom, night into dawn. */
  scene5: [
    L('Grace', 'Daniel. Brian told me.'),
    L('Daniel', 'Mama, your money is gone. The laptop is dead. I am sorry.'),
    L('Grace', 'I did not sell my stock for a laptop. I did it for a boy who promised me he would not give up.'),
    L('Daniel', 'There is nothing left to not give up on.'),
    L('Grace', 'Your father wrote his first program on paper. You have your phone. You have your notebook. You have until nine.'),
    L('Brian', 'I brought my uncle\'s laptop. It is slow, but it boots.'),
    L('Brian', 'I am not going home. Move over.'),
    L('narrator', 'They rebuilt it line by line. From a paper notebook, on a borrowed laptop, by the light of a kerosene lamp.'),
    L('Daniel', 'Eight fifty-seven. Upload complete. Submitted.'),
    L('Grace', 'You kept your promise.'),
  ],

  /** SCENE 6 - THE REAL VICTORY (25 s). Home, one week later. */
  scene6: [
    L('narrator', 'One week later.'),
    L('Brian', 'Results are out! Daniel, you are a finalist. Not first. A finalist!'),
    L('Daniel', 'A finalist. From a notebook and a borrowed laptop.'),
    L('Grace', 'You finished what you started. That is the real victory, my son.'),
    L('Brian', 'And finalists get a mentor and a new laptop!'),
    L('narrator', 'Some promises are not about winning. They are about not letting go.'),
  ],
};
