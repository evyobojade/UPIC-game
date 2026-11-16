# U-pic — HD Campus Map Update

## Run in Visual Studio 2022
1. Extract this folder.
2. Open the folder in Visual Studio 2022 (File → Open → Folder), or open `index.html` in your browser.
3. Keep `index.html`, `style.css`, `script.js`, and the `assets` folder together.
4. The new campus illustration is `assets/campus-map-hd.png`.

The map artwork is a background image. The building labels, clickable hotspots, progress counter, locked/unlocked states, and character remain HTML/CSS/JavaScript elements.

For the most reliable local run, open a terminal in this folder and run `python -m http.server 8000`, then visit http://localhost:8000/index.html.


## Real photo clues

Each puzzle has eight real stock photographs, split into two sets of four. The Swap Pictures button switches between photos 1–4 and photos 5–8; it does not randomly rearrange the same four photos. The answer remains the same, and entered letters are cleared when switching sets. The clue images are real stock photographs loaded from Pexels. An internet connection is required while playing because the photo files are served from Pexels' image CDN. The Pexels License allows free use and does not require attribution; credits are included here as a courtesy.

- Reading (McPherson Library): [Liudmyla Honcharova](https://www.pexels.com/photo/a-person-reading-a-book-beside-a-bookshelf-11954964/), [Mikhail Nilov](https://www.pexels.com/photo/close-up-shot-of-a-person-reading-a-book-9158359/), [Ahmet Polat](https://www.pexels.com/photo/man-reading-a-book-in-a-library-40249095/), [Tima Miroshnichenko](https://www.pexels.com/photo/an-open-book-9572525/)
- Mind (Cornett): [Marlon Schmeiski](https://www.pexels.com/photo/portrait-of-thinking-man-20186029/), [Timur Weber](https://www.pexels.com/photo/woman-sitting-and-thinking-8560800/), [August de Richelieu](https://www.pexels.com/photo/a-man-thinking-7428308/), [Vitaly Gariev](https://www.pexels.com/photo/39842863/)
- Study (Strong): [Yan Krukau](https://www.pexels.com/photo/people-studying-in-library-8199762/), [Tima Miroshnichenko](https://www.pexels.com/photo/students-studying-in-the-library-9572464/), [Polina Tankilevitch](https://www.pexels.com/photo/young-women-studying-together-5234735/), [Tima Miroshnichenko](https://www.pexels.com/photo/student-studying-on-a-table-with-books-6549368/)
- Teach (MacLaurin): [Mikhail Nilov](https://www.pexels.com/photo/a-teacher-teaching-in-the-classroom-8923154/), [Max Fischer](https://www.pexels.com/photo/teacher-teaching-his-students-5212342/), [Max Fischer](https://www.pexels.com/photo/teacher-teaching-his-students-5212337/), [Yan Krukau](https://www.pexels.com/photo/a-teacher-teaching-his-students-8617816/)
- Coding (ECSS): [Mikhail Nilov](https://www.pexels.com/photo/a-person-doing-computer-programming-7988086/), [Mizuno K](https://www.pexels.com/photo/programming-on-all-in-one-computer-12899157/), [Mikhail Fesenko](https://www.pexels.com/photo/man-writing-a-code-on-a-computer-and-laptop-9553905/), [Mikhail Nilov](https://www.pexels.com/photo/a-man-looking-at-a-computer-screen-with-data-6963944/)
- Science (Bob Wright Centre): [RDNE Stock project](https://www.pexels.com/photo/tray-of-forceps-beside-a-microscope-6129892/), [Jonathan Borba](https://www.pexels.com/photo/scientist-in-a-laboratory-15831835/), [Polina Tankilevitch](https://www.pexels.com/photo/scientist-in-laboratory-3735786/), [Pavel Danilyuk](https://www.pexels.com/photo/scientists-in-a-laboratory-8442282/)
- Events (Jamie Cassels Centre): [Jakub Zerdzicki](https://www.pexels.com/photo/capturing-the-moment-at-a-live-event-37805464/), [Caleb Oquendo](https://www.pexels.com/photo/a-person-holding-a-microphone-and-performing-in-front-of-the-audience-7431367/), [Dominika Poláková](https://www.pexels.com/photo/crowd-attending-an-event-19234633/), [Stephen Leonardi](https://www.pexels.com/photo/diverse-crowd-cheering-at-night-event-35120738/)
- Language (Clearihue): [Polina Zimmerman](https://www.pexels.com/photo/photo-of-alphabet-tiles-on-wooden-surface-3747580/), [Alexey Demidov](https://www.pexels.com/photo/smartphone-with-language-app-on-screen-33210883/), [Leeloo The First](https://www.pexels.com/photo/a-cup-of-black-coffee-on-a-notebook-with-notes-of-foreign-language-with-translation-5408919/), [Ling App](https://www.pexels.com/photo/learn-languages-text-on-dice-14814047/)

All selected photo pages were listed as free to use on Pexels when selected. Review the [Pexels License](https://www.pexels.com/license/) for the current terms.


### Additional photo set (photos 5–8)

These are the four additional photos used by the Swap Pictures button in each round:

- Reading (McPherson Library): [Tima Miroshnichenko](https://www.pexels.com/photo/a-man-reading-a-book-in-a-library-6550123/), [miniperde](https://www.pexels.com/photo/people-reading-in-library-15361558/), [Nina Hill](https://www.pexels.com/photo/man-reading-in-library-10803232/), [Tima Miroshnichenko](https://www.pexels.com/photo/an-elderly-man-reading-a-book-at-a-library-9572569/)
- Mind (Cornett): [Pouya Hajiebrahimi](https://www.pexels.com/photo/face-of-thinking-woman-16771324/), [Atahan Demir](https://www.pexels.com/photo/portrait-of-thinking-woman-15169174/), [Vitaly Gorbachev](https://www.pexels.com/photo/portrait-of-thinking-woman-26934508/), [Timur Weber](https://www.pexels.com/photo/portrait-of-a-woman-thinking-8560857/)
- Study (Strong): [Yan Krukau](https://www.pexels.com/photo/students-studying-in-classroom-8197511/), [jessica olivella](https://www.pexels.com/photo/students-collaborating-in-a-classroom-setting-37810244/), [Pavel Danilyuk](https://www.pexels.com/photo/students-on-a-classroom-8423404/), [Yan Krukau](https://www.pexels.com/photo/people-sitting-at-a-classroom-8199160/)
- Teach (MacLaurin): [Mikhail Nilov](https://www.pexels.com/photo/teacher-and-students-having-a-lesson-in-a-classroom-8923076/), [Yan Krukau](https://www.pexels.com/photo/teacher-and-students-in-the-classroom-8617967/), [Mikhail Nilov](https://www.pexels.com/photo/a-teacher-teaching-the-students-in-the-classroom-8923042/), [Max Fischer](https://www.pexels.com/photo/teacher-with-his-students-in-the-classroom-5212335/)
- Coding (ECSS): [Nemuel Sereti](https://www.pexels.com/photo/programming-code-on-laptop-screen-6424590/), [Daniil Komov](https://www.pexels.com/photo/close-up-of-computer-screen-with-code-displayed-34803966/), [Julien BRION](https://www.pexels.com/photo/macbook-pro-102061/), [cottonbro studio](https://www.pexels.com/photo/coding-on-a-laptop-5483075/)
- Science (Bob Wright Centre): [Mikhail Nilov](https://www.pexels.com/photo/scientists-experimenting-in-the-laboratory-9243743/), [Mikhail Nilov](https://www.pexels.com/photo/scientists-experimenting-in-the-laboratory-9243728/), [Mikhail Nilov](https://www.pexels.com/photo/scientists-experimenting-in-the-laboratory-9243745/), [Artem Podrez](https://www.pexels.com/photo/a-scientist-doing-experiment-using-a-microscope-8532849/)
- Events (Jamie Cassels Centre): [Yan Krukau](https://www.pexels.com/photo/a-stage-set-up-ready-for-a-live-performance-9001997/), [Caleb Oquendo](https://www.pexels.com/photo/live-music-concert-with-audience-participation-38756923/), [Maor Attias](https://www.pexels.com/photo/audience-on-concert-5192291/), [Luis Quintero](https://www.pexels.com/photo/crowd-in-the-audience-at-a-concert-13899690/)
- Language (Clearihue): [jessica olivella](https://www.pexels.com/photo/close-up-of-writing-hands-in-classroom-setting-37825335/), [Serena Barbera](https://www.pexels.com/photo/a-kid-writing-on-a-notebook-11958995/), [Vitaly Gariev](https://www.pexels.com/photo/close-up-of-person-writing-in-notebook-30535635/), [Anil Sharma](https://www.pexels.com/photo/child-learning-with-alphabet-letters-hands-on-40282961/)


## Version 14 update

- Replaced Level 2 (MIND) and Level 8 (LANGUAGE) clue sets with custom local vector illustrations. Each level has two distinct four-image sets for the swap-pictures feature.
- Reworked the campus activity toolbar so it sits above the map instead of covering building markers. It now explains Daily Quests, Treasures, and Campus Trivia at a glance and adapts to smaller screens.
- Reduced the map menu dropdown width and constrained its height for laptop and phone screens.
- Added clearer instructions to the daily quest panel, including where to find each task and when trivia unlocks.
- Treasure puzzles now use their matching four illustrated clue cards and visible captions, rather than reusing the main-level photos that did not match the treasure answer.


## Campus Wallet + grey map (added)

- **Grey map:** the campus starts in greyscale. Each building you unlock blooms back into colour; unlock all 8 and the whole map turns colour with a "Campus complete" celebration.
- **Campus Wallet:** every solved level adds a collectible map-piece card (cropped from the campus art) to the wallet. Open it from the 👛 button above the map or from the ⋯ menu. Tap a collected card to read that building's info. Locked pieces show blurred and grey.
- **Celebration:** solving a puzzle plays a short fanfare, fires confetti, and deals the new card into the win popup. Back on the map, the card flies into the wallet before the building colours in. Sounds follow the existing Settings · Audio toggle; animations are skipped for players with "reduce motion" turned on.
- **Files:** new `wallet.js` and `wallet.css`. `script.js` only gained a small `window.UPic` API and three events (`upic:unlock`, `upic:maprender`, `upic:reset`); `index.html` loads the two new files.
