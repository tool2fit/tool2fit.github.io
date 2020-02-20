// global variables
var canvas; // canvas on which we plot
var ctx;   // context
var pxpermm = 3.77953; // guess about how many px make one mm on the screen
var myMagnifications = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.5, 2.0, 3.0, 4.0, 5.0, 6.0]; // magnifications
var maxUndoStackSize = 5000; // how many undo steps we can do; 
// the copy buffer should be a single globabl buffer so
// that later we can copy between different canvases'
var copyToolsBuffer = []; // array containing all the tools which have been copied
var handleRadius; // global radius of all handles

var regularCanvasStack = [];
var regularCanvasIndex = 1;
var regularCanvas; // width, height, units, magnification, scale, tool stack and all undo as well as redo stacks
var editCanvas; // parameters of the canvas when we are in editing mode (width, height, units, magnification, scale)

// colors
var myBlue = "#005DB3";
var myGray = "#C0C0C0";
var myBlack= "black";
var myRed = "red";

var myGridLineColor = myBlue;
var myCrossHairColor = myGray;
var myBoundingBoxColor = myGray
var myToolColor = myBlack;
var myToolSelectedColor = myBlue;
var myHandleColor = myRed;
var myHandleSelectedColor = myBlue;
var myPointColor = myRed;
var myPointSelectedColor = myBlue;
var myToolHoverColor = myBlue;

// line widths
var myCrossHairLineWidth = 0.25;
var myBoundingBoxLineWidth = 0.52;
var myGridLineWidth = 0.15;
var myToolLineWidth = 0.15;
var myHandleLineWidth = 0.15;
var myPointLineWidth = 0.25;

// class for regular canvas
class myRegularCanvas {    

    constructor(width, height, unitsinmm, magnification) {

        this.offsetX = 0; // x-offset of the left top corner
        this.offsetY = 0; // y-offset of the left top corner
        this.width = width; // width of the canvas in mm
        this.height = height;  // height of the canvas in mm
        this.unitsinmm = unitsinmm; // units in mms
        this.magnification = magnification; // magnfication
        this.scale = magnification*pxpermm;
        this.allTools = []; // stack of all tools
        this.undoToolStack = []; // array containing the tool modifications
        this.undoIndexStack = []; // array containing indices of modified tools
        this.undoWhatStack = []; // array containing what action was taken
        this.redoToolStack = []; // array containing the tool modifications
        this.redoIndexStack = []; // array containing indices of modified tools
        this.redoWhatStack = []; // array containing what action was take

    }
    
}

// class for edit canvas
class myEditCanvas {    

    constructor(width, height, unitsinmm, magnification) {

        this.offsetX = 0; // x-offset of the left top corner
        this.offsetY = 0; // y-offset of the left top corner
        this.width = width; // width of the canvas in mm
        this.height = height;  // height of the canvas in mm
        this.unitsinmm = unitsinmm; // units in mms
        this.magnification = magnification; // magnfication
        this.scale = magnification*pxpermm;
        this.toolToEdit; // tool to be edited
    }
    
}

// class for tool
class Tool {    

    constructor(tooltype) {
        this.type = tooltype; // one of {"free", "ellipse", "rectangle"}
        
        this.rawdata = []; // raw data of the tool outline (pairs are in mm)
        this.convexhull = []; // convex hull of the tool
        this.editeddata = []; // edited (smoothed, simplified) tool outline
        this.path = new Path2D();  // path2D object corresponding to editeddata

        this.filename = ""; // store the file name so that we can access the .jpg to show actual tool
        this.img = new Image(); // store the image corresponding to this file
        this.imgOffset = []; // store the xmin and ymin from the python
        
        this.offsetX = 0;  // in mm
        this.offsetY = 0;  // in mm
        this.angle = 0; // angle of rotation in [0, 2 pi]
        this.horizontalFlip = 1; // flip along y=0; 1 means no flip; -1 means flip
        this.verticalFlip = 1; // flip along x=0; 1 means no flip; -1 means flip

        this.avgX = 0;  // the x position of the centroid in mm, relative to offset
        this.avgY = 0;  // the y position of the centroid in mm, relative to offset
        this.maxX = 0; // distance of the right most point of path from the center in the rotated coordinate system
        this.minX = 0; // distance of the left most point of path from the center in the rotated coordinate system
        this.maxY= 0; // distance of the top most point of path from the center in the rotated coordinate system
        this.minY = 0; // distance of the bottom most point of path from the center in the rotated coordinate system

        this.handleCenterX = 0; // handle/grip circle center 
        this.handleCenterY = 0; // handle/grip circle center
        this.handleRadius = handleRadius; // radius of the handle in mm
 
        this.selected = false; // {true, false} depending if the tool is currently selected or not
        this.insideTool = false; // {true, false} depending whether mouse is inside or outside this tool
        this.insideHandle= false; // {true, false} depending whether mouse is inside or outside handle

        // all the following attributes are for editing mode
        this.undoStack = []; 
        this.redoStack = []; 
        this.slider = 1; // value of the slider for tool smoothing  
        this.selectedPoint = -1; // index of the selected point in the edited outline
        this.opacity = 0.5; // default opacity when showing the tool photo
        this.backgroundPaperSize = 1; // 1 corresponds to A4; A3 would be 2 etc
    }

