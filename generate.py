#! /usr/bin/env nix-shell
#! nix-shell -i python3 -p python3 python3Packages.numpy python3Packages.matplotlib
import numpy as np
import matplotlib.pyplot as plt
from matplotlib import animation, rc, cm
import time, random, sys
from datetime import datetime


'''
 Custom Game of Life alike cellular automaton with a flexible set of rules.

 A game consists of a playfield (gameSize) and its rules (gameRules). A rule consists of its name ("name"),
 a list of how many neighbors it takes to survive ("survive"), a list of how many neighbors it takes to be birthed ("birth")
 and optional a cells lifetime ("starve"). All ammounts of neighbours outside of "survive" and "birth" will mark a cell as dying.
 While "survive" and "birth" are borrowed game dynmaics borrowed from Game of Life, "starve" is rather foreign here.
 It is the time in steps it takes to starve a cell designated to die, set this to 0 if you don't want to use this.

 This concept is heavily insipred by The Powder Toys Life element. Please consider donating to them <3
 https://powdertoy.co.uk/Wiki/W/Element:LIFE.html

 You can add your rules to the list of rules below, and choose one from the commandline.
 Usage (NixOS) ./generate.py <name> or ./generate.py
 Usage (other) python3 generate.py <name> or python3 generate.py
'''

# size of a single game, will be tiled 3x3
gameSize = (100,100)
# Target generation, you can navigate generations using arrow keys
gameTarget = 130
gameSeed = 'nyaaaa'
# change cmap, vmin & vmax to change the overall visual effect
# cmap can be any matplotlib color map, these include: viridis (<3), jet, grey, magma, turbo and many more
# vmin=0 is usually a good choice
# vmax should be between 1 and 255; go, play with it!
gameMap = cm.viridis
gameMapMin = 0
gameMapMax = 1
# time (1) or game (0)
gameVisMode = 1
# use gol if no key is given
ruleKey = "gol" if len(sys.argv) <= 1 else sys.argv[1]
gameRules = [
	{
		"name": "custom", # custom ruleset for rapid play
		"survive": [1,2,3,4,5],
		"birth": [3],
		"starve": 0,
	},
	{
		"name": "gol", # classing GoL set
		"survive": [2,3],
		"birth": [3],
		"starve": 0,
	},
	{
		"name": "twotwo",
		"survive": [1,2,5],
		"birth": [3,6],
		"starve": 0,
	},
	{
		"name": "dnn",
		"survive": [3,4,5,7,8],
		"birth": [3,6,7,8],
		"starve": 0,
	},
	{
		"name": "diam", # creates super interesting patters
		"survive": [5],
		"birth": [3,4,5],
		"starve": 0,
	},
	{
		"name": "seeds", # can generate very symmetric patterns
		"survive": [],
		"birth": [2],
		"starve": 0,
	},
	{
		"name": "castle", # generates large structures with interrior
		"survive": [2,3,4,5],
		"birth": [4,5,6,7,8],
		"starve": 0,
	},
	{
		"name": "densemaze", # much denser mazes
		"survive": [2,3],
		"birth": [2],
		"starve": 3,
	},
	{
		"name": "maze", # generates a stable maze
		"survive": [1,2,3,4,5],
		"birth": [3],
		"starve": 0,
	}]

# GoLT class, game happens here in evaluate_step()
class GoLT:
	def __init__(self, state, rules, size):
		self.state = [state]
		self.gameCount = 0

		self.name = rules["name"]

		self.sizeX, self.sizeY = size

		self.birth = rules["birth"]
		self.survive = rules["survive"]
		self.starve = rules["starve"]

		self.lifeTime = [np.zeros((self.sizeY, self.sizeX), dtype=int)]
		self.startTime = time.time()

	def step_timer(self):
		# timer helper for debugging and timing purposes
		t = time.time() - self.startTime
		self.startTime = time.time()
		return t

	def vis_helper(self, gen, mode):
		# vis helper returns a specific generation and spawns new ones if we reach for the future
		while self.gameCount <= (gen + 5):
			self.evaluate_step()
		if gen <= 0:
			gen = 0
		# return value can either be the current game or the current age of the cells, choose your fighter :3
		if mode:
			return self.lifeTime[gen]
		return self.state[gen]

	def count_neighbors(self, x, y):
		n = 0 # neighbor counter

		# wrap around
		xp1 = x+1 if (x+1) < self.sizeX-1 else 0
		xm1 = x-1 if (x-1) > 0 else self.sizeX-1

		yp1 = y+1 if (y+1) < self.sizeY-1 else 0
		ym1 = y-1 if (y-1) > 0 else self.sizeY-1

		# count and return neighbors
		n += self.state[-1][ym1][xm1]
		n += self.state[-1][ym1][x  ]
		n += self.state[-1][ym1][xp1]
		n += self.state[-1][y  ][xp1]
		n += self.state[-1][y  ][xm1]
		n += self.state[-1][yp1][xm1]
		n += self.state[-1][yp1][x  ]
		n += self.state[-1][yp1][xp1]
		return n

	def evaluate_step(self):
		# evaluate a new generation, it will be put ontop of all old generations.
		# This means that all generations will be stored and are always available.
		# Thanks to the usually small games, not much storage is needed
		newGameState = np.zeros((self.sizeY, self.sizeX), dtype=int)
		newLifeTime = np.zeros((self.sizeY, self.sizeX), dtype=int)
		
		# iterate over all cells and apply rules to each of them
		for iy in range(self.sizeY):
			for ix in range(self.sizeX):
				neighbors = self.count_neighbors(ix, iy)

				if neighbors in self.birth:
					if self.state[-1][iy][ix] == 0:
						newGameState[iy][ix] = 1

				if neighbors in self.survive:
					if self.state[-1][iy][ix] == 1:
						newGameState[iy][ix] = 1

				if self.state[-1][iy][ix] == 1 and newGameState[iy][ix] == 0:
					if self.lifeTime[-1][iy][ix] >= self.starve:
						newGameState[iy][ix] = 0;
					else:
						newGameState[iy][ix] = 1;

				if self.state[-1][iy][ix] == newGameState[iy][ix]:
					newLifeTime[iy][ix] = self.lifeTime[-1][iy][ix] + 1;
					newLifeTime[iy][ix] = 255 if newLifeTime[iy][ix] >= 255 else newLifeTime[iy][ix]
				else:
					newLifeTime[iy][ix] = 0;

		# append the new generation :3
		self.state.append(newGameState)
		self.lifeTime.append(newLifeTime)
		self.gameCount += 1
		return

