# GoLTGen Web

GoLTGen Web is the successor of GoLTGen, a web based Game of Life alike cellular automaton with an even more extensive and flexible set of rules. The planned additional display modes, beatmatching and wonderful colormaps shall make this tool a fantastic visual feast.

## Todos/Ideas

 - [ ] **Display**
   - [ ] Add a neighborhood density display
   - [ ] Choose from multiply displays
   - [ ] Math operations on displays 
   - [ ] Glow display
   - [ ] Smooth display
 - [x] **Color**
   - [x] Add colormaps
   - [x] Colormap age
   - [x] Colormap selector
 - [ ] **Rules**
   - [x] Birth
   - [x] Survive
   - [ ] Starve (cells may live n iterations after the death condition has occured)
     - [ ] Starve jitter
   - [x] Age-death
     - [ ] Age-death jitter
   - [ ] Random spawn, zombies? (when there wasn't a cell for a long time. I don't like this idea too much tbh)
   ~~- [ ] Illness? (can very randomly spawn where plenty alive ones are and can spread)~~
 - [ ] **Game**
   - [ ] Other neighborhoods
     - [x] Moore neighborhood
      - [x] r=n
     - [ ] Von Neumann neighborhood
      - [ ] r=n
   - [ ] Stale detection
   - [ ] Other grid shapes
     - [ ] Square
     - [ ] Triangle
     - [ ] Hexagon
     - [ ] Penrose
     - [ ] Polar grid system
       - [ ] Penrose
       - [ ] Polar grid
   - [ ] Music based game-speed
     - [ ] Speed on music volume/beat
     - [ ] Step on beat
 - [ ] **User interface**
   - [ ] Dynamic shaders and sliders on game display to live change inputs
   - [ ] BPM Controller
   - [ ] Randomizer
   - [ ] Make Preset/Savegame more usable
     - [ ] Images next to savegames
     - [x] Visial indication of a save-game success
     - [x] Checkboxes don't work yet
   - [x] Make hideable for a full-screen experience
   - [x] Speed slider
   - [x] Rules checkbox input
   - [x] Colormap(s) selector
   - [x] Opt-In ~~Cookies~~ Local Storage to save user input
   - [x] Game size, game scale (size of grid and how big it should be displayed)
   - [x] Repeat, Mirror, Stretch
   - [ ] Mirror display grid
   - [ ] Neighborhood selector
   - [ ] Movement of field? (like autonomous zoom or movement in x,y)
   - [ ] Stale time
   - [ ] Autoplay button, with speed awareness
   - [ ] Allow user to "draw" pixels (should be fun on a touchscreen)
   - [ ] Collection of working rules
 - [ ] **JS/HTML/CSS/GLSL**
   - [ ] Clean up code
   - [ ] Make shader dynamic