    // regular plot function
    regularPlot(ctx) {

        // cross hairs
        ctx.save();    
        // offset of the paper  
        // ctx.translate(regularCanvas.offsetX, regularCanvas.offsetY); 

        ctx.translate((this.offsetX+this.avgX)*regularCanvas.scale, (this.offsetY+this.avgY)*regularCanvas.scale);
        ctx.scale(regularCanvas.magnification*pxpermm,regularCanvas.magnification*pxpermm);
        ctx.beginPath();
        ctx.moveTo(-50, 0);
        ctx.lineTo(50, 0);
        ctx.moveTo(0, -50);
        ctx.lineTo(0, 50);
        ctx.strokeStyle = myCrossHairColor;
        ctx.lineWidth = myCrossHairLineWidth/regularCanvas.magnification;
        ctx.stroke();
      
        // bounding box if the tool is selected
        if (this.selected == true) {
            computeBoundingBox(this);

            ctx.beginPath();
            ctx.rect(this.minX, this.minY, this.maxX-this.minX,this.maxY-this.minY); 
            ctx.strokeStyle = myBoundingBoxColor;
            ctx.lineWidth = myBoundingBoxLineWidth/regularCanvas.magnification;
            ctx.stroke();
        }
        ctx.restore();

        // tool itself
        ctx.save();                
        ctx.translate((this.offsetX+this.avgX)*regularCanvas.scale, (this.offsetY+this.avgY)*regularCanvas.scale);
        ctx.rotate(this.angle * 2 * Math.PI / 360.0 * this.horizontalFlip * this.verticalFlip);
        ctx.translate(-this.avgX*regularCanvas.scale*this.verticalFlip, -this.avgY*regularCanvas.scale*this.horizontalFlip);
        if (this.selected === true) {

            ctx.setLineDash([2,4]); // dashed line
            if (this.insideTool)
                ctx.strokeStyle = myToolSelectedColor;
            else
                ctx.strokeStyle = myToolColor;
        }
        else {
    
            ctx.setLineDash([1,0]); // solid line
            if (this.insideTool)
                ctx.strokeStyle = myToolSelectedColor;
            else
                ctx.strokeStyle = myToolColor;
        }
        ctx.scale(this.verticalFlip*regularCanvas.magnification*pxpermm,this.horizontalFlip*regularCanvas.magnification*pxpermm);
        ctx.lineWidth = myToolLineWidth/regularCanvas.magnification;;
        ctx.stroke(this.path);  

        if (this.insideTool || this.selected) {
            ctx.save();
            ctx.fillStyle = myToolHoverColor;
            ctx.globalAlpha = 0.25;
            ctx.fill(this.path);
            ctx.restore();
        }
        ctx.beginPath();
        
        
        // handle
        // use red for the handle to show that this
        // is not part of the tool itself
        ctx.lineWidth = myHandleLineWidth/regularCanvas.magnification;

        if (this.insideHandle || this.selected) {

            ctx.save();
            ctx.beginPath();
            ctx.arc(this.handleCenterX,this.handleCenterY,this.handleRadius,0,2*Math.PI); 
            if (this.selected) ctx.setLineDash([2,4]); 
            ctx.stroke();
            ctx.fillStyle = myHandleColor;
            ctx.globalAlpha = 0.25;             
            ctx.fill(); 
            ctx.restore();   
        }
        else {

            ctx.strokeStyle = myHandleColor;
            ctx.beginPath();
            ctx.arc(this.handleCenterX,this.handleCenterY,this.handleRadius,0,2*Math.PI);                
            ctx.stroke(); 
        }

        ctx.restore();
    }   
    

    // plot function when we are in editing mode
    editPlot(ctx) {

        // draw the tool so that the actual tool center, measured wrt
        // max and min values is in the center of the canvas
        // computeBoundingBox(this);
        var centerX = editCanvas.width/2 - (this.maxX + this.minX)/2;
        var centerY = editCanvas.height/2 - (this.maxY + this.minY)/2;

        // tool image if we have it; the other parts should be drawn on top
        if (this.img.width>5) {

            ctx.save(); 
            // offset of the paper  
            //ctx.translate(editCanvas.offsetX, editCanvas.offsetY);

            ctx.translate(centerX*editCanvas.scale, centerY*editCanvas.scale);
            ctx.rotate(this.angle * 2 * Math.PI / 360.0 * this.horizontalFlip * this.verticalFlip);
            ctx.translate(-this.avgX*editCanvas.scale*this.verticalFlip, -this.avgY*editCanvas.scale*this.horizontalFlip);                
            ctx.scale(this.verticalFlip*editCanvas.magnification*pxpermm,this.horizontalFlip*editCanvas.magnification*pxpermm);  
                
            // clip the image to the convex hull
            var newString = "M ";
            for (var i=0; i<this.convexhull.length; i++) {
                newString+= this.convexhull[i][0].toString() + " " + this.convexhull[i][1].toString() + " ";
            }
            path = new Path2D(newString);
            ctx.clip(path); 
                
            ctx.globalAlpha = this.opacity;
            ctx.drawImage(this.img,-210/this.img.width*this.imgOffset[0],-297/this.img.height*this.imgOffset[1],210,297);
            ctx.restore();
        }


        // tool itself
        ctx.save();       
        ctx.translate(centerX*editCanvas.scale, centerY*editCanvas.scale);
        ctx.rotate(this.angle * 2 * Math.PI / 360.0 * this.horizontalFlip * this.verticalFlip);
        ctx.translate(-this.avgX*editCanvas.scale*this.verticalFlip, -this.avgY*editCanvas.scale*this.horizontalFlip);
        ctx.setLineDash([1,0]); // solid line
        ctx.strokeStyle = myToolColor;
        ctx.lineWidth = myToolLineWidth/editCanvas.magnification;
        ctx.scale(this.verticalFlip*editCanvas.magnification*pxpermm,this.horizontalFlip*editCanvas.magnification*pxpermm);
        ctx.beginPath(); 
        ctx.stroke(this.path);  
        
        // points definining the tool
        ctx.beginPath();
        ctx.lineWidth = myPointLineWidth/editCanvas.magnification;;
        for (var i=0; i<this.editeddata.length; i++) {

            var path = new Path2D();
            path.arc(this.editeddata[i][0], this.editeddata[i][1], 3/editCanvas.magnification, 0, 2 * Math.PI);
            if (i == this.selectedPoint)
                ctx.strokeStyle = myPointSelectedColor;
            else
                ctx.strokeStyle = myPointColor;

            ctx.stroke(path); 
        }
                    
        ctx.stroke();
        ctx.restore();
    }    

}
 
  
// main event loop
function mainLoop () {

    // get the ids for all the elements  
    var inputFileButton = document.getElementById('inputFileButton');   
    var pasteSelectedTools = document.getElementById('pasteSelectedTools');
    var copySelectedTools = document.getElementById('copySelectedTools');
    var deleteSelectedTools = document.getElementById('deleteSelectedTools');
    var exportToDXFButton = document.getElementById('exportToDXFButton');
    var flipHorizontalButton = document.getElementById('flipHorizontalButton');
    var flipVerticalButton = document.getElementById('flipVerticalButton');
    var spaceVerticalButton = document.getElementById('spaceVerticalButton');
    var spaceHorizontalButton = document.getElementById('spaceHorizontalButton');
    var undoButton = document.getElementById('undoButton');
    var redoButton = document.getElementById('redoButton');
    var alignHorizontalTopButton = document.getElementById('alignHorizontalTopButton');
    var alignHorizontalCenterButton = document.getElementById('alignHorizontalCenterButton');
    var alignHorizontalBottomButton = document.getElementById('alignHorizontalBottomButton');
    var alignVerticalLeftButton = document.getElementById('alignVerticalLeftButton');
    var alignVerticalCenterButton = document.getElementById('alignVerticalCenterButton');
    var alignVerticalRightButton = document.getElementById('alignVerticalRightButton');
    var alignHandleHorizontalButton = document.getElementById('alignHandleHorizontalButton');
    var alignHandleVerticalButton = document.getElementById('alignHandleVerticalButton');
    var myHandleRadius = document.getElementById('myHandleRadius');
    var addRectButton = document.getElementById('addRectButton');    
    var addEllipseButton = document.getElementById('addEllipseButton');
    var myRadiusX = document.getElementById('myRadiusX');
    var myRadiusY = document.getElementById('myRadiusY');
    var rotateLeftButton = document.getElementById('rotateLeftButton');
    var rotateRightButton = document.getElementById('rotateRightButton');
    var saveCanvas = document.getElementById('saveCanvas');
    var anchorPointButton = document.getElementById('anchorPointButton');
       
    // hide the toolEdit buttons initially
    document.getElementById('grid-item-toolEdit-buttons').style.display = "none";

    // create the first regular canvas
    regularCanvas = new myRegularCanvas(document.getElementById('myCanvasWidth').value, document.getElementById('myCanvasHeight').value, document.getElementById('selectUnit').value, document.getElementById('selectCustomMagnification').value);
    // put it onto the stack
    regularCanvasStack.push(regularCanvas);

    // also initialze the editCanvas
    editCanvas = new myEditCanvas(document.getElementById('myCanvasWidth').value, document.getElementById('myCanvasHeight').value, document.getElementById('selectUnit').value, document.getElementById('selectCustomMagnification').value);

    
    canvas = document.getElementById('canvas');  
    ctx = canvas.getContext('2d');  
    // add event listener to rescale canvas every time
    // we change the window
    window.addEventListener('resize', resizeCanvas, false);
    resizeCanvas();

    // center the paper properly
    regularCanvas.offsetX = Math.max(0, (canvas.width-regularCanvas.width*regularCanvas.scale)/2);
    regularCanvas.offsetY = Math.min(50,Math.max(0, (canvas.height-regularCanvas.height*regularCanvas.scale)/2));

    handleRadius=15;
    
    // activate all event listeners
    //inputFileButton.addEventListener('change', readNewFile, false);
    inputFileButton.addEventListener('change', processNewFile, false);
    inputCanvasButton.addEventListener('change', readOldCanvas, false);
    canvas.addEventListener('mousedown', myMouseDown, false);
    canvas.addEventListener('mouseup', myMouseUp, false);
    canvas.addEventListener('mousemove', myMouseMove, false);
    canvas.addEventListener('click', myMouseClick, false);
    window.addEventListener('keydown', myKeyDownFunction, false);       
    canvas.addEventListener('dblclick', myDoubleClick, false);
    pasteSelectedTools.addEventListener('click', pasteSelectedToolsFunction, false); 
    copySelectedTools.addEventListener('click', copySelectedToolsFunction, false); 
    deleteSelectedTools.addEventListener('click', deleteSelectedToolsFunction, false); 
    exportToDXFButton.addEventListener('click', exportToDXFButtonFunction, false); 
    flipHorizontalButton.addEventListener('click', flipHorizontalButtonFunction, false); 
    flipVerticalButton.addEventListener('click', flipVerticalButtonFunction, false); 
    spaceVerticalButton.addEventListener('click', spaceVerticalButtonFunction, false); 
    spaceHorizontalButton.addEventListener('click', spaceHorizontalButtonFunction, false); 
    undoButton.addEventListener('click', undoButtonFunction, false); 
    redoButton.addEventListener('click', redoButtonFunction, false); 
    alignHorizontalTopButton.addEventListener('click', function(){alignHorizontalButtonFunction('top')}, false);
    alignHorizontalCenterButton.addEventListener('click', function(){alignHorizontalButtonFunction('center')}, false);
    alignHorizontalBottomButton.addEventListener('click', function(){alignHorizontalButtonFunction('bottom')}, false);
    alignVerticalLeftButton.addEventListener('click', function(){alignVerticalButtonFunction('left')}, false);
    alignVerticalCenterButton.addEventListener('click', function(){alignVerticalButtonFunction('center')}, false);
    alignVerticalRightButton.addEventListener('click', function(){alignVerticalButtonFunction('right')}, false);
    alignHandleHorizontalButton.addEventListener('click', alignHandleHorizontalButtonFunction, false); 
    alignHandleVerticalButton.addEventListener('click', alignHandleVerticalButtonFunction, false); 
    myHandleRadius.addEventListener('change', myHandleRadiusFunction, false); 
    addRectButton.addEventListener('click', addRectButtonFunction, false);    
    addEllipseButton.addEventListener('click', addEllipseButtonFunction, false);
    myRadiusX.addEventListener('change', changeEllipseRect, false); 
    myRadiusY.addEventListener('change', changeEllipseRect, false); 
    rotateLeftButton.addEventListener('click', rotateLeftButtonFunction, false);
    rotateRightButton.addEventListener('click', rotateRightButtonFunction, false);
    saveCanvas.addEventListener('click', saveCanvasFunction, false);
    anchorPointButton.addEventListener('click', anchorPointButtonFunction, false);

    // redraw all tools
    regularPlot();
    
}


// when a double click happens 
var myDoubleClick = function() {

    var lastTool = -1;

    // check if we are inside at least one tool
    regularCanvas.allTools.forEach((tool, index) => {    
        if (tool.insideTool == true){
            lastTool = index;
            editCanvas.toolToEdit = tool;
        }
    });

    // if we are inside at least one tool go into edit mode
    if (lastTool >= 0) {

        // disply name of file
        document.getElementById('showFileName').value = editCanvas.toolToEdit.filename;

        // set the slider to the appropriate value
        document.getElementById('mySmoothingParam').value = editCanvas.toolToEdit.slider; 

        // remove the edit buttons on the left from the viewing window
        // add the toolEdit buttons on the left
        document.getElementById('grid-item-edit-buttons').style.display = "none";
        document.getElementById('grid-item-top').style.visibility = "hidden";
        document.getElementById('grid-item-empty-23').style.display = "none";        
        document.getElementById('grid-item-toolEdit-buttons').style.display = "block";

        // disable regular listeners
        inputFileButton.removeEventListener('change', readNewFile, false);
        inputCanvasButton.removeEventListener('change', readOldCanvas, false);
        canvas.removeEventListener('mousedown', myMouseDown, false);
        canvas.removeEventListener('mouseup', myMouseUp, false);
        canvas.removeEventListener('mousemove', myMouseMove, false);
        canvas.removeEventListener('click', myMouseClick, false);
        window.removeEventListener('keydown', myKeyDownFunction, false);       
        canvas.removeEventListener('dblclick', myDoubleClick, false);
        pasteSelectedTools.removeEventListener('click', pasteSelectedToolsFunction, false); 
        copySelectedTools.removeEventListener('click', copySelectedToolsFunction, false); 
        deleteSelectedTools.removeEventListener('click', deleteSelectedToolsFunction, false); 
        exportToDXFButton.removeEventListener('click', exportToDXFButtonFunction, false); 
        flipHorizontalButton.removeEventListener('click', flipHorizontalButtonFunction, false); 
        flipVerticalButton.removeEventListener('click', flipVerticalButtonFunction, false); 
        spaceVerticalButton.removeEventListener('click', spaceVerticalButtonFunction, false); 
        spaceHorizontalButton.removeEventListener('click', spaceHorizontalButtonFunction, false); 
        undoButton.removeEventListener('click', undoButtonFunction, false); 
        redoButton.removeEventListener('click', redoButtonFunction, false); 
        alignHorizontalTopButton.removeEventListener('click', function(){alignHorizontalButtonFunction('top')}, false);
        alignHorizontalCenterButton.removeEventListener('click', function(){alignHorizontalButtonFunction('center')}, false);
        alignHorizontalBottomButton.removeEventListener('click', function(){alignHorizontalButtonFunction('bottom')}, false);
        alignVerticalLeftButton.removeEventListener('click', function(){alignVerticalButtonFunction('left')}, false);
        alignVerticalCenterButton.removeEventListener('click', function(){alignVerticalButtonFunction('center')}, false);
        alignVerticalRightButton.removeEventListener('click', function(){alignVerticalButtonFunction('right')}, false);
        alignHandleHorizontalButton.removeEventListener('click', alignHandleHorizontalButtonFunction, false); 
        alignHandleVerticalButton.removeEventListener('click', alignHandleVerticalButtonFunction, false); 
        myHandleRadius.removeEventListener('change', myHandleRadiusFunction, false); 
        addRectButton.removeEventListener('click', addRectButtonFunction, false);        
        addEllipseButton.removeEventListener('click', addEllipseButtonFunction, false);
        myRadiusX.removeEventListener('change', changeEllipseRect, false); 
        myRadiusY.removeEventListener('change', changeEllipseRect, false); 
        rotateLeftButton.removeEventListener('click', rotateLeftButtonFunction, false);
        rotateRightButton.removeEventListener('click', rotateRightButtonFunction, false);
        saveCanvas.removeEventListener('click', saveCanvasFunction, false);

        // compute the current bounding box
        computeBoundingBox(editCanvas.toolToEdit);

        // set the canvas 50% larger than the tool bounding box
        editCanvas.unitsinmm = regularCanvas.unitsinmm;
        editCanvas.width = (editCanvas.toolToEdit.maxX-editCanvas.toolToEdit.minX)* 1.5; 
        editCanvas.height = (editCanvas.toolToEdit.maxY-editCanvas.toolToEdit.minY)* 1.5;

        // put these values into the visible elemens
        document.getElementById('myCanvasWidth').value = editCanvas.width;
        document.getElementById('myCanvasHeight').value = editCanvas.height;

        // the magnification is picked as large as possible given the window space we have
        editCanvas.magnification = Math.min(window.innerWidth * 0.6/(editCanvas.width * pxpermm), window.innerHeight * 0.6/(editCanvas.height * pxpermm));
        var newMagnification = myMagnifications.reduce((prev, curr) => Math.abs(curr - editCanvas.magnification) < Math.abs(prev - editCanvas.magnification) ? curr : prev);
        editCanvas.magnification = newMagnification;
        document.getElementById('selectCustomMagnification').value = editCanvas.magnification.toFixed(2).toString();
     
        // now recompute the proper scale from these parameters
        editCanvas.scale = editCanvas.magnification * pxpermm;

        // reset the canvas itself
        /* ctx.canvas.width=Math.round(editCanvas.width * editCanvas.scale); 
        canvas.style.width=(Math.round(editCanvas.width * editCanvas.scale)).toString().concat("px");
        ctx.canvas.height=Math.round(editCanvas.height * editCanvas.scale); 
        canvas.style.height=(Math.round(editCanvas.height * editCanvas.scale)).toString().concat("px"); */

        // listen to keydown which reacts only to Escapekey
        // this will get us out of the edit mode
        window.addEventListener('keydown', myKeyDownAfterDoubleClick, false);  

        var mySmoothingParam = document.getElementById('mySmoothingParam');
        mySmoothingParam.addEventListener('change', smoothPathOnSliderFunction, false);

        myOpacity.addEventListener('change', setOpacityFunction, false);
        canvas.addEventListener('dblclick', myDoubleClickAfterDoubleClick, false);
        canvas.addEventListener('mousemove', myMouseMoveAfterDoubleClick, false);
        canvas.addEventListener('mousedown', myMouseDownAfterDoubleClick, false);

        var inputToolImage = document.getElementById('inputToolImage');
        inputToolImage.addEventListener('change', inputToolImageFunction, false);

        undoEditButton.addEventListener('click', undoEditButtonFunction, false); 
        redoEditButton.addEventListener('click', redoEditButtonFunction, false); 

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // set the parameters
        document.getElementById('mySmoothingParam').value = regularCanvas.allTools[lastTool].slider;
        document.getElementById('myOpacity').value = regularCanvas.allTools[lastTool].opacity;
        document.getElementById('backgroundPaperSize').value = regularCanvas.allTools[lastTool].backgroundPaperSize;

        // plot the selected tool
        editPlot(regularCanvas.allTools[lastTool]);           
    }


}


// react to the various keyDown events
var myKeyDownFunction = function() {

    // NOTE: for the four move events we need to add
    // the undo/redo actions

    // capture what key was pressed
    const key = event.key; 

    // move to the left
    if (key == "ArrowLeft") {

        for (var index = regularCanvas.allTools.length-1; index>= 0; index--)
        {
            if (regularCanvas.allTools[index].selected == true) {

                // push onto undo stack
                pushOntoUndoStack(index, "m", false, false);

                if (event.shiftKey == false) {
                    regularCanvas.allTools[index].offsetX -= 1; 
                }
                else
                    regularCanvas.allTools[index].offsetX -= 10;
            }
        }

        // redraw tools
        regularPlot();
    };

    // move to the right
    if (key == "ArrowRight") {

        for (var index = regularCanvas.allTools.length-1; index>= 0; index--)
        {
            if (regularCanvas.allTools[index].selected == true) {

                // push onto undo stack
                pushOntoUndoStack(index, "m", false, false);

                if (event.shiftKey == false) {
                    regularCanvas.allTools[index].offsetX += 1; 
                }
                else
                    regularCanvas.allTools[index].offsetX += 10;
            }
        }

        // redraw tools
        regularPlot();
    };

    // move down
    if (key == "ArrowDown") {

        for (var index = regularCanvas.allTools.length-1; index>= 0; index--)
        {
            if (regularCanvas.allTools[index].selected == true) {

                // push onto undo stack
                pushOntoUndoStack(index, "m", false, false);

                if (event.shiftKey == false) {
                    regularCanvas.allTools[index].offsetY += 1; 
                }
                else
                    regularCanvas.allTools[index].offsetY += 10;
            }
        }

        // redraw tools
        regularPlot();
    };

    // move up
    if (key == "ArrowUp") {

        for (var index = regularCanvas.allTools.length-1; index>= 0; index--)
        {
            if (regularCanvas.allTools[index].selected == true) {

                // push onto undo stack
                pushOntoUndoStack(index, "m", false, false);

                if (event.shiftKey == false) {
                    regularCanvas.allTools[index].offsetY -= 1; 
                }
                else
                    regularCanvas.allTools[index].offsetY -= 10;
            }
        }

        // redraw tools
        regularPlot();
    };

    // add an ellipse
    if (key == "o") {

    addEllipseButtonFunction();
    };

    // add a rectangle or "box"
    if (key == "b") {

        addRectButtonFunction();
    };

    // add rectangle
    if (key == "s") {

        saveCanvasFunction();
    };

    // undo action
    if (key == "U") {

        undoButtonFunction();
    };

    // redo action
    if (key == "R") {

            redoButtonFunction();
        };

    // turn anti-clockwise == turn left
    if (key == "l") {

        rotateLeftButtonFunction();
    };

    // turn clockwise == turn right
    if (key == "r") {

        rotateRightButtonFunction();
    };

    // align horizontally
    if (key == "h") {

        alignHorizontalButtonFunction('center');
    };


    // align vertically
    if (key == "v") {

        alignVerticalButtonFunction("center");
    };

    // space horizontally
    if (key == "H") {

        spaceHorizontalButtonFunction();
    };
    
    // space vertically
    if (key == "V") {
    
        spaceVerticalButtonFunction();
    };

    // flip horizontally
    if (key == "f") {

            flipHorizontalButtonFunction();
        };

   // flip vertically
   if (key == "F") {

        flipVerticalButtonFunction();
    };

    // delete 
    if (key == "d") {

        deleteSelectedToolsFunction();
    };

    // ctrl+c for copy
    if (event.ctrlKey == true && ( key == 'c' || key == "C")) { 

        copySelectedToolsFunction();
    };

    // ctrl+v for paste
    if (event.ctrlKey && (key == "v" || key == "V")) {        
  
        pasteSelectedToolsFunction();
    }

}; 

// on mouse down: if we are inside a tool then
// move this tool until the mouse is released; if we are 
// inside a tool handle then move this tool handle to the point on the
// tool path that is closest to the mouse position
var myMouseDown = function() {

    var outsideAllTools = true; // we are outside all tools
    var outsideAllHandles = true; // we are outside all tool handles
    var currentToolIndex; // the index of the tool we hovering over
    var initialOffsetX = event.offsetX; // x mouse position when first clicked
    var initialOffsetY= event.offsetY; // y mouse position when first clicked
    var initialToolOffsetX = []; // remember where the tool was wrt x before we started moving it
    var initialToolOffsetY = []; // remember where the tool was wrt y before we started moving it

    // no longer invoke the usual myMouseMove action
    canvas.removeEventListener('mousemove', myMouseMove, false);

    // check if mouse pointer is inside a tool outline
    // if so, remember tool index and set outsideAllTools to false
    regularCanvas.allTools.forEach((tool, index) => {    

        // remember were the tool currently is
        initialToolOffsetX[index] = regularCanvas.allTools[index].offsetX*regularCanvas.scale;
        initialToolOffsetY[index] = regularCanvas.allTools[index].offsetY*regularCanvas.scale;        

        if (tool.insideTool == true){

            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);

            currentToolIndex = index;
            outsideAllTools = false; 
        }

    }); 

    // if the mouse is outside all tools
    // check if it is inside a handle
    if (outsideAllTools == true){
        regularCanvas.allTools.forEach((tool, index) => {  

             
            if (tool.insideHandle == true){

                // push onto undo stack
                pushOntoUndoStack(index, "m", false, false);

                currentToolIndex = index;
                outsideAllHandles = false; 
            }
        });  
    }

    // if we are inside a tool then move this tool
    // and all selected tools
    var myMouseMoveAfterMouseDown = function() {

        // remove the action normally associated to mouse clicks
        canvas.removeEventListener('click', myMouseClick, false);
        canvas.addEventListener('click', myMouseClickAfterMouseDown, false);

        
        // if we are inside a tool
        if (outsideAllTools == false){
            // move all selected tools and the current tool
            for (var index = regularCanvas.allTools.length-1; index>= 0; index--)
            {
                if (regularCanvas.allTools[index].selected == true || index == currentToolIndex) {
                    regularCanvas.allTools[index].offsetX = (initialToolOffsetX[index]+event.offsetX-initialOffsetX)/regularCanvas.scale;
                    regularCanvas.allTools[index].offsetY = (initialToolOffsetY[index]+event.offsetY-initialOffsetY)/regularCanvas.scale;                
                }
            };

            regularPlot();
        }
        else if (outsideAllHandles == false) {
            // move the handle to the point along the
            // tool path closest to the mouse; this is 
            // essentially the same operation we do when
            // we read the file

            // take offset, rotation, and flips into account
            // instead of transforming the physical space where the data resides into
            // the canvas space where the mouse operates, we transform
            // the canvas space, i.e, the mouse coordinates, into physical space

            var myAngle=regularCanvas.allTools[currentToolIndex].angle * 2 * Math.PI / 360.0 * regularCanvas.allTools[currentToolIndex].horizontalFlip * regularCanvas.allTools[currentToolIndex].verticalFlip;

            var mouseX = (event.offsetX-regularCanvas.offsetX)/regularCanvas.scale-regularCanvas.allTools[currentToolIndex].avgX-regularCanvas.allTools[currentToolIndex].offsetX;
            var mouseY = (event.offsetY-regularCanvas.offsetY)/regularCanvas.scale-regularCanvas.allTools[currentToolIndex].avgY-regularCanvas.allTools[currentToolIndex].offsetY;

            var newMouseX = (mouseX * Math.cos(-myAngle) - mouseY * Math.sin(-myAngle))*regularCanvas.allTools[currentToolIndex].verticalFlip;
            var newMouseY = (mouseX * Math.sin(-myAngle) + mouseY * Math.cos(-myAngle))*regularCanvas.allTools[currentToolIndex].horizontalFlip;

            newMouseX += regularCanvas.allTools[currentToolIndex].avgX;
            newMouseY += regularCanvas.allTools[currentToolIndex].avgY;
        
            // get the current distance
            var dist=Math.pow(newMouseX - regularCanvas.allTools[currentToolIndex].handleCenterX, 2) + Math.pow(newMouseY - regularCanvas.allTools[currentToolIndex].handleCenterY, 2);

            // go over all points of the path and see if any of these points is closer than the current point
            // if so, set the handle center to be this new point
            /* var newdist = 0;
            for (var i = 0; i < regularCanvas.allTools[currentToolIndex].editeddata.length; i++) {
                // go over all points                    
                if( (newdist=Math.pow(newMouseX - regularCanvas.allTools[currentToolIndex].editeddata[i][0], 2)+Math.pow(newMouseY - regularCanvas.allTools[currentToolIndex].editeddata[i][1], 2)) <= dist  ){
                    regularCanvas.allTools[currentToolIndex].handleCenterX = regularCanvas.allTools[currentToolIndex].editeddata[i][0];
                    regularCanvas.allTools[currentToolIndex].handleCenterY = regularCanvas.allTools[currentToolIndex].editeddata[i][1];
                    dist = newdist;
                }
            } */
            regularCanvas.allTools[currentToolIndex].handleCenterX = newMouseX;
            regularCanvas.allTools[currentToolIndex].handleCenterY = newMouseY;
            findClosestHandleCenter(regularCanvas.allTools[currentToolIndex]);
            
            // redraw tools
            regularPlot();
        } 
        // either move the canvas or draw selection box
        else {

            // redraw tools
            regularPlot();

            // if the shift key is down draw a selection box
            // else move the canvas

            if(event.shiftKey == false) {
            // draw a selection box
            ctx.beginPath();
            ctx.strokeStyle = "blue";          
            ctx.rect(initialOffsetX, initialOffsetY, event.offsetX - initialOffsetX, event.offsetY - initialOffsetY);
            ctx.stroke(); 
            }
            else {

            // change cursor style
            document.body.style.cursor = "all-scroll";    

            regularCanvas.offsetX += event.offsetX - initialOffsetX;
            regularCanvas.offsetY += event.offsetY - initialOffsetY;
            initialOffsetX = event.offsetX;
            initialOffsetY = event.offsetY;   
            }    
        }
    }

    // restore normal operation
    var myMouseUpAfterMouseMove = function() {    

        // if we are outside all tools then we have been
        // drawing a selection box; check what tools are inside
        if (outsideAllTools == true){
            var path = new Path2D();
        
            path.rect((initialOffsetX-regularCanvas.offsetX)/regularCanvas.scale,(initialOffsetY-regularCanvas.offsetY)/regularCanvas.scale,(event.offsetX-initialOffsetX)/regularCanvas.scale,(event.offsetY-initialOffsetY)/regularCanvas.scale);
                                
            regularCanvas.allTools.forEach((tool, index) => {                   
                if (ctx.isPointInPath(path, (tool.offsetX + tool.avgX), (tool.offsetY + tool.avgY))) {            
                    tool.selected = true;                       
                }           
            });         
        };

        // redraw tools
        regularPlot();

        // no longer invoke the special actions for mousemove and mouseup but 
        // re-instate the usual actions
        canvas.removeEventListener('mousemove', myMouseMoveAfterMouseDown, false);
        canvas.removeEventListener('mouseup', myMouseUpAfterMouseMove, false); 
        canvas.addEventListener('mousemove', myMouseMove, false);
        canvas.addEventListener('mouseup', myMouseUp, false);
    }

