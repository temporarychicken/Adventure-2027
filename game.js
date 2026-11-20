const directions = { N: "north", S: "south", E: "east", W: "west", U: "up", D: "down" };
const spacecraftNames = ["ship", "airship", "spacecraft", "meridian"];
const radioNames = ["radio", "transmitter", "console"];

const rooms = {
  courtyard: {
    name: "Lighthouse Courtyard",
    description: "Rain sweeps across the flagstones. The lighthouse door stands north, and the keeper's cottage is east. Out on the reef, a fishing boat sounds its horn.",
    image: "lighthouse and cottage across a stormy flagstone courtyard",
    exits: { N: "watchroom", E: "cottage" },
  },
  cottage: {
    name: "Keeper's Cottage",
    description: "A fire spits in the grate. Mrs Vale watches the darkening water from her chair. The courtyard lies west.",
    image: "a woman by the hearth in the keeper's cottage",
    exits: { W: "courtyard" },
  },
  watchroom: {
    name: "Watchroom",
    description: "The walls tick with cooling pipes. Ellis, an old sailor, stands by the stairs. The lantern room is north, and the courtyard is south.",
    image: "a sailor next to iron stairs inside the lighthouse",
    exits: { N: "lantern-room", S: "courtyard" },
  },
  "lantern-room": {
    name: "Lantern Room",
    description: "The great lens is dark. Beneath it, an empty brass socket waits for the pilot flame. The stairs lead south.",
    image: "a lighthouse lens overlooking a boat in rough seas",
    exits: { S: "watchroom", U: "helipad" },
  },
  helipad: {
    name: "Rooftop Helipad",
    description: "An empty landing deck hangs above the sea. A ringed planet fills the break in the clouds. Beside the rail, a brass radio displays MERIDIAN / ORBITAL TENDER / READY TO CALL. The hatch leads down.",
    image: "an empty lighthouse helipad under a ringed planet",
    exits: { D: "lantern-room" },
  },
};

const items = {
  book: { name: "blue logbook", start: "cottage", detail: "The last entry reads: Spare stair key entrusted to Mrs Vale. Show her this book if the light goes out." },
  lantern: { name: "brass hand lantern", start: "courtyard", detail: "A pilot flame burns behind the glass. The base is shaped to fit a brass socket." },
  key: { name: "stair key", start: "with Vale", detail: "A small iron key stamped with a lighthouse." },
};

function newGame() {
  return {
    room: "courtyard",
    items: Object.fromEntries(Object.entries(items).map(([id, item]) => [id, item.start])),
    unlocked: false,
    beaconLit: false,
    shipArrived: false,
  };
}

function listItems(state, location) {
  return Object.keys(items).filter(id => state.items[id] === location).map(id => items[id].name);
}

function describe(state) {
  const room = rooms[state.room];
  const visible = listItems(state, state.room);
  let description = room.description;
  if (state.room === "lantern-room" && state.beaconLit) {
    description = "The lens sweeps a beam across the reef. The fishing boat answers with two short blasts. The stairs lead south. An iron ladder leads up through the open roof hatch.";
  }
  if (state.room === "helipad" && state.shipArrived) {
    description = "The Meridian holds station alongside the deck. Cyan thrusters stir the sea mist beneath its wooden hull, and frost sparkles on its canvas solar sails. The hatch leads down.";
  }
  return visible.length ? description + "\nYou see: " + visible.join(", ") + "." : description;
}

function summonShip(state) {
  if (state.room !== "helipad") return "You'll need a transmitter. Try the rooftop helipad.";
  if (state.shipArrived) return "The Meridian is already alongside.";
  state.shipArrived = true;
  return "The radio crackles. “Meridian descending from low orbit. Keep your landing lights on.”\nA wooden hull breaks through the clouds. Its canvas solar sails furl as cyan thrusters bring it alongside the helipad. The captain raises a hand from the bridge.\nAdventure complete!";
}

function runCommand(state, input) {
  const command = input.toLowerCase().trim().replace(/\s+/g, " ");
  const heading = command.replace(/^go /, "");
  const direction = Object.keys(directions).find(id => heading === id.toLowerCase() || heading === directions[id]);
  if (direction) {
    const destination = rooms[state.room].exits[direction];
    if (!destination) return "You can't go that way.";
    if (state.room === "watchroom" && destination === "lantern-room" && !state.unlocked) return "The iron stair gate is locked.";
    if (destination === "helipad" && !state.beaconLit) return "The roof hatch is locked. A plate reads: BEACON POWER REQUIRED.";
    state.room = destination;
    return describe(state);
  }

  const [verb, ...words] = command.split(" ");
  const target = words.join(" ").replace(/^(at |to )?(the )?/, "");
  const noun = target.split(/ (?:to|on|with) /)[0];
  const item = Object.keys(items).find(id => noun === id || noun === items[id].name ||
    (id === "book" && noun === "logbook"));

  switch (verb) {
    case "l":
    case "look":
      if (!target) return describe(state);
      // A named LOOK uses the same object inspection as EXAMINE.
      return runCommand(state, "examine " + target);
    case "i":
    case "inventory": {
      const carried = listItems(state, "inventory");
      return carried.length ? "You carry: " + carried.join(", ") + "." : "You are empty-handed.";
    }
    case "help":
      return "N, S, E, W, UP, DOWN · LOOK · GET BOOK · DROP BOOK · INVENTORY\nEXAMINE or READ an object · TALK TO someone · SHOW an object · USE an object\nOn the helipad, try USE RADIO or SUMMON SHIP.";
    case "get":
    case "take":
      if (!target) return "Get what?";
      if (item && state.items[item] === "inventory") return "You already have it.";
      if (!item || state.items[item] !== state.room) return "You don't see that here.";
      state.items[item] = "inventory";
      return "Taken.";
    case "drop":
      if (!target) return "Drop what?";
      if (!item || state.items[item] !== "inventory") return "You aren't carrying that.";
      state.items[item] = state.room;
      return "Dropped.";
    case "x":
    case "read":
    case "examine":
      if (!target) return "Examine what?";
      if (item && [state.room, "inventory"].includes(state.items[item])) return items[item].detail;
      if (["gate", "stair gate"].includes(noun) && state.room === "watchroom") {
        return state.unlocked ? "The iron gate is open." : "The iron gate has a small keyhole.";
      }
      if (state.room === "helipad" && radioNames.includes(noun)) {
        return state.shipArrived ? "The display reads MERIDIAN / ALONGSIDE." : "A single brass call switch is wired to an orbital frequency. Try USE RADIO.";
      }
      if (state.room === "helipad" && state.shipArrived && spacecraftNames.includes(noun)) {
        return "The Meridian has a clinker-built wooden hull, folding canvas solar sails and a pair of cyan ion thrusters.";
      }
      return "You don't see that here.";
    case "talk":
      if (state.room === "cottage" && (!target || ["vale", "mrs vale"].includes(target))) {
        return "Mrs Vale says, “If you've come for the key, show me the logbook.”";
      }
      if (state.room === "watchroom" && (!target || target === "ellis")) {
        return "Ellis says, “The beacon takes a pilot flame. A hand lantern will do it if you can get upstairs.”";
      }
      return "There's no one here by that name.";
    case "show":
      if (!target) return "Show what?";
      if (!item || state.items[item] !== "inventory") return "You aren't carrying that.";
      if (item === "book" && state.room === "cottage" &&
          (target === noun || / to (?:the )?(mrs )?vale$/.test(target))) {
        if (state.items.key !== "with Vale") return "Mrs Vale says, “I've already given you the key.”";
        state.items.key = "inventory";
        return "Mrs Vale checks the logbook and presses the stair key into your hand.";
      }
      return "Nothing comes of it.";
    case "unlock":
      if (["gate", "stair gate"].includes(noun)) return runCommand(state, "use key");
      return "Try UNLOCK GATE or USE KEY.";
    case "summon":
    case "call":
      if (spacecraftNames.includes(target) || (verb === "summon" && !target)) return summonShip(state);
      return "Try SUMMON SHIP.";
    case "use":
      if (!target) return "Use what?";
      if (state.room === "helipad" && radioNames.includes(noun)) return summonShip(state);
      if (!item || state.items[item] !== "inventory") return "You aren't carrying that.";
      if (item === "key" && state.room === "watchroom") {
        if (state.unlocked) return "The stair gate is already open.";
        state.unlocked = true;
        return "The key turns. The iron gate swings open.";
      }
      if (item === "lantern" && state.room === "lantern-room") {
        if (state.beaconLit) return "The beacon is already burning.";
        state.beaconLit = true;
        return "The pilot flame catches. A bright beam sweeps across the reef, and the boat answers with two short blasts. You saved the boat.\nAbove you, a relay clicks and the roof hatch opens. A ladder leads UP.";
      }
      return "You find no use for it here.";
    default:
      return "I don't understand that command. Try HELP.";
  }
}

if (typeof module !== "undefined") module.exports = { newGame, runCommand };

if (typeof document !== "undefined") {
  const transcript = document.querySelector("#transcript");
  const picture = document.querySelector("#picture");
  const commandInput = document.querySelector("#command");
  const buttons = [...document.querySelectorAll("[data-command]")];
  let state = newGame();
  let history = [];
  let historyIndex = 0;

  function print(message, className = "") {
    const entry = document.createElement("p");
    entry.className = className;
    entry.textContent = message;
    transcript.append(entry);
    transcript.scrollTop = transcript.scrollHeight;
  }

  function renderRoom() {
    const room = rooms[state.room];
    const shipVisible = state.room === "helipad" && state.shipArrived;
    const artwork = state.room === "helipad"
      ? "art/v3/" + (shipVisible ? "meridian" : "helipad") + ".png"
      : "art/v2/" + state.room + ".png";
    if (picture.getAttribute("src") !== artwork) {
      picture.src = artwork;
      picture.alt = shipVisible ? "a wooden spacecraft with cyan thrusters alongside the helipad" : room.image;
    }
    const exits = Object.keys(room.exits).filter(direction => direction !== "U" || state.beaconLit);
    document.querySelector("#room").textContent = room.name;
    document.querySelector("#exits").textContent = "Exits: " + exits.map(direction => ["U", "D"].includes(direction)
      ? directions[direction].toUpperCase()
      : direction).join(" · ");
    for (const button of buttons) {
      const command = button.dataset.command;
      if (command in directions) button.disabled = !exits.includes(command);
    }
  }

  function submit(command) {
    const input = command.trim();
    if (!input) return;
    print("> " + input.toUpperCase(), "echo");
    print(runCommand(state, input));
    history.push(input);
    historyIndex = history.length;
    renderRoom();
  }

  function restart() {
    state = newGame();
    history = [];
    historyIndex = 0;
    commandInput.value = "";
    transcript.replaceChildren();
    print("The beacon has gone dark. Get it burning before the boat reaches the reef. Type HELP for commands.");
    print(describe(state));
    renderRoom();
  }

  document.querySelector("#prompt").addEventListener("submit", event => {
    event.preventDefault();
    submit(commandInput.value);
    commandInput.value = "";
  });
  commandInput.addEventListener("keydown", event => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    const step = event.key === "ArrowUp" ? -1 : 1;
    historyIndex = Math.max(0, Math.min(history.length, historyIndex + step));
    commandInput.value = history[historyIndex] ?? "";
  });
  for (const button of buttons) {
    button.addEventListener("click", () => submit(button.dataset.command));
  }
  document.querySelector("#restart").addEventListener("click", restart);
  restart();
}
