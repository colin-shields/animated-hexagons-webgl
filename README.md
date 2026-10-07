# Overview

This project was created for CMPSC 457 - [] at Penn State Abington for the Fall 2026 semester. Below is the proposal and description of the project.

## Running

Clone the repository, then open `lab5.html` in your browser. If your browser supports WebGL (most modern browsers do), the animation should display automatically.

# **Lab 5: Animated Hexagons** 

## Objective 

In this lab you will design and present an original interactive or animated WebGL scene. We have already covered how to draw shapes of different colors and sizes, create animations, and load images. Use these skills to create something visually engaging and technically sound. 

## Discussion

The lab will be completed as a grid of randomized regular hexagons. Each hexagon will be spawned with a random color. A hexagon will comprise four states: Alive, Dead, Spawning, or Dying. An Alive hexagon has a random chance on each animation cycle to “die”, at which point it will begin to shrink and spin until it fully disappears (see Figure 3). An empty cell—or a cell with a Dead hexagon—has a random chance on each animation cycle to begin spawning a new hexagon, at which point it will begin to grow and spin until it reaches the maximum allowed size. Figure 2 shows an approximation of what this will look like in-progress. 

Additionally, there will be animated light rays extending from the top corners of the canvas and reaching toward the center. Each light ray will consist of a single triangle that can be assigned a color; the color will be solid at its origin and grow fully translucent toward the tail. These light rays will randomly pivot around their origins. 

## Concept Drawings 


![](assets/Lab%205%20Proposa%20-%20full%20gridl.png)
Figure 1. A complete hexagonal grid. Each hexagon shown is in its Alive state. Light rays can be seen extending from the top-left corner of the grid. 

<br>

![](assets/Lab%205%20Proposa%20-%20animated%20grid.png)

Figure 2. The basic concept. Each hexagon in the grid will randomly spawn and die. Several hexagons can be seen rotated and shrunk, in the middle of their spawning/dying animations. Approximately half of the hexagons are alive or spawning, the other half dead or dying. 

<br>

![](assets/Lab%205%20Proposa%20-%20progression.png)

Figure 3. The animation progression of the proposal. As shown, once an Alive hexagon is selected to be killed, it will begin to slowly shrink and rotate until it fully disappears. Not shown, a Dead hexagon selected to spawn will be animated in the reverse, growing and rotating in the opposite direction. 


## Description 

The implementation will consist primarily of classes. The Hexagon class will store the hexagon’s position within the grid, current rotation, current scale, current color, and current state. It will also have methods to update the current rotation, scale, and state based on the current state, to kill or spawn the hexagon, and to return the vertices of the Hexagon. Vertices will be returned directly with the rotation and scale encoded —no matrix transformations will be performed by WebGL. The vertices will also be interleaved with the color of the Hexagon. 

The LightRay class will store the position of its origin, the length of the ray, the angle from 0, and the spread/width of the ray. LightRay will contain the same set of methods to update and return the vertices, and the vertices will be returned in the same format interleaved with their colors. 

The main animation will comprise a basic update-render loop. On each tick, each shape’s update method will be called, then their vertices calculated, sent to WebGL, and drawn. 

There are two anticipated challenges in this implementation. The first will be calculating the correct vertex coordinates from the known position and varying scale and rotation, then translating that into the correct format to be interpreted by WebGL. The second challenge will be the updating logic itself—there are many possible ways to implement the random actions and animation speed, each with their assorted benefits and drawbacks which will be unclear until implemented. 

The proposed implementation satisfies all requirements of having multiple shapes (hexagons and light rays), varying (random) colors, and animation. 