// once the mouse is down invoke special actions for mousemove, mouseup, and mouseclick
canvas.addEventListener('mousemove', myMouseMoveAfterMouseDown, false);
canvas.addEventListener('mouseup', myMouseUpAfterMouseMove, false);

};


// on mouse up
var myMouseUp = function() {
    
    var currentToolIndex;
    // reset the cursor to normal
    document.body.style.cursor = "auto";

    // if we did not do anything since the mouse was pressed down
    // originally then pop the undoStack to avoid useless steps
    regularCanvas.allTools.forEach((tool, index) => {

        if (tool.selected == true)
            currentToolIndex = index;
    });

    if (sameAsUndoStack(currentToolIndex) == true) 
    popUndoStack();
}; 

// if the mouse is moved inside a tool or inside a tool
// handle then the corresponding flag
var myMouseMove = function() {
   
    // display the x,y coordinates of the mouse
    document.getElementById('mouseX').value = parseFloat((event.offsetX-regularCanvas.offsetX)/(regularCanvas.unitsinmm*regularCanvas.magnification*pxpermm)).toFixed(2);
    document.getElementById('mouseY').value = parseFloat((event.offsetY-regularCanvas.offsetY)/(regularCanvas.unitsinmm*regularCanvas.magnification*pxpermm)).toFixed(2);


    // check whether point is inside a tool or inside a tool handle
    // this flag is used to display the corresponding part in a different color
    regularCanvas.allTools.forEach((tool, index) => {
        ctx.save();
        ctx.translate((tool.offsetX+tool.avgX)*regularCanvas.scale, (tool.offsetY+tool.avgY)*regularCanvas.scale);
        ctx.rotate(tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip);
        ctx.translate(-tool.avgX*regularCanvas.scale*tool.verticalFlip, -tool.avgY*regularCanvas.scale*tool.horizontalFlip);
        ctx.scale(tool.verticalFlip*regularCanvas.magnification*pxpermm,tool.horizontalFlip*regularCanvas.magnification*pxpermm);

        // check if we are inside this tool
        if (ctx.isPointInPath(tool.path, event.offsetX-regularCanvas.offsetX, event.offsetY-regularCanvas.offsetY)) {
            tool.insideTool = true;
        }
        else{
            tool.insideTool = false;
        }
        
        // check if we are inside this tool handle; here we still have an issue!!!!!
        // perhaps the problem is that we draw the path inside the environment where
        // we modified the scaling etc???
        var handle = new Path2D();
        handle.arc(tool.handleCenterX,tool.handleCenterY,tool.handleRadius,0,2*Math.PI); 
        if (ctx.isPointInPath(handle, event.offsetX-regularCanvas.offsetX, event.offsetY-regularCanvas.offsetY)) {
            tool.insideHandle = true;
        }
        else{
            tool.insideHandle = false;
        }
        ctx.restore();        
    });

    // redraw all tools
    regularPlot();
};

