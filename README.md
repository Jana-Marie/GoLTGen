# GoLTGen Web

GoLTGen Web is a webgl2 based Game of Life alike Cellular Automaton. This means that it presents you with a gamefield, rules that apply to a life, lifes, as in cells of the gamefield that are either alive or dead, a start condition and a mean of visualising the cells and their age..

Demo and Tutorial at [jana-marie.github.io/GoLTGen](https://jana-marie.github.io/GoLTGen/)

[production_web.webm](https://user-images.githubusercontent.com/7141239/230789976-2c1fab93-3d73-41d3-bd40-d1ee3da4c4eb.webm)

<table>
  <tbody>
    <tr>
      <td>
        <img src="media/maze_SEED_nyaaaa_GEN_125_213324.png"/>
      </td>
      <td>
        <img src="media/maze_SEED_nyaaaa_GEN_125_213433.png"/>
      </td>
    </tr>
  </tbody>
</table>
<table>
  <tbody>
    <tr>
      <td>
        <img src="media/castle_SEED_nyaaa_GEN_10_204659.png"/>
      </td>
      <td>
        <img src="media/castle_SEED_nyaaa_GEN_357_150300.png"/>
      </td>
      <td>
        <img src="media/densemaze_SEED_nyaaa_GEN_110_150739.png"/>
      </td>
    </tr>
  </tbody>
</table>

## Rules

A game consists of a playfield (gameSize) and its rules (gameRules). A rule consists of its name ("name"), a list of how many neighbors it takes to survive ("survive"), a list of how many neighbors it takes to be birthed ("birth") and optional a cells lifetime ("starve"). All ammounts of neighbours outside of "survive" and "birth" will mark a cell as dying. While "survive" and "birth" are borrowed game dynmaics borrowed from Game of Life, "starve" is rather foreign here. It is the time in steps it takes to starve a cell designated to die, set this to 0 if you don't want to use this.

## Inspiration

This concept is heavily insipred by [The Powder Toys](https://powdertoy.co.uk/Wiki/W/Element:LIFE.html) Life element. Please consider donating to them <3

The whole project was furthermore fueled by RevisionParty23 <3

## Further Development

A set of ideas and todos rests at [/main/todo.md](https://github.com/Jana-Marie/GoLTGen/blob/main/todo.md).