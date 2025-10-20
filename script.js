// Simple Pong - left paddle controlled by mouse and arrow keys, right paddle is AI.

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = canvas.width;
const H = canvas.height;

// Game objects
const paddle = {
  width: 12,
  height: 100,
  x: