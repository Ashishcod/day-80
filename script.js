"use strict";

window.addEventListener("load",function() {

  const RADIUSMIN = 0.1;
  const RADIUSMAX = 0.2;

  let rndSeed = Math.random();

  let canv, ctx;    // canvas and context
  let maxx, maxy;   // canvas dimensions
  let nbx, nby;
  let uiv;
  let grid;
  let rndStruct;
  let lRef;
  let mouse;
  
// for animation
  let events;

// shortcuts for Math.
  const mrandom = Math.random;
  const mfloor = Math.floor;
  const mround = Math.round;
  const mceil = Math.ceil;
  const mabs = Math.abs;
  const mmin = Math.min;
  const mmax = Math.max;

  const mPI = Math.PI;
  const mPIS2 = Math.PI / 2;
  const mPIS3 = Math.PI / 3;
  const m2PI = Math.PI * 2;
  const m2PIS3 = Math.PI * 2 / 3;
  const msin = Math.sin;
  const mcos = Math.cos;
  const matan2 = Math.atan2;

  const mhypot = Math.hypot;
  const msqrt = Math.sqrt;

  const rac3   = msqrt(3);
  const rac3s2 = rac3 / 2;
function Mash(seed) {
	let n = 0xefc8249d;
  let intSeed = (seed || Math.random()).toString();

	function mash (data) {
		if (data) {
			data = data.toString();
			for (var i = 0; i < data.length; i++) {
				n += data.charCodeAt(i);
				var h = 0.02519603282416938 * n;
				n = h >>> 0;
				h -= n;
				h *= n;
				n = h >>> 0;
				h -= n;
				n += h * 0x100000000; // 2^32
			}
			return (n >>> 0) * 2.3283064365386963e-10; // 2^-32
		} else n = 0xefc8249d;
	};
  mash (intSeed); // initial value based on seed

  let mmash = () => mash('A'); // could as well be 'B' or '!' or any non falsy value
  mmash.reset = () => {mash(); mash(intSeed)}
  Object.defineProperty(mmash, 'seed', {get: ()=> intSeed});
  mmash.intAlea = function (min, max) {
    if (typeof max == 'undefined') {
      max = min; min = 0;
    }
    return mfloor(min + (max - min) * this());
  }
  mmash.alea = function (min, max) {
// random number [min..max[ . If no max is provided, [0..min[

    if (typeof max == 'undefined') return min * this();
    return min + (max - min) * this();
  }
  return mmash;
} // Mash

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function hslString(h, s = 100, l = 50) {
  return `hsl(${h},${s}%,${l}%)`;
} // hslString


// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function lerp(p1, p2, alpha) {
    const omalpha = 1 - alpha;
    return [p1[0] * omalpha + p2[0] * alpha,
            p1[1] * omalpha + p2[1] * alpha];
} // lerp

//------------------------------------------------------------------------
function Hexagon (kx, ky) {
  this.kx = kx;
  this.ky = ky;
  this.hPoints = new Array(12).fill(0).map((v,k) => new HalfPoint(this, k));

} // Hexagon

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

Hexagon.prototype.calculateArc = function(arc) {

  if (! this.pos) this.calculatePoints();

  const kp0 = arc.p0.khp;
  const kp1 = arc.p1.khp;

  let khp0 = kp0, khp1 = kp1;
// is starting point is odd, take symmetric to start from even point
  if (kp0 & 1) {
    khp0 = 11 - kp0;
    khp1 = 11 - kp1;
  }
  khp1 = (khp1 - khp0 + 12) % 12; // relative index from khp0 to khp1;
  const coeffBeg = Hexagon.coeffBeg [khp1] * uiv.radius;
  const coeffEnd = Hexagon.coeffEnd [khp1] * uiv.radius;
  const side0 = mfloor(kp0 / 2);
  const side1 = mfloor(kp1 / 2);
  const p0 = this.pos[kp0];
  const p1 = this.pos[kp1];
  const pax = p0[0] + Hexagon.perp[side0][0] * coeffBeg;
  const pay = p0[1] + Hexagon.perp[side0][1] * coeffBeg;
  const pbx = p1[0] + Hexagon.perp[side1][0] * coeffEnd;
  const pby = p1[1] + Hexagon.perp[side1][1] * coeffEnd;

  arc.bez = [p0, [pax, pay], [pbx, pby], p1];

} // Hexagon.prototype.calculateArc

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Hexagon.prototype.drawArc = function(arc, withoutMoveTo) {

// just draws path, doest not stroke nor fill

//  if (! arc.bez) this.calculateArc(arc);
  let bez = arc.bez;
  if (! withoutMoveTo) ctx.moveTo (bez[0][0], bez[0][1]);
  ctx.bezierCurveTo (bez[1][0], bez[1][1], bez[2][0], bez[2][1],bez[3][0], bez[3][1]);
} // Hexagon.prototype.drawArc

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Hexagon.prototype.createArcs = function() {

/* we divide the hexagon to create 2 groups of 6 points
for every group we pick a point at random among the 6 points
we connect it by arcs to the other 5 
*/     
    let p1, arc;
    const randDivision = 2 * rndStruct.intAlea(6); 
    const grp1 = new Array(6).fill(0).map((v,k)=> (k + randDivision) % 12);
    const grp2 = grp1.map( v => (v + 6) % 12);

// create first group
    let k0 = grp1[rndStruct.intAlea(6)];
    let p0 = this.hPoints[k0];
    this.center0 = p0;   // memorize 'center' of 1st group
    grp1.forEach(khPoint => {
        p1 = this.hPoints[khPoint];
        if (p1 == p0) return;
        arc = new Arc(p0, p1);
        this.calculateArc(arc);
    });
// create second group
    k0 = grp2[rndStruct.intAlea(6)];
    p0 = this.hPoints[k0];
    this.center1 = p0;  // memorize 'center' of 2nd group
    grp2.forEach(khPoint => {
        p1 = this.hPoints[khPoint];
        if (p1 == p0) return;
        arc = new Arc(p0, p1);
        this.calculateArc(arc);
    });
} // Hexagon.prototype.createArcs

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

Hexagon.prototype.calculatePoints = function() {

  this.xc = (maxx - (nbx - 1) * 1.5 * uiv.radius) / 2 + 1.5 * uiv. radius * this.kx;
  let y0 = (maxy - (nby - 0.5) * rac3 * uiv.radius) / 2;
  if ((this.kx & 1) == 0) y0 += uiv.radius * rac3s2; 
  this.yc = y0 + this.ky * uiv.radius * rac3;
  this.pos = Hexagon.positions.map(p => [this.xc + p[0] * uiv.radius, this.yc + p[1] * uiv.radius]);

} // Hexagon.prototype.calculatePoints

// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

Hexagon.prototype.drawArcs = function () {
    ctx.beginPath();
    this.center0.arcs.forEach(arc => this.drawArc(arc));
    this.center1.arcs.forEach(arc => this.drawArc(arc));
    ctx.lineWidth = uiv.lineWidth;
    ctx.strokeStyle = hslString(globHue, 100, 50);
    ctx.stroke();
} // Hexagon.prototype.drawArcs
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

function calcHexagon () {
    Hexagon.k0 = rndStruct.alea(0.15,0.22); 
    
    Hexagon.vertices = [[1, 0], [0.5, rac3s2], [-0.5, rac3s2], [-1, 0], [-0.5, -rac3s2], [0.5, -rac3s2]];
    
    Hexagon.positions = [lerp(Hexagon.vertices[0],Hexagon.vertices[1] , 0.5 - Hexagon.k0),
                         lerp(Hexagon.vertices[0],Hexagon.vertices[1] , 0.5 + Hexagon.k0),
                         lerp(Hexagon.vertices[1],Hexagon.vertices[2] , 0.5 - Hexagon.k0),
                         lerp(Hexagon.vertices[1],Hexagon.vertices[2] , 0.5 + Hexagon.k0),
                         lerp(Hexagon.vertices[2],Hexagon.vertices[3] , 0.5 - Hexagon.k0),
                         lerp(Hexagon.vertices[2],Hexagon.vertices[3] , 0.5 + Hexagon.k0),
                         lerp(Hexagon.vertices[3],Hexagon.vertices[4] , 0.5 - Hexagon.k0),
                         lerp(Hexagon.vertices[3],Hexagon.vertices[4] , 0.5 + Hexagon.k0),
                         lerp(Hexagon.vertices[4],Hexagon.vertices[5] , 0.5 - Hexagon.k0),
                         lerp(Hexagon.vertices[4],Hexagon.vertices[5] , 0.5 + Hexagon.k0),
                         lerp(Hexagon.vertices[5],Hexagon.vertices[0] , 0.5 - Hexagon.k0),
                         lerp(Hexagon.vertices[5],Hexagon.vertices[0] , 0.5 + Hexagon.k0)];
    Hexagon.coeffBeg = [0, 0.3, 0.3, 0.4, 0.5, 0.6, 1, 0.7, 0.5, 0.5, 0.4, 0.2];
    Hexagon.coeffEnd = [0, 0.2, 0.3, 0.3, 0.5, 0.6, 0.7, 0.7, 0.6, 0.6, 0.3, 0.3];
    Hexagon.perp = [[-rac3s2, -0.5],
                    [0, -1],
                    [rac3s2, -0.5],
                    [rac3s2, 0.5],
                    [0, 1],
                    [-rac3s2, 0.5]]; // perpendicular to sides - towards center
}
//------------------------------------------------------------------------
function Arc(p0, p1) {
/* create Arc between 2 half-points (of the same Hexagon) */

    this.p0 = p0;
    this.p1 = p1;
    this.hexagon = p0.parent;
    if (p1.parent !== p0.parent) throw ("arc between 2 Hexagons ???")
    if (! p0.arcs) p0.arcs = [];
    p0.arcs.push (this);
    p1.arc = this;
        
}

Arc.prototype.reverse = function () {
    [this.p0, this.p1] = [this.p1, this.p0];
    if (this.bez) this.bez.reverse(); 
}
//------------------------------------------------------------------------

function createArcs() {
  grid.forEach(line=>line.forEach(cell => cell.createArcs()));
} // createArcs

//------------------------------------------------------------------------

function drawGrid() {
  grid.forEach(line=>line.forEach(cell => cell.drawArcs()));
} // drawGrid

//------------------------------------------------------------------------

function HalfPoint(parent, khp) {

  this.parent = parent;  // an Hexagon

  this.khp = khp; // index of point in its parentFig's hPoints
  this.side = mfloor(khp / 2);
  this.state = 0; // 0 : undecided; 1: entry; 2: exit; 3: blocked

  // this.other will be added later for the other half of same point. Maybe
} // HalfPoint
// - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -

HalfPoint.prototype.attach = function(other) {
/* sets other as the second half of this HalfPoint */
  if (this.other) {
    if (this.other != other) throw ('inconsistent attachment');
    return; // already connected
  }
  this.other = other; // connect both ways at the same time
  other.other = this;
} // HalfPoint.prototype.attach

//------------------------------------------------------------------------
function Piece(p) {
/* creates a piece starting from a given half-point
  this half-point MUST NOT be the center0 or center1 of its hexagon
  (so that the Piece is unique, because many pieces start from center0 and center1)
*/
    let lastp, p0, p1, bez, center, other;
    
    this.parts = [];

    if (p.arcs) throw ('starting Piece from forbidden point');
    let arc = p.arc;
    if (arc.p0 == p) throw ('p is arc.p0 in new Piece ???');
    
    this.addArcFrom(p, arc);
    
    for (let k = 10; k >=0 ; --k) { // should never do more than 4 loops
        this.getNext();
        lastp = this.parts[this.parts.length - 1].arc.p1;
        if (lastp == p) break; // we have closed the loop
        if (lastp.other && lastp.other == p) break;  // we have closed the loop too
        if (k == 0) throw ('k==0 in Piece');
    } // for k
    
// now, add every part of a piece a 'target' value for future gradient
 
    this.parts.forEach(part => {
        p0 = part.arc.p0;
        p1 = part.arc.p1;
        switch (part.nature) {
            case "line" : 
                part.pos0 = p0.parent.pos[p0.khp]; // coordinates of p0
                part.pos1 = p1.parent.pos[p1.khp]; // coordinates of p1
                part.arc.target = lerp(part.pos0, part.pos1, 0.5); // half-way between points
                break;
            case "uturn" :
                bez = part.arc.bez;
                let center = lerp (bez[0], bez[3], 0.5);
                part.arc.target = [center, center, center, center];
                break;
            case "normal" :
                if (part.arc.target) break; 
                bez = part.arc.bez;
                other = (part.arc.p0.khp ^ 1); // index of neighbor point
                other = part.arc.hexagon.hPoints[other].arc;
                part.arc.target = [lerp(bez[0], other.bez[3], 0.5),
                                   lerp(bez[1], other.bez[2], 0.5),
                                   lerp(bez[2], other.bez[1], 0.5),
                                   lerp(bez[3], other.bez[0], 0.5)];
                other.target = [part.arc.target[3],
                                part.arc.target[2],
                                part.arc.target[1],
                                part.arc.target[0]];
                break;                                    
        } // switch    
    });
    
    this.draw(0);
    this.draw(0.6);
} // Piece 
//------------------------------------------------------------------------
Piece.prototype.draw = function (alpha) {
    let kp1, hexa, p, bez0, bez1;
    ctx.beginPath();
    let withoutMoveTo = false; // need 'moveTo' only for 1st part
    this.parts.forEach((part) => {
        switch (part.nature) {
            case "line" :
                p = lerp(part.pos1, part.arc.target, alpha);
                ctx.lineTo(p[0],p[1]);
                break;
            default: 
                bez0 = part.arc.bez;
                bez1 = part.arc.target;
                part.arc.hexagon.drawArc({bez:[lerp(bez0[0], bez1[0], alpha),
                                               lerp(bez0[1], bez1[1], alpha),
                                               lerp(bez0[2], bez1[2], alpha),
                                               lerp(bez0[3], bez1[3], alpha)
                                                ]}, withoutMoveTo);
                  
        } // switch
        withoutMoveTo = true;  
    });

    ctx.fillStyle = hslString(rndStruct.intAlea(360));
    ctx.fill();
}
//------------------------------------------------------------------------

Piece.prototype.getNext = function() {
/* while building Piece, finds the element that comes after the last currently in this.parts */

    const last = this.parts[this.parts.length - 1];
    if (last.nature == "line") {
        let p = last.arc.p1;
        let arc = last.p1.arc; // there MUST be an arc here
        this.addArcFrom(p, arc); // SHOULD be 'normal'
        return; 
    }
    if (last.arc.p1.arcs && last.nature == "normal") { // We are at center0 or center 1 : go back to the point neighbor of this we come from 
        const comeFrom = last.arc.p0;
        const nextp = last.arc.hexagon.hPoints[comeFrom.khp ^ 1];
        const nextArc = nextp.arc; 
        this.addArcFrom(last.arc.p1, nextArc);
        return;
    } 
    // previous was a u-turn OR its final point was not center0 nor center1
    let np = last.arc.p1.other;
    if (!np) { // limit of the grid - add straight line without changing hexagon
        const nextp = last.arc.hexagon.hPoints[last.arc.p1.khp ^ 1];
        this.parts.push({nature: "line", arc:{p0: last.arc.p1, p1: nextp} });
        return;
    }
    if (np.arcs) { // we enter other hexagon at its center0 or center1 : do u-turn
        let kother = (np.khp ^ 1);
        let pother = np.parent.hPoints[kother];
        this.addArcFrom(np, pother.arc); // SHOULD be u-turn
        return;
    }
    this.addArcFrom(np, np.arc); // add simple arc

} // Piece.prototype.getNext

//------------------------------------------------------------------------
Piece.prototype.addArcFrom = function(p, arc) {
    arc.inPiece = true; // memorize this arc is in a Piece
    if (arc.p0 != p) arc.reverse();
    if (p.khp == (arc.p1.khp ^ 1)) { // U-turn
        this.parts.push({nature:"uturn", arc: arc});
    } else {
        this.parts.push({nature:"normal", arc: arc});
    }
} // Piece.prototype.addArcFrom
//------------------------------------------------------------------------

function createPieces() {
    grid.forEach(line => {
        line.forEach(cell => {
            cell.hPoints.forEach(p => {
                if (p.arcs) return; // not good starting point
                if (p.arc.inPiece) return; // already in a piece
                new Piece(p); // create piece from here
            }); // cell.hPoints.forEach
        }); // line.forEach
    }); // grid.forEach 
}
//------------------------------------------------------------------------

function attachHalfPoints() {
  let kxn, kyn, khpn;
  let dkx, dky;
  grid.forEach ((line, ky) => {
    line.forEach ((hex, kx) => {
      hex.hPoints.forEach((hp, khp) => {
        dkx = [1, 0, -1, -1, 0, 1][hp.side];
        dky = [[1,1,1,0,-1,0],[0,1,0,-1,-1,-1]][kx & 1][hp.side];
        kyn = ky + dky;
        if (kyn < 0 || kyn >= nby) return; // no neighbor
        kxn = kx + dkx;
        if (kxn < 0 || kxn >= nbx) return; // no neighbor
        hp.attach(grid[kyn][kxn].hPoints[[7,6,9,8,11,10,1,0,3,2,5,4][khp]]);
      }); // sq.hPoints.forEach
    }); // line.forEach
  }); // grid.forEach
} // attachHalfPoints

//------------------------------------------------------------------------
function readUI() {

  uiv = {};
  uiv.radius = mmax(rndStruct.alea(RADIUSMIN, RADIUSMAX) * lRef, 20);
  uiv.lineWidth = mmax(uiv.radius * rndStruct.alea(0.02, 0.06), 0.5);
  
} // readUI
//------------------------------------------------------------------------

let animate;

{ // scope for animate

let animState = 0;
let st;
let tStart;
let speedFr;

animate = function(tStamp) {

  let event;

  event = events.pop();
  if (event && event.event == 'reset') animState = 0;
  if (event && event.event == 'click') animState = 0;
  window.requestAnimationFrame(animate)

  switch (animState) {

    case 0 :
      if (startOver()) {
        animState = 10;
        return;
    }
  } // switch

} // animate
} // scope for animate

//------------------------------------------------------------------------
//------------------------------------------------------------------------

function startOver() {

// canvas dimensions

  maxx = window.innerWidth;
  maxy = window.innerHeight;
  lRef = msqrt(maxx * maxy);

  canv.width = maxx;
  canv.height = maxy;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  rndStruct = Mash(rndSeed);
  ++rndSeed;
  readUI();
  calcHexagon();
 

/* rem : width = (1.5 * nx + 0.5) * radius
         height = (ny + 0.5) * radius * sqrt(3)
*/         

  nbx = mfloor((maxx / uiv.radius - 0.5) / 1.5);
  nby = mfloor(maxy / uiv.radius / rac3 - 0.5);

    nbx += 2;
    nby += 2;

  ctx.fillStyle = hslString(rndStruct.intAlea(360), 50, 20);
  ctx.fillRect(0,0,maxx,maxy);

  grid = new Array(nby).fill(0).map((v, ky) => new Array(nbx).fill(0).map((v, kx) => new Hexagon(kx, ky)));
  
  grid.forEach(line => {
    line.forEach(cell=> {
        cell.calculatePoints();
    });
  });
  
  attachHalfPoints();
    createArcs();
    createPieces();
//   if (rndStruct() > 0.5) drawGrid();
       
  return true;

} // startOver

//------------------------------------------------------------------------

function mouseClick (event) {

  events.push({event:'click', x: event.clientX, y: event.clientY});;
  if (! mouse) mouse = {};
  mouse.x = event.clientX;
  mouse.y = event.clientY;
} // mouseClick

//------------------------------------------------------------------------
//------------------------------------------------------------------------
// beginning of execution

  {
    canv = document.createElement('canvas');
    canv.style.position="absolute";
    document.body.appendChild(canv);
    ctx = canv.getContext('2d');
    canv.setAttribute ('title','click me');
  } // creation CANVAS
  canv.addEventListener('click',mouseClick);
  events = [{event:'reset'}];
  requestAnimationFrame (animate);

}); // window load listener