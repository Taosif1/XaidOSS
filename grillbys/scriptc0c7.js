const canvas = document.getElementById("viewport");
const ctx = canvas.getContext("2d");
const room = {
    name: "grillbys",
    src: "images/grillbys.webp",
    src_collisions: "images/grillbys_collisionmap.png",
    width: 638,
    height: 476,
};
const collision_boxes = [];
const pixels = [];
let characters = [];
let items = [];
let shadowLayer = [];
let shadowLayerLight;
let tempShadowCanvas = document.createElement('canvas');
tempShadowCanvas.width = room.width;
tempShadowCanvas.height = room.height;
let tempShadowCtx = tempShadowCanvas.getContext('2d');
let moving = {};
let mouse = {
    x: 0,
    y: 0
}

// video
let video = document.createElement('video');
let videoAudio = new Audio();
let tvItem = null;

setInterval(() => {
    video.currentTime = videoAudio.currentTime;
}, 20000);

video.onended = () => {
    videoAudio.src = "";
    tvItem.blink = false;
    video.src = "";
}

if(localStorage.debug === "1") document.getElementById('viewport').parentElement.append(document.createElement('br'), tempShadowCanvas); 

for(let i = 1; i <= 40; i++) {
    let img = new Image();
    img.src = `images/dark/grillbys_dark_layer${i}.png`;
    img.onload = () => {
        if(i !== 1) return;
        tempShadowCtx.fillStyle = "red";
        tempShadowCtx.fillRect(0, 0, room.width, room.height);
        tempShadowCtx.drawImage(img, 0, 0);
        let imageData = tempShadowCtx.getImageData(0, 0, room.width, room.height);
        for(let i = 0; i < imageData.data.length; i += 4) {
            if(imageData.data[i + 0] > 50) {
                imageData.data[i+0] = 255;
                imageData.data[i+1] = 255;
                imageData.data[i+2] = 255;
                imageData.data[i+3] = 255;
            }
        }
        shadowLayerLight = imageData;
        tempShadowCtx.putImageData(imageData, 0, 0);
    }
    shadowLayer.push(img);
}
let darkMode = false;

let cards = [];
let placedCards = [];
let deckImage = new Image();
let lastDeckTake = Date.now();
let cardAnimation = [];
setInterval(() => {
    cardAnimation = [];
}, 20000)
deckImage.src = "images/cards/deck0.png";
let selectedCard = null;
let placeCardMode = 0; // 0 - off, 1 - private, 2 - public
let cardToDraw = {
    text: "",
    x: 0,
    y: 0,
}
let placeCardImage = new Image();
placeCardImage.src = "images/cards/place.png";

let selectedItem;
let itemAddMode = false;
let nickToDraw = {
    nick: "",
    x: 0,
    y: 0,
}

room.img = new Image();
room.img.src = room.src;
room.img_collisions = new Image();
room.img_collisions.src = room.src_collisions;

let over = new Image();
over.src = "images/grillbys_over.png";
let over_lower = new Image();
over_lower.src = "images/grillbys_over_lower.png";

canvas.width = room.width;
canvas.height = room.height;

function onVisibilityChange(callback) {
    var visible = true;

    if (!callback) {
        throw new Error('no callback given');
    }

    function focused() {
        if (!visible) {
            callback(visible = true);
        }
    }

    function unfocused() {
        if (visible) {
            callback(visible = false);
        }
    }

    // Standards:
    if ('hidden' in document) {
        visible = !document.hidden;
        document.addEventListener('visibilitychange',
            function() {(document.hidden ? unfocused : focused)()});
    }
    if ('mozHidden' in document) {
        visible = !document.mozHidden;
        document.addEventListener('mozvisibilitychange',
            function() {(document.mozHidden ? unfocused : focused)()});
    }
    if ('webkitHidden' in document) {
        visible = !document.webkitHidden;
        document.addEventListener('webkitvisibilitychange',
            function() {(document.webkitHidden ? unfocused : focused)()});
    }
    if ('msHidden' in document) {
        visible = !document.msHidden;
        document.addEventListener('msvisibilitychange',
            function() {(document.msHidden ? unfocused : focused)()});
    }
    // IE 9 and lower:
    if ('onfocusin' in document) {
        document.onfocusin = focused;
        document.onfocusout = unfocused;
    }
    // All others:
    window.onpageshow = window.onfocus = focused;
    window.onpagehide = window.onblur = unfocused;
};
let isTabFocused = true;
onVisibilityChange(function(visible) {
    isTabFocused = visible;
});

class CharacterSprite {
    constructor(srcs) {
        this.srcs = srcs;
        this.speedMultiplier = srcs.speed_multiplier;
        this.heightOffset = 0;
        this.images = {
            left: [],
            right: [],
            up: [],
            down: [],
            left_walk: [],
            right_walk: [],
            up_walk: [],
            down_walk: []
        }
        let imgnames = ["left", "right", "up", "down", "left_walk", "right_walk", "up_walk", "down_walk"];
        for(let move in this.srcs) {
            if(!imgnames.includes(move)) continue;
            let src = this.srcs[move];
            let _canvas = document.createElement("canvas");
            let _ctx = _canvas.getContext("2d");
            if(src.endsWith(".gif") || src.startsWith("data:image/gif;")) {
                fetch(src)
                    .then(resp => resp.arrayBuffer())
                    .then(buff => {
                            let gif = gifuct.parseGIF(buff)
                            let frames = gifuct.decompressFrames(gif, true);
                            _canvas.width = frames[0].dims.width;
                            _canvas.height = frames[0].dims.height;
                            if(_canvas.height < 130) {
                                _canvas.height = 130;
                            }
                            for(let frame of frames) {
                                let imagedata = new ImageData(frame.patch, _canvas.width, frames[0].dims.height);
                                _ctx.putImageData(imagedata, 0, _canvas.height-frame.dims.height);
                                this.heightOffset =  _canvas.height-frame.dims.height;
                                this.images[move].push(new Image());
                                this.images[move][this.images[move].length - 1].src = _canvas.toDataURL();
                            }
                    });
            } else {
                let img = new Image();
                img.src = src;
                img.onload = () => {
                    _canvas.width = img.width;
                    _canvas.height = img.height;
                    if(_canvas.height < 130) {
                        _canvas.height = 130;
                    }
                    _ctx.drawImage(img, 0, _canvas.height-img.height);
                    this.heightOffset =  _canvas.height-img.height;
                    this.images[move].push(new Image());
                    this.images[move][0].src = _canvas.toDataURL();
                }   
            }
        }
    }
}

let noWalk = false, fastWalk = false;
document.addEventListener("keydown", (e) => {
    if(e.key === "Shift") {
        fastWalk = true;
    }
});
document.addEventListener("keyup", (e) => {
    if(e.key === "Shift") {
        fastWalk = false;
    }
});
class Character {
    constructor(x, y, sprite) {
        this.x = x;
        this.y = y;
        this.lastMove = "down";
        this.lastMoveChange = 0;
        this.sprite = sprite;
        this.walking = false;
        this.chat = null;
        this.chatExpire = 0;
        characters.push(this);
    }
    draw() {
        let move = this.lastMove + (this.walking ? '_walk' : '');
        if(this.sprite.images[move].length === 0) return;
        let sprite_index = Math.floor(Date.now() / 100) % this.sprite.images[move].length;
        ctx.drawImage(this.sprite.images[move][sprite_index], this.x, this.y);
    }
    walk(direction, notMove = false) {
        if(noWalk) return;
        if(Date.now()-this.lastMoveChange > 20) {
            this.lastMove = direction;
            this.lastMoveChange = Date.now();
        }
        if(notMove) return;
        this.walking = true;
        let walk_amount = this.sprite && this.controllable && (this.sprite.speedMultiplier || fastWalk) ? 2 : 1;
        if(direction === "left") {
            this.x -= walk_amount;
            if(this.isCollide()) {
                this.x += walk_amount;
            }
        } else if(direction === "right") {
            this.x += walk_amount;
            if(this.isCollide()) {
                this.x -= walk_amount;
            }
        } else if(direction === "up") {
            this.y -= walk_amount;
            if(this.isCollide()) {
                this.y += walk_amount;
            }
        } else if(direction === "down") {
            this.y += walk_amount;
            if(this.isCollide()) {
                this.y -= walk_amount;
            }
        }
        if(this.y > 380) {
            noWalk = true;
            ws.close();
            setTimeout(() => {
                alert("You have left the Grillby's, see you later!");
                window.location.href = "https://dimden.dev/";
            });
            return;
        }
    }
    stop() {
        this.walking = false;
        if(ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
                operation: "move",
                value: {
                    x: this.x,
                    y: this.y,
                    lastMove: this.lastMove,
                    walking: this.walking
                }
            }));
        }
    }
    isCollide() {
        let player;
        try {
            player = {
                x: this.x,
                y: this.sprite && this.sprite.images['down'] ? this.y + this.sprite.images['down'][0].height - 40 : this.y+80,
                width: this.sprite && this.sprite.images['down'] ? this.sprite.images['down'][0].width : 0,
                height: 20
            };
        } catch(e) {
            return true;
        }
        for(let i = 0; i < collision_boxes.length; i++) {
            let box = collision_boxes[i];
            if(box.x < player.x + player.width &&
                box.x + box.width > player.x &&
                box.y < player.y + player.height &&
                box.y + box.height > player.y) {
                return true;
            }
        }
    }
    destroy() {
        characters.splice(characters.indexOf(this), 1);
    }
}
let walkI = 0;
class ControllableCharacter extends Character {
    constructor(x, y, sprite) {
        super(x, y, sprite);
        this.controllable = true;
        let onkeydown = e => {
            if(characters[0] && characters[0].x < 125 && characters[0].y < 140 && characters[0].y > 75 && tvItem && document.activeElement.id !== "chat") {
                // tv
                if(e.keyCode === 70) {
                    let video_url = prompt("Enter YouTube URL. Enter 0 to disable video.");
                    if(video_url === '0') {
                        ws.send(JSON.stringify({
                            operation: "videoStop"
                        }));
                    } else if(video_url) {
                        ws.send(JSON.stringify({
                            operation: "video",
                            value: video_url
                        }));
                    }
                    return;
                }
            }
            if(characters[0] && characters[0].x > 500 && characters[0].y < 65 && document.activeElement.id !== "chat") {
                // jukebox
                if(e.keyCode === 70) {
                    let music_url = prompt("Enter a URL to play music from (also supports YouTube). Enter 0 to disable music.");
                    if(music_url === '0') {
                        ws.send(JSON.stringify({
                            operation: "musicStop"
                        }));
                    } else if(music_url) {
                        ws.send(JSON.stringify({
                            operation: "music",
                            value: music_url
                        }));
                    }
                    return;
                }
            }
            if(e.key === "Enter") {
                if(e.target.id !== 'chat') return document.getElementById('chat').focus();
                let msg = document.getElementById("chat").value;
                if(msg.startsWith("/nick ")) {
                    localStorage.setItem("nick_grillby", msg.slice(6));
                    ws.send(JSON.stringify({
                        operation: "nick",
                        value: msg.slice(6)
                    }));
                } else if(msg.startsWith("/ban ")) {
                    ws.send(JSON.stringify({
                        operation: "ban",
                        value: msg.slice(4)
                    }));
                } else if(msg.startsWith("/kick ")) {
                    ws.send(JSON.stringify({
                        operation: "kick",
                        value: msg.slice(5)
                    }));
                } else if(msg.startsWith("/ip ")) {
                    ws.send(JSON.stringify({
                        operation: "ip",
                        value: msg.slice(3)
                    }));
                } else if(msg.startsWith("/setversion ")) {
                    ws.send(JSON.stringify({
                        operation: "setVersion",
                        value: +msg.slice(11)
                    }));
                } else if(msg.startsWith("/help")) {
                    ws.send(JSON.stringify({operation: "help"}));
                } else if(msg.startsWith("/banip ")) {
                    ws.send(JSON.stringify({
                        operation: "banip",
                        value: msg.slice(6)
                    }));
                } else if(msg.startsWith("/unban ")) {
                    ws.send(JSON.stringify({
                        operation: "unban",
                        value: msg.slice(6)
                    }));
                } else if(msg.startsWith("/deckshufflevote") || msg.startsWith("/deckvoteshuffle") || msg.startsWith("/shuffledeckvote") || msg.startsWith("/votedeckshuffle")) {
                    ws.send(JSON.stringify({
                        operation: "deckShuffleVote"
                    }));
                } else if(msg.startsWith("/shuffledeck") || msg.startsWith("/deckshuffle")) {
                    ws.send(JSON.stringify({
                        operation: "deckShuffle"
                    }));
                } else if(msg.startsWith("/darkmode")) {
                    ws.send(JSON.stringify({
                        operation: "darkMode"
                    }));
                } else if(!msg.startsWith("/")) {
                    ws.send(JSON.stringify({
                        operation: "chat",
                        value: msg
                    }));
                }
                document.getElementById('chat').value = "";
                document.getElementById("viewport").focus();
            }
            if(e && e.target && e.target.id === "chat") return;
            if(![87, 65, 83, 68].includes(e.keyCode)) return;
            if(e.altKey) {
                e.preventDefault();
                if(e.keyCode === 87) {
                    this.walk("up", true);
                } else if(e.keyCode === 65) {
                    this.walk("left", true);
                } else if(e.keyCode === 83) {
                    this.walk("down", true);
                } else if(e.keyCode === 68) {
                    this.walk("right", true);
                }
                return;
            }
            moving[e.keyCode] = true;
            // if(this.walkIntervals[e.keyCode]) return;
            // this.walkIntervals[e.keyCode] = setInterval(() => {
            //     if (e.keyCode === 87) {
            //         this.walk("up");
            //     } else if (e.keyCode === 83) {
            //         this.walk("down");
            //     } else if (e.keyCode === 65) {
            //         this.walk("left");
            //     } else if (e.keyCode === 68) {
            //         this.walk("right");
            //     }
            //     if(ws.readyState === ws.OPEN && walkI % 2 === 0) ws.send(JSON.stringify({
            //         operation: "move",
            //         value: {
            //             x: this.x,
            //             y: this.y,
            //             lastMove: this.lastMove,
            //             walking: this.walking
            //         }
            //     }));
            // }, 8);
        }
        let onkeyup = e => {
            moving[e.keyCode] = false;
            // clearInterval(this.walkIntervals[e.keyCode]);
            // this.walkIntervals[e.keyCode] = 0;
            this.stop();
        }
        document.onkeydown = onkeydown;
        document.onkeyup = onkeyup;
        document.getElementById('mobile-w').ontouchstart = e => {
            onkeydown({keyCode: 87});
        }
        document.getElementById('mobile-d').ontouchstart = e => {
            onkeydown({keyCode: 83});
        }
        document.getElementById('mobile-a').ontouchstart = e => {
            onkeydown({keyCode: 65});
        }
        document.getElementById('mobile-s').ontouchstart = e => {
            onkeydown({keyCode: 68});
        }
        document.getElementById('mobile-w').ontouchend = e => {
            onkeyup({keyCode: 87});
        }
        document.getElementById('mobile-d').ontouchend = e => {
            onkeyup({keyCode: 83});
        }
        document.getElementById('mobile-a').ontouchend = e => {
            onkeyup({keyCode: 65});
        }
        document.getElementById('mobile-s').ontouchend = e => {
            onkeyup({keyCode: 68});
        }
        document.getElementById('mobile-f').onclick = e => {
            onkeydown({keyCode: 70});
        }
    }
}
document.addEventListener('dblclick', function(event) {
    event.preventDefault();
}, { passive: false });
let players = [];
class Player {
    constructor(id) {
        this.id = id;
        this.moved = false;
        this.nick = "Anonymous";
        this.character = null;
        this.cardCount = 0;
    }
    leave() {
        players.splice(players.indexOf(this), 1);
        if(this.character) this.character.destroy();
    }
}

room.img.onload = () => {
    ctx.drawImage(room.img, 0, 0, room.width, room.height);
};

// Collisions
room.img_collisions.onload = () => {
    let temp_canvas = document.createElement('canvas');
    temp_canvas.width = room.width;
    temp_canvas.height = room.height;
    let temp_ctx = temp_canvas.getContext('2d');
    let img = room.img_collisions;
    temp_ctx.drawImage(img, 0, 0, room.width, room.height);
    // get all pixels
    const imageData = temp_ctx.getImageData(0, 0, room.width, room.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
        pixels.push([ data[i], data[i + 1], data[i + 2] ]);
    }
    // get index by coordinates
    const index = (x, y) => {
        return y * room.width + x;
    }
    for(let y = 0; y < room.height; y++) {
        for(let x = 0; x < room.width; x++) {
            const gindex = index(x, y); const pixel = pixels[gindex];
            const gindex_b = index(x, y+1); const pixel_b = pixels[gindex_b];
            const gindex_r = index(x+1, y); const pixel_r = pixels[gindex_r];
            if(pixel[1] === 255 && pixel_b[1] === 255 && pixel_r[1] === 255) {
                let temp_x = x;
                for(temp_x; temp_x < room.width; temp_x++) {
                    const temp_index_ahead = index(temp_x+1, y);
                    const temp_pixel_ahead = pixels[temp_index_ahead];
                    if(!temp_pixel_ahead || temp_pixel_ahead[1] !== 255) {
                        let temp_y = y;
                        for(temp_y; temp_y < room.height; temp_y++) {
                            const temp_index_down = index(temp_x, temp_y+1);
                            const temp_pixel_down = pixels[temp_index_down];
                            if(!temp_pixel_down || temp_pixel_down[1] !== 255) {
                                collision_boxes.push({
                                    x: x,
                                    y: y,
                                    width: temp_x - x,
                                    height: temp_y - y
                                });
                                x = temp_x;
                                break;
                            }
                        }
                        break;
                    }
                }
            }
        }
    }
};

