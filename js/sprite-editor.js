// Todo: convert into a class with constructor
// Global reference to canvas and it's context
let canvas;
let subCanvasID = 0;
let ctx;
let dirtyIndices = [];

// used to load images from local storage and display them
let loadedImages;

// Width and Height of Canvas.
// Have to be even multiples of number of rows and colums

const WIDTH = 256; //px
const HEIGHT = 256; //px

// -> Number of columns and rows have to be even multiples of 16
const NUM_ROWS = 16;
const NUM_COLS = 16; 

// TODO Currently only makes square sprites
const BOX_SIDE_LENGTH = WIDTH / NUM_ROWS; //px

// Mouse Flags
let mouseDown = false;
let mouseDownAt = null;
let clickAndDrag = true;
// Delay in MS before click and drag events are handled
let DRAG_DELAY_MS = 50; 

// Default color and canvas data array
// Sprite Editor

let colorPalette = ['fafafa', 'd4d4d4', '9d9d9d', '4b4b4b', 'f9d381', 'eaaf4d', 'f9938a', 'e75952', '9ad1f9', '58aeee', '58aeee', '44c55b', 'c3a7e1', '9569c8', 'bab5aa', '948e82'];
let currentColor = '#eaaf4d';
let currentColorDiv;
let defaultColor = '#FFFFFF';
let canvasData = new Array(NUM_ROWS * NUM_COLS).fill(defaultColor);


// Create Color Palette
function populatePalette() {
    let palette = colorPalette;
    let paletteArea = document.querySelector('.sprite--palette');
    palette.forEach((color, index) => {
        let html = `
            <div class="sprite--color-swatch" id="${color}_${index}" data-hex="#${color}" style="background-color: #${color}">
            </div>
        `;
        paletteArea.innerHTML += html;
        //html.setAttribute("style", `background-color: ${color}`);
    });
    currentColorDiv = document.querySelector(`[data-hex="${currentColor}"]`);
    currentColorDiv.classList.add('activeColor');
}
// Converts an grid arra index on the editor to an x and y coordinate
function indexToRowAndColumn(index) {
    let row = Math.floor(index / NUM_ROWS);
    let column = index % NUM_COLS;
    return {row, column};
}

// Converts a mouse click's x and y offset on the editor to x and y coordinates
function coordinatesToIndex(x, y) {
    // Takes the canvas offset X and Y and convers them into 
    // row and column numbers of the canvas
    let column = Math.floor(x / BOX_SIDE_LENGTH);
    let row = Math.floor(y / BOX_SIDE_LENGTH);
    return row * NUM_ROWS + column;
}

// Sets the color data of the clicked sprite editor's array index 
function setData(index, color) {
    // Check if the index is already in the dirty Indice array to be updated. If it is, don't bother updating it. It's already the color we're setting
    if (dirtyIndices.includes(index)) { return false; }
    // If it isn't, check to see that the index's color is different than the current color and recolor accordingly.
    let currentColor = canvasData[index];
    if (!clickAndDrag) {
        if ( color !== currentColor ) {
            canvasData[index] = color;
        } else {
            canvasData[index] = defaultColor;
        }
    } else {
        canvasData[index] = color;
    }
    // push the new color for that index into the dirty indices array to be redrawn.
    dirtyIndices.push(index);
}

// Functions to make sure the column and row and actually in the canvas.
const isValidColumn = column => column >= 0 && column <= NUM_COLS - 1;

const isValidRow = row => row >= 0 && row <= NUM_ROWS - 1;

// Colors a rectangle (pixel) based on a row and column coordinate pulled from the dirty index every animation frame. 
function colorBox(box, color) {
    const {row, column } = box;
    // Check if the coordinate is valid
    if (!isValidColumn(column) || !isValidColumn(row) ) {
        return false;
    }
    // Set the color of the fill and the dimensions of the color.
    ctx.fillStyle = color || currentColor;
    ctx.clearRect(column * BOX_SIDE_LENGTH, row * BOX_SIDE_LENGTH, BOX_SIDE_LENGTH, BOX_SIDE_LENGTH);
    ctx.beginPath();
    ctx.fillRect(column * BOX_SIDE_LENGTH, row * BOX_SIDE_LENGTH, BOX_SIDE_LENGTH, BOX_SIDE_LENGTH);
    ctx.closePath();
    // Redraw the Grid
    redrawGrid(row, column);
}

function getUserImageParameters(e) {
    e.preventDefault();
    let imageWidth = document.querySelector('select#pxWidth').value;
    let transparency = true;
    let backgroundColor = "#000000";
    let imageTray = document.getElementById('imageTray');
    imageTray.prepend(grabCanvas(imageWidth, transparency, backgroundColor, canvasData));
    imageTray.scrollLeft = 0;
}
// Draw the grid
function redrawGrid(row, column) {
    ctx.lineWidth = 0.5;
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset the canvas' transform scaling by a factor of 1. a = horizontal scale and d = vertical
    ctx.translate(0.5, 0.5); // Make sharp grid lines
    ctx.beginPath();
    ctx.moveTo(column * BOX_SIDE_LENGTH, row * BOX_SIDE_LENGTH);
    ctx.lineTo(column * BOX_SIDE_LENGTH, (row +  1) * BOX_SIDE_LENGTH);
    ctx.stroke();
    ctx.lineTo( (column + 1) * BOX_SIDE_LENGTH, (row + 1 )* BOX_SIDE_LENGTH);
    ctx.stroke();
    ctx.lineTo( (column + 1 ) * BOX_SIDE_LENGTH, row * BOX_SIDE_LENGTH );
    ctx.stroke();
    ctx.lineTo(column * BOX_SIDE_LENGTH, row * BOX_SIDE_LENGTH);
    ctx.stroke();
    ctx.closePath();
}

// Color Change Handlers 
function setColor(swatch) {
    currentColor = swatch.dataset.hex;
    currentColorDiv = swatch;
    swatch.classList.add('activeColor');
}

function switchColor(e) {
    const classes = e.target.classList;
    if (!classes.contains('sprite--color-swatch') || classes.contains('activeColor')) { return false; }
    currentColorDiv.classList.remove('activeColor');
    setColor(e.target);
}

// Save Image
function grabCanvas(imageWidth, transparency, backgroundColor, data) {
    subCanvasID++;
    let savedImage = document.createElement('canvas');
    savedImage.height = imageWidth;
    savedImage.width = imageWidth;
    savedImage.classList.add('editor-output');
    savedImage.id = 'image'+subCanvasID;
    let savedImageContext = savedImage.getContext('2d');
    const cellDimensions = Math.ceil(imageWidth / NUM_COLS);
    

    function colorScaledBox(box, color) {
        const { row, column } = box;
        if (!isValidColumn(column) || !isValidRow(row) ) { return false; }
        savedImageContext.fillStyle = color || currentColor;
        savedImageContext.clearRect(column * cellDimensions, row * cellDimensions, cellDimensions, cellDimensions);
        savedImageContext.beginPath();
        savedImageContext.fillRect(column * cellDimensions, row * cellDimensions, cellDimensions, cellDimensions);
        savedImageContext.closePath();
    }

    //
    for (let i = 0; i < data.length; i++) {
        let row = Math.floor(i / NUM_ROWS);
        let column = i % NUM_COLS;
        let color = canvasData[i];
        if (transparency) {
            if (color === defaultColor) {
                colorScaledBox({row, column}, 'rgba(255,255,255,0');
            } else {
                colorScaledBox({row, column}, color);
            }
        }
    }
    return savedImage;
}


// Iterates through each x,y coord of the canvas and set's it to the default state by adding it to the dirty index;
function resetCanvas() {
    for (let i = 0; i < canvasData.length; i++) {
        canvasData[i] = defaultColor;
        dirtyIndices.push(i);
    }
}

// Event Handlers

// Handles a single click within the sprite editor's canvas.
function handleClick(e){
    //console.log(e);
    let x = e.offsetX;
    let y= e.offsetY;
    // TURN BOUNDARY CHECK INTO FUNCTION?
    if ( (x > WIDTH || x < 0) || y > HEIGHT || y < 0) { 
        return false;
    }
    setData(coordinatesToIndex(x, y), currentColor);
}

function handleMouseDown(e) {
    mouseDown = true;
    mouseDownAt = Date.now();
}

function handleMouseMove(e) {
    if (!mouseDown) {
        return false;
    }
    if ( (Date.now() - mouseDownAt) > DRAG_DELAY_MS ) {
        let x = e.offsetX;
        let y = e.offsetY;
        clickAndDrag = true;
        if ( (x > WIDTH || x < 0) || y > HEIGHT || y < 0) { 
            return false;
        } else {
            setData(coordinatesToIndex(x, y), currentColor);
        }
    }
}
function handleMouseUp(e) {
    if (clickAndDrag) {
        let x = e.offsetX;
        let y = e.offsetY;

        if ( (x >= WIDTH || x <= 0) || (y >= HEIGHT || y <= 0) ) {
            return false;
        }
        setData(coordinatesToIndex(x, y), currentColor);
    }
    mouseDown = false;
    mouseDownAt = null;
    clickAndDrag = false;
}

function loadImages(e) {
    let saved = localStorage.getItem('sprites');
    if (!saved) { return false; }
    loadedImages = JSON.parse(saved);

    let savedImages = document.getElementById('savedImages');
    savedImages.innerHTML = ''; // delete saved images
    loadedImages.images.map( (image, index) => {
        let imageContainer = document.createElement('div');
        imageContainer.id  = 'saved-image-' + index;
        imageContainer.classList.add('image-container');
        let closeBox = document.createElement('div');
        closeBox.id = 'close-' + index;
        closeBox.classList.add('close');
        imageContainer.appendChild(closeBox);
        let canvas = grabCanvas(128, true, null, image);
        canvas.id = 'close-' + index;
        imageContainer.appendChild(canvas);
        savedImages.prepend(imageContainer);
    });
    savedImages.addEventListener('click', handleSavedPaneClick);
    savedImages.style.display = 'flex';
}

function saveImage(e) {
    let saved = localStorage.getItem('sprites');
    if  (!saved) {
        // Create a save object to copy canvas data to
        let saveObject = JSON.stringify({
            images: [canvasData]
        });
        localStorage.setItem('sprites', saveObject);
    } else {
        // retrieve the images from the existing sprites object in local storage and add the image being saved to it.
        saved = JSON.parse(saved);
        let newImages = saved.images.slice();
        newImages.push(canvasData);
        let saveObject = Object.assign({}, saved, { images: newImages });
        localStorage.setItem('sprites', JSON.stringify(saveObject));

    }
    loadImages();
}

// Event Listeners
function addListeners() {
    canvas.addEventListener('click', handleClick);
    const palette = document.querySelector('.sprite--palette');
    palette.addEventListener('click', switchColor);

    // Mouse Listeners
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mouseup', handleMouseUp);

    // Make these more dynamic
    document.getElementById('saveSprite').addEventListener('click', getUserImageParameters);
    
    // Probably won't be needed in final
    document.getElementById('saveImage').addEventListener('click', saveImage);
    document.getElementById('loadImages').addEventListener('click', loadImages);
}

// Iterates through the dirty indices and updates each x, y coord on the canvas with it's new color
function drawData() {
    for (let i = 0; i < dirtyIndices.length; i++) {
       let color = canvasData[dirtyIndices[i]];
       colorBox(indexToRowAndColumn(dirtyIndices[i]), color);
    }
    // Reset the dirty Indices array for the next animation frame's update
    dirtyIndices = [];
    requestAnimationFrame(drawData);
}

// Initializes the Canvas for drawing.

function getCanvasAndContext() {
    // To Do initilize on load for all canvases via event listener
    canvas = document.getElementById('editor');
    ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    canvas.width = NUM_COLS * BOX_SIDE_LENGTH + 1; // +1 to display border;
    canvas.height = NUM_ROWS * BOX_SIDE_LENGTH + 1;
}

// Initializes the dditor
function initEditor() {
    getCanvasAndContext();
    resetCanvas();
    
    populatePalette();
    addListeners();
    
    
}

// On first load. initilize the editor and draw it's default state.
window.onload = function() {
    initEditor()
    drawData();
}


