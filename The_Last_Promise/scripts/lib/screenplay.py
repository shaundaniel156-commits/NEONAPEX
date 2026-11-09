"""THE LAST PROMISE - screenplay data (exact dialogue supplied by the director).

Each scene: start/end seconds, location and the ordered list of lines.
Line ids are stable: s<scene>_<index>_<speaker>, used for audio files and subtitles.
"""

SCENES = [
    {"id": 1, "title": "A Promise", "start": 0, "end": 45, "location": "home_morning",
     "lines": [
         ("Grace", "Daniel, you're going to be late again."),
         ("Daniel", "Mum, just five more minutes. I'm almost done."),
         ("Grace", "You've been saying five minutes since yesterday!"),
         ("Grace", "I don't need a big house or expensive things, my son. I just want to see you become someone you are proud of."),
         ("Daniel", "I promise."),
     ]},
    {"id": 2, "title": "The Opportunity", "start": 45, "end": 95, "location": "street",
     "lines": [
         ("Brian", "Bro! Have you seen this? The competition is happening this weekend!"),
         ("Daniel", "A scholarship? You're joking!"),
         ("Brian", "I'm serious. But there's one problem. Registration closes tomorrow."),
         ("Daniel", "I don't even have enough money for transport and registration."),
         ("Brian", "We'll figure something out. You're too talented to miss this."),
     ]},
    {"id": 3, "title": "The Sacrifice", "start": 95, "end": 145, "location": "market",
     "lines": [
         ("Grace", "How much do you need?"),
         ("Daniel", "Mum, forget it. I'll find another way."),
         ("Grace", "Take this."),
         ("Daniel", "Mum, no. You need that money."),
         ("Grace", "Daniel, opportunities don't come every day. Go and do your best."),
         ("Daniel", "I won't disappoint you."),
     ]},
    {"id": 4, "title": "The Unexpected Problem", "start": 145, "end": 208, "location": "bedroom_night",
     "lines": [
         ("Daniel", "No! No, no, no!"),
         ("Brian", "Wait. Didn't you save a backup?"),
         ("Daniel", "I forgot..."),
         ("Grace", "What's wrong?"),
         ("Daniel", "I think I've ruined everything, Mum."),
         ("Grace", "Losing something doesn't mean you've lost everything. You still have your mind, your hands and another chance to try."),
         ("Grace", "Don't let one bad night decide your future."),
     ]},
    {"id": 5, "title": "The Final Attempt", "start": 208, "end": 267, "location": "home_early_morning",
     "lines": [
         ("Brian", "Move over, genius. We're not losing this competition today."),
         ("Brian", "WE DID IT!"),
     ]},
    {"id": 6, "title": "The Real Victory", "start": 267, "end": 300, "location": "home_days_later",
     "lines": [
         ("Daniel", "Mum! We made it!"),
         ("Grace", "I told you not to give up."),
         ("Daniel", "One day, Mum, I'll give you the life you deserve."),
         ("Grace", "Daniel, you've already given me something better. You've given me a reason to believe."),
         ("Narrator", "Sometimes, success isn't about how far you go. It's about remembering the people who helped you take your first step."),
     ]},
]

TITLE = "THE LAST PROMISE"
TAGLINE = "A STORY ABOUT LOVE, SACRIFICE AND NEVER GIVING UP."


def line_id(scene_id, index, speaker):
    return f"s{scene_id}_{index:02d}_{speaker.lower()}"


def all_lines():
    for sc in SCENES:
        for i, (speaker, text) in enumerate(sc["lines"]):
            yield sc, i, speaker, text, line_id(sc["id"], i, speaker)