// raytracing
function getIntersection(ray,segment){

	// RAY in parametric: Point + Delta*T1
	var r_px = ray.a.x;
	var r_py = ray.a.y;
	var r_dx = ray.b.x-ray.a.x;
	var r_dy = ray.b.y-ray.a.y;

	// SEGMENT in parametric: Point + Delta*T2
	var s_px = segment.a.x;
	var s_py = segment.a.y;
	var s_dx = segment.b.x-segment.a.x;
	var s_dy = segment.b.y-segment.a.y;

	// Are they parallel? If so, no intersect
	var r_mag = Math.sqrt(r_dx*r_dx+r_dy*r_dy);
	var s_mag = Math.sqrt(s_dx*s_dx+s_dy*s_dy);
	if(r_dx/r_mag==s_dx/s_mag && r_dy/r_mag==s_dy/s_mag){
		// Unit vectors are the same.
		return null;
	}

	// SOLVE FOR T1 & T2
	// r_px+r_dx*T1 = s_px+s_dx*T2 && r_py+r_dy*T1 = s_py+s_dy*T2
	// ==> T1 = (s_px+s_dx*T2-r_px)/r_dx = (s_py+s_dy*T2-r_py)/r_dy
	// ==> s_px*r_dy + s_dx*T2*r_dy - r_px*r_dy = s_py*r_dx + s_dy*T2*r_dx - r_py*r_dx
	// ==> T2 = (r_dx*(s_py-r_py) + r_dy*(r_px-s_px))/(s_dx*r_dy - s_dy*r_dx)
	var T2 = (r_dx*(s_py-r_py) + r_dy*(r_px-s_px))/(s_dx*r_dy - s_dy*r_dx);
	var T1 = (s_px+s_dx*T2-r_px)/r_dx;

	// Must be within parametic whatevers for RAY/SEGMENT
	if(T1<0) return null;
	if(T2<0 || T2>1) return null;

	// Return the POINT OF INTERSECTION
	return {
		x: r_px+r_dx*T1,
		y: r_py+r_dy*T1,
		param: T1
	};

}


// Drawing
let segments = [];
let Light = {
    x: 208,
    y: 300
}
let uniqueAngles = [];
let intersects = [];
let polygons = [];

function getSightPolygon(sightX,sightY){

	// Get all unique points
	points = (function(segments){
		var a = [];
		segments.forEach(function(seg){
			a.push(seg.a,seg.b);
		});
		return a;
	})(segments);
	uniquePoints = (function(points){
		var set = {};
		return points.filter(function(p){
			var key = p.x+","+p.y;
			if(key in set){
				return false;
			}else{
				set[key]=true;
				return true;
			}
		});
	})(points);

	// Get all angles
	uniqueAngles = [];
	for(var j=0;j<uniquePoints.length;j++){
		var uniquePoint = uniquePoints[j];
		var angle = Math.atan2(uniquePoint.y-sightY,uniquePoint.x-sightX);
		uniquePoint.angle = angle;
		uniqueAngles.push(angle-0.00001,angle,angle+0.00001);
	}

	// RAYS IN ALL DIRECTIONS
	intersects = [];
	for(var j=0;j<uniqueAngles.length;j++){
		var angle = uniqueAngles[j];

		// Calculate dx & dy from angle
		var dx = Math.cos(angle);
		var dy = Math.sin(angle);

		// Ray from center of screen to mouse
		var ray = {
			a:{x:sightX,y:sightY},
			b:{x:sightX+dx,y:sightY+dy}
		};

		// Find CLOSEST intersection
		var closestIntersect = null;
		for(var i=0;i<segments.length;i++){
			var intersect = getIntersection(ray,segments[i]);
			if(!intersect) continue;
			if(!closestIntersect || intersect.param<closestIntersect.param){
				closestIntersect=intersect;
			}
		}

		// Intersect angle
		if(!closestIntersect) continue;
		closestIntersect.angle = angle;

		// Add to list of intersects
		intersects.push(closestIntersect);

	}

	// Sort intersects by angle
	intersects = intersects.sort(function(a,b){
		return a.angle-b.angle;
	});

	// Polygon is intersects, in order of angle
	return intersects;

}

function drawPolygon(polygon,ctx,fillStyle){
	ctx.fillStyle = fillStyle;
	ctx.beginPath();
    if(!polygon[0]) return ctx.fill();
	ctx.moveTo(polygon[0].x,polygon[0].y);
	for(var i=1;i<polygon.length;i++){
		var intersect = polygon[i];
		ctx.lineTo(intersect.x,intersect.y);
	}
	ctx.fill();
}
let shadowCanvas = document.createElement("canvas");
let shadowCtx = shadowCanvas.getContext('2d');
shadowCanvas.width = canvas.width;
shadowCanvas.height = canvas.height;

if(localStorage.debug === "1") document.getElementById('viewport').parentElement.append(document.createElement('br'), shadowCanvas); 

function mixPixels(p1, p2) {
    return [
        p1[0] * p1[3] + p2[0] * p2[3] * (1 - p1[3]),
        p1[1] * p1[3] + p2[1] * p2[3] * (1 - p1[3]),
        p1[2] * p1[3] + p2[2] * p2[3] * (1 - p1[3]),
        p1[3] + p2[3] * (1 - p1[3])
    ]
}
function normalize(val, max, min) { return (val - min) / (max - min); }


function draw() {
    ctx.drawImage(room.img, 0, 0, room.width, room.height);

    // raycasting
    if(characters[0] && darkMode) {
        segments = [
            {a: {x:0,y:0}, b:{x:canvas.width,y:0}},
            {a: {x:canvas.width,y:0}, b:{x:canvas.width,y:canvas.height}},
            {a: {x:canvas.width,y:canvas.height}, b:{x:0,y:canvas.height}},
            {a: {x:0,y:canvas.height}, b:{x:0,y:0}}        
        ];
        characters.filter(i => i.sprite && i.sprite.images[i.lastMove].length > 0).forEach(function(seg){
            segments.push(
                {a: {x: seg.x + seg.sprite.images[seg.lastMove][0].width/3, y: seg.y + seg.sprite.heightOffset+10}, b: {x: seg.x + (seg.sprite.images[seg.lastMove][0].width/3)*2, y: seg.y + seg.sprite.heightOffset+10}},
                {a: {x: seg.x + (seg.sprite.images[seg.lastMove][0].width/3)*2, y: seg.y + seg.sprite.heightOffset+10}, b: {x: seg.x + (seg.sprite.images[seg.lastMove][0].width/3)*2, y: seg.y + seg.sprite.images[seg.lastMove][0].height-10}},
                {a: {x: seg.x + seg.sprite.images[seg.lastMove][0].width/3, y: seg.y + seg.sprite.heightOffset+10}, b: {x: seg.x + seg.sprite.images[seg.lastMove][0].width/3, y: seg.y + seg.sprite.images[seg.lastMove][0].height-10}},
                {a: {x: seg.x + seg.sprite.images[seg.lastMove][0].width/3, y: seg.y + seg.sprite.images[seg.lastMove][0].height-10}, b: {x: seg.x + (seg.sprite.images[seg.lastMove][0].width/3)*2, y: seg.y + seg.sprite.images[seg.lastMove][0].height-10}}
            );
        });
        items.filter(i => i.sprite && i.sprite.images.length > 0).forEach(function(seg){
            segments.push(
                {a: {x: seg.x-seg.sprite.images[0].width/3, y: seg.y-seg.sprite.images[0].height/3}, b: {x: seg.x+seg.sprite.images[0].width/3, y: seg.y-seg.sprite.images[0].height/3}},
                {a: {x: seg.x+seg.sprite.images[0].width/3, y: seg.y-seg.sprite.images[0].height/3}, b: {x: seg.x+seg.sprite.images[0].width/3, y: seg.y+seg.sprite.images[0].height/3}},
                {a: {x: seg.x+seg.sprite.images[0].width/3, y: seg.y+seg.sprite.images[0].height/3}, b: {x: seg.x-seg.sprite.images[0].width/3, y: seg.y+seg.sprite.images[0].height/3}},
                {a: {x: seg.x-seg.sprite.images[0].width/3, y: seg.y+seg.sprite.images[0].height/3}, b: {x: seg.x-seg.sprite.images[0].width/3, y: seg.y-seg.sprite.images[0].height/3}}
            );
        });
        // Sight Polygons
        polygons = [getSightPolygon(Light.x,Light.y)];
        shadowCtx.fillStyle = "black";
        shadowCtx.fillRect(0, 0, canvas.width, canvas.height);
        drawPolygon(polygons[0], shadowCtx, "rgba(255,255,255,1)");
        if(shadowLayerLight) {
            let shadows = shadowCtx.getImageData(0, 0, room.width, room.height);
            let id = ctx.getImageData(0, 0, room.width, room.height);
            for(let i = 0; i < id.data.length; i += 4) {
                if(shadowLayerLight.data[i] === 255 && shadows.data[i] === 0) {
                    let mix = mixPixels([0, 0, 0, 0.67], [id.data[i], id.data[i+1], id.data[i+2], normalize(id.data[i+3], 255, 0)]);
                    id.data[i+0] = mix[0];
                    id.data[i+1] = mix[1];
                    id.data[i+2] = mix[2];
                }
            }
            ctx.putImageData(id, 0, 0);
        }
    }
    
    if (moving[87]) {
        characters[0].walk("up");
        if(fps <= 30) characters[0].walk("up");
        if(ws.readyState === ws.OPEN) ws.send(JSON.stringify({
            operation: "move",
            value: {
                x: characters[0].x,
                y: characters[0].y,
                lastMove: characters[0].lastMove,
                walking: characters[0].walking
            }
        }));
    }
    if (moving[83]) {
        characters[0].walk("down");
        if(fps <= 30) characters[0].walk("down");
        if(ws.readyState === ws.OPEN) ws.send(JSON.stringify({
            operation: "move",
            value: {
                x: characters[0].x,
                y: characters[0].y,
                lastMove: characters[0].lastMove,
                walking: characters[0].walking
            }
        }));
    }
    if (moving[65]) {
        characters[0].walk("left");
        if(fps <= 30) characters[0].walk("left");
        if(ws.readyState === ws.OPEN) ws.send(JSON.stringify({
            operation: "move",
            value: {
                x: characters[0].x,
                y: characters[0].y,
                lastMove: characters[0].lastMove,
                walking: characters[0].walking
            }
        }));
    }
    if (moving[68]) {
        characters[0].walk("right");
        if(fps <= 30) characters[0].walk("right");
        if(ws.readyState === ws.OPEN) ws.send(JSON.stringify({
            operation: "move",
            value: {
                x: characters[0].x,
                y: characters[0].y,
                lastMove: characters[0].lastMove,
                walking: characters[0].walking
            }
        }));
    }

    let even_before_characters = [];
    let before_characters = [];
    let after_characters = [];
    let lower_characters = [];
    let even_lower_characters = [];
    for(let i = 0; i < characters.length; i++) {
        let character = characters[i];
        character.fakeY = character.y;
        if(character.y <= 70) {
            before_characters.push(character);
        } else if(character.y <= 140) {
            after_characters.push(character);
        } else if(character.y >= 215) {
            lower_characters.push(character);
        } else {
            before_characters.push(character);
        }
    }
    for(let i = 0; i < items.length; i++) {
        let item = items[i];
        item.fakeY = item.y - 120;
        if(item.vault && item.vault.lowest_layer) {
            even_before_characters.push(item);
        } else if(item.y <= 100) {
            before_characters.push(item);
        } else if(item.y <= 240) {
            after_characters.push(item);
        } else if(item.y >= 350) {
            even_lower_characters.push(item);
        } else if(item.y >= 215) {
            lower_characters.push(item);
        } else {
            before_characters.push(item);
        }
    }
    even_before_characters.sort((a, b) => a.fakeY - b.fakeY);
    before_characters.sort((a, b) => a.fakeY - b.fakeY);
    after_characters.sort((a, b) => a.fakeY - b.fakeY);
    lower_characters.sort((a, b) => a.fakeY - b.fakeY);
    even_lower_characters.sort((a, b) => a.fakeY - b.fakeY);

    for(let i = 0; i < even_before_characters.length; i++) {
        even_before_characters[i].draw();
    }
    for(let i = 0; i < before_characters.length; i++) {
        before_characters[i].draw();
    }
    ctx.drawImage(over, 0, 0, room.width, room.height);
    for(let i = 0; i < after_characters.length; i++) {
        after_characters[i].draw();
    }
    for(let i = 0; i < lower_characters.length; i++) {
        lower_characters[i].draw();
    }
    ctx.drawImage(over_lower, 0, 0, room.width, room.height);
    for(let i = 0; i < even_lower_characters.length; i++) {
        even_lower_characters[i].draw();
    }
    
    // card animation
    for(let i in cardAnimation) {
        if(cardAnimation[i] && cardAnimation[i].draw) cardAnimation[i].draw(true);
    }

    // deck
    try {
        ctx.drawImage(deckImage, 202, 301);
    } catch(e) {
    }

    // cards
    for(let i = 0; i < placedCards.length; i++) {
        placedCards[i].draw();
    }
    if(cardToDraw.text && !placeCardMode) {
        smallDrawTextBG(cardToDraw.text, "10px FallbackMSGothic", cardToDraw.x + 4, cardToDraw.y - 8);
    }
    if(placeCardMode && placeCardImage.width && mouse.x >= 124 && mouse.y >= 262 && mouse.x <= 124+162 && mouse.y <= 262+93 && !(mouse.x >= 202 && mouse.y >= 301 && mouse.x <= 202+13 && mouse.y <= 301+13)) {
        ctx.drawImage(placeCardImage, Math.floor((mouse.x-placeCardImage.width/2)/2)*2, Math.floor((mouse.y-placeCardImage.height/2)/2)*2);
    }

    // nick
    if(nickToDraw.nick) {
        drawTextBG(nickToDraw.nick, "14px FallbackMSGothic", nickToDraw.x + 46/2, nickToDraw.y+ characters[0].sprite.heightOffset+30);
    }

    // dark
    if(darkMode && shadowLayer.length === 40) {
        let sprite_index = Math.floor(Date.now() / 100) % 40;
        if(isFinite(sprite_index)) ctx.drawImage(shadowLayer[sprite_index], 0, 0, room.width, room.height);
    }

    // chat drawing
    for(let i = 0; i < characters.length; i++) {
        let x = characters[i].x;
        let y = characters[i].y;
        if(characters[i].chatExpire > Date.now()) {
            ctx.fillStyle = "white";
            drawTextBG(characters[i].chat, "14px FallbackMSGothic", x+46/2, y+characters[i].sprite.heightOffset-10);
        }
    }
    
    // tv
    if(video.readyState >= 2 && tvItem) {
        ctx.drawImage(video, tvItem.x-tvItem.sprite.images[0].width/2+5, tvItem.y-tvItem.sprite.images[0].height/2+9);
    }
    if(tvItem && tvItem.blink) {
        // make it darker every other frame
        if(Date.now() % 2 === 0) {
            ctx.fillStyle = "rgba(0,0,0)";
            ctx.globalAlpha = 0.2;
            ctx.fillRect(tvItem.x-tvItem.sprite.images[0].width/2+5, tvItem.y-tvItem.sprite.images[0].height/2+9, 91, 42);
            ctx.globalAlpha = 1;
        }
    }
    // video box
    if(characters[0] && characters[0].x < 125 && characters[0].y < 140 && characters[0].y > 75 && tvItem) {
        drawTextBG("Play Video (F)", "14px FallbackMSGothic", tvItem.x, tvItem.y-tvItem.sprite.images[0].height/2);
    }
    // music box
    if(characters[0] && characters[0].x > 500 && characters[0].y < 65) {
        drawTextBG("Play Music (F)", "14px FallbackMSGothic", 555, 65);
    }

    requestAnimationFrame(draw);
}
function drawTextBG(txt, font, x, y) {
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    let width = ctx.measureText(txt).width;
    ctx.fillRect(x-5-width/2 + width > room.width ? room.width-width-10 : x-5-width/2 <= 0 ? 0 : x-5-width/2, y-5, width+10, parseInt(font, 10)+10);
    ctx.fillStyle = 'white';
    ctx.fillText(txt, x-5-width/2 + width > room.width ? room.width-width-5 : x-5-width/2 <= 0 ? 0 : x-width/2, y);
}
function smallDrawTextBG(txt, font, x, y) {
    ctx.font = font;
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    let width = ctx.measureText(txt).width;
    ctx.fillRect(x-2-width/2 + width > room.width ? room.width-width-4 : x-2-width/2 <= 0 ? 0 : x-2-width/2, y-2, width+4, parseInt(font, 10)+4);
    ctx.fillStyle = 'white';
    ctx.fillText(txt, x-2-width/2 + width > room.width ? room.width-width-2 : x-2-width/2 <= 0 ? 0 : x-width/2, y);
}

// Connecting to server
let ws;
let connected = 0;
let lastPlaySound = Date.now();
setInterval(() => {
    if(ws && ws.readyState === 1) ws.send("ping");
}, 1000);
function connect() {
    ws = new WebSocket('wss://dimden.dev/services/grillbys/');
    ws.onopen = () => {
        connected = Date.now();
        if(!localStorage.sprites) {
            ws.send(JSON.stringify({
                operation: "sprite",
                value: {
                    left: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAA6CAYAAADVwos0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFRSURBVGhD7ZYxDoJAEEXB1oTCwkNY2Fpp7wm8hYfxFp7AXitbCw9hYUFijbLsNzhmGBZQZxdfYgaExN23f3eMI4H5KMnsZSsO17Tytwa2/py3UXZlgIMzo8/Ip01QqBk9Rr5tggIzaoz8B0JhM7LfFXWxLCq97xo9S5OnVuoDZXIzsNMlejJi6/NkrTvbrrMS3vZFdppmSL+ReJa+fDiaGqDo2TWuuwXQExc03U3+G6G0PVf0GXn0G/MFyI6JvaqmrQl1/9Aa9xrgagQGSiuh1AjASCWk84ObOYdeIxJclmBEmjmH/0Y4+mOEMzHZnEw9r6emAlcz/hiBCcycA0aoobpm/DOyvV3MPVgNx6ZSA3gPz8MxImWDy0S4GeGyAZABSv8ygrXnuq/3GfkPhCKun5QVwD0Pr9cA6aQFriaAv0bqEr4RIJlxNQHCzYjnRqLoDrSvvIUkFPeUAAAAAElFTkSuQmCC",
                    right: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAYAAAAUufjgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFPSURBVGhD7Za9DcIwEEYTWiQKCoagoKWCngnYgmHYggnoYQMKhqCgiEQNxMmHxInT+SdB8dlPii5WLNl5+S5JkQmkbKvIajp5tqdBnO+V9Zo1o7YOFvFuujLHIRmN12Df5iicyfgM/tschZocvMG8wVA+z7uv7J2OTV1vmkrHlJxBUJuCLRtqc7/ehelm0NYeshjtl8R7g8iYa9ZcSaeLJZPlsvo6bNHfxdQa/WLYwnWzfoMgtJPjNwj+ZZJ28ntdU/UYxJ24Gu2qe0F8Bjkks9z7UIIzB/QY5IBJzqBkSCIdgxzZIAc1N99fTL3uFqZSfE3qMwhz1BjGHJjnalKvwcPjZsbb8cxUahTXAeZlg1IGpUy6ZjGdDFJoBoFrFtPJIPc3Q7OoLoN5g6EEZxAgWyA0e0CfQcCZpPiaA/oN2pINckgmfc2BbBAozWBRvADybcUV0gXnDgAAAABJRU5ErkJggg==",
                    up: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAYAAAAUufjgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFHSURBVGhD7ZaxDcIwEEUDLRIFBUNQsAH0TMAWDMMWTEAPG1AwBAUFEjUo4I/Ejyyfc0nwBb/GjiLju6dP7CKjZODGIIvJ+OGmKo7Xm3jPkqEbkyXYTVPmGKlJuwbbMseETNoz2JU5xmfSjsFfmQPZYFOwyeQN5gK1DFLJHjCXweQMApjMfxItuUAtuUAtuUAtuUAtyRdYuVHjDOzqjOb97N1m3FjB1xHA+8P+9fhhuXqPvnWx2DXI1M2k1qT9DDKz7cnNZJw3czf7RmrWnkGYgykYiDXH8O/gOWTS3knCHYLd/eJmOtaj6WuUmrRvUJs9JjaL9gwyTWUPIINMfwzidoJbSVsZ5H3MGqwUWHaErtpEuo+dDDL8XfSBTDG+daHvHmMvg3UpjUitxGA/g1JgT7quNxkUZyZkJmSwbj7tG4zN1J9lsCieqyCjxFQ4QnAAAAAASUVORK5CYII=",
                    down: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAA6CAYAAADcKStOAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAF8SURBVGhD7ZYxbsJAEEUNbSQKihwiBW2qpM8JcoschltwgvSkSkvBIVKkQEoNsr2f4ovRzHox7LfymlmLFet9/ruaWRPkZbk4pmERX7+H0JrzVKvDfftrmWI8c3rGxjLFWOZ0jN3KFMPm/o1Fgbn6jXmmtp99fX3rq0V0noW+MRhg2AjPs373TE7XWCmeuWqNzVtT97y72i9y6avUm7Ho/TV7PvSDxPF7kUaXyZ3PmdMzNtZpZKzTOV1juVkCsvdY+FSW4hlidI0xuQZzTYF6jaV67i7QD5WajJri9XT6saFgp5YxGGDYEDM9Y7kZBJYhRteYZeZpvevq/mPVVQtv3nQyBlO8YzwPhf8Hz2xOx5hlavP309VS3h8e06jHMqdvrDRbjJc1PWPMtTIGOGtA1xi6BXQJY2WM16nemPli7Q6iXWgJ1jo6GWP4XmOQFcbLJN9bjF7Gcml3bu1+CPoZ84Ct6Hwgl7HsTFhGosaiOdQ3FjWRm0mLSo01zQm5LtGR4J/pYwAAAABJRU5ErkJggg==",
                    left_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6Kv4wPkarlTjavbLH3PWNTsiQ6GSmaci+wgaz8ozW9og/w+D0uRJFAhQUc7ti7whL+oxLpGhJjdpq1aq08stau8wM1sukksaBdMAMZX/Qanb2PGyTn25d/W7Nv/d8WjSAgV83dWprdy81iXyMHGCLekJjj5QxKx55DZkmdRmcAJWfmmylqIRPqayjIK2oYrCaEAUFELOREba4uXW2wMAOvJ6+w8HCAsS+HQIEzwTHDs+kudPQ0s7RxbDHwdnLxsrI4LfcrdfQ2xDU56zp2BHtzN7mbOHW48T35vT69lbwzaonKRuzTt8eJDzoKiFBdwP/LWTYDFkyis3+YKSDsRGThI6gNIB0JQukxpEoU1pIAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi63P4wykmrvThnwbv/ncaA5KeVKImlbFi1sCvF8Uzf0I0/Op33sJ9nMOAQgbIF6ChgIoXNYtSpgzKJ1J3DiO1mfbyp91sLj7tDbOt3VnfQLLaUe/WuzXMx3Z3aitt7ZSN/Z4FBDXttcIJKhIp5d4MBkwGPWogClJWKl36PZCYAHDafkCqiAhQpi6moJyisCqMinm60qnqttxEluzYgvmEeBQUewYPDxUm7HMTOzs3KwdHPxNGzzAIE2wTX2t26txzc4Nbf2CLUyt7m2c/J3tnbhuPg8uCs8+Gv5nDv+xsE9HPzzx20DtWkiRN4UF07Xw6rGYPIMKE5dBYmAkPV6xmCxlB9AnaUdWoFCmShXk0kuZFWS44pJyQAACH5BAkKAAAALAAAAAAoADwAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLoq/jA+RquVONq9ssfc9Y1OyJDoZKZpyL7CBrPyjNb2iD/D4PS5EkUCFBRzu2LvCEv6jEukaEmN2mrVqrTyy1q7zAzWy6SSxhAzVP1B86zZ83BNfrJ18zr8iz/R9WF9HX+AL1wCAYkBeoYiiot1jWOMeEKTkZUxKx53DZomcxmdAJagm2qmqXlWqq2kIK6pYrGbEAUFELQcEre5unO3wcEOvZ+/xMLDAsW/gwTPBMgOz6W609DSAtTGscjF2czHy8rguNyu12BP6eet7HfbzdlqwtXo4+re5vLj3/3K/Oo9SLav2SuCAu11+0fQlzsVEjzNkgVRw6uJqtoMingPFCPGhw4vWrQ2UmRIgyhTqlzJklYCACH5BAkKAAAALAAAAAAoADwAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLoq/jA+RquVONq9ssfc9Y1OyJDoZKZpyL7CBrPyjNb2iD/D4PS5EkUCFBRzu2LvCEv6jEukaEmN2mrVqrTyy1q7zAzWy6SSxoF0wAxlf9BqdvY8bJOfbl39bs2/93xaNICBXzd1amt3LzWJfIwcYIt6QmOPlDErHnkNmSZ1GZwAlZ+abKWohE+prKMgrahisJoQBQUQs5ERtri5dbbAwA68nr7DwcICxL4dAgTPBMcOz6S509DSztHFsMfB2cvGysjgt9yt19DbENTnrOnYEe3M3uZs4dbjxPfm9Pr2VvDNqicpG7NO3x4kPOgqIUF3A/8tZNgMWTKKzf5gpIOxEZOEjqA0gHQlC6TGkShTWkgAADs=",
                    right_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi63P4wykmpuDhrXOP+WueA5CcCZcpVartKrgvHNETXzx3bejv2l8EgOAw1gMSkkQEUCpUXns5ZfL6OPaq2KL1tqdFcCoz5OsO/EploRmPVWvYgQA9Yu6CtvG7nilVkZmRpY2cCgoaEgIhxAoqFjIl/LYh8bkwxlXWXC2GLiJyYCp+CoR6OKGWGICejqBlrJq0/g7Msh5K2E6y6u7K9kwUFG8CEwsTFrscCws3NpicXy87O0CIXBATSwwLZ2dYd2NrM3N7jydvp5NWouurT1OC+3xrm9MDiG/bnvepk7PjIydm2LOCyf8/a2fJnCGC/ddwIckMHMYNDitQSJsOUsRfgRlclPoIkIbLTr5KpkKFMefJjyAoJAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD/wi63P4wykmrvTjnwLv/ncaA5CcCZUpiahtWbvxKskzXOITnz17rvpgj2BEIOEbQkBhINo+mBtHodHKAPirUGsDutGCoFxfWXnstc7HsHJPUSLYYrQrHuW16yv7Ez5cuanJUZyMxgoN/C2SJaoCHjYRdeoFySpRpllFLCpWDhWidmZ+TFmcecCsbk6iSJSeGjrA3srNuoLZSqrmGHAQEl7woHb/Btr7AAb/Ly7giyMjMxaWwHAMD0AHX184a1tjKydvgudnT0cmz5sno3RffrU7c1N7a4HdQ8+rh02rT+8zwZQMozUNAequkseOXrhoxhc0Q1kOn0J2pFKI8ZJQYQRfFxlMzYOwa9mqVMY/PRhqbuIlkSAcJAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6Kv4wPkarlTjaTbPH3PWNTsiQ6GSmaci+wgaz8ozW9ljlzjD0P02H5wNKdjZfUbAsiWbKYDP2hEWvQZwVq3QiP1EIt0v9esKP8VKbwQJ9gXhgXW1f3wP5PFs/k9VkZmB/gHwnLIV3ZQsviWhsI4B6XkMpknKUhw2RhZlDm4OAni5UYmQZJiKgTKcgqSusdK+zjLGGtLOouLS6u7AOBQVHvhwQwcPEQ8cCwc3No7vAwszOz4vJDgQE0tna29fE3dwC3t/Jh8vp1dC51OPV0+cA4hHl2uyv9BD25ufjaM7wpfpHJiA4XASXGJSXMMhCf9SWSVsmb5PBifEqWoSXURzjRngCo+nwuKoXyXmuTtZCphKlSZIfWsqcWSEBACH5BAkKAAAALAAAAAAoADwAggAAAD0SDv/JDuYH+Gek4AAAAAAAAAAAAAP/CLoa/jA+RquVONpNs8fc9Y1OyJDoZKZpyL7BBrPyjNb2WOWOIPQ/TYfnA0p2Nl8xsCyJZspgM/aERa9BnBWrdCI/UQi3S/16wo/xUpvBAqfravv6DhrLQxJaTTaDyXxxJyyBdHgNhIV9ciN8R4x/Y49IiJFqXiKVZ4GYJgBOYmQZnpSfaaIgpC5Mi6qupmivr6OyqrS1qw4EBJO4Zru9vojAAbvGxp24urzFx8iHygEDA8sO09PJtdbUzdvY0Nrd4svEwqbExOTM5tuhS9/s0tx17eCu6vTi8cf55cLq6Zr58wWQGT57th44c5ZNFoSF/BCS+qAJlIqEtB5BmJWqFaIQjr0oRgv5cWTJYOZSqlzJsqWvBAA7",
                    up_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD9Ai63P4wyklpuDhrXOP+WueAZCgqZRqcartWrmrFrkTXzx1DOj72vgUwiBrKGsZjMZliMJWAZ2spJVGrnyvWtLVGu9kvmDsmlzni80uNZl+c62fxpwXOPS+4YC94n3J5QgF8fYF/gFCHcIl/GwSPkJGPGywakpcElDABk5yYnxedM52foJ5+PKcYA6ytrq+toZmGgp0XsLivsqhIqqW/s6KApMCmwj8ZucqxJsiry8qaP3uyxZcX1LRF2daY2IWpGd3Xzb3i45HSeKbn6drr3paSvKPxReSVpvfz7+FeJZUAplEX0AwaRYI0EWz0z0tBhQ4fJAAAIfkECQoAAAAsAAAAACgAPACCAAAAPRIO/8kO5gf4Z6TgAAAAAAAAAAAAA/UIuhz+MD5Gq5U42k2z19z2jUFYkWhpKim5tm0Ip+JMXzZa53rH942fyyf8BIujI9KjXDIBzmE0CZ0+rVcshqWVcLuQL9ghHpfB524wneOeVE43h+wT2AX0lUwVvOP5ei9AgXODhAsSBIqLjIpehImNko+CjgGSmIsOlpUEm5mYn3k4lg4Dp6ipqqiigEGlAauyqq07D6C4niBvELmglHV/s8MDDn6jfcLEssZ3yESXvo3Nds9K0tMBx66k2NlhJp/emruFmb26tZDRk7fp0dbh7O9sh6/kdBn20OD6+4hbqgDbB2zgv4Ll/smLp9BWw4cQI1ZIAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD9Ai63P4wyklpuDhrXOP+WueAZCgqZRqcartWrmrFrkTXzx1DOj72vgUwiBrKGsZjMZliMJWAZ2spJVGrnyvWtLVGu9kvmDsmlzni80uNZl+c62fxpwXOPS+4YC94n3J5QgF8fYF/gFCHcIl/GwSPkJGPGywakpcElDABk5yYnxedM52foJ5+PKcYA6ytrq+toZmGgp0XsLivsqhIqqW/s6KApMCmwj8ZucqxJsiry8qaP3uyxZcX1LRF2daY2IWpGd3Xzb3i45HSeKbn6drr3paSvKPxReSVpvfz7+FeJZUAplEX0AwaRYI0EWz0z0tBhQ4fJAAAIfkECQoAAAAsAAAAACgAPACCAAAAPRIO/8kO5gf4Z6TgAAAAAAAAAAAAA/MIuhz+MD5Gq5U42k2z19z2jUFYkWhpKim5tm0Ip+JMXzZa53rH942fyyf8BIujI9KjXDIBzmE0CZ0+rVcshqWVcLuQL9ghHpfB524wneOeVE43h+wT2AX0lUwVvOP5ei9AgXODhAsSBIqLjIpehImNko+CjgGSmIsOlpUEm5mYn3k4lgOmp6ippxCcpJ4BqrGprK87D6C4r2E4tLmhIG9+DrLEAw52o313w8Wxx381wpe+jbvRy9PUmhOFvdrbgt7ftZDTtOLg5Zait7+HbGKMyeWP3vOBGfDvTdz5+0TczvwDOIrSQEQBD4YDpLChw4cVEgAAOw==",
                    down_walk: "data:image/gif;base64,R0lGODdhJgA6AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAJgA6AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6LP4wPkYrlTjavbLXXPWNQtiQqAmgKce+pQWz2/yKdqtkw8D7uhWm96N1Ir0k0KGEEDEnp3IpaD6ekuh1yu0mMzukd2xlkc9ArAdNZlJ/gXjAK593Sb06Xe79sNl4f2eBe3FtKGR6YzCCXzmNajlVg5JihyRhYX6OYEInmmucUJ4qF5NPOKUup0CpqqaYrzVBqhIFBRm3WaW2uBi6ICEOwLfFxsfEvsICycjOvsCzwATU1dbX1RDRptPY3tbaytzQz+XJDjjN5s7D4loO3/HZwUcQ8vK7J0/r5W7opvv4sZv07x0zgcjy1XuAMCG9dMd6Oax10JjEiDFUtLMYYyIjRooThTwraOIDqE4aPZwcJWsXSlkL/71sOcokzE42KyQAACH5BAUKAAAALAAAAAAmADoAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLos/jA+RiuVONq9stdc9Y1C2JCoCaApx76lBbPb/Ip2q2TDwPu6Fab3o3UivSTQoYQQMSenciloPp6S6HXK7SYzO6R3bGWRz0CsB01mUn+BeMArn3dJvTpd7v2w2Xh/Z4F7cW0oZHpjMIJfOY1qOVWDkmKHJGFhfo5gQieaa5xQnioXk084pS6nQKmqppivNUGqEgW3Bba5ICq6t7pZJg6/ArjGx8bDuyHKysjPu8SzxATV1tfY1hDSptTZ39fby7AP0Oa4wVrO58/pR1bg8QRuDjjw8t/0MSdW7O287xz5Q+YO1DqCEZLtk5HQnK9xvYodI8EtIsIPFUutqyekHpOsjTE+yDI4oSPAj6M8jiSpbuFKdwVXmpT5CgLNBAAh+QQJCgAAACwAAAAAJgA6AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6LP4wPkYrlTjavbLXXPWNQtiQqAmgKce+pQWz2/yKdqtkw8D7uhWm96N1Ir0k0KGEEDEnp3IpaD6ekuh1yu0mMzukd2xlkc9ArAdNZlJ/gXjAK593Sb06Xe79sNl4f2eBe3FtKGR6YzCCXzmNajlVg5JihyRhYX6OYEInmmucUJ4qF5NPOKUup0CpqqaYrzVBqhIFBRm3WaW2uBi6ICEOwLfFxsfEvsICycjOvsCzwATU1dbX1RDRptPY3tbaytzQz+XJDjjN5s7D4loO3/HZwUcQ8vK7J0/r5W7opvv4sZv07x0zgcjy1XuAMCG9dMd6Oax10JjEiDFUtLMYYyIjRooThTwraOIDqE4aPZwcJWsXSlkL/71sOcokzE42KyQAACH5BAkKAAAALAAAAAAmADoAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLos/jA+RiuVONq9stdc9Y1C2JCoCaApx76lBbPb/Ip2q2TDwPu6Fab3o3UivSTQoYQQMSenciloPp6S6HXK7SYzO6R3bGWRz0CsB01mUn+BeMArn3dJvTpd7v2w2Xh/Z4F7cW0oZHpjMIJfOY1qOVWDkmKHJGFhfo5gQieaa5xQnioXk084pS6nQKmqppivNUGqEgUFtre4ICq5ubdZJg7AArrGx8bDuyHKysjPu8SzxA4E1tfY2dfNMSfUAtrh2dw4ENDnusFazujP6kdP4vIEbqim8fPh9a2wD+3urByU8/fv2D6Bq5JFQPcOh0Jz5xqa+pYBGcJexXZ9sNitItSHMAplgQrG7qLITp1ECiE5SuU7ibJe8lIpbALNWjZDJAAAOw==",
                }
            }));
        } else {
            ws.send(JSON.stringify({
                operation: "sprite",
                value: JSON.parse(localStorage.sprites)
            }));
        }
        setTimeout(() => {
            if(localStorage.admin) {
                ws.send(JSON.stringify({
                    operation: "admin",
                    value: localStorage.admin
                }));
            }
            if(localStorage.bartender) {
                ws.send(JSON.stringify({
                    operation: "bartender",
                    value: localStorage.bartender
                }));
            }
            if(localStorage.nick_grillby) {
                ws.send(JSON.stringify({
                    operation: "nick",
                    value: localStorage.nick_grillby
                }));
            }
        }, 100);
    }
    ws.onmessage = e => {
        let data;
        try {
            data = JSON.parse(e.data);
        } catch(error) {
            if(e.data === 'pong') return;
            console.log(e.data);
            let msg = document.createElement("div");
            msg.className = "msg";
            let msg_text = document.createElement("span");
            msg_text.innerHTML = e.data.replace('<LOCAL>', '&lt;LOCAL&gt;').replace('<GLOBAL>', '&lt;GLOBAL&gt;').replace('<CARDS>', '&lt;CARDS&gt;');
            msg_text.className = "msg-message"
            msg.appendChild(msg_text);
            document.getElementById("messages").appendChild(msg);
            setTimeout(() => {
                document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
            });
            return;
        }
        if(data.operation === 'join') {
            let player = new Player(data.value.id, data.value.x, data.value.y);
            if(data.value.nick) player.nick = data.value.nick;
            player.cardCount = data.value.cardCount;
            players.push(player);
        }
        if(data.operation === 'leave') {
            for(let i = 0; i < players.length; i++) {
                if(players[i].id === data.value) {
                    players[i].leave();
                }
            }
        }
        if(data.operation === 'nick') {
            for(let i = 0; i < players.length; i++) {
                if(players[i].id === data.value.id) {
                    players[i].nick = data.value.nick;
                }
            }
        }
        if(data.operation === 'move') {
            for(let i = 0; i < players.length; i++) {
                if(players[i].id === data.value.id) {
                    if(!players[i].character) return; 
                    if(!players[i].moved) {
                        players[i].moved = true;
                        if(doorbell && Date.now() - lastPlaySound > 1000 && !isTabFocused) {
                            lastPlaySound = Date.now();
                            doorbell.play();
                        }
                    }
                    players[i].character.x = data.value.x;
                    players[i].character.y = data.value.y;
                    players[i].character.lastMove = data.value.lastMove;
                    players[i].character.walking = data.value.walking;
                }
            }
        }
        if(data.operation === 'nick') {
            for(let i = 0; i < players.length; i++) {
                if(players[i].id === data.id) {
                    players[i].nick = data.nick;
                }
            }
        }
        if(data.operation === 'sprite') {
            for(let i = 0; i < players.length; i++) {
                if(players[i].id === data.value.id) {
                    if(players[i].character) players[i].character.destroy();
                    players[i].character = new Character(data.value.x, data.value.y, new CharacterSprite(data.value.sprite));
                }
            }
        }
        if(data.operation === 'chat') {
            let found = false;
            for(let i = 0; i < players.length; i++) {
                if(players[i].id === data.value.id) {
                    if(!players[i].character) return; 
                    found = true;
                    players[i].character.chat = data.value.message;
                    players[i].character.chatExpire = Date.now() + 10000;
                }
            }
            if(!found && Date.now() - connected > 1000) {
                characters[0].chat = data.value.message;
                characters[0].chatExpire = Date.now() + 10000;
            }
            let nick = document.createElement("span");
            nick[data.value.isAdmin ? 'innerHTML' : 'innerText'] = `${data.value.isAdmin ? '!&lt;' : '<'}${data.value.nick}${data.value.isAdmin ? '&gt;' : '>'} `;
            nick.className = "msg-nick";
            let message = document.createElement("span");
            message[data.value.isAdmin ? 'innerHTML' : 'innerText'] = data.value.message;
            message.className = "msg-message";
            let div = document.createElement("div");
            div.className = "msg";
            div.append(nick, message, document.createElement("br"));
            document.getElementById('messages').append(div);
            setTimeout(() => {
                document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
            })
        }
        if(data.operation === 'music') {
            let url = data.value.music;
            let time = Date.now() - data.value.start;
            music.src = url;
            music.onload = () => music.currentTime = time/1000;
            music.currentTime = time/1000;
            if(music.paused) music.play();
        }
        if(data.operation === 'musicStop') {
            music.src = "";
            music.currentTime = 0;
        }
        if(data.operation === 'videoStop') {
            video.src = "";
            videoAudio.src = "";
            video.currentTime = 0;
            videoAudio.currentTime = 0;
            videoImageData = null;
            if(tvItem) {
                tvItem.blink = false;
                tvItem.sprite.srcs = ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAABACAYAAAD24zL6AAAAAXNSR0IArs4c6QAAAdtJREFUeF7tnD1Ow0AYBfER6BCcgQaJlgNweBrOAKLjCKBEWktZZO3I+Xmfw6RI9Xbfeiaf48rT0/3tz42fsgQmBZV1sz/Y9Pr8cjBBXx/vtU985ae7e3g8uEIFFRO+KMjJqWWqiZonSEFFBbWHhH60ah33/52mDcz8FKegWj+CoSBveZcV1g+Igi7Lf9iGBTVz3vKGTE8a6LkvTpCCTsodb6YgjCoTVFCGO25VEEaVCSoowx23KgijygQVlOGOWxWEUWWCCspwx60KwqgyQQVluONWBWFUmaCCMtxxq4IwqkxQQRnuuFVBGFUmqKAMd9yqIIwqE1RQhjtuVRBGlQkqKMMdtyoIo8oEFZThjlsVhFFlggrKcMetCsKoMkEFZbjjVgVhVJmggjLccauCMKpMUEEZ7rhVQRhVJqigDHfcqiCMKhNUUIY7blUQRpUJKijDHbcqCKPKBBWU4Y5bFYRRZYIKynDHrVhQ27EtwA0GjyKAXwWjoKM4r168KKjt6MtlV7M9y8K3z+9pt/H+a/dR0Fk4r970j6DVOxVZOPqBtQsuclx8jHmC8IqiQQUVFUNv0U5QWKATFBawVD8S06/b2iRt/j9IQUUnpz/WSNTWJqdd3+Yn6NofEn4BFlkXR2iSupsAAAAASUVORK5CYII="];
                let img = new Image();
                img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAABACAYAAAD24zL6AAAAAXNSR0IArs4c6QAAAdtJREFUeF7tnD1Ow0AYBfER6BCcgQaJlgNweBrOAKLjCKBEWktZZO3I+Xmfw6RI9Xbfeiaf48rT0/3tz42fsgQmBZV1sz/Y9Pr8cjBBXx/vtU985ae7e3g8uEIFFRO+KMjJqWWqiZonSEFFBbWHhH60ah33/52mDcz8FKegWj+CoSBveZcV1g+Igi7Lf9iGBTVz3vKGTE8a6LkvTpCCTsodb6YgjCoTVFCGO25VEEaVCSoowx23KgijygQVlOGOWxWEUWWCCspwx60KwqgyQQVluONWBWFUmaCCMtxxq4IwqkxQQRnuuFVBGFUmqKAMd9yqIIwqE1RQhjtuVRBGlQkqKMMdtyoIo8oEFZThjlsVhFFlggrKcMetCsKoMkEFZbjjVgVhVJmggjLccauCMKpMUEEZ7rhVQRhVJqigDHfcqiCMKhNUUIY7blUQRpUJKijDHbcqCKPKBBWU4Y5bFYRRZYIKynDHrVhQ27EtwA0GjyKAXwWjoKM4r168KKjt6MtlV7M9y8K3z+9pt/H+a/dR0Fk4r970j6DVOxVZOPqBtQsuclx8jHmC8IqiQQUVFUNv0U5QWKATFBawVD8S06/b2iRt/j9IQUUnpz/WSNTWJqdd3+Yn6NofEn4BFlkXR2iSupsAAAAASUVORK5CYII=";
                tvItem.sprite.images = [img];
            }
        }
        if(data.operation === 'video') {
            tvItem.blink = true;
            let videoUrl = data.value.video;
            let audioUrl = data.value.audio;
            let time = Date.now() - data.value.start;
            video.src = videoUrl;
            videoAudio.src = audioUrl;
            video.onload = () => {
                video.currentTime = time/1000;
                videoAudio.currentTime = time/1000;
            }
            videoAudio.onload = () => videoAudio.currentTime = time/1000;
            video.currentTime = time/1000;
            videoAudio.currentTime = time/1000;
            if(video.paused) video.play();
            if(videoAudio.paused) videoAudio.play();
        }
        if(data.operation === 'videoLoading') {
            video.src = "";
            videoAudio.src = "";
            video.currentTime = 0;
            videoAudio.currentTime = 0;
            if(tvItem) {
                tvItem.blink = true;
                tvItem.sprite.srcs = ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAABACAYAAAD24zL6AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAE8SURBVHhe7dyxDsFAHIDxnjewCbvNQqxi9tKegERsdmLiESqpuyatNNJK9Gvy/ZbeIsLnf63lwnI6zjNhjeJVUGG33lQm6H49x5X6MJkt4urNCYIrJ8jJYUmT5ATBlU9x9b1P/Uo7mhME1zhB3pP+q+n7d4LgPiYolTvMH8W1rbAPcdVO5c9YC6HjKzu/X+j2+ZJ8u42rqtXlVFzrHZwgOAPBGQjOQHAGgjMQnIHgDARnIDgDwRkIzkBwBoIzEJyB4AwEZyA4A8EZCM5AcAaCMxCcgeAMBGcgOAPBGQjOQHAGgjMQnIHgDARnIDgDwRkIzkBwBoIzEJyB4AwEZyA4z+qB8KyegSoPnvH0X5bj7Vm0cYLgfju6CeTbDpB+kUPjBMEZCM5AcIO/B7V9+hzavcgJgvMpDs4JQsuyF7p/Prqdx6rJAAAAAElFTkSuQmCC"];
                let img = new Image();
                img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAABACAYAAAD24zL6AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAE8SURBVHhe7dyxDsFAHIDxnjewCbvNQqxi9tKegERsdmLiESqpuyatNNJK9Gvy/ZbeIsLnf63lwnI6zjNhjeJVUGG33lQm6H49x5X6MJkt4urNCYIrJ8jJYUmT5ATBlU9x9b1P/Uo7mhME1zhB3pP+q+n7d4LgPiYolTvMH8W1rbAPcdVO5c9YC6HjKzu/X+j2+ZJ8u42rqtXlVFzrHZwgOAPBGQjOQHAGgjMQnIHgDARnIDgDwRkIzkBwBoIzEJyB4AwEZyA4A8EZCM5AcAaCMxCcgeAMBGcgOAPBGQjOQHAGgjMQnIHgDARnIDgDwRkIzkBwBoIzEJyB4AwEZyA4z+qB8KyegSoPnvH0X5bj7Vm0cYLgfju6CeTbDpB+kUPjBMEZCM5AcIO/B7V9+hzavcgJgvMpDs4JQsuyF7p/Prqdx6rJAAAAAElFTkSuQmCC";
                tvItem.sprite.images = [img];
            }
        }
        if(data.operation === 'videoLoaded') {
            if(tvItem) {
                tvItem.sprite.srcs = ["data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAABACAYAAAD24zL6AAAAAXNSR0IArs4c6QAAAdtJREFUeF7tnD1Ow0AYBfER6BCcgQaJlgNweBrOAKLjCKBEWktZZO3I+Xmfw6RI9Xbfeiaf48rT0/3tz42fsgQmBZV1sz/Y9Pr8cjBBXx/vtU985ae7e3g8uEIFFRO+KMjJqWWqiZonSEFFBbWHhH60ah33/52mDcz8FKegWj+CoSBveZcV1g+Igi7Lf9iGBTVz3vKGTE8a6LkvTpCCTsodb6YgjCoTVFCGO25VEEaVCSoowx23KgijygQVlOGOWxWEUWWCCspwx60KwqgyQQVluONWBWFUmaCCMtxxq4IwqkxQQRnuuFVBGFUmqKAMd9yqIIwqE1RQhjtuVRBGlQkqKMMdtyoIo8oEFZThjlsVhFFlggrKcMetCsKoMkEFZbjjVgVhVJmggjLccauCMKpMUEEZ7rhVQRhVJqigDHfcqiCMKhNUUIY7blUQRpUJKijDHbcqCKPKBBWU4Y5bFYRRZYIKynDHrVhQ27EtwA0GjyKAXwWjoKM4r168KKjt6MtlV7M9y8K3z+9pt/H+a/dR0Fk4r970j6DVOxVZOPqBtQsuclx8jHmC8IqiQQUVFUNv0U5QWKATFBawVD8S06/b2iRt/j9IQUUnpz/WSNTWJqdd3+Yn6NofEn4BFlkXR2iSupsAAAAASUVORK5CYII="];
                let img = new Image();
                img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGgAAABACAYAAAD24zL6AAAAAXNSR0IArs4c6QAAAdtJREFUeF7tnD1Ow0AYBfER6BCcgQaJlgNweBrOAKLjCKBEWktZZO3I+Xmfw6RI9Xbfeiaf48rT0/3tz42fsgQmBZV1sz/Y9Pr8cjBBXx/vtU985ae7e3g8uEIFFRO+KMjJqWWqiZonSEFFBbWHhH60ah33/52mDcz8FKegWj+CoSBveZcV1g+Igi7Lf9iGBTVz3vKGTE8a6LkvTpCCTsodb6YgjCoTVFCGO25VEEaVCSoowx23KgijygQVlOGOWxWEUWWCCspwx60KwqgyQQVluONWBWFUmaCCMtxxq4IwqkxQQRnuuFVBGFUmqKAMd9yqIIwqE1RQhjtuVRBGlQkqKMMdtyoIo8oEFZThjlsVhFFlggrKcMetCsKoMkEFZbjjVgVhVJmggjLccauCMKpMUEEZ7rhVQRhVJqigDHfcqiCMKhNUUIY7blUQRpUJKijDHbcqCKPKBBWU4Y5bFYRRZYIKynDHrVhQ27EtwA0GjyKAXwWjoKM4r168KKjt6MtlV7M9y8K3z+9pt/H+a/dR0Fk4r970j6DVOxVZOPqBtQsuclx8jHmC8IqiQQUVFUNv0U5QWKATFBawVD8S06/b2iRt/j9IQUUnpz/WSNTWJqdd3+Yn6NofEn4BFlkXR2iSupsAAAAASUVORK5CYII=";
                tvItem.sprite.images = [img];
            }
        }
        if(data.operation === 'itemCreate') {
            if(!data.value.x || !data.value.y || !data.value.id) return;
            let item = new Item(data.value.id, data.value.x, data.value.y, new Sprite(data.value.sprite.src), data.value.vault, data.value.oninteract ? new Function(['i', 'id', 'o'], data.value.oninteract) : undefined, data.value.onbartenderinteract ? new Function('i', data.value.onbartenderinteract) : undefined, data.value.oncreate ? new Function('i', data.value.oncreate) : undefined);
            if(data.value.name) item.name = data.value.name;
            if(data.value.name === 'tv') {
                tvItem = item;
            }
        }
        if(data.operation === 'itemDelete') {
            for(let i = 0; i < items.length; i++) {
                if(items[i].id === data.value) {
                    items[i].destroy();
                    if(items[i].name === "tv") {
                        tvItem = undefined;
                    }
                }
            }
        }
        if(data.operation === 'itemInteraction') {
            for(let i = 0; i < items.length; i++) {
                if(items[i].id === data.value.item) {
                    items[i].interact(data.value.id, data.value.options);
                }
            }
        }
        if(data.operation === 'itemBartenderInteraction') {
            for(let i = 0; i < items.length; i++) {
                if(items[i].id === data.value.item) {
                    items[i].bartenderInteract(data.value.id);
                }
            }
        }
        if(data.operation === 'deckStatus') {
            deckImage.src = data.value === 0 ? "images/cards/deck0.png" : data.value >= 36 ? "images/cards/deck3.png" : data.value >= 18 ? "images/cards/deck2.png" : "images/cards/deck1.png";
        }
        if(data.operation === 'deckPut') {
            cards[data.value].el.remove();
            cards.splice(data.value, 1);
        }
        if(data.operation === 'deckTake') {
            data.value.el = document.createElement("img");
            data.value.el.src = data.value.src;
            data.value.el.title = data.value.full;
            data.value.el.className = "card";
            data.value.el.onclick = () => {
                for(let i in cards) {
                    if(cards[i].el) {
                        cards[i].el.className = "card";
                    }
                }
                selectedCard = data.value;
                selectedCard.el.className = "card selected-card";
                document.getElementById("put-card").disabled = false;
                document.getElementById("place-privately").disabled = false;
                document.getElementById("place-publicly").disabled = false;
                
            }
            document.getElementById("cards").append(data.value.el);
            cards.push(data.value);
        }
        if(data.operation === 'cardPlace') {
            data.value.sprite = data.value.isPublic ? new Sprite(data.value.card.src) : new Sprite("images/cards/hidden.png");
            data.value.draw = (isAnimation = false) => {
                let img = data.value.sprite.images[0];
                let x = data.value[!isAnimation ? 'x' : 'animationX']-img.width/2;
                let y = data.value[!isAnimation ? 'y' : 'animationY']-img.height/2;
                x = Math.floor(x/2)*2;
                y = Math.floor(y/2)*2;
                ctx.drawImage(img, x, y);
            }

            let placer = players.find(p => p.id === data.value.placerId);
            if(!placer) placer = characters[0];
            else {
                placer.cardCount--;
                placer = placer.character;
            }
            
            if(!data.value.noAnimation && placer) {
                let start = Date.now();
                cardAnimation.push(data.value);
                let card = data.value;
                let cardIndex = cardAnimation.length-1;
                let int = setInterval(() => {
                    let s = {x: placer.x+placer.sprite.images[placer.lastMove][0].width/2, y: placer.y+(placer.sprite.images[placer.lastMove][0].height+placer.sprite.heightOffset)/2}; // Start
                    let e = {x: card.x, y: card.y}; // End
                    let d = {x: e.x-s.x, y: e.y-s.y}; // Distance
                    let t = Date.now() - start; // Time
                    let p = {x: s.x+d.x*t/300, y: s.y+d.y*t/300}; // Position
                    card.animationX = p.x; card.animationY = p.y;
                    if(t >= 300) {
                        clearInterval(int);
                        cardAnimation.splice(cardIndex, 1);
                        placedCards.push(data.value);
                    }
                }, 5)
            } else {
                placedCards.push(data.value);
            }
        }
        if(data.operation === 'cardTake') {
            let card = placedCards.find(c => c.id === data.value.card);
            let taker = players.find(p => p.id === data.value.taker);
            placedCards = placedCards.filter(c => c.id !== data.value.card);
            if(!taker) taker = characters[0];
            else {
                taker.cardCount++;
                taker = taker.character;
            }

            let start = Date.now();
            cardAnimation.push(card);
            let cardIndex = cardAnimation.length-1;
            if(taker) {
                let int = setInterval(() => {
                    let s = {x: card.x, y: card.y}; // Start
                    let e = {x: taker.x+taker.sprite.images[taker.lastMove][0].width/2, y: taker.y+(taker.sprite.images[taker.lastMove][0].height+taker.sprite.heightOffset)/2}; // End
                    let d = {x: e.x-s.x, y: e.y-s.y}; // Distance
                    let t = Date.now() - start; // Time
                    let p = {x: s.x+d.x*t/500, y: s.y+d.y*t/500}; // Position
                    card.animationX = p.x; card.animationY = p.y;
                    if(t >= 500) {
                        clearInterval(int);
                        cardAnimation.splice(cardIndex, 1);
                    }
                }, 5);
            }
        }
        if(data.operation === 'deckShuffle') {
            for(let i in players) {
                players[i].cardCount = 0;
            }
            placedCards = [];
            cards = [];
            cardAnimation = [];
            document.getElementById("cards").innerHTML = "";
            selectedCard = null;
            document.getElementById("put-card").disabled = true;
            document.getElementById("place-privately").disabled = true;
            document.getElementById("place-publicly").disabled = true;
            document.getElementById("cancel-card").disabled = true;
        }
        if(data.operation === 'deckPutSomeone') {
            let player = players.find(p => p.id === data.value);
            if(!player) player = characters[0];
            else {
                player.cardCount--;
                player = player.character;
            }
            let img = new Image();
            img.src = "images/cards/hidden.png";
            let card = {
                x: player.x+player.sprite.images[player.lastMove][0].width/2,
                y: player.y+(player.sprite.images[player.lastMove][0].height+player.sprite.heightOffset)/2,
                draw() {
                    let x = card.animationX-img.width/2;
                    let y = card.animationY-img.height/2;
                    x = Math.floor(x/2)*2;
                    y = Math.floor(y/2)*2;
                    ctx.drawImage(img, x, y);
                }
            }
            let start = Date.now();
            cardAnimation.push(card);
            let cardIndex = cardAnimation.length-1;
            let int = setInterval(() => {
                let s = {x: card.x, y: card.y}; // Start
                let e = {x: 208, y: 307}; // End
                let d = {x: e.x-s.x, y: e.y-s.y}; // Distance
                let t = Date.now() - start; // Time
                let p = {x: s.x+d.x*t/500, y: s.y+d.y*t/500}; // Position
                card.animationX = p.x; card.animationY = p.y;
                if(t >= 500) {
                    clearInterval(int);
                    cardAnimation.splice(cardIndex, 1);
                }
            }, 5)
        }
        if(data.operation === 'deckTakeSomeone') {
            let player = players.find(p => p.id === data.value);
            if(!player) player = characters[0];
            else {
                player.cardCount++;
                player = player.character;
            }
            let img = new Image();
            img.src = "images/cards/hidden.png";
            let card = {
                x: 208,
                y: 307,
                draw() {
                    let x = card.animationX-img.width/2;
                    let y = card.animationY-img.height/2;
                    x = Math.floor(x/2)*2;
                    y = Math.floor(y/2)*2;
                    ctx.drawImage(img, x, y);
                }
            }
            let start = Date.now();
            cardAnimation.push(card);
            let cardIndex = cardAnimation.length-1;
            let int = setInterval(() => {
                let s = {x: card.x, y: card.y}; // Start
                let e = {x: player.x+player.sprite.images[player.lastMove][0].width/2, y: player.y+(player.sprite.images[player.lastMove][0].height+player.sprite.heightOffset)/2}; // End
                let d = {x: e.x-s.x, y: e.y-s.y}; // Distance
                let t = Date.now() - start; // Time
                let p = {x: s.x+d.x*t/500, y: s.y+d.y*t/500}; // Position
                card.animationX = p.x; card.animationY = p.y;
                if(t >= 500) {
                    clearInterval(int);
                    cardAnimation.splice(cardIndex, 1);
                }
            }, 5)
        }
        if(data.operation === 'version') {
            let clientVersion = 89;
            if(clientVersion.toString() !== data.value) {
                document.getElementById("version-warning").hidden = false;
            }
        }
        if(data.operation === 'darkMode') {
            darkMode = data.value;
        }
    }
    ws.onclose = () => {
        console.log('Disconnected from server');
        players = [];
        characters = [characters[0]];
        items = [];
        cards = [];
        placedCards = [];
        cardAnimation = [];
        connected = 0;
        lastPlaySound = 0;
        music.src = "";
        video.src = "";
        videoAudio.src = "";
        video.currentTime = 0;
        videoAudio.currentTime = 0;
        music.currentTime = 0;
        if(tvItem) tvItem.blink = false;
        document.getElementById('messages').innerHTML = "";
        document.getElementById('cards').innerHTML = "";
        setTimeout(() => {
            connect();
        }, 4000);
    }
}
connect();

