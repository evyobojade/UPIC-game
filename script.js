(() => {
      "use strict";
      const progressStorageKey = "u-pic-unlocked-levels";
      const progressInitKey = "u-pic-level-progression-v3";
      const legacyStorageKey = "u-pic-mcpherson-unlocked";
      const audioStorageKey = "u-pic-audio-settings";
      const tutorialStorageKey = "u-pic-first-play-guide-seen-v2";
      const hintStorageKey = "u-pic-hint-count-v1";
      const exploredStorageKey = "u-pic-exploration-rewards-v1";
      const treasureStorageKey = "u-pic-hidden-treasures-v1";
      const dailyQuestStorageKey = "u-pic-daily-quests-v1";
      const triviaStorageKey = "u-pic-trivia-answered-v1";
      let unlockedLevels = new Set();
      let exploredRewardBuildings = new Set();
      let foundTreasures = new Set();
      let dailyQuestState = { date: "", visited: [], treasureFound: false, triviaAnswered: false, rewardClaimed: false };
      let triviaBuildingId = null;
      let levelSolved = false;
      let tutorialSeen = false;
      let audioPreferences = { effects: true, music: false };
      try {
        tutorialSeen = localStorage.getItem(tutorialStorageKey) === "true";
      } catch (error) {
        console.warn("U-pic could not read the tutorial setting; this session will still work.", error);
      }
      try {
        const savedAudio = JSON.parse(localStorage.getItem(audioStorageKey) || "null");
        if (savedAudio && typeof savedAudio.effects === "boolean" && typeof savedAudio.music === "boolean") {
          audioPreferences = savedAudio;
        }
      } catch (error) {
        console.warn("U-pic could not read saved audio preferences; default audio settings will be used.", error);
      }

      let audioContext = null;
      let musicOscillators = [];
      let musicGain = null;

      let hints = 3;
      let activeBuilding = null;
      let userLetters = [];
      let hintedLetters = [];
      let keyboardSelections = [];
      let keyboardTiles = [];
      let displayedClues = [];
      let displayedClueSet = 0; // 0 = photos 1–4, 1 = photos 5–8
      let selectedMapBuilding = null;
      let travelTimer = 0;
      let travelSequence = 0;
      const shuffled = items => {
        const result = [...items];
        for (let index = result.length - 1; index > 0; index -= 1) {
          const swapIndex = Math.floor(Math.random() * (index + 1));
          [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
        }
        return result;
      };

      const pages = [...document.querySelectorAll(".page")];
      const grid = document.getElementById("clue-grid");
      const slots = document.getElementById("letter-slots");
      const keyboard = document.getElementById("fake-keyboard");
      const status = document.getElementById("status-message");
      const hintButton = document.getElementById("hint-button");
      const hintCount = document.getElementById("hint-count");
      const buildingModal = document.getElementById("building-modal");
      const winModal = document.getElementById("win-modal");
      const settingsModal = document.getElementById("settings-modal");
      const tourBackdrop = document.getElementById("tour-backdrop");
      const tourCard = document.getElementById("tour-card");
      const tourSteps = [
        { selector: "#clue-grid", icon: "👀", title: "Study the pictures", copy: "Look closely at all four clues. They share one word or idea." },
        { selector: "#letter-slots", icon: "🧩", title: "Build your answer", copy: "Your letters fill these slots. Tap a filled slot to remove that letter." },
        { selector: "#fake-keyboard", icon: "⌨️", title: "Choose letter tiles", copy: "Tap the randomized letters to spell your answer. The game checks it automatically." },
        { selector: "#hint-button", icon: "💡", title: "Need a hint?", copy: "Use one of your three hints to reveal a letter. Solve the level to refill them." },
        { selector: "#swap-button", icon: "🔄", title: "Swap the pictures", copy: "Switch between the first four and the other four real-photo clues. The answer stays the same." },
        { selector: ".back-button", icon: "🗺️", title: "Return to the map", copy: "Use this button to leave the puzzle and go back to campus." },
        { selector: "#game-help-button", icon: "❔", title: "Replay this guide", copy: "You can open this walkthrough again any time with the question-mark button." }
      ];
      let tourStepIndex = 0;
      const mapNodes = document.getElementById("map-nodes");
      const menuToggle = document.getElementById("menu-toggle");
      const menuPanel = document.getElementById("menu-panel");
      const effectsToggle = document.getElementById("effects-toggle");
      const musicToggle = document.getElementById("music-toggle");
      const audioStatus = document.getElementById("audio-status");

      // Real stock photographs from Pexels. The Pexels License permits free use;
      // attribution is not required, but photo-page links are listed in README.md.
      const clue = (photoIds, captions) => photoIds.map((photoId, index) => ({
        image: `https://images.pexels.com/photos/${photoId}/pexels-photo-${photoId}.jpeg?auto=compress&cs=tinysrgb&w=900`,
        caption: captions[index]
      }));
      const illustratedClues = (topic, captions) => captions.map((caption, index) => ({
        image: `assets/clues/${topic}-${index + 1}.svg`,
        caption
      }));
      const buildings = [
        {
          level: 1, id: "mcpherson", name: "McPherson Library", icon: "📚", left: 68, top: 41, width: 21, height: 16, labelTop: 63,
          answer: "reading",
          clues: clue([11954964, 9158359, 40249095, 9572525, 6550123, 15361558, 10803232, 9572569], ["Reading in a library", "Reading a book", "A quiet library", "Students reading", "Reading beside bookshelves", "People reading together", "Reading in a vintage library", "Reading in a library"] ),
          description: "The McPherson Library is UVic's main library and an important place for study and research. Students can use library collections, research support, study spaces, and resources for their coursework.",
          facts: ["Books, journals, and digital resources", "Individual and group study", "Research help and learning support"]
        },
        {
          level: 2, id: "cornett", name: "Cornett Building", icon: "🧠", left: 10, top: 38, width: 24, height: 16, labelTop: 62,
          answer: "mind",
          clues: illustratedClues("mind", ["A brain and its thoughts", "A thinking face", "A bright idea", "Solving a problem", "The human brain", "A reflective expression", "An idea taking shape", "A problem-solving grid"]),
          description: "The Cornett Building houses academic spaces used by departments in the humanities and social sciences. It is a place where students explore people, behaviour, communication, and ideas.",
          facts: ["Academic departments and classrooms", "Learning about people and ideas", "Teaching and student study"]
        },
        {
          level: 3, id: "strong", name: "David Strong Building", icon: "📘", left: 18, top: 22, width: 21, height: 17, labelTop: 61,
          answer: "study",
          clues: clue([8199762, 9572464, 5234735, 6549368, 8197511, 37810244, 8423404, 8199160], ["Students studying", "Library study", "Study partners", "Study materials", "Students in a classroom", "Students collaborating", "Classroom discussion", "Students learning together"]),
          description: "The David Strong Building is an academic building on UVic's campus. Students use campus learning spaces to attend classes, work on assignments, and meet with classmates.",
          facts: ["Academic and teaching spaces", "Student learning", "A place to work on coursework"]
        },
        {
          level: 4, id: "maclaurin", name: "MacLaurin Building", icon: "✏️", left: 11, top: 56, width: 22, height: 15, labelTop: 59,
          answer: "teach",
          clues: clue([8923154, 5212342, 5212337, 8617816, 8923076, 8617967, 8923042, 5212335], ["Teacher in class", "Teaching students", "Classroom lesson", "Guiding learners", "Teacher helping students", "Teacher and students", "Teacher guiding a lesson", "Teacher with learners"]),
          description: "The MacLaurin Building is closely associated with education and learning at UVic. It includes spaces used for teaching, studying, and preparing for work in educational settings.",
          facts: ["Education-related learning", "Teaching and study spaces", "A place for students and instructors"]
        },
        {
          level: 5, id: "ecss", name: "Engineering & Computer Science", icon: "💻", left: 37, top: 68, width: 23, height: 18, labelTop: 57,
          answer: "coding",
          clues: clue([7988086, 12899157, 9553905, 6963944, 6424590, 34803966, 102061, 5483075], ["Writing computer code", "Code on a screen", "Programmer at work", "Computer programming", "Code on a laptop", "Debugging code", "Programming workspace", "Typing code on a laptop"]),
          description: "The Engineering and Computer Science building supports learning and research in computing and engineering. Students use its academic spaces to work on programming, systems, design, and engineering projects.",
          facts: ["Computer science and engineering", "Computing labs and academic spaces", "Programming, design, and projects"]
        },
        {
          level: 6, id: "bob", name: "Bob Wright Centre", icon: "🔬", left: 62, top: 65, width: 28, height: 19, labelTop: 65,
          answer: "science",
          clues: clue([6129892, 15831835, 3735786, 8442282, 9243743, 9243728, 9243745, 8532849], ["Laboratory microscope", "Scientist at work", "Chemistry experiment", "Scientific research", "Scientists experimenting", "Scientists using a microscope", "Laboratory research", "Scientific experiment"]),
          description: "The Bob Wright Centre is part of UVic's science and research environment. It supports learning and research in areas such as physics and astronomy, with spaces used by students, instructors, and researchers.",
          facts: ["Science and research spaces", "Learning and collaboration", "Connected with UVic's science community"]
        },
        {
          level: 7, id: "jcc", name: "Jamie Cassels Centre", icon: "🎤", left: 40, top: 13, width: 18, height: 16, labelTop: 67,
          answer: "events",
          clues: clue([37805464, 7431367, 19234633, 35120738, 9001997, 38756923, 5192291, 13899690], ["Live performance", "Singer with microphone", "Event crowd", "People celebrating", "Stage ready for a performance", "Live concert", "Audience at a concert", "Crowd at a live event"]),
          description: "The Jamie Cassels Centre is a central campus venue used for a range of university activities and gatherings. Its event spaces help bring students, faculty, and visitors together.",
          facts: ["Meetings and gatherings", "University events", "A recognizable campus landmark"]
        },
        {
          level: 8, id: "cle", name: "Clearihue Building", icon: "🌎", left: 58, top: 20, width: 18, height: 18, labelTop: 68,
          answer: "language",
          clues: illustratedClues("language", ["Letters and speech", "Languages around the world", "A dictionary", "Letters and alphabets", "A conversation", "A world of languages", "Word definitions", "Writing systems"]),
          description: "Clearihue is associated with humanities teaching at UVic, including language-related learning. Its classrooms and academic spaces support students studying languages, literature, and other humanities subjects.",
          facts: ["Humanities and language learning", "Classrooms and academic spaces", "Study across cultures and ideas"]
        }
      ];

      const campusTrivia = {
        mcpherson: { question: "What is the McPherson Library especially useful for?", choices: ["Study and research", "Athletic training", "Dining services"], answer: 0, fact: "The library offers collections, research support, and study spaces." },
        cornett: { question: "Which broad areas are associated with the Cornett Building?", choices: ["Humanities and social sciences", "Engineering workshops", "Athletics"], answer: 0, fact: "Cornett is used by departments in the humanities and social sciences." },
        strong: { question: "What do students use the David Strong Building for?", choices: ["Classes and coursework", "Only sports practice", "Only food services"], answer: 0, fact: "It provides academic learning spaces for classes, assignments, and study groups." },
        maclaurin: { question: "Which subject area is closely associated with MacLaurin?", choices: ["Education", "Marine transportation", "Fine dining"], answer: 0, fact: "MacLaurin is closely associated with education and learning." },
        ecss: { question: "What does ECSS stand for?", choices: ["Engineering and Computer Science", "Environmental Campus Student Services", "Education and Community Study Spaces"], answer: 0, fact: "ECSS is the Engineering and Computer Science building." },
        bob: { question: "Which fields are especially connected with the Bob Wright Centre?", choices: ["Physics and astronomy", "Languages and literature", "Business and accounting"], answer: 0, fact: "The Bob Wright Centre is part of UVic's science and research environment." },
        jcc: { question: "What is the Jamie Cassels Centre commonly used for?", choices: ["University activities and gatherings", "Only laboratory experiments", "Only library borrowing"], answer: 0, fact: "The centre hosts a range of university activities and gatherings." },
        cle: { question: "Which learning areas are associated with Clearihue?", choices: ["Languages and humanities", "Computer hardware repair", "Athletic coaching"], answer: 0, fact: "Clearihue supports humanities teaching, including language-related learning." }
      };

      function todayKey() {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
      }

      function loadEngagementState() {
        try {
          foundTreasures = new Set(JSON.parse(localStorage.getItem(treasureStorageKey) || "[]").filter(id => buildings.some(b => b.id === id)));
          const savedDaily = JSON.parse(localStorage.getItem(dailyQuestStorageKey) || "null");
          if (savedDaily && savedDaily.date === todayKey()) {
            dailyQuestState = {
              date: savedDaily.date,
              visited: Array.isArray(savedDaily.visited) ? savedDaily.visited.filter(id => buildings.some(b => b.id === id)) : [],
              treasureFound: Boolean(savedDaily.treasureFound),
              triviaAnswered: Boolean(savedDaily.triviaAnswered),
              rewardClaimed: Boolean(savedDaily.rewardClaimed)
            };
          } else {
            dailyQuestState = { date: todayKey(), visited: [], treasureFound: false, triviaAnswered: false, rewardClaimed: false };
            saveEngagementState();
          }
        } catch (error) {
          console.warn("U-pic could not load exploration extras; they will restart for this session.", error);
        }
      }

      function saveEngagementState() {
        try {
          dailyQuestState.date = todayKey();
          localStorage.setItem(treasureStorageKey, JSON.stringify([...foundTreasures]));
          localStorage.setItem(dailyQuestStorageKey, JSON.stringify(dailyQuestState));
        } catch (error) {
          console.warn("U-pic could not save exploration extras.", error);
        }
      }

      function updateDailyQuestProgress() {
        if (dailyQuestState.date !== todayKey()) {
          dailyQuestState = { date: todayKey(), visited: [], treasureFound: false, triviaAnswered: false, rewardClaimed: false };
        }
        const tasks = [
          { done: dailyQuestState.visited.length >= 2, text: `Visit 2 different buildings (${Math.min(2, dailyQuestState.visited.length)}/2)` },
          { done: dailyQuestState.treasureFound, text: "Find a hidden campus treasure" },
          { done: dailyQuestState.triviaAnswered, text: "Answer one campus trivia question" }
        ];
        const completed = tasks.filter(task => task.done).length;
        document.getElementById("daily-quest-progress").textContent = `${completed}/3`;

        document.getElementById("treasure-count").textContent = `${foundTreasures.size}/8`;
        saveEngagementState();
      }

      function recordDailyVisit(building) {
        if (!dailyQuestState.visited.includes(building.id)) dailyQuestState.visited.push(building.id);
        updateDailyQuestProgress();
      }

      const treasureWords = {
        mcpherson: "books", cornett: "ideas", strong: "learn", maclaurin: "class",
        ecss: "code", bob: "lab", jcc: "stage", cle: "words"
      };
      const treasurePictureClues = {
        mcpherson: [{icon:"📚",label:"Bookshelf"},{icon:"📖",label:"Open book"},{icon:"📰",label:"Reading"},{icon:"🔖",label:"Bookmark"}],
        cornett: [{icon:"💡",label:"Bright idea"},{icon:"🧠",label:"Thinking"},{icon:"💭",label:"Thought"},{icon:"📝",label:"Brainstorm"}],
        strong: [{icon:"🎓",label:"Graduation"},{icon:"✏️",label:"Learning"},{icon:"🏫",label:"Classroom"},{icon:"📘",label:"Study"}],
        maclaurin: [{icon:"👩‍🏫",label:"Teacher"},{icon:"🧑‍🎓",label:"Student"},{icon:"🧑‍🏫",label:"Class"},{icon:"📋",label:"Lesson"}],
        ecss: [{icon:"💻",label:"Computer"},{icon:"⌨️",label:"Keyboard"},{icon:"🧩",label:"Code"},{icon:"🖥️",label:"Monitor"}],
        bob: [{icon:"🧪",label:"Experiment"},{icon:"🔬",label:"Microscope"},{icon:"⚗️",label:"Lab glassware"},{icon:"⚛️",label:"Science"}],
        jcc: [{icon:"🎭",label:"Theatre"},{icon:"🎤",label:"Microphone"},{icon:"🎬",label:"Performance"},{icon:"🎟️",label:"Show"}],
        cle: [{icon:"🔤",label:"Alphabet"},{icon:"💬",label:"Speech"},{icon:"📕",label:"Dictionary"},{icon:"✉️",label:"Written words"}]
      };
      let treasureAnswer = "";
      let treasureEntry = "";
      let treasureKeyLetters = [];

      function openActivityModal(title, eyebrow, content) {
        document.getElementById("activity-modal-title").textContent = title;
        document.getElementById("activity-modal-eyebrow").textContent = eyebrow;
        const target = document.getElementById("activity-modal-content");
        target.replaceChildren();
        target.append(content);
        const modal = document.getElementById("activity-modal");
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        document.body.classList.add("modal-open");
      }

      function closeActivityModal() {
        const modal = document.getElementById("activity-modal");
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
        document.body.classList.remove("modal-open");
      }

      function activityText(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        node.textContent = text;
        return node;
      }

      function openDailyQuests() {
        const content = document.createElement("div");
        content.className = "activity-modal-section";
        const intro = activityText("p", "activity-intro", "Your daily checklist has three steps. First, select and visit two different buildings on the map. At a selected building, open Treasures and solve its bonus word. Then solve that building's main level to unlock its information and answer its Campus trivia question. Finish all three tasks to claim +1 hint. Your progress resets each day.");
        const list = document.createElement("ul");
        list.className = "daily-quest-list modal-quest-list";
        const tasks = [
          { done: dailyQuestState.visited.length >= 2, text: `Visit 2 different buildings (${Math.min(2, dailyQuestState.visited.length)}/2)` },
          { done: dailyQuestState.treasureFound, text: "Solve a hidden treasure puzzle" },
          { done: dailyQuestState.triviaAnswered, text: "Answer one campus trivia question correctly" }
        ];
        tasks.forEach(task => {
          const li = activityText("li", task.done ? "quest-done" : "", `${task.done ? "✓" : "○"} ${task.text}`);
          list.append(li);
        });
        const progress = activityText("strong", "activity-progress modal-progress", `${tasks.filter(task => task.done).length}/3 completed`);
        const feedback = activityText("p", "activity-feedback", dailyQuestState.rewardClaimed ? "Today's hint reward has already been claimed." : "Your daily progress is saved in this browser.");
        feedback.id = "daily-quest-feedback";
        const claim = activityText("button", "button gold modal-action", dailyQuestState.rewardClaimed ? "Daily reward claimed" : "Claim daily reward (+1 hint)");
        claim.type = "button";
        claim.disabled = tasks.some(task => !task.done) || dailyQuestState.rewardClaimed;
        claim.addEventListener("click", claimDailyQuestReward);
        const howTo = activityText("div", "activity-howto", "Where to find each task: choose building markers on the campus map → use the building panel to open its treasure puzzle or trivia. Trivia unlocks after that building's main level is solved.");
        content.append(intro, howTo, list, progress, feedback, claim);
        openActivityModal("Daily exploration quests", "Refreshes every day", content);
      }

      function openTreasurePuzzle() {
        if (!selectedMapBuilding) return;
        const building = selectedMapBuilding;
        if (foundTreasures.has(building.id)) {
          const content = activityText("p", "activity-intro", `You already found the ${building.name} treasure. Each building has one unique treasure puzzle.`);
          openActivityModal("Treasure collected!", "Hidden treasure", content);
          return;
        }
        treasureAnswer = treasureWords[building.id] || "campus";
        treasureEntry = "";
        const content = document.createElement("div");
        content.className = "treasure-game";
        content.append(activityText("p", "activity-intro", `A bonus puzzle for ${building.name}: all four illustrations point to one related word. Use the letter tiles to solve it. You earn +1 hint once per building (maximum 3 hints).`));
        const pictureGrid = document.createElement("div");
        pictureGrid.className = "treasure-picture-grid";
        (treasurePictureClues[building.id] || []).forEach(clueItem => {
          const figure = document.createElement("figure");
          figure.className = "treasure-clue-card treasure-illustration-card";
          const illustration = activityText("span", "treasure-clue-illustration", clueItem.icon);
          illustration.setAttribute("aria-hidden", "true");
          const caption = activityText("figcaption", "treasure-clue-caption", clueItem.label);
          figure.append(illustration, caption);
          pictureGrid.append(figure);
        });
        content.append(pictureGrid);
        const slots = document.createElement("div");
        slots.className = "treasure-slots";
        slots.id = "treasure-slots";
        for (let i = 0; i < treasureAnswer.length; i += 1) {
          const slot = activityText("span", "treasure-slot", "");
          slots.append(slot);
        }
        content.append(slots);
        const pool = shuffled([...treasureAnswer.toUpperCase().split(""), ..."RTAEOMN".split("")].slice(0, treasureAnswer.length + 5));
        treasureKeyLetters = pool;
        const keyboard = document.createElement("div");
        keyboard.className = "treasure-keyboard";
        keyboard.id = "treasure-keyboard";
        pool.forEach((letter, index) => {
          const key = activityText("button", "treasure-key", letter);
          key.type = "button";
          key.addEventListener("click", () => {
            if (treasureEntry.length >= treasureAnswer.length) return;
            treasureEntry += letter.toLowerCase();
            renderTreasureSlots();
            key.disabled = true;
            key.dataset.used = "true";
          });
          keyboard.append(key);
        });
        content.append(keyboard);
        const feedback = activityText("p", "activity-feedback", "Tap letters to fill the answer. Tap a filled slot to remove it.");
        feedback.id = "treasure-feedback";
        const controls = document.createElement("div");
        controls.className = "treasure-controls";
        const clear = activityText("button", "button secondary", "Clear letters");
        clear.type = "button";
        clear.addEventListener("click", () => {
          treasureEntry = "";
          keyboard.querySelectorAll("button").forEach(key => { key.disabled = false; delete key.dataset.used; });
          renderTreasureSlots();
        });
        const check = activityText("button", "button gold", "Check answer");
        check.type = "button";
        check.addEventListener("click", () => {
          const status = document.getElementById("treasure-feedback");
          if (treasureEntry !== treasureAnswer) {
            status.textContent = "Not quite! Try another combination.";
            status.className = "activity-feedback wrong";
            return;
          }
          if (hints >= 3) {
            status.textContent = "Correct! Your hint pouch is full. Spend a hint, then solve this treasure again to collect its reward.";
            status.className = "activity-feedback";
            return;
          }
          foundTreasures.add(building.id);
          dailyQuestState.treasureFound = true;
          hints += 1;
          saveHintState();
          updateDailyQuestProgress();
          renderPuzzle();
          renderMap();
          status.textContent = `Correct! You uncovered the ${building.name} treasure and earned +1 hint. You now have ${hints}/3 hints.`;
          status.className = "activity-feedback correct";
          check.disabled = true;
          keyboard.querySelectorAll("button").forEach(key => key.disabled = true);
          document.getElementById("treasure-search-button").textContent = "✓ Treasure collected";
          document.getElementById("treasure-search-button").disabled = true;
        });
        controls.append(clear, check);
        content.append(controls, feedback);
        openActivityModal(`Hidden treasure: ${building.name}`, "4 pictures · 1 word", content);
        renderTreasureSlots();
      }

      function renderTreasureSlots() {
        const target = document.getElementById("treasure-slots");
        if (!target) return;
        target.replaceChildren();
        for (let index = 0; index < treasureAnswer.length; index += 1) {
          const slot = activityText("button", `treasure-slot${treasureEntry[index] ? " filled" : ""}`, treasureEntry[index] ? treasureEntry[index].toUpperCase() : "");
          slot.type = "button";
          slot.setAttribute("aria-label", treasureEntry[index] ? `Remove letter ${treasureEntry[index]}` : "Empty answer slot");
          slot.addEventListener("click", () => {
            if (!treasureEntry[index]) return;
            treasureEntry = treasureEntry.slice(0, index) + treasureEntry.slice(index + 1);
            const keys = document.querySelectorAll("#treasure-keyboard button");
            const letter = slot.textContent;
            const key = [...keys].find(item => item.disabled && item.textContent === letter);
            if (key) { key.disabled = false; delete key.dataset.used; }
            renderTreasureSlots();
          });
          target.append(slot);
        }
      }

      function searchForTreasure() {
        if (!selectedMapBuilding) return;
        openTreasurePuzzle();
      }

      function openTrivia() {
        if (!selectedMapBuilding) return;
        const building = selectedMapBuilding;
        if (!unlockedLevels.has(building.level)) {
          const lockedMessage = activityText("p", "activity-intro", `Campus trivia for ${building.name} is locked. Solve the main picture puzzle for Level ${building.level} first to unlock this building's information and trivia.`);
          openActivityModal("Campus trivia locked", "Solve the main puzzle first", lockedMessage);
          return;
        }
        const trivia = campusTrivia[building.id];
        const content = document.createElement("div");
        content.className = "trivia-modal-content";
        content.append(activityText("p", "activity-intro", `Choose the best answer for ${building.name}. Answer correctly to complete the trivia part of today's quest. ${trivia.question}`));
        const choices = document.createElement("div");
        choices.className = "trivia-choices";
        const feedback = activityText("p", "trivia-feedback", "");
        trivia.choices.forEach((choice, index) => {
          const button = activityText("button", "trivia-choice", choice);
          button.type = "button";
          button.addEventListener("click", () => {
            if (index === trivia.answer) {
              feedback.textContent = `Correct! ${trivia.fact}`;
              feedback.className = "trivia-feedback correct";
              dailyQuestState.triviaAnswered = true;
              updateDailyQuestProgress();
              choices.querySelectorAll("button").forEach(option => option.disabled = true);
            } else {
              feedback.textContent = "Not quite — try again!";
              feedback.className = "trivia-feedback try-again";
            }
          });
          choices.append(button);
        });
        content.append(choices, feedback);
        openActivityModal("Campus trivia", "Learn something about UVic", content);
      }

      function claimDailyQuestReward() {
        if (dailyQuestState.visited.length < 2 || !dailyQuestState.treasureFound || !dailyQuestState.triviaAnswered || dailyQuestState.rewardClaimed) return;
        if (hints >= 3) {
          const feedback = document.getElementById("daily-quest-feedback");
          if (feedback) feedback.textContent = "Your hint pouch is full. Spend a hint, then claim this reward before the day ends.";
          return;
        }
        hints += 1;
        dailyQuestState.rewardClaimed = true;
        saveHintState();
        renderPuzzle();
        updateDailyQuestProgress();
        const feedback = document.getElementById("daily-quest-feedback");
        if (feedback) feedback.textContent = `Daily reward claimed! You now have ${hints}/3 hints.`;
        openDailyQuests();
      }

      function saveProgress() {
        try {
          localStorage.setItem(progressStorageKey, JSON.stringify([...unlockedLevels].sort((a, b) => a - b)));
          localStorage.removeItem(legacyStorageKey);
        } catch (error) {
          console.warn("U-pic could not save level progress; unlocks will last for this session.", error);
        }
      }

      function loadProgress() {
        try {
          const savedProgress = localStorage.getItem(progressStorageKey);
          if (savedProgress !== null) {
            const parsed = JSON.parse(savedProgress);
            if (!Array.isArray(parsed) || parsed.some(level => !Number.isInteger(level) || level < 1 || level > buildings.length)) {
              throw new Error("Saved level progress has an invalid format.");
            }
            unlockedLevels = new Set(parsed);
          } else if (localStorage.getItem(legacyStorageKey) === "true") {
            unlockedLevels.add(1);
            saveProgress();
          }
        } catch (error) {
          console.warn("U-pic could not read saved level progress; the map will start fresh in this session.", error);
        }
      }

      // First launch of this updated build always starts at Level 1.
      // After this one-time reset, normal progress is saved between visits.
      try {
        if (localStorage.getItem(progressInitKey) !== "true") {
          unlockedLevels = new Set();
          localStorage.removeItem(progressStorageKey);
          localStorage.removeItem(legacyStorageKey);
          localStorage.setItem(progressInitKey, "true");
        } else {
          loadProgress();
        }
      } catch (error) {
        unlockedLevels = new Set();
        console.warn("U-pic will start at Level 1; browser storage is unavailable.", error);
      }

      // Hints and map-discovery rewards persist independently of level progression.
      function saveHintState() {
        try {
          localStorage.setItem(hintStorageKey, String(hints));
          localStorage.setItem(exploredStorageKey, JSON.stringify([...exploredRewardBuildings]));
        } catch (error) {
          console.warn("U-pic could not save hint or exploration progress.", error);
        }
      }

      function loadHintState() {
        try {
          const rawHints = localStorage.getItem(hintStorageKey);
          if (rawHints !== null) {
            const savedHints = Number(rawHints);
            if (Number.isInteger(savedHints) && savedHints >= 0 && savedHints <= 3) hints = savedHints;
          }
          const savedExploration = JSON.parse(localStorage.getItem(exploredStorageKey) || "[]");
          if (Array.isArray(savedExploration)) {
            exploredRewardBuildings = new Set(savedExploration.filter(id => buildings.some(building => building.id === id)));
          }
        } catch (error) {
          console.warn("U-pic could not read saved hint or exploration progress.", error);
        }
      }

      function claimExplorationReward(building) {
        if (exploredRewardBuildings.has(building.id)) {
          return "You've already collected this building's exploration reward.";
        }
        if (hints >= 3) {
          return "Building discovered! Your hint pouch is full. Spend a hint, then return here to collect this building's +1 hint reward.";
        }
        hints += 1;
        exploredRewardBuildings.add(building.id);
        saveHintState();
        if (activeBuilding) {
          renderPuzzle();
        } else {
          document.getElementById("hint-count").textContent = String(hints);
          document.getElementById("header-hint-count").textContent = String(hints);
          hintButton.disabled = hints <= 0;
        }
        return `Discovery reward: +1 hint! You now have ${hints}/3 hints.`;
      }

      loadHintState();
      loadEngagementState();

      function answer() {
        return activeBuilding.answer;
      }

      function pickClues(building, setIndex = 0) {
        // Each building has eight curated photos. Show one set of four at a time.
        const start = setIndex * 4;
        return shuffled(building.clues.slice(start, start + 4));
      }

      function startLevel(level) {
        const building = buildings.find(item => item.level === level);
        const highestUnlocked = Math.max(0, ...unlockedLevels);
        if (!building || (level > highestUnlocked + 1 && !unlockedLevels.has(level))) {
          console.warn(`U-pic cannot start locked Level ${level}.`);
          return;
        }
        activeBuilding = building;
        selectedMapBuilding = building;
        levelSolved = false;
        // Hints carry over between levels. The player starts with 3 on a fresh game.
        userLetters = Array(answer().length).fill("");
        hintedLetters = Array(answer().length).fill("");
        keyboardSelections = Array(answer().length).fill(null);
        displayedClueSet = 0;
        displayedClues = pickClues(building, displayedClueSet);
        const swapButton = document.getElementById("swap-button");
        swapButton.textContent = "⟳ Swap to photos 5–8";
        setStatus("", "");
        createKeyboard();
        document.getElementById("level-badge").setAttribute("aria-label", `Level ${building.level}`);
        document.querySelector("#level-badge .level-number").textContent = String(building.level);
        document.getElementById("puzzle-title").textContent = `Level ${building.level}: ${building.name}`;
        showPage("game");
      }

      function updateArrival(building, arrived) {
        const eyebrow = document.getElementById("map-arrival-eyebrow");
        const title = document.getElementById("map-arrival-title");
        const copy = document.getElementById("map-arrival-copy");
        const playButton = document.getElementById("map-play-button");
        const detailsButton = document.getElementById("map-details-button");
        if (!building) {
          eyebrow.textContent = "Your campus adventure";
          title.textContent = "Ready to explore?";
          copy.textContent = "Choose Level 1 and your campus guide will walk there. You can play after they arrive.";
          playButton.hidden = true;
          detailsButton.hidden = true;
          document.getElementById("treasure-search-button").hidden = true;
          document.getElementById("trivia-open-button").hidden = true;
          return;
        }
        const buildingUnlocked = unlockedLevels.has(building.level);
        eyebrow.textContent = arrived ? `Level ${building.level}${buildingUnlocked ? " · Completed" : ""}` : "On the way";
        title.textContent = arrived ? building.name : `Walking to ${building.name}...`;
        copy.textContent = !arrived
          ? "Your campus guide is on the way. The level will be ready to play when they arrive."
          : buildingUnlocked
            ? building.description
            : `🔒 Building information is locked. Solve the ${building.name} picture puzzle to reveal its description and facts.`;
        const nextPlayableLevel = Math.max(0, ...unlockedLevels) + 1;
        const canPlay = unlockedLevels.has(building.level) || building.level === nextPlayableLevel;
        playButton.textContent = unlockedLevels.has(building.level)
          ? `▶  Replay Level ${building.level}`
          : `▶  Play Level ${building.level}`;
        playButton.hidden = !arrived || !canPlay;
        detailsButton.hidden = !arrived || !buildingUnlocked;
        detailsButton.textContent = "Building information";
        document.getElementById("treasure-search-button").hidden = !arrived;
        document.getElementById("trivia-open-button").hidden = !arrived;
      }

      function travelToBuilding(building) {
        selectedMapBuilding = building;
        const character = document.getElementById("map-character");
        const sequence = ++travelSequence;
        window.clearTimeout(travelTimer);
        updateArrival(building, false);
        character.classList.add("walking");
        character.style.left = `${building.left + building.width / 2}%`;
        character.style.top = `${building.top + building.height / 2}%`;
        const delay = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 760;
        travelTimer = window.setTimeout(() => {
          if (sequence !== travelSequence) return;
          character.classList.remove("walking");
          updateArrival(building, true);
          const rewardMessage = claimExplorationReward(building);
          recordDailyVisit(building);
          const arrivalCopy = document.getElementById("map-arrival-copy");
          if (unlockedLevels.has(building.level)) {
            // Reveal the building description only after its main puzzle is solved.
            arrivalCopy.textContent = building.description;
          } else {
            // Exploration rewards must never reveal locked building information.
            arrivalCopy.textContent = `🔒 Building information is locked. Solve the Level ${building.level} main picture puzzle to reveal this building's description and facts. ${rewardMessage}`;
          }
          const treasureButton = document.getElementById("treasure-search-button");
          treasureButton.hidden = false;
          treasureButton.disabled = foundTreasures.has(building.id);
          treasureButton.textContent = foundTreasures.has(building.id) ? "✓ Treasure collected" : "🔎 Find hidden treasure";
          document.getElementById("trivia-open-button").hidden = false;
        }, delay);
      }

      function showPage(name) {
        const target = document.getElementById(name + "-page");
        if (!target) return;
        closeMenu();

        if (name === "game") {
          // Keep the campus map active underneath the puzzle modal.
          document.getElementById("map-page").classList.add("active");
          target.classList.add("active");
          renderPuzzle();
          if (!tutorialSeen) window.setTimeout(() => startTutorialTour(), 360);
          return;
        }

        // Returning to the map closes the puzzle overlay without resetting map state.
        pages.forEach(page => page.classList.toggle("active", page === target));
        if (name === "map") renderMap();
        window.scrollTo({ top: 0, behavior: "smooth" });
      }

      function positionTourCard(target) {
        const targetRect = target.getBoundingClientRect();
        const cardRect = tourCard.getBoundingClientRect();
        const left = Math.max(16, Math.min(window.innerWidth - cardRect.width - 16, targetRect.left + targetRect.width / 2 - cardRect.width / 2));
        const belowTop = targetRect.bottom + 16;
        const aboveTop = targetRect.top - cardRect.height - 16;
        const top = belowTop + cardRect.height <= window.innerHeight - 12
          ? belowTop
          : aboveTop >= 12 ? aboveTop : Math.max(12, Math.min(window.innerHeight - cardRect.height - 12, (window.innerHeight - cardRect.height) / 2));
        tourCard.style.left = `${left}px`;
        tourCard.style.top = `${top}px`;
      }

      function renderTutorialStep() {
        document.querySelectorAll(".tour-highlight").forEach(element => element.classList.remove("tour-highlight"));
        const step = tourSteps[tourStepIndex];
        const target = document.querySelector(step.selector);
        if (!target) {
          finishTutorialTour();
          return;
        }
        // Do not scroll the puzzle behind the tutorial. The guide card stays centred
        // in the viewport so it cannot be pushed off-screen by a highlighted control.
        target.classList.add("tour-highlight");
        document.getElementById("tour-count").textContent = `STEP ${tourStepIndex + 1} OF ${tourSteps.length}`;
        document.getElementById("tour-icon").textContent = step.icon;
        document.getElementById("tour-title").textContent = step.title;
        document.getElementById("tour-copy").textContent = step.copy;
        document.getElementById("tour-back").disabled = tourStepIndex === 0;
        document.getElementById("tour-next").textContent = tourStepIndex === tourSteps.length - 1 ? "Start playing" : "Next";
        tourCard.hidden = false;
        tourCard.style.left = "50%";
        tourCard.style.top = "50%";
        tourCard.style.transform = "translate(-50%, -50%)";
      }

      function startTutorialTour(force = false) {
        if ((!force && tutorialSeen) || !document.getElementById("game-page").classList.contains("active")) return;
        tourStepIndex = 0;
        tourBackdrop.classList.add("open");
        tourBackdrop.setAttribute("aria-hidden", "false");
        renderTutorialStep();
        document.getElementById("tour-next").focus();
      }

      function finishTutorialTour() {
        tourBackdrop.classList.remove("open");
        tourBackdrop.setAttribute("aria-hidden", "true");
        tourCard.hidden = true;
        document.querySelectorAll(".tour-highlight").forEach(element => element.classList.remove("tour-highlight"));
        tutorialSeen = true;
        try {
          localStorage.setItem(tutorialStorageKey, "true");
        } catch (error) {
          console.warn("U-pic could not save tutorial status; the guide may appear again next time.", error);
        }
      }

      function renderPuzzle() {
        grid.innerHTML = "";
        displayedClues.forEach((clue, index) => {
          const card = document.createElement("div");
          card.className = "clue-card";
          card.setAttribute("role", "img");
          card.setAttribute("aria-label", clue.caption);
          const photo = document.createElement("img");
          photo.className = "clue-photo";
          photo.src = clue.image;
          photo.alt = clue.caption;
          photo.loading = "eager";
          photo.referrerPolicy = "no-referrer";
          photo.addEventListener("error", () => {
            card.classList.add("photo-unavailable");
            photo.remove();
            const fallback = document.createElement("span");
            fallback.className = "photo-fallback";
            fallback.textContent = "Photo unavailable";
            card.appendChild(fallback);
          }, { once: true });
          card.appendChild(photo);
          const caption = document.createElement("span");
          caption.className = "clue-caption";
          caption.textContent = clue.caption;
          card.appendChild(caption);
          grid.appendChild(card);
        });
        renderSlots();
        renderKeyboard();
        updateProgress();
      }

      function renderSlots() {
        slots.innerHTML = "";
        answer().split("").forEach((letter, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "letter-slot";
          button.setAttribute("aria-label", `Answer letter ${index + 1}${hintedLetters[index] ? ", revealed" : userLetters[index] ? ", tap to remove" : ", empty"}`);
          const shown = hintedLetters[index] || userLetters[index];
          if (hintedLetters[index]) button.classList.add("hinted");
          else if (userLetters[index]) button.classList.add("filled");
          button.textContent = shown.toUpperCase();
          button.disabled = levelSolved || Boolean(hintedLetters[index]) || !userLetters[index];
          button.addEventListener("click", () => {
            if (!hintedLetters[index]) {
              userLetters[index] = "";
              keyboardSelections[index] = null;
              setStatus("", "");
              renderSlots();
              renderKeyboard();
            }
          });
          slots.appendChild(button);
        });
        hintCount.textContent = String(hints);
        document.getElementById("header-hint-count").textContent = String(hints);
        hintButton.disabled = hints <= 0 || levelSolved;
        document.getElementById("swap-button").disabled = levelSolved;
      }

      function createKeyboard() {
        const answerLetters = answer().toLowerCase().split("");
        // Keep every answer character (including duplicates) and add five
        // distractors that cannot replace a required character.
        const requiredCounts = answerLetters.reduce((counts, letter) => {
          counts[letter] = (counts[letter] || 0) + 1;
          return counts;
        }, {});
        const distractorPool = [..."abcdefghijklmnopqrstuvwxyz"].filter(letter => !requiredCounts[letter]);
        const distractors = shuffled(distractorPool).slice(0, 5);
        keyboardTiles = shuffled([...answerLetters, ...distractors]);
        const availableCounts = keyboardTiles.reduce((counts, letter) => {
          counts[letter] = (counts[letter] || 0) + 1;
          return counts;
        }, {});
        if (!answerLetters.every(letter => availableCounts[letter] > 0)) {
          throw new Error(`Keyboard is missing a required letter for Level ${activeBuilding.level}.`);
        }
        keyboardSelections = Array(answer().length).fill(null);
        hintedLetters.forEach((letter, slot) => {
          if (!letter) return;
          const keyIndex = keyboardTiles.findIndex((key, index) => key === letter && !keyboardSelections.includes(index));
          if (keyIndex >= 0) keyboardSelections[slot] = keyIndex;
        });
        renderKeyboard();
      }

      function renderKeyboard() {
        keyboard.innerHTML = "";
        keyboardTiles.forEach((letter, index) => {
          const button = document.createElement("button");
          button.type = "button";
          button.className = "keyboard-key";
          button.textContent = letter.toUpperCase();
          button.setAttribute("aria-label", `Choose letter ${letter.toUpperCase()}`);
          button.disabled = levelSolved || keyboardSelections.includes(index) || userLetters.filter(Boolean).length + hintedLetters.filter(Boolean).length >= answer().length;
          button.addEventListener("click", () => selectKeyboardKey(index));
          keyboard.appendChild(button);
        });
      }

      function selectKeyboardKey(keyIndex) {
        if (levelSolved || keyboardSelections.includes(keyIndex)) return;
        const slot = userLetters.findIndex((value, index) => !hintedLetters[index] && !value);
        if (slot < 0) return;
        userLetters[slot] = keyboardTiles[keyIndex];
        keyboardSelections[slot] = keyIndex;
        setStatus("", "");
        renderSlots();
        renderKeyboard();
        if (userLetters.every((letter, index) => Boolean(letter || hintedLetters[index]))) submitAnswer();
      }

      function updateProgress() {
        const count = unlockedLevels.size;
        document.getElementById("map-count").textContent = `${count} / 8`;
        const explorationCount = document.getElementById("exploration-count");
        if (explorationCount) explorationCount.textContent = `${exploredRewardBuildings.size} / 8`;
      }

      function resetMapProgress() {
        if (!window.confirm("Reset your map progress? All progress will be lost, and you will be able to play all levels again. This cannot be undone.")) return;
        try {
          localStorage.removeItem(progressStorageKey);
          localStorage.removeItem(legacyStorageKey);
        } catch (error) {
          console.warn("U-pic could not clear saved progress; the map is reset for this session only.", error);
        }
        unlockedLevels.clear();
        document.dispatchEvent(new CustomEvent("upic:reset"));
        exploredRewardBuildings.clear();
        foundTreasures.clear();
        dailyQuestState = { date: todayKey(), visited: [], treasureFound: false, triviaAnswered: false, rewardClaimed: false };
        saveEngagementState();
        levelSolved = false;
        hints = 3;
        saveHintState();
        activeBuilding = buildings[0];
        userLetters = Array(answer().length).fill("");
        hintedLetters = Array(answer().length).fill("");
        keyboardSelections = Array(answer().length).fill(null);
        displayedClueSet = 0;
        displayedClues = pickClues(activeBuilding, displayedClueSet);
        document.getElementById("swap-button").textContent = "⟳ Swap to photos 5–8";
        selectedMapBuilding = null;
        window.clearTimeout(travelTimer);
        travelSequence += 1;
        const character = document.getElementById("map-character");
        character.classList.remove("walking");
        character.style.left = "50%";
        character.style.top = "53%";
        updateArrival(null);
        createKeyboard();
        renderPuzzle();
        closeMenu();
        showPage("map");
      }

      function renderMap() {
        mapNodes.innerHTML = "";
        const nextPlayableLevel = Math.max(0, ...unlockedLevels) + 1;
        buildings.forEach(building => {
          const isUnlocked = unlockedLevels.has(building.level);
          const isPlayable = building.level === nextPlayableLevel && !isUnlocked;
          const button = document.createElement("button");
          button.type = "button";
          const hasExplorationReward = exploredRewardBuildings.has(building.id);
          button.className = `map-hotspot ${isUnlocked ? "unlocked" : isPlayable ? "playable" : "locked"}${hasExplorationReward ? " explored" : ""}`;
          button.style.left = `${building.left}%`;
          button.style.top = `${building.top}%`;
          button.style.width = `${building.width}%`;
          button.style.height = `${building.height}%`;
          button.style.setProperty("--label-top", `${building.labelTop}%`);
          button.setAttribute("aria-label", isUnlocked
            ? `Level ${building.level}, ${building.name}, unlocked. Select to travel there.`
            : isPlayable ? `Level ${building.level}, available to play.` : `Level ${building.level}, locked`);
          // Every building can be visited for exploration; locked buildings remain unplayable.
          button.disabled = false;
          button.title = exploredRewardBuildings.has(building.id)
            ? `${building.name} — explored`
            : `${building.name} — visit to discover this place and earn a hint`;
          button.addEventListener("pointerenter", event => {
            if (event.pointerType === "mouse") button.style.scale = "1.055";
          });
          button.addEventListener("pointerleave", event => {
            if (event.pointerType === "mouse") button.style.scale = "";
          });
          const label = document.createElement("span");
          label.className = "map-hotspot-label";
          label.textContent = hasExplorationReward
            ? `✓ ${building.name}`
            : isUnlocked ? building.name : isPlayable ? `▶ Level ${building.level}` : `🔒 Level ${building.level}`;
          button.appendChild(label);
          button.addEventListener("click", () => travelToBuilding(building));
          mapNodes.appendChild(button);
        });
        updateProgress();
        document.dispatchEvent(new CustomEvent("upic:maprender"));
      }

      function getAudioContext() {
        if (!window.AudioContext) {
          audioStatus.textContent = "Audio is not supported in this browser.";
          return null;
        }
        if (!audioContext) audioContext = new window.AudioContext();
        return audioContext;
      }

      function playTone(frequency, duration = 0.12) {
        if (!audioPreferences.effects) return;
        const context = getAudioContext();
        if (!context) return;
        if (context.state === "suspended") context.resume().catch(error => console.warn("U-pic audio could not start.", error));
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.value = frequency;
        gain.gain.setValueAtTime(0.0001, context.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        oscillator.stop(context.currentTime + duration);
      }

      async function startAmbientMusic() {
        const context = getAudioContext();
        if (!context) {
          musicToggle.checked = false;
          audioPreferences.music = false;
          saveAudioPreferences();
          return;
        }
        if (context.state === "suspended") await context.resume();
        if (musicOscillators.length) return;
        musicGain = context.createGain();
        musicGain.gain.setValueAtTime(0.0001, context.currentTime);
        musicGain.gain.exponentialRampToValueAtTime(0.018, context.currentTime + 1);
        musicGain.connect(context.destination);
        musicOscillators = [130.81, 164.81].map(frequency => {
          const oscillator = context.createOscillator();
          oscillator.type = "sine";
          oscillator.frequency.value = frequency;
          oscillator.connect(musicGain);
          oscillator.start();
          return oscillator;
        });
      }

      function stopAmbientMusic() {
        if (!musicOscillators.length || !audioContext || !musicGain) return;
        musicGain.gain.setTargetAtTime(0.0001, audioContext.currentTime, 0.15);
        const oscillators = musicOscillators;
        musicOscillators = [];
        window.setTimeout(() => oscillators.forEach(oscillator => oscillator.stop()), 700);
      }

      function saveAudioPreferences() {
        try {
          localStorage.setItem(audioStorageKey, JSON.stringify(audioPreferences));
        } catch (error) {
          console.warn("U-pic could not save audio preferences; settings will last for this session.", error);
        }
      }

      function updateAudioSettings() {
        effectsToggle.checked = audioPreferences.effects;
        musicToggle.checked = audioPreferences.music;
        audioStatus.textContent = `Sound effects ${audioPreferences.effects ? "on" : "off"} · Music ${audioPreferences.music ? "on" : "off"}`;
      }

      function closeMenu() {
        menuPanel.hidden = true;
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open menu");
      }

      function setStatus(message, kind) {
        status.textContent = message;
        status.className = "status-message" + (kind ? " " + kind : "");
      }

      function resetEnteredLetters() {
        userLetters = Array(answer().length).fill("");
        keyboardSelections = hintedLetters.map(() => null);
        hintedLetters.forEach((letter, slot) => {
          if (!letter) return;
          const keyIndex = keyboardTiles.findIndex((key, index) => key === letter && !keyboardSelections.includes(index));
          if (keyIndex >= 0) keyboardSelections[slot] = keyIndex;
        });
        renderSlots();
        renderKeyboard();
      }

      function useHint() {
        if (hints <= 0 || levelSolved) return;
        const choices = answer().split("").map((letter, index) => ({ letter, index })).filter(item => !hintedLetters[item.index]);
        if (!choices.length) return;
        const choice = choices[Math.floor(Math.random() * choices.length)];
        const availableKey = keyboardTiles.findIndex((letter, index) =>
          letter === choice.letter && !keyboardSelections.some((selection, slot) => slot !== choice.index && selection === index)
        );
        hintedLetters[choice.index] = choice.letter;
        userLetters[choice.index] = "";
        keyboardSelections[choice.index] = availableKey >= 0 ? availableKey : null;
        hints -= 1;
        saveHintState();
        playTone(620);
        setStatus(`Letter ${choice.index + 1} revealed. Keep going!`, "");
        renderSlots();
        renderKeyboard();
      }

      function submitAnswer() {
        if (levelSolved) return;
        const solution = answer();
        const guess = solution.split("").map((letter, index) => hintedLetters[index] || userLetters[index]).join("");
        if (guess.length !== solution.length || guess.split("").some(letter => !letter)) {
          setStatus("Fill in all the letters before you submit.", "error");
          return;
        }
        if (guess === solution) {
          unlockedLevels.add(activeBuilding.level);
          levelSolved = true;
          const hintsBeforeReward = hints;
          hints = Math.min(3, hints + 1);
          const earnedHint = hints > hintsBeforeReward;
          saveHintState();
          saveProgress();
          document.dispatchEvent(new CustomEvent("upic:unlock", { detail: { building: activeBuilding } }));
          renderPuzzle();
          renderMap();
          selectedMapBuilding = activeBuilding;
          updateArrival(activeBuilding, true);
          document.getElementById("win-title").textContent = activeBuilding.name;
          document.getElementById("win-copy").textContent = earnedHint
            ? `You completed Level ${activeBuilding.level} and unlocked this building on your UVic campus map. You earned 1 bonus hint! You now have ${hints} hint${hints === 1 ? "" : "s"}.`
            : `You completed Level ${activeBuilding.level} and unlocked this building on your UVic campus map. Your hint inventory is full (${hints}/3).`;
          const nextButton = document.getElementById("win-next-button");
          nextButton.hidden = activeBuilding.level === buildings.length;
          nextButton.textContent = `Play Level ${activeBuilding.level + 1}`;
          openModal(winModal);
        } else {
          resetEnteredLetters();
          setStatus("Not quite — your letters are cleared. Try another combination.", "error");
          const shell = document.querySelector("#game-page .game-shell");
          shell.classList.remove("wrong-answer");
          window.requestAnimationFrame(() => shell.classList.add("wrong-answer"));
        }
      }

      function swapPictures() {
        if (levelSolved || !activeBuilding) return;
        displayedClueSet = displayedClueSet === 0 ? 1 : 0;
        displayedClues = pickClues(activeBuilding, displayedClueSet);
        resetEnteredLetters();
        const swapButton = document.getElementById("swap-button");
        swapButton.textContent = displayedClueSet === 0 ? "⟳ Swap to photos 5–8" : "⟳ Swap to photos 1–4";
        playTone(440);
        renderPuzzle();
        setStatus(displayedClueSet === 1 ? "Showing the other four photos (5–8). The answer stays the same." : "Back to the first four photos (1–4). The answer stays the same.", "");
      }

      function openModal(modal) {
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
        modal.querySelector(".modal-close").focus();
      }

      function closeModal(modal) {
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
      }

      function openBuilding(building) {
        if (!unlockedLevels.has(building.level)) {
          updateArrival(building, true);
          return;
        }
        document.getElementById("building-modal-label").textContent = `Level ${building.level} · Building unlocked`;
        document.getElementById("building-modal-icon").textContent = building.icon;
        document.getElementById("building-modal-title").textContent = building.name;
        document.getElementById("building-modal-copy").textContent = building.description;
        const facts = document.getElementById("building-modal-facts");
        facts.replaceChildren(...building.facts.map(fact => {
          const item = document.createElement("li");
          item.textContent = fact;
          return item;
        }));
        openModal(buildingModal);
      }

      document.querySelectorAll("[data-page]").forEach(button => {
        button.addEventListener("click", () => showPage(button.dataset.page));
      });
      menuToggle.addEventListener("click", () => {
        const willOpen = menuPanel.hidden;
        menuPanel.hidden = !willOpen;
        menuToggle.setAttribute("aria-expanded", String(willOpen));
        menuToggle.setAttribute("aria-label", willOpen ? "Close menu" : "Open menu");
        if (willOpen && audioPreferences.music) {
          startAmbientMusic().catch(error => {
            audioStatus.textContent = "Could not start ambient music.";
            console.warn("U-pic ambient music could not start.", error);
          });
        }
      });
      document.addEventListener("click", event => {
        if (!event.target.closest(".menu-wrap")) closeMenu();
      });
      document.getElementById("settings-open").addEventListener("click", () => {
        closeMenu();
        updateAudioSettings();
        openModal(settingsModal);
      });
      document.getElementById("reset-map").addEventListener("click", resetMapProgress);
      document.getElementById("game-help-button").addEventListener("click", () => startTutorialTour(true));
      document.getElementById("tour-next").addEventListener("click", () => {
        if (tourStepIndex === tourSteps.length - 1) finishTutorialTour();
        else {
          tourStepIndex += 1;
          renderTutorialStep();
        }
      });
      document.getElementById("tour-back").addEventListener("click", () => {
        if (tourStepIndex > 0) {
          tourStepIndex -= 1;
          renderTutorialStep();
        }
      });
      document.getElementById("tour-skip").addEventListener("click", finishTutorialTour);
      tourBackdrop.addEventListener("click", finishTutorialTour);
      window.addEventListener("resize", () => {
        if (tourBackdrop.classList.contains("open")) {
          const target = document.querySelector(tourSteps[tourStepIndex].selector);
          if (target) positionTourCard(target);
        }
      });
      document.getElementById("settings-done").addEventListener("click", () => closeModal(settingsModal));
      effectsToggle.addEventListener("change", () => {
        audioPreferences.effects = effectsToggle.checked;
        saveAudioPreferences();
        updateAudioSettings();
        if (audioPreferences.effects) playTone(660);
      });
      musicToggle.addEventListener("change", async () => {
        audioPreferences.music = musicToggle.checked;
        saveAudioPreferences();
        updateAudioSettings();
        try {
          if (audioPreferences.music) await startAmbientMusic();
          else stopAmbientMusic();
        } catch (error) {
          audioPreferences.music = false;
          musicToggle.checked = false;
          saveAudioPreferences();
          audioStatus.textContent = "Could not start ambient music.";
          console.warn("U-pic ambient music could not start.", error);
        }
      });
      hintButton.addEventListener("click", useHint);
      document.getElementById("swap-button").addEventListener("click", swapPictures);
      document.getElementById("win-map-button").addEventListener("click", () => {
        closeModal(winModal);
        showPage("map");
      });
      document.getElementById("win-next-button").addEventListener("click", () => {
        closeModal(winModal);
        startLevel(activeBuilding.level + 1);
      });
      document.getElementById("map-play-button").addEventListener("click", () => {
        if (selectedMapBuilding) startLevel(selectedMapBuilding.level);
      });
      document.getElementById("map-details-button").addEventListener("click", () => {
        if (selectedMapBuilding) openBuilding(selectedMapBuilding);
      });
      document.getElementById("treasure-search-button").addEventListener("click", searchForTreasure);
      document.getElementById("trivia-open-button").addEventListener("click", openTrivia);
      document.getElementById("daily-quest-open").addEventListener("click", openDailyQuests);
      document.getElementById("treasure-open").addEventListener("click", () => {
        if (selectedMapBuilding) openTreasurePuzzle();
        else openActivityModal("Hidden treasures", "Explore the map", activityText("p", "activity-intro", "Choose a building on the map, travel there, and solve its four-picture treasure puzzle."));
      });
      document.getElementById("trivia-open").addEventListener("click", () => {
        if (selectedMapBuilding) openTrivia();
        else openActivityModal("Campus trivia", "Explore the map", activityText("p", "activity-intro", "Choose a building on the map and open its trivia question after arriving."));
      });
      document.getElementById("activity-modal-close").addEventListener("click", closeActivityModal);
      document.getElementById("activity-modal").addEventListener("click", event => {
        if (event.target.id === "activity-modal") closeActivityModal();
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape") closeActivityModal();
      });
      document.getElementById("modal-done").addEventListener("click", () => closeModal(buildingModal));
      document.querySelectorAll(".modal-close").forEach(button => {
        button.addEventListener("click", () => closeModal(button.closest(".building-modal, .win-modal")));
      });
      [buildingModal, winModal, settingsModal].forEach(modal => {
        modal.addEventListener("click", event => {
          if (event.target === modal) closeModal(modal);
        });
      });
      document.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          closeModal(buildingModal);
          closeModal(winModal);
          closeModal(settingsModal);
          closeMenu();
          if (tourBackdrop.classList.contains("open")) finishTutorialTour();
        }
        if (buildingModal.classList.contains("open") || winModal.classList.contains("open") || settingsModal.classList.contains("open") || tourBackdrop.classList.contains("open")) return;
      });

      // Small API used by wallet.js (Campus Wallet, grey map reveal, celebrations).
      window.UPic = {
        buildings,
        isUnlocked: level => unlockedLevels.has(level),
        unlockedCount: () => unlockedLevels.size,
        effectsOn: () => audioPreferences.effects,
        audio: () => getAudioContext(),
        openBuilding,
        openModal,
        closeModal,
        showPage,
        closeMenu
      };

      activeBuilding = buildings[0];
      userLetters = Array(answer().length).fill("");
      hintedLetters = Array(answer().length).fill("");
      keyboardSelections = Array(answer().length).fill(null);
      displayedClueSet = 0;
      displayedClues = pickClues(activeBuilding, displayedClueSet);
      updateArrival(null);
      updateAudioSettings();
      createKeyboard();
      renderPuzzle();
      renderMap();
      updateDailyQuestProgress();
    })();