// when we click the mouse do the following: if the mouse is inside a tool 
// select this tool if we also have the shift button clicked then keep all
// other tools that were already selected; otherwise clear them from
// the list of selected tools
var myMouseClick = function() {

    // go over all tools
    regularCanvas.allTools.forEach((tool, index) => {
        // check if mouse is inside a tool
        if (tool.insideTool == true) {            
            // if so then toggle the selected status of this tool
            if (tool.selected == false) {
                tool.selected = true;
                if (tool.type == "ellipse"){
                    document.getElementById('myRadiusX').value=tool.editeddata[0][0];
                    document.getElementById('myRadiusY').value=tool.editeddata[25][1];                    
                }
                if (tool.type == "rectangle"){
                    document.getElementById('myRadiusX').value=2*tool.editeddata[2][0];
                    document.getElementById('myRadiusY').value=2*tool.editeddata[3][1];
                }
                document.getElementById('myHandleRadius').value=tool.handleRadius;                    
            }
            else {
                tool.selected = false;
            }
        }
        else {
            // if the mouse is not inside this tool then deselect this
            // tool unless the shift key is pressed
            if(event.shiftKey == false) {
                tool.selected=false;
            }
            
        }
    });

    // redraw all tools
    regularPlot();
};

// the only purpose of this function is to clear the
// one spurious mouse click event that we get when we
// draw a selection box
var myMouseClickAfterMouseDown = function() {

    canvas.removeEventListener('click', myMouseClickAfterMouseDown, false);
    canvas.addEventListener('click', myMouseClick, false);
    
};

// start main loop once everything has been loaded
window.onload = mainLoop();