// music
let music = document.createElement('audio');
document.getElementById("audio-box").append(music);
music.autoplay = true;
music.loop = true;
music.controls = true;
music.style.width = "236px";
music.style.height = "26px";

// Character
try {
    new ControllableCharacter(330, 340,
        new CharacterSprite(localStorage.sprites ? JSON.parse(localStorage.sprites) : {
            left: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAA6CAYAAADVwos0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFRSURBVGhD7ZYxDoJAEEXB1oTCwkNY2Fpp7wm8hYfxFp7AXitbCw9hYUFijbLsNzhmGBZQZxdfYgaExN23f3eMI4H5KMnsZSsO17Tytwa2/py3UXZlgIMzo8/Ip01QqBk9Rr5tggIzaoz8B0JhM7LfFXWxLCq97xo9S5OnVuoDZXIzsNMlejJi6/NkrTvbrrMS3vZFdppmSL+ReJa+fDiaGqDo2TWuuwXQExc03U3+G6G0PVf0GXn0G/MFyI6JvaqmrQl1/9Aa9xrgagQGSiuh1AjASCWk84ObOYdeIxJclmBEmjmH/0Y4+mOEMzHZnEw9r6emAlcz/hiBCcycA0aoobpm/DOyvV3MPVgNx6ZSA3gPz8MxImWDy0S4GeGyAZABSv8ygrXnuq/3GfkPhCKun5QVwD0Pr9cA6aQFriaAv0bqEr4RIJlxNQHCzYjnRqLoDrSvvIUkFPeUAAAAAElFTkSuQmCC",
            right: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAYAAAAUufjgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFPSURBVGhD7Za9DcIwEEYTWiQKCoagoKWCngnYgmHYggnoYQMKhqCgiEQNxMmHxInT+SdB8dlPii5WLNl5+S5JkQmkbKvIajp5tqdBnO+V9Zo1o7YOFvFuujLHIRmN12Df5iicyfgM/tschZocvMG8wVA+z7uv7J2OTV1vmkrHlJxBUJuCLRtqc7/ehelm0NYeshjtl8R7g8iYa9ZcSaeLJZPlsvo6bNHfxdQa/WLYwnWzfoMgtJPjNwj+ZZJ28ntdU/UYxJ24Gu2qe0F8Bjkks9z7UIIzB/QY5IBJzqBkSCIdgxzZIAc1N99fTL3uFqZSfE3qMwhz1BjGHJjnalKvwcPjZsbb8cxUahTXAeZlg1IGpUy6ZjGdDFJoBoFrFtPJIPc3Q7OoLoN5g6EEZxAgWyA0e0CfQcCZpPiaA/oN2pINckgmfc2BbBAozWBRvADybcUV0gXnDgAAAABJRU5ErkJggg==",
            up: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAYAAAAUufjgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFHSURBVGhD7ZaxDcIwEEUDLRIFBUNQsAH0TMAWDMMWTEAPG1AwBAUFEjUo4I/Ejyyfc0nwBb/GjiLju6dP7CKjZODGIIvJ+OGmKo7Xm3jPkqEbkyXYTVPmGKlJuwbbMseETNoz2JU5xmfSjsFfmQPZYFOwyeQN5gK1DFLJHjCXweQMApjMfxItuUAtuUAtuUAtuUAtyRdYuVHjDOzqjOb97N1m3FjB1xHA+8P+9fhhuXqPvnWx2DXI1M2k1qT9DDKz7cnNZJw3czf7RmrWnkGYgykYiDXH8O/gOWTS3knCHYLd/eJmOtaj6WuUmrRvUJs9JjaL9gwyTWUPIINMfwzidoJbSVsZ5H3MGqwUWHaErtpEuo+dDDL8XfSBTDG+daHvHmMvg3UpjUitxGA/g1JgT7quNxkUZyZkJmSwbj7tG4zN1J9lsCieqyCjxFQ4QnAAAAAASUVORK5CYII=",
            down: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAA6CAYAAADcKStOAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAF8SURBVGhD7ZYxbsJAEEUNbSQKihwiBW2qpM8JcoschltwgvSkSkvBIVKkQEoNsr2f4ovRzHox7LfymlmLFet9/ruaWRPkZbk4pmERX7+H0JrzVKvDfftrmWI8c3rGxjLFWOZ0jN3KFMPm/o1Fgbn6jXmmtp99fX3rq0V0noW+MRhg2AjPs373TE7XWCmeuWqNzVtT97y72i9y6avUm7Ho/TV7PvSDxPF7kUaXyZ3PmdMzNtZpZKzTOV1juVkCsvdY+FSW4hlidI0xuQZzTYF6jaV67i7QD5WajJri9XT6saFgp5YxGGDYEDM9Y7kZBJYhRteYZeZpvevq/mPVVQtv3nQyBlO8YzwPhf8Hz2xOx5hlavP309VS3h8e06jHMqdvrDRbjJc1PWPMtTIGOGtA1xi6BXQJY2WM16nemPli7Q6iXWgJ1jo6GWP4XmOQFcbLJN9bjF7Gcml3bu1+CPoZ84Ct6Hwgl7HsTFhGosaiOdQ3FjWRm0mLSo01zQm5LtGR4J/pYwAAAABJRU5ErkJggg==",
            left_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6Kv4wPkarlTjavbLH3PWNTsiQ6GSmaci+wgaz8ozW9og/w+D0uRJFAhQUc7ti7whL+oxLpGhJjdpq1aq08stau8wM1sukksaBdMAMZX/Qanb2PGyTn25d/W7Nv/d8WjSAgV83dWprdy81iXyMHGCLekJjj5QxKx55DZkmdRmcAJWfmmylqIRPqayjIK2oYrCaEAUFELOREba4uXW2wMAOvJ6+w8HCAsS+HQIEzwTHDs+kudPQ0s7RxbDHwdnLxsrI4LfcrdfQ2xDU56zp2BHtzN7mbOHW48T35vT69lbwzaonKRuzTt8eJDzoKiFBdwP/LWTYDFkyis3+YKSDsRGThI6gNIB0JQukxpEoU1pIAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi63P4wykmrvThnwbv/ncaA5KeVKImlbFi1sCvF8Uzf0I0/Op33sJ9nMOAQgbIF6ChgIoXNYtSpgzKJ1J3DiO1mfbyp91sLj7tDbOt3VnfQLLaUe/WuzXMx3Z3aitt7ZSN/Z4FBDXttcIJKhIp5d4MBkwGPWogClJWKl36PZCYAHDafkCqiAhQpi6moJyisCqMinm60qnqttxEluzYgvmEeBQUewYPDxUm7HMTOzs3KwdHPxNGzzAIE2wTX2t26txzc4Nbf2CLUyt7m2c/J3tnbhuPg8uCs8+Gv5nDv+xsE9HPzzx20DtWkiRN4UF07Xw6rGYPIMKE5dBYmAkPV6xmCxlB9AnaUdWoFCmShXk0kuZFWS44pJyQAACH5BAkKAAAALAAAAAAoADwAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLoq/jA+RquVONq9ssfc9Y1OyJDoZKZpyL7CBrPyjNb2iD/D4PS5EkUCFBRzu2LvCEv6jEukaEmN2mrVqrTyy1q7zAzWy6SSxhAzVP1B86zZ83BNfrJ18zr8iz/R9WF9HX+AL1wCAYkBeoYiiot1jWOMeEKTkZUxKx53DZomcxmdAJagm2qmqXlWqq2kIK6pYrGbEAUFELQcEre5unO3wcEOvZ+/xMLDAsW/gwTPBMgOz6W609DSAtTGscjF2czHy8rguNyu12BP6eet7HfbzdlqwtXo4+re5vLj3/3K/Oo9SLav2SuCAu11+0fQlzsVEjzNkgVRw6uJqtoMingPFCPGhw4vWrQ2UmRIgyhTqlzJklYCACH5BAkKAAAALAAAAAAoADwAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLoq/jA+RquVONq9ssfc9Y1OyJDoZKZpyL7CBrPyjNb2iD/D4PS5EkUCFBRzu2LvCEv6jEukaEmN2mrVqrTyy1q7zAzWy6SSxoF0wAxlf9BqdvY8bJOfbl39bs2/93xaNICBXzd1amt3LzWJfIwcYIt6QmOPlDErHnkNmSZ1GZwAlZ+abKWohE+prKMgrahisJoQBQUQs5ERtri5dbbAwA68nr7DwcICxL4dAgTPBMcOz6S509DSztHFsMfB2cvGysjgt9yt19DbENTnrOnYEe3M3uZs4dbjxPfm9Pr2VvDNqicpG7NO3x4kPOgqIUF3A/8tZNgMWTKKzf5gpIOxEZOEjqA0gHQlC6TGkShTWkgAADs=",
            right_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi63P4wykmpuDhrXOP+WueA5CcCZcpVartKrgvHNETXzx3bejv2l8EgOAw1gMSkkQEUCpUXns5ZfL6OPaq2KL1tqdFcCoz5OsO/EploRmPVWvYgQA9Yu6CtvG7nilVkZmRpY2cCgoaEgIhxAoqFjIl/LYh8bkwxlXWXC2GLiJyYCp+CoR6OKGWGICejqBlrJq0/g7Msh5K2E6y6u7K9kwUFG8CEwsTFrscCws3NpicXy87O0CIXBATSwwLZ2dYd2NrM3N7jydvp5NWouurT1OC+3xrm9MDiG/bnvepk7PjIydm2LOCyf8/a2fJnCGC/ddwIckMHMYNDitQSJsOUsRfgRlclPoIkIbLTr5KpkKFMefJjyAoJAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD/wi63P4wykmrvTjnwLv/ncaA5CcCZUpiahtWbvxKskzXOITnz17rvpgj2BEIOEbQkBhINo+mBtHodHKAPirUGsDutGCoFxfWXnstc7HsHJPUSLYYrQrHuW16yv7Ez5cuanJUZyMxgoN/C2SJaoCHjYRdeoFySpRpllFLCpWDhWidmZ+TFmcecCsbk6iSJSeGjrA3srNuoLZSqrmGHAQEl7woHb/Btr7AAb/Ly7giyMjMxaWwHAMD0AHX184a1tjKydvgudnT0cmz5sno3RffrU7c1N7a4HdQ8+rh02rT+8zwZQMozUNAequkseOXrhoxhc0Q1kOn0J2pFKI8ZJQYQRfFxlMzYOwa9mqVMY/PRhqbuIlkSAcJAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6Kv4wPkarlTjaTbPH3PWNTsiQ6GSmaci+wgaz8ozW9ljlzjD0P02H5wNKdjZfUbAsiWbKYDP2hEWvQZwVq3QiP1EIt0v9esKP8VKbwQJ9gXhgXW1f3wP5PFs/k9VkZmB/gHwnLIV3ZQsviWhsI4B6XkMpknKUhw2RhZlDm4OAni5UYmQZJiKgTKcgqSusdK+zjLGGtLOouLS6u7AOBQVHvhwQwcPEQ8cCwc3No7vAwszOz4vJDgQE0tna29fE3dwC3t/Jh8vp1dC51OPV0+cA4hHl2uyv9BD25ufjaM7wpfpHJiA4XASXGJSXMMhCf9SWSVsmb5PBifEqWoSXURzjRngCo+nwuKoXyXmuTtZCphKlSZIfWsqcWSEBACH5BAkKAAAALAAAAAAoADwAggAAAD0SDv/JDuYH+Gek4AAAAAAAAAAAAAP/CLoa/jA+RquVONpNs8fc9Y1OyJDoZKZpyL7BBrPyjNb2WOWOIPQ/TYfnA0p2Nl8xsCyJZspgM/aERa9BnBWrdCI/UQi3S/16wo/xUpvBAqfravv6DhrLQxJaTTaDyXxxJyyBdHgNhIV9ciN8R4x/Y49IiJFqXiKVZ4GYJgBOYmQZnpSfaaIgpC5Mi6qupmivr6OyqrS1qw4EBJO4Zru9vojAAbvGxp24urzFx8iHygEDA8sO09PJtdbUzdvY0Nrd4svEwqbExOTM5tuhS9/s0tx17eCu6vTi8cf55cLq6Zr58wWQGT57th44c5ZNFoSF/BCS+qAJlIqEtB5BmJWqFaIQjr0oRgv5cWTJYOZSqlzJsqWvBAA7",
            up_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD9Ai63P4wyklpuDhrXOP+WueAZCgqZRqcartWrmrFrkTXzx1DOj72vgUwiBrKGsZjMZliMJWAZ2spJVGrnyvWtLVGu9kvmDsmlzni80uNZl+c62fxpwXOPS+4YC94n3J5QgF8fYF/gFCHcIl/GwSPkJGPGywakpcElDABk5yYnxedM52foJ5+PKcYA6ytrq+toZmGgp0XsLivsqhIqqW/s6KApMCmwj8ZucqxJsiry8qaP3uyxZcX1LRF2daY2IWpGd3Xzb3i45HSeKbn6drr3paSvKPxReSVpvfz7+FeJZUAplEX0AwaRYI0EWz0z0tBhQ4fJAAAIfkECQoAAAAsAAAAACgAPACCAAAAPRIO/8kO5gf4Z6TgAAAAAAAAAAAAA/UIuhz+MD5Gq5U42k2z19z2jUFYkWhpKim5tm0Ip+JMXzZa53rH942fyyf8BIujI9KjXDIBzmE0CZ0+rVcshqWVcLuQL9ghHpfB524wneOeVE43h+wT2AX0lUwVvOP5ei9AgXODhAsSBIqLjIpehImNko+CjgGSmIsOlpUEm5mYn3k4lg4Dp6ipqqiigEGlAauyqq07D6C4niBvELmglHV/s8MDDn6jfcLEssZ3yESXvo3Nds9K0tMBx66k2NlhJp/emruFmb26tZDRk7fp0dbh7O9sh6/kdBn20OD6+4hbqgDbB2zgv4Ll/smLp9BWw4cQI1ZIAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD9Ai63P4wyklpuDhrXOP+WueAZCgqZRqcartWrmrFrkTXzx1DOj72vgUwiBrKGsZjMZliMJWAZ2spJVGrnyvWtLVGu9kvmDsmlzni80uNZl+c62fxpwXOPS+4YC94n3J5QgF8fYF/gFCHcIl/GwSPkJGPGywakpcElDABk5yYnxedM52foJ5+PKcYA6ytrq+toZmGgp0XsLivsqhIqqW/s6KApMCmwj8ZucqxJsiry8qaP3uyxZcX1LRF2daY2IWpGd3Xzb3i45HSeKbn6drr3paSvKPxReSVpvfz7+FeJZUAplEX0AwaRYI0EWz0z0tBhQ4fJAAAIfkECQoAAAAsAAAAACgAPACCAAAAPRIO/8kO5gf4Z6TgAAAAAAAAAAAAA/MIuhz+MD5Gq5U42k2z19z2jUFYkWhpKim5tm0Ip+JMXzZa53rH942fyyf8BIujI9KjXDIBzmE0CZ0+rVcshqWVcLuQL9ghHpfB524wneOeVE43h+wT2AX0lUwVvOP5ei9AgXODhAsSBIqLjIpehImNko+CjgGSmIsOlpUEm5mYn3k4lgOmp6ippxCcpJ4BqrGprK87D6C4r2E4tLmhIG9+DrLEAw52o313w8Wxx381wpe+jbvRy9PUmhOFvdrbgt7ftZDTtOLg5Zait7+HbGKMyeWP3vOBGfDvTdz5+0TczvwDOIrSQEQBD4YDpLChw4cVEgAAOw==",
            down_walk: "data:image/gif;base64,R0lGODdhJgA6AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAJgA6AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6LP4wPkYrlTjavbLXXPWNQtiQqAmgKce+pQWz2/yKdqtkw8D7uhWm96N1Ir0k0KGEEDEnp3IpaD6ekuh1yu0mMzukd2xlkc9ArAdNZlJ/gXjAK593Sb06Xe79sNl4f2eBe3FtKGR6YzCCXzmNajlVg5JihyRhYX6OYEInmmucUJ4qF5NPOKUup0CpqqaYrzVBqhIFBRm3WaW2uBi6ICEOwLfFxsfEvsICycjOvsCzwATU1dbX1RDRptPY3tbaytzQz+XJDjjN5s7D4loO3/HZwUcQ8vK7J0/r5W7opvv4sZv07x0zgcjy1XuAMCG9dMd6Oax10JjEiDFUtLMYYyIjRooThTwraOIDqE4aPZwcJWsXSlkL/71sOcokzE42KyQAACH5BAUKAAAALAAAAAAmADoAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLos/jA+RiuVONq9stdc9Y1C2JCoCaApx76lBbPb/Ip2q2TDwPu6Fab3o3UivSTQoYQQMSenciloPp6S6HXK7SYzO6R3bGWRz0CsB01mUn+BeMArn3dJvTpd7v2w2Xh/Z4F7cW0oZHpjMIJfOY1qOVWDkmKHJGFhfo5gQieaa5xQnioXk084pS6nQKmqppivNUGqEgW3Bba5ICq6t7pZJg6/ArjGx8bDuyHKysjPu8SzxATV1tfY1hDSptTZ39fby7AP0Oa4wVrO58/pR1bg8QRuDjjw8t/0MSdW7O287xz5Q+YO1DqCEZLtk5HQnK9xvYodI8EtIsIPFUutqyekHpOsjTE+yDI4oSPAj6M8jiSpbuFKdwVXmpT5CgLNBAAh+QQJCgAAACwAAAAAJgA6AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6LP4wPkYrlTjavbLXXPWNQtiQqAmgKce+pQWz2/yKdqtkw8D7uhWm96N1Ir0k0KGEEDEnp3IpaD6ekuh1yu0mMzukd2xlkc9ArAdNZlJ/gXjAK593Sb06Xe79sNl4f2eBe3FtKGR6YzCCXzmNajlVg5JihyRhYX6OYEInmmucUJ4qF5NPOKUup0CpqqaYrzVBqhIFBRm3WaW2uBi6ICEOwLfFxsfEvsICycjOvsCzwATU1dbX1RDRptPY3tbaytzQz+XJDjjN5s7D4loO3/HZwUcQ8vK7J0/r5W7opvv4sZv07x0zgcjy1XuAMCG9dMd6Oax10JjEiDFUtLMYYyIjRooThTwraOIDqE4aPZwcJWsXSlkL/71sOcokzE42KyQAACH5BAkKAAAALAAAAAAmADoAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLos/jA+RiuVONq9stdc9Y1C2JCoCaApx76lBbPb/Ip2q2TDwPu6Fab3o3UivSTQoYQQMSenciloPp6S6HXK7SYzO6R3bGWRz0CsB01mUn+BeMArn3dJvTpd7v2w2Xh/Z4F7cW0oZHpjMIJfOY1qOVWDkmKHJGFhfo5gQieaa5xQnioXk084pS6nQKmqppivNUGqEgUFtre4ICq5ubdZJg7AArrGx8bDuyHKysjPu8SzxA4E1tfY2dfNMSfUAtrh2dw4ENDnusFazujP6kdP4vIEbqim8fPh9a2wD+3urByU8/fv2D6Bq5JFQPcOh0Jz5xqa+pYBGcJexXZ9sNitItSHMAplgQrG7qLITp1ECiE5SuU7ibJe8lIpbALNWjZDJAAAOw==",
        })
    );
} catch(e) {
    delete localStorage.sprites;
}