# GoLT initial gamefield generator, supports an empty, random and square field. Todo add a dot generator
class GoLT_generator():
	def __init__(self, size):
		self.sizeX, self.sizeY = size
		self.playfield = np.zeros((self.sizeY, self.sizeX), dtype=int)

	def printPlayfield(self):
		for l in range(len(self.playfield)):
			print(self.playfield[l])

	def empty(self):
		return self.playfield

	def random(self, seed):
		random.seed(seed)
		return [random.choices(range(0,2), k=self.sizeX) for _ in range(self.sizeY)]

	def dot(self, size):
		# wip build dot generator
		return self.playfield

	def square(self, x, y, dx, dy):
		xStart = x - (dx/2)
		yStart = y - (dy/2)
		for ix in range(dx):
			for iy in range(dy):
				self.playfield[int(yStart+iy)][int(xStart+ix)] = 1
		return self.playfield

# Matplotlib based visualisation. While doing it this way is slow, it is easy and not much boilerplate is needed.
# This class is also used for animations and control
# Control:
# 	Left, Right: generation forward, back
#	w: write image to "out/"
#	a: write animation sequence to "anim/"
# 	esc: quit GoLTGen
class GoLT_vis():
	def __init__(self, gol, mode, map, mapMin, mapMax, seed):
		self.seed = seed
		self.gen = 0
		self.gol = gol
		self.mode = mode

		plt.figure()
		self.imgobj = plt.imshow(np.vstack(self.stacker(gol.state[-1])), cmap=map, vmin=mapMin, vmax=mapMax)
		plt.gcf().canvas.mpl_connect('key_press_event', self.compute_event)
		plt.ion()
		plt.show()

	def stacker(self, data):
		vStack = np.vstack((data, data, data))
		hStack = np.hstack((vStack, vStack, vStack))
		return hStack

	def update_vis(self, gen = 0):
		if gen != 0:
			self.gen = gen
		self.imgobj.set_data(self.stacker(self.gol.vis_helper(self.gen, self.mode)))
		plt.pause(0.0025)

	def animator(self, fromGen, toGen, location):
		plt.axis('off')
		for i in range(fromGen, toGen):
			print("Animating: " + str(round(((i+1)/(toGen-fromGen)*100),2)) + "%  ", end='\r')
			self.imgobj.set_data(self.stacker(self.gol.vis_helper(i)))
			plt.pause(0.0001)
			plt.savefig(location + "/" + str(gol.name) + "_SEED_" + str(self.seed) + "_GEN_" + str(i) + ".png", bbox_inches='tight', dpi=600)

	def compute_event(self, event):
		if event.key == 'escape':
			self.exit_GoLT(event)
		if event.key == 'right':
			self.gen += 1
		if event.key == 'left':
			self.gen -= 1
		if event.key == 'm':
			self.mode = self.mode ^ 1
		if event.key == 'w':
			plt.axis('off')
			plt.savefig("out/" + str(gol.name) + "_SEED_" + str(self.seed) + "_GEN_" + str(self.gen) + "_" + str(datetime.now().strftime("%H%M%S")) + ".png", bbox_inches='tight', dpi=600)
		if event.key == 'a':
			self.animator(0, self.gen, "anim")

	def exit_GoLT(self, event):
		plt.close(event.canvas.figure)
		exit()


if __name__ == "__main__":
	print("Init game")
	gen = GoLT_generator(gameSize)
	gameState = gen.square(5,5,8,8)
	#gameState = gen.square(3,3,6,6)
	#gameState = gen.random(gameSeed)
	
	print("Init GoLT")
	gol = GoLT(gameState, next((item for item in gameRules if item['name'] == ruleKey), None), gameSize)

	print("Init vis")
	v = GoLT_vis(gol, gameVisMode, gameMap, gameMapMin, gameMapMax, gameSeed)
	tStep = 0

	print("Running game")
	for i in range(1, gameTarget+6):
		# time game
		_tStep = gol.step_timer()
		if i >= 2:
			tStep += _tStep*1000
		print("Running game, generation: " + str(i) + " of " + str(gameTarget), " took avg ", round(tStep/(i),2), " ms   ", end='\r')
		# actual game step is evaluated here
		gol.evaluate_step()
		# show progress every now and then
		if i % 20 == 0:
			v.update_vis()

	v.update_vis(gameTarget-5)
	
	print("\n\r" + "Ran " + str(gameTarget) + " iterations.")
	
	while True:
		# run until quit
		v.update_vis()
		pass