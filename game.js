const directions = { N: "north", S: "south", E: "east", W: "west", U: "up", D: "down" };
const spacecraftNames = ["ship", "airship", "spacecraft", "meridian"];
const radioNames = ["radio", "transmitter", "console"];

const rooms = {
  courtyard: {
    name: "Lighthouse Quayside",
    description: "Rain sweeps across the flagstones. A fishing boat sounds its horn out on the reef. The lighthouse door stands north, and the keeper's cottage is east.",
    image: "the lighthouse and keeper's cottage across the stormy quayside",
    exits: { N: "watchroom", E: "cottage" },
  },
  cottage: {
    name: "Keeper's Cottage",
    description: "A fire spits in the grate. Mrs Vale looks up from her chair as the marine radio crackles. The courtyard lies west.",
    image: "Mrs Vale in a rust cardigan by the hearth in the keeper's cottage",
    artwork: "art/v3/cottage.png",
    exits: { W: "courtyard" },
  },
  watchroom: {
    name: "Watchroom",
    description: "The walls tick with cooling pipes. Ellis wipes his glasses and checks the iron stair gate. The lantern room is north, and the courtyard is south.",
    image: "Rowan and Ellis beside the watchroom map table and iron stair gate",
    artwork: "art/v3/watchroom.png",
    exits: { N: "lantern-room", S: "courtyard" },
  },
  "lantern-room": {
    name: "Lantern Room",
    description: "The great lens is dark. Mateo Vega, the lighthouse engineer, looks up from a relay with a spanner in his hand. Beneath the lens, an empty brass socket waits for the pilot flame. The stairs lead south.",
    image: "engineer Mateo Vega in canvas coveralls beside the lighthouse lens",
    artwork: "art/v3/lantern-room.png",
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
    description = "The lens sweeps a beam across the reef. The fishing boat answers with two short blasts. Mateo watches the relay hold steady. The stairs lead south. An iron ladder leads up through the open roof hatch.";
  }
  if (state.room === "helipad" && state.shipArrived) {
    description = "The Meridian holds station alongside the deck. Cyan thrusters stir the sea mist beneath its wooden hull. The captain stands beside the radio in a navy coat with gold braid. The hatch leads down.";
  }
  return visible.length ? description + "\nYou see: " + visible.join(", ") + "." : description;
}

function summonShip(state) {
  if (state.room !== "helipad") return "You'll need a transmitter. Try the rooftop helipad.";
  if (state.shipArrived) return "The Meridian is already alongside.";
  state.shipArrived = true;
  return "You key the radio. “Meridian, this is Keeper Rowan. Landing lights are on.”\nThe radio crackles. “Meridian descending from low orbit.”\nA wooden hull breaks through the clouds. Its solar sails furl as cyan thrusters bring it alongside. The captain steps onto the deck and joins you by the radio. “Welcome, Keeper Rowan. Fine work with that beacon.”\nEllis grins. “Fancy taking the long way home, Rowan?”\nAdventure complete!";
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
      return "N, S, E, W, UP, DOWN · LOOK · GET BOOK · DROP BOOK · INVENTORY\nEXAMINE or READ an object · TALK TO ELLIS · SHOW an object · USE an object\nOn the helipad, try USE RADIO or SUMMON SHIP.";
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
      if (state.room === "lantern-room" && ["mateo", "vega", "mateo vega", "engineer"].includes(target)) {
        if (state.beaconLit) return "Mateo taps the relay. “I wired the landing lights into the beacon after the Meridian came down blind in fog. Both circuits are live now, Rowan. Go up and use the radio.”";
        return "Mateo sets down his spanner. “Mateo Vega. I used to keep the Meridian's engines running out of Cádiz. Now I look after this old lens. The storm drowned the pilot flame, but the relay held. Fit that hand lantern into the brass socket and she'll come back to life.”";
      }
      if (state.room === "helipad" && state.shipArrived && target === "captain") {
        return "The captain straightens his cuffs. “That beam brought us straight down through the storm. A pleasure to meet you, Rowan.”";
      }
      if (state.room === "cottage" && (!target || ["vale", "mrs vale"].includes(target))) {
        return "Mrs Vale turns down the radio. “Is that you, Rowan? If you've come for the key, show me the logbook.”";
      }
      if (!target || target === "ellis") {
        if (state.shipArrived) return "Ellis says, “I flew the Meridian once. They still make the tea dangerously strong.”";
        if (state.room === "helipad") return "Ellis says, “That's the Meridian's call sign, Rowan. Use the radio. I'll talk her in.”";
        if (state.beaconLit) return "Ellis says, “Good work, Rowan. That relay opened the roof hatch. Try going up from the lantern room.”";
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
        return "Mrs Vale checks the logbook and presses the stair key into your hand. “There you are, Rowan. Mind the top step.”";
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
      ? "art/v3/" + (shipVisible ? "meridian-arrival" : "helipad") + ".png"
      : room.artwork ?? "art/v2/" + state.room + ".png";
    if (picture.getAttribute("src") !== artwork) {
      picture.src = artwork;
      picture.alt = shipVisible ? "the uniformed captain welcomes Rowan by the radio as the Meridian hovers alongside" : room.image;
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
    print("You are Rowan, the lighthouse keeper. Your companion Ellis pulls his coat tight as a horn sounds from the reef.\n“Beacon's out, Rowan. We'd better get it burning.”\nType HELP for commands.");
    print(describe(state));
    transcript.scrollTop = 0;
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