// Sprite creator
document.getElementById('sprite-file').onchange = evt => {
    let files = evt.target.files;
    if(files.length !== 8) return alert("You must select 8 files");
    for(let i = 0; i < files.length; i++) {
        if(!files[i].type.startsWith("image")) return alert("You must select 8 images");
    }
    let names = ["left_walk", "right_walk", "up_walk", "down_walk", "left", "right", "up", "down"];
    for(let i in names) {
        if(!Array.from(files).find(f => f.name.includes(names[i]))) return alert("You must select 8 images with the following words in their names: left, right, up, down, left_walk, right_walk, up_walk, down_walk");
    }
    let chr = {};
    let fi = 0;
    for(let i in files) {
        if(files[i].size > 30000) return alert("One of the files is too big (max 30kB)");
        if(typeof files[i] !== 'object') continue;
        let name = names.find(f => files[i].name.includes(f));

        let reader = new FileReader();
        reader.onload = function(frEvent) {
            let img = new Image();
            img.src = frEvent.target.result;
            img.onload = () => {
                if(img.width > 95 && !localStorage.admin) return alert("Sprite width must not be over 95px");
                if(img.width < 5 && !localStorage.admin) return alert("Sprite width must not be less than 5px");
                if(img.height < 5 && !localStorage.admin) return alert("Sprite height must not be less than 5px");
                if(img.height > 130) return alert("Sprite height must not be over 130px");
                if(img.width <= 1) return alert("Sprite width must be over 1px");
                if(img.height <= 1) return alert("Sprite height must be over 1px");
                chr[name] = frEvent.target.result;
                if(++fi === 8) {
                    saveFile();
                }
            }
        }
        reader.readAsDataURL(files[i]);
    }
    function saveFile() {
        const blob = new Blob([JSON.stringify(chr)], {type: ".chr"})
        let l = document.createElement("a");
        l.download = "sprite.chr";
        l.href = URL.createObjectURL(blob);
        l.click();
        document.getElementById('sprite-file').value = "";
    }
}
document.getElementById('char-file').onchange = evt => {
    let files = evt.target.files;
    let reader = new FileReader();
    reader.onload = function(frEvent) {
        let chr = JSON.parse(frEvent.target.result);
        characters[0].sprite = new CharacterSprite(chr);
        if(ws.readyState === 1) {
            ws.send(JSON.stringify({
                operation: 'sprite',
                value: chr
            }));
        }
        localStorage.sprites = JSON.stringify(chr);
        document.getElementById('char-file').value = "";
    }
    reader.readAsText(files[0]);
}

// items

class Sprite {
    constructor(src, _2x = false, _2xfallback) {
        this.src = src;
        this.images = [];
        let _canvas = document.createElement("canvas");
        let _ctx = _canvas.getContext("2d");
        if(src.endsWith(".gif") || src.startsWith("data:image/gif;")) {
            fetch(src)
                .then(resp => resp.arrayBuffer())
                .then(buff => {
                        let gif = gifuct.parseGIF(buff)
                        let frames = gifuct.decompressFrames(gif, true);
                        if(!frames) return;
                        _canvas.width = frames[0].dims.width;
                        _canvas.height = frames[0].dims.height;
                        for(let frame of frames) {
                            let imagedata = new ImageData(frame.patch, _canvas.width, frames[0].dims.height);
                            _ctx.putImageData(imagedata, 0, frame.dims.height);
                            let img = new Image();
                            img.src = _canvas.toDataURL();
                            this.images.push(img);
                        }
                });
        } else {
            if(!_2x) {
                this.images.push(new Image());
                this.images[0].src = src;
            } else {
                let tempCanvas = document.createElement("canvas");
                let tempCtx = tempCanvas.getContext("2d");
                let zoom = 2;
                let img = new Image();
                img.src = src;
                img.onload = () => {
                    _canvas.width = img.width;
                    _canvas.height = img.height;
                    tempCanvas.width = img.width * zoom;
                    tempCanvas.height = img.height * zoom;
                    _ctx.drawImage(img, 0, 0);
                    let imgData = _ctx.getImageData(0, 0, _canvas.width, _canvas.height).data;
                    // nearest neighbor
                    for (let x = 0; x < img.width; x++) {
                        for (let y = 0; y < img.height; y++) {
                            let i = (y * img.width + x) * 4;
                            let r = imgData[i];
                            let g = imgData[i + 1];
                            let b = imgData[i + 2];
                            let a = imgData[i + 3];
                            tempCtx.fillStyle = "rgba(" + r + "," + g + "," + b + "," + a + ")";
                            tempCtx.fillRect(x * zoom, y * zoom, zoom, zoom);
                        }
                    }
                    this.src = tempCanvas.toDataURL();
                    this.images.push(new Image());
                    this.images[0].src = this.src;
                    if(_2xfallback) _2xfallback(this.src);
                }
            }
        }
    }
}
let pass = n => [...crypto.getRandomValues(new Uint8Array(n))].map((x,i)=>(i=x/255*61|0,String.fromCharCode(i+(i>9?i>35?61:55:48)))).join``;
class Item {
    constructor(id, x, y, sprite, vault, oninteract, onbartenderinteract, oncreate) {
        this.id = id;
        this.sprite = sprite;
        this.x = x;
        this.y = y;
        this.name = "";
        this.vault = vault;
        this.oninteract = oninteract;
        this.oncreate = oncreate;
        this.onbartenderinteract = onbartenderinteract;
        if(oncreate) oncreate(this);
        items.push(this);
    }
    interact(id, options = {}) {
        if(this.oninteract) this.oninteract(this, id, options);
    }
    bartenderInteract(id) {
        if(!localStorage.bartender && !localStorage.admin) return;
        if(this.onbartenderinteract) this.onbartenderinteract(this, id);
    }
    destroy() {
        items.splice(items.indexOf(this), 1);
    }
    draw() {
        let sprite_index = Math.floor(Date.now() / 100) % this.sprite.images.length;
        let img = this.sprite.images[sprite_index];
        let x = this.x-img.width/2;
        let y = this.y-img.height/2;
        x = Math.floor(x/2)*2;
        y = Math.floor(y/2)*2;
        ctx.drawImage(img, x, y);
    }
}

let doorbell;
if(localStorage.bartender || localStorage.admin) {
    doorbell = document.createElement("audio");
    doorbell.src = "doorbell.mp3";
    document.body.append(doorbell);

    document.getElementById("items").hidden = false;
    document.getElementById("food").onchange = evt => {
        let _2x = document.getElementById("item-2x").checked;
        let lowest = document.getElementById("lowest-layer").checked;
        let files = evt.target.files;
        let FI = 0;
        function makeItem() {
            let first_sprite = {src: files[0]._src};
            let oninteract = `i.vault.sprite_index++; let img = new Image();`;
            let oncreate = `let img = new Image();`;
            for(let i in files) {
                if(i === 0) continue;
                if(typeof files[i] !== 'object') continue;
                oninteract += `\nif(i.vault.sprite_index === ${i}) {
                    img.src = "${files[i]._src}";
                    i.sprite.images = [img];
                };`;
                oncreate += `\nif(i.vault.sprite_index ${+i === files.length-1 ? '>=' : '===' } ${i}) {
                    img.src = "${files[i]._src}";
                    i.sprite.images = [img];
                };`;
            }
            selectedItem = {
                sprite: first_sprite,
                vault: {
                    sprite_index: 0,
                    lowest_layer: lowest ? 1 : 0
                },
                onserverinteract: `sprite_index++`,
                oninteract,
                onbartenderinteract: `ws.send(JSON.stringify({ operation: 'itemDelete', value: i.id }));`,
                oncreate
            };
            itemAddMode = true;
            document.getElementById("food").value = "";
            document.getElementById("additemmode").innerText = "ON";
        }
        for(let i in files) {
            if(typeof files[i] !== 'object') continue;
            let reader = new FileReader();
            reader.onload = function(frEvent) {
                if(!_2x) {
                    files[i]._src = frEvent.target.result;
                    if(++FI === files.length) {
                        makeItem();
                    }
                } else {
                    new Sprite(frEvent.target.result, true, s => {
                        files[i]._src = s;
                        if(++FI === files.length) {
                            makeItem();
                        }
                    });

                }
            }
            reader.readAsDataURL(files[i]);
        }
    }
    document.getElementById("viewport").oncontextmenu = e => {
        e.preventDefault();
        if(localStorage.bartender || localStorage.admin) {
            let x = e.offsetX;
            let y = e.offsetY;
            // find closest item
            let closest = items.reduce((closest, item) => {
                let dist = Math.sqrt(Math.pow(x-item.x, 2) + Math.pow(y-item.y, 2));
                if(dist < closest.dist) return {dist: dist, item: item};
                return closest;
            }, {dist: Infinity});
            if(!closest || !closest.item) return;
            if(closest.dist < closest.item.sprite.images[0].width && Math.abs(characters[0].x - closest.item.x) < 200 && Math.abs(characters[0].y - closest.item.y) < 200) {
                ws.send(JSON.stringify({
                    operation: 'itemBartenderInteraction',
                    value: closest.item.id
                }));
                closest.item.bartenderInteract();
            }
        }
    }
}
document.getElementById("viewport").onclick = e => {
    if(itemAddMode) {
        let x = e.offsetX;
        let y = e.offsetY;
        let id = pass(32);
        ws.send(JSON.stringify({
            operation: 'itemCreate',
            value: {
                id: id,
                x, y,
                vault: selectedItem.vault,
                sprite: selectedItem.sprite,
                onserverinteract: selectedItem.onserverinteract,
                oninteract: selectedItem.oninteract ? String(selectedItem.oninteract) : undefined,
                onbartenderinteract: selectedItem.onbartenderinteract ? String(selectedItem.onbartenderinteract) : undefined,
                oncreate: selectedItem.oncreate ? String(selectedItem.oncreate) : undefined
            }
        }));
        itemAddMode = false;
        document.getElementById("additemmode").innerText = "OFF";
    } else {
        let x = e.offsetX;
        let y = e.offsetY;

        // take card from deck
        if(x >= 202 && y >= 301 && x <= 202+13 && y <= 301+13) {
            if(Date.now() - lastDeckTake < 500) return;
            if(Math.abs(characters[0].x - x) > 200 || Math.abs(characters[0].y - y) > 200) return;
            lastDeckTake = Date.now();
            ws.send(JSON.stringify({
                operation: 'deckTake'
            }));
            return;
        }

        // cards
        if(placeCardMode && selectedCard) {
            if(x >= 202 && y >= 301 && x <= 202+13 && y <= 301+13) {
                return;
            }
            if(x >= 124 && y >= 262 && x <= 124+162 && y <= 262+93) {
                // place card
                selectedCard.el.remove();
                let cardIndex = cards.findIndex(c => c.full === selectedCard.full);
                if(cardIndex === -1) return;
                selectedCard = null;
                document.getElementById("put-card").disabled = true;
                document.getElementById("card-cancel").disabled = true;
                document.getElementById("place-privately").disabled = true;
                document.getElementById("place-publicly").disabled = true;
                document.getElementById("place-privately").className = "card-btn";
                document.getElementById("place-publicly").className = "card-btn";
                cards.splice(cardIndex, 1);
                ws.send(JSON.stringify({
                    operation: 'cardPlace',
                    value: {
                        x, y,
                        index: cardIndex,
                        isPublic: placeCardMode === 2 ? true : false
                    }
                }));
                placeCardMode = 0;
            }
        } else {
            // take card
            let closestCard = placedCards.reduce((closest, card) => {
                let dist = Math.sqrt(Math.pow(x-card.x, 2) + Math.pow(y-card.y, 2));
                if(dist < closest.dist) return {dist: dist, card: card};
                return closest;
            }, {dist: Infinity});
            if(closestCard && closestCard.dist < 10) {
                if(Math.abs(characters[0].x - closestCard.card.x) > 200 || Math.abs(characters[0].y - closestCard.card.y) > 200) return;
                ws.send(JSON.stringify({
                    operation: 'cardTake',
                    value: closestCard.card.id
                }));
                return;
            }
        }
        // items
        let closest = items.reduce((closest, item) => {
            let dist = Math.sqrt(Math.pow(x-item.x, 2) + Math.pow(y-item.y, 2));
            if(dist < closest.dist) return {dist: dist, item: item};
            return closest;
        }, {dist: Infinity});
        if(!closest || !closest.item) return;
        if(closest.dist < closest.item.sprite.images[0].width && Math.abs(characters[0].x - closest.item.x) < 200 && Math.abs(characters[0].y - closest.item.y) < 200) {
            ws.send(JSON.stringify({
                operation: 'itemInteraction',
                value: {
                    item: closest.item.id
                }
            }));
        }
    }
}

if(!localStorage.savedSprites) localStorage.savedSprites = JSON.stringify({
    "frisk": {
        left: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACIAAAA6CAYAAADVwos0AAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFRSURBVGhD7ZYxDoJAEEXB1oTCwkNY2Fpp7wm8hYfxFp7AXitbCw9hYUFijbLsNzhmGBZQZxdfYgaExN23f3eMI4H5KMnsZSsO17Tytwa2/py3UXZlgIMzo8/Ip01QqBk9Rr5tggIzaoz8B0JhM7LfFXWxLCq97xo9S5OnVuoDZXIzsNMlejJi6/NkrTvbrrMS3vZFdppmSL+ReJa+fDiaGqDo2TWuuwXQExc03U3+G6G0PVf0GXn0G/MFyI6JvaqmrQl1/9Aa9xrgagQGSiuh1AjASCWk84ObOYdeIxJclmBEmjmH/0Y4+mOEMzHZnEw9r6emAlcz/hiBCcycA0aoobpm/DOyvV3MPVgNx6ZSA3gPz8MxImWDy0S4GeGyAZABSv8ygrXnuq/3GfkPhCKun5QVwD0Pr9cA6aQFriaAv0bqEr4RIJlxNQHCzYjnRqLoDrSvvIUkFPeUAAAAAElFTkSuQmCC",
        right: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAYAAAAUufjgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFPSURBVGhD7Za9DcIwEEYTWiQKCoagoKWCngnYgmHYggnoYQMKhqCgiEQNxMmHxInT+SdB8dlPii5WLNl5+S5JkQmkbKvIajp5tqdBnO+V9Zo1o7YOFvFuujLHIRmN12Df5iicyfgM/tschZocvMG8wVA+z7uv7J2OTV1vmkrHlJxBUJuCLRtqc7/ehelm0NYeshjtl8R7g8iYa9ZcSaeLJZPlsvo6bNHfxdQa/WLYwnWzfoMgtJPjNwj+ZZJ28ntdU/UYxJ24Gu2qe0F8Bjkks9z7UIIzB/QY5IBJzqBkSCIdgxzZIAc1N99fTL3uFqZSfE3qMwhz1BjGHJjnalKvwcPjZsbb8cxUahTXAeZlg1IGpUy6ZjGdDFJoBoFrFtPJIPc3Q7OoLoN5g6EEZxAgWyA0e0CfQcCZpPiaA/oN2pINckgmfc2BbBAozWBRvADybcUV0gXnDgAAAABJRU5ErkJggg==",
        up: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACgAAAA8CAYAAAAUufjgAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAFHSURBVGhD7ZaxDcIwEEUDLRIFBUNQsAH0TMAWDMMWTEAPG1AwBAUFEjUo4I/Ejyyfc0nwBb/GjiLju6dP7CKjZODGIIvJ+OGmKo7Xm3jPkqEbkyXYTVPmGKlJuwbbMseETNoz2JU5xmfSjsFfmQPZYFOwyeQN5gK1DFLJHjCXweQMApjMfxItuUAtuUAtuUAtuUAtyRdYuVHjDOzqjOb97N1m3FjB1xHA+8P+9fhhuXqPvnWx2DXI1M2k1qT9DDKz7cnNZJw3czf7RmrWnkGYgykYiDXH8O/gOWTS3knCHYLd/eJmOtaj6WuUmrRvUJs9JjaL9gwyTWUPIINMfwzidoJbSVsZ5H3MGqwUWHaErtpEuo+dDDL8XfSBTDG+daHvHmMvg3UpjUitxGA/g1JgT7quNxkUZyZkJmSwbj7tG4zN1J9lsCieqyCjxFQ4QnAAAAAASUVORK5CYII=",
        down: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACYAAAA6CAYAAADcKStOAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAF8SURBVGhD7ZYxbsJAEEUNbSQKihwiBW2qpM8JcoschltwgvSkSkvBIVKkQEoNsr2f4ovRzHox7LfymlmLFet9/ruaWRPkZbk4pmERX7+H0JrzVKvDfftrmWI8c3rGxjLFWOZ0jN3KFMPm/o1Fgbn6jXmmtp99fX3rq0V0noW+MRhg2AjPs373TE7XWCmeuWqNzVtT97y72i9y6avUm7Ho/TV7PvSDxPF7kUaXyZ3PmdMzNtZpZKzTOV1juVkCsvdY+FSW4hlidI0xuQZzTYF6jaV67i7QD5WajJri9XT6saFgp5YxGGDYEDM9Y7kZBJYhRteYZeZpvevq/mPVVQtv3nQyBlO8YzwPhf8Hz2xOx5hlavP309VS3h8e06jHMqdvrDRbjJc1PWPMtTIGOGtA1xi6BXQJY2WM16nemPli7Q6iXWgJ1jo6GWP4XmOQFcbLJN9bjF7Gcml3bu1+CPoZ84Ct6Hwgl7HsTFhGosaiOdQ3FjWRm0mLSo01zQm5LtGR4J/pYwAAAABJRU5ErkJggg==",
        left_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6Kv4wPkarlTjavbLH3PWNTsiQ6GSmaci+wgaz8ozW9og/w+D0uRJFAhQUc7ti7whL+oxLpGhJjdpq1aq08stau8wM1sukksaBdMAMZX/Qanb2PGyTn25d/W7Nv/d8WjSAgV83dWprdy81iXyMHGCLekJjj5QxKx55DZkmdRmcAJWfmmylqIRPqayjIK2oYrCaEAUFELOREba4uXW2wMAOvJ6+w8HCAsS+HQIEzwTHDs+kudPQ0s7RxbDHwdnLxsrI4LfcrdfQ2xDU56zp2BHtzN7mbOHW48T35vT69lbwzaonKRuzTt8eJDzoKiFBdwP/LWTYDFkyis3+YKSDsRGThI6gNIB0JQukxpEoU1pIAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi63P4wykmrvThnwbv/ncaA5KeVKImlbFi1sCvF8Uzf0I0/Op33sJ9nMOAQgbIF6ChgIoXNYtSpgzKJ1J3DiO1mfbyp91sLj7tDbOt3VnfQLLaUe/WuzXMx3Z3aitt7ZSN/Z4FBDXttcIJKhIp5d4MBkwGPWogClJWKl36PZCYAHDafkCqiAhQpi6moJyisCqMinm60qnqttxEluzYgvmEeBQUewYPDxUm7HMTOzs3KwdHPxNGzzAIE2wTX2t26txzc4Nbf2CLUyt7m2c/J3tnbhuPg8uCs8+Gv5nDv+xsE9HPzzx20DtWkiRN4UF07Xw6rGYPIMKE5dBYmAkPV6xmCxlB9AnaUdWoFCmShXk0kuZFWS44pJyQAACH5BAkKAAAALAAAAAAoADwAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLoq/jA+RquVONq9ssfc9Y1OyJDoZKZpyL7CBrPyjNb2iD/D4PS5EkUCFBRzu2LvCEv6jEukaEmN2mrVqrTyy1q7zAzWy6SSxhAzVP1B86zZ83BNfrJ18zr8iz/R9WF9HX+AL1wCAYkBeoYiiot1jWOMeEKTkZUxKx53DZomcxmdAJagm2qmqXlWqq2kIK6pYrGbEAUFELQcEre5unO3wcEOvZ+/xMLDAsW/gwTPBMgOz6W609DSAtTGscjF2czHy8rguNyu12BP6eet7HfbzdlqwtXo4+re5vLj3/3K/Oo9SLav2SuCAu11+0fQlzsVEjzNkgVRw6uJqtoMingPFCPGhw4vWrQ2UmRIgyhTqlzJklYCACH5BAkKAAAALAAAAAAoADwAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLoq/jA+RquVONq9ssfc9Y1OyJDoZKZpyL7CBrPyjNb2iD/D4PS5EkUCFBRzu2LvCEv6jEukaEmN2mrVqrTyy1q7zAzWy6SSxoF0wAxlf9BqdvY8bJOfbl39bs2/93xaNICBXzd1amt3LzWJfIwcYIt6QmOPlDErHnkNmSZ1GZwAlZ+abKWohE+prKMgrahisJoQBQUQs5ERtri5dbbAwA68nr7DwcICxL4dAgTPBMcOz6S509DSztHFsMfB2cvGysjgt9yt19DbENTnrOnYEe3M3uZs4dbjxPfm9Pr2VvDNqicpG7NO3x4kPOgqIUF3A/8tZNgMWTKKzf5gpIOxEZOEjqA0gHQlC6TGkShTWkgAADs=",
        right_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi63P4wykmpuDhrXOP+WueA5CcCZcpVartKrgvHNETXzx3bejv2l8EgOAw1gMSkkQEUCpUXns5ZfL6OPaq2KL1tqdFcCoz5OsO/EploRmPVWvYgQA9Yu6CtvG7nilVkZmRpY2cCgoaEgIhxAoqFjIl/LYh8bkwxlXWXC2GLiJyYCp+CoR6OKGWGICejqBlrJq0/g7Msh5K2E6y6u7K9kwUFG8CEwsTFrscCws3NpicXy87O0CIXBATSwwLZ2dYd2NrM3N7jydvp5NWouurT1OC+3xrm9MDiG/bnvepk7PjIydm2LOCyf8/a2fJnCGC/ddwIckMHMYNDitQSJsOUsRfgRlclPoIkIbLTr5KpkKFMefJjyAoJAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD/wi63P4wykmrvTjnwLv/ncaA5CcCZUpiahtWbvxKskzXOITnz17rvpgj2BEIOEbQkBhINo+mBtHodHKAPirUGsDutGCoFxfWXnstc7HsHJPUSLYYrQrHuW16yv7Ez5cuanJUZyMxgoN/C2SJaoCHjYRdeoFySpRpllFLCpWDhWidmZ+TFmcecCsbk6iSJSeGjrA3srNuoLZSqrmGHAQEl7woHb/Btr7AAb/Ly7giyMjMxaWwHAMD0AHX184a1tjKydvgudnT0cmz5sno3RffrU7c1N7a4HdQ8+rh02rT+8zwZQMozUNAequkseOXrhoxhc0Q1kOn0J2pFKI8ZJQYQRfFxlMzYOwa9mqVMY/PRhqbuIlkSAcJAAAh+QQJCgAAACwAAAAAKAA8AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6Kv4wPkarlTjaTbPH3PWNTsiQ6GSmaci+wgaz8ozW9ljlzjD0P02H5wNKdjZfUbAsiWbKYDP2hEWvQZwVq3QiP1EIt0v9esKP8VKbwQJ9gXhgXW1f3wP5PFs/k9VkZmB/gHwnLIV3ZQsviWhsI4B6XkMpknKUhw2RhZlDm4OAni5UYmQZJiKgTKcgqSusdK+zjLGGtLOouLS6u7AOBQVHvhwQwcPEQ8cCwc3No7vAwszOz4vJDgQE0tna29fE3dwC3t/Jh8vp1dC51OPV0+cA4hHl2uyv9BD25ufjaM7wpfpHJiA4XASXGJSXMMhCf9SWSVsmb5PBifEqWoSXURzjRngCo+nwuKoXyXmuTtZCphKlSZIfWsqcWSEBACH5BAkKAAAALAAAAAAoADwAggAAAD0SDv/JDuYH+Gek4AAAAAAAAAAAAAP/CLoa/jA+RquVONpNs8fc9Y1OyJDoZKZpyL7BBrPyjNb2WOWOIPQ/TYfnA0p2Nl8xsCyJZspgM/aERa9BnBWrdCI/UQi3S/16wo/xUpvBAqfravv6DhrLQxJaTTaDyXxxJyyBdHgNhIV9ciN8R4x/Y49IiJFqXiKVZ4GYJgBOYmQZnpSfaaIgpC5Mi6qupmivr6OyqrS1qw4EBJO4Zru9vojAAbvGxp24urzFx8iHygEDA8sO09PJtdbUzdvY0Nrd4svEwqbExOTM5tuhS9/s0tx17eCu6vTi8cf55cLq6Zr58wWQGT57th44c5ZNFoSF/BCS+qAJlIqEtB5BmJWqFaIQjr0oRgv5cWTJYOZSqlzJsqWvBAA7",
        up_walk: "data:image/gif;base64,R0lGODdhKAA8AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD9Ai63P4wyklpuDhrXOP+WueAZCgqZRqcartWrmrFrkTXzx1DOj72vgUwiBrKGsZjMZliMJWAZ2spJVGrnyvWtLVGu9kvmDsmlzni80uNZl+c62fxpwXOPS+4YC94n3J5QgF8fYF/gFCHcIl/GwSPkJGPGywakpcElDABk5yYnxedM52foJ5+PKcYA6ytrq+toZmGgp0XsLivsqhIqqW/s6KApMCmwj8ZucqxJsiry8qaP3uyxZcX1LRF2daY2IWpGd3Xzb3i45HSeKbn6drr3paSvKPxReSVpvfz7+FeJZUAplEX0AwaRYI0EWz0z0tBhQ4fJAAAIfkECQoAAAAsAAAAACgAPACCAAAAPRIO/8kO5gf4Z6TgAAAAAAAAAAAAA/UIuhz+MD5Gq5U42k2z19z2jUFYkWhpKim5tm0Ip+JMXzZa53rH942fyyf8BIujI9KjXDIBzmE0CZ0+rVcshqWVcLuQL9ghHpfB524wneOeVE43h+wT2AX0lUwVvOP5ei9AgXODhAsSBIqLjIpehImNko+CjgGSmIsOlpUEm5mYn3k4lg4Dp6ipqqiigEGlAauyqq07D6C4niBvELmglHV/s8MDDn6jfcLEssZ3yESXvo3Nds9K0tMBx66k2NlhJp/emruFmb26tZDRk7fp0dbh7O9sh6/kdBn20OD6+4hbqgDbB2zgv4Ll/smLp9BWw4cQI1ZIAAAh+QQJCgAAACwAAAAAKAA8AIIAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAAAAAD9Ai63P4wyklpuDhrXOP+WueAZCgqZRqcartWrmrFrkTXzx1DOj72vgUwiBrKGsZjMZliMJWAZ2spJVGrnyvWtLVGu9kvmDsmlzni80uNZl+c62fxpwXOPS+4YC94n3J5QgF8fYF/gFCHcIl/GwSPkJGPGywakpcElDABk5yYnxedM52foJ5+PKcYA6ytrq+toZmGgp0XsLivsqhIqqW/s6KApMCmwj8ZucqxJsiry8qaP3uyxZcX1LRF2daY2IWpGd3Xzb3i45HSeKbn6drr3paSvKPxReSVpvfz7+FeJZUAplEX0AwaRYI0EWz0z0tBhQ4fJAAAIfkECQoAAAAsAAAAACgAPACCAAAAPRIO/8kO5gf4Z6TgAAAAAAAAAAAAA/MIuhz+MD5Gq5U42k2z19z2jUFYkWhpKim5tm0Ip+JMXzZa53rH942fyyf8BIujI9KjXDIBzmE0CZ0+rVcshqWVcLuQL9ghHpfB524wneOeVE43h+wT2AX0lUwVvOP5ei9AgXODhAsSBIqLjIpehImNko+CjgGSmIsOlpUEm5mYn3k4lgOmp6ippxCcpJ4BqrGprK87D6C4r2E4tLmhIG9+DrLEAw52o313w8Wxx381wpe+jbvRy9PUmhOFvdrbgt7ftZDTtOLg5Zait7+HbGKMyeWP3vOBGfDvTdz5+0TczvwDOIrSQEQBD4YDpLChw4cVEgAAOw==",
        down_walk: "data:image/gif;base64,R0lGODdhJgA6AHcAACH/C05FVFNDQVBFMi4wAwEAAAAh+QQJCgAAACwAAAAAJgA6AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6LP4wPkYrlTjavbLXXPWNQtiQqAmgKce+pQWz2/yKdqtkw8D7uhWm96N1Ir0k0KGEEDEnp3IpaD6ekuh1yu0mMzukd2xlkc9ArAdNZlJ/gXjAK593Sb06Xe79sNl4f2eBe3FtKGR6YzCCXzmNajlVg5JihyRhYX6OYEInmmucUJ4qF5NPOKUup0CpqqaYrzVBqhIFBRm3WaW2uBi6ICEOwLfFxsfEvsICycjOvsCzwATU1dbX1RDRptPY3tbaytzQz+XJDjjN5s7D4loO3/HZwUcQ8vK7J0/r5W7opvv4sZv07x0zgcjy1XuAMCG9dMd6Oax10JjEiDFUtLMYYyIjRooThTwraOIDqE4aPZwcJWsXSlkL/71sOcokzE42KyQAACH5BAUKAAAALAAAAAAmADoAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLos/jA+RiuVONq9stdc9Y1C2JCoCaApx76lBbPb/Ip2q2TDwPu6Fab3o3UivSTQoYQQMSenciloPp6S6HXK7SYzO6R3bGWRz0CsB01mUn+BeMArn3dJvTpd7v2w2Xh/Z4F7cW0oZHpjMIJfOY1qOVWDkmKHJGFhfo5gQieaa5xQnioXk084pS6nQKmqppivNUGqEgW3Bba5ICq6t7pZJg6/ArjGx8bDuyHKysjPu8SzxATV1tfY1hDSptTZ39fby7AP0Oa4wVrO58/pR1bg8QRuDjjw8t/0MSdW7O287xz5Q+YO1DqCEZLtk5HQnK9xvYodI8EtIsIPFUutqyekHpOsjTE+yDI4oSPAj6M8jiSpbuFKdwVXmpT5CgLNBAAh+QQJCgAAACwAAAAAJgA6AIIAAAAAAAA9Eg7/yQ7mB/hnpOAAAAAAAAAD/wi6LP4wPkYrlTjavbLXXPWNQtiQqAmgKce+pQWz2/yKdqtkw8D7uhWm96N1Ir0k0KGEEDEnp3IpaD6ekuh1yu0mMzukd2xlkc9ArAdNZlJ/gXjAK593Sb06Xe79sNl4f2eBe3FtKGR6YzCCXzmNajlVg5JihyRhYX6OYEInmmucUJ4qF5NPOKUup0CpqqaYrzVBqhIFBRm3WaW2uBi6ICEOwLfFxsfEvsICycjOvsCzwATU1dbX1RDRptPY3tbaytzQz+XJDjjN5s7D4loO3/HZwUcQ8vK7J0/r5W7opvv4sZv07x0zgcjy1XuAMCG9dMd6Oax10JjEiDFUtLMYYyIjRooThTwraOIDqE4aPZwcJWsXSlkL/71sOcokzE42KyQAACH5BAkKAAAALAAAAAAmADoAggAAAAAAAD0SDv/JDuYH+Gek4AAAAAAAAAP/CLos/jA+RiuVONq9stdc9Y1C2JCoCaApx76lBbPb/Ip2q2TDwPu6Fab3o3UivSTQoYQQMSenciloPp6S6HXK7SYzO6R3bGWRz0CsB01mUn+BeMArn3dJvTpd7v2w2Xh/Z4F7cW0oZHpjMIJfOY1qOVWDkmKHJGFhfo5gQieaa5xQnioXk084pS6nQKmqppivNUGqEgUFtre4ICq5ubdZJg7AArrGx8bDuyHKysjPu8SzxA4E1tfY2dfNMSfUAtrh2dw4ENDnusFazujP6kdP4vIEbqim8fPh9a2wD+3urByU8/fv2D6Bq5JFQPcOh0Jz5xqa+pYBGcJexXZ9sNitItSHMAplgQrG7qLITp1ECiE5SuU7ibJe8lIpbALNWjZDJAAAOw==",
    }
});
let savedSprites = JSON.parse(localStorage.savedSprites);
for(let i in savedSprites) {
    let el = document.createElement("span");
    el.innerText = i;
    el.className = "saved-sprite";
    let rm = document.createElement("span");
    rm.innerText = ' [x]';
    rm.className = "saved-sprite sprite-remove";
    rm.onclick = () => {
        delete savedSprites[i];
        localStorage.savedSprites = JSON.stringify(savedSprites);
        document.getElementById("saved-sprites").removeChild(el);
        document.getElementById("saved-sprites").removeChild(rm);
    }
    el.onclick = () => {
        ws.send(JSON.stringify({
            operation: "sprite",
            value: savedSprites[i]
        }));
        characters[0].sprite = new CharacterSprite(savedSprites[i]);
        localStorage.sprites = JSON.stringify(savedSprites[i]);
    };
    document.getElementById("saved-sprites").append(el, rm, document.createElement("br"));
}
document.getElementById('save-sprite').onclick = () => {
    let name = prompt("Name of sprite?");
    if(!name) return;
    let overwriting = false;
    if(savedSprites[name]) {
        if(!confirm("Overwrite existing sprite?")) return;
        overwriting = true;
    }
    savedSprites[name] = characters[0].sprite.srcs;
    localStorage.savedSprites = JSON.stringify(savedSprites);
    if(overwriting) return;
    let el = document.createElement("span");
    el.innerText = name;
    el.className = "saved-sprite";
    let rm = document.createElement("span");
    rm.innerText = ' [x]';
    rm.className = "saved-sprite sprite-remove";
    rm.onclick = () => {
        delete savedSprites[i];
        localStorage.savedSprites = JSON.stringify(savedSprites);
        document.getElementById("saved-sprites").removeChild(el);
        document.getElementById("saved-sprites").removeChild(rm);
    }
    el.onclick = () => {
        ws.send(JSON.stringify({
            operation: "sprite",
            value: savedSprites[name]
        }));
        characters[0].sprite = new CharacterSprite(savedSprites[name]);
        localStorage.sprites = JSON.stringify(savedSprites[name]);
    };
    document.getElementById("saved-sprites").append(el, rm, document.createElement("br"));
}

// nicks on hover
document.getElementById('viewport').onmousemove = e => {
    let x = e.offsetX;
    let y = e.offsetY;
    mouse.x = x;
    mouse.y = y;

    // cards
    let closestCard = placedCards.reduce((closest, card) => {
        let dist = Math.sqrt(Math.pow(x - card.x, 2) + Math.pow(y - card.y, 2));
        if(dist < closest.dist) return {dist, card};
        return closest;
    }, {dist: Infinity});
    if(closestCard && closestCard.dist < 13) {
        cardToDraw = {
            text: (closestCard.card.card ? closestCard.card.card.full : 'Unknown') + " (" + closestCard.card.placer + ")",
            x: closestCard.card.x,
            y: closestCard.card.y,
        }
        return;
    } else {
        cardToDraw = {
            text: "",
            x: 0,
            y: 0,
        }
    }
    // players
    let closestPlayer = players.filter(i => i.character && i.character.sprite).reduce((a, b) => {
        let dist = Math.sqrt(Math.pow(x - b.character.x, 2) + Math.pow(y - b.character.y-130, 2));
        if(dist < a.dist) return {dist, player: b};
        return a;
    }, {dist: Infinity, player: null});
    if(!closestPlayer.player) {
        nickToDraw = {
            nick: "",
            x: 0,
            y: 0
        }
        return;
    };
    if(closestPlayer.player.character.sprite && closestPlayer.dist < closestPlayer.player.character.sprite.images.down[0].width) {
        nickToDraw.nick = closestPlayer.player.nick + closestPlayer.player.id + ` (${closestPlayer.player.cardCount})`;
        nickToDraw.x = closestPlayer.player.character.x;
        nickToDraw.y = closestPlayer.player.character.y;
    } else {
        nickToDraw = {
            nick: "",
            x: 0,
            y: 0
        }
    }
}

// cards
document.getElementById("put-card").onclick = () => {
    if(!selectedCard) return;
    let index = cards.findIndex(i => i.full == selectedCard.full);
    selectedCard = null;
    document.getElementById("put-card").disabled = true;
    document.getElementById("card-cancel").disabled = true;
    document.getElementById("place-privately").disabled = true;
    document.getElementById("place-publicly").disabled = true;

    ws.send(JSON.stringify({
        operation: "deckPut",
        value: index
    }));
}
document.getElementById("place-privately").onclick = () => {
    placeCardMode = 1;
    document.getElementsByName("place-privately").className = "card-btn selected-card-btn";
    document.getElementsByName("place-publicly").className = "card-btn";
    document.getElementById("card-cancel").disabled = false;
};
document.getElementById("place-publicly").onclick = () => {
    placeCardMode = 2;
    document.getElementsByName("place-publicly").className = "card-btn selected-card-btn";
    document.getElementsByName("place-privately").className = "card-btn";
    document.getElementById("card-cancel").disabled = false;
};
document.getElementById("card-cancel").onclick = () => {
    placeCardMode = 0;
    document.getElementsByName("place-publicly").className = "card-btn";
    document.getElementsByName("place-privately").className = "card-btn";
    document.getElementById("card-cancel").disabled = true;
}

// fps
let last25 = [];
let i25 = 0;
let before = Date.now(), now, fps = 0;

requestAnimationFrame(
    function loop() {
        now = Date.now();
        fps = Math.round(1000/(now-before));
        before = now;
        last25.push(fps);
        if(last25.length > 25) last25.shift();
        if(i25++ > 10) {
            i25 = 0;
            document.getElementById("fps").innerText = Math.round(last25.reduce((a, b) => a + b, 0) / 25);
        }
        requestAnimationFrame(loop);
    }
);

draw();