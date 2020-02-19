// this is used for things that should
// not fire too often
function debounce(func, wait, immediate) {
    var timeout;


    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };

        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}; 

// when the slider is moved; read the new parameter
// invoce the smoothing function on the original raw data
// and replace tool.editedpath with this new smoothed path
var smoothPathOnSliderFunction = function() {

    // recall what tool we are editing
    var tool = editCanvas.toolToEdit;

    // undo/redo
    // push data onto undo stack
    // prune undo if too long
    // reset redo stack
    tool.undoStack.push(makeToolCopy(tool, true));
    if (tool.undoStack.length > maxUndoStackSize){
        tool.undoStack.splice(0, 1);
    }
    tool.redoStack = [];

    // read the new smoothing paramter from the slider
    var smoothParam = parseFloat(document.getElementById('mySmoothingParam').value);    
    tool.slider = smoothParam;

    // in order to be able to smooth the original data
    // we first have to bring it into a proper format
    var allPointObjects = pointsConversion(tool.rawdata, 'toObject');

    //  now apply the smoothing algorithm
    allPointObjectsSmooth = simplify(allPointObjects,smoothParam,true);

    // put the result into editeddata
    tool.editeddata = pointsConversion(allPointObjectsSmooth, 'toArray');

    // create a new path out of this smoothed data
    var newString = "M ";
    for (var i=0; i<tool.editeddata.length; i++) {
        newString+= tool.editeddata[i][0].toString() + " " + tool.editeddata[i][1].toString() + " ";
    }

    // store the result in tool.path
    tool.path = new Path2D(newString);

    // plot the tool
    editPlot(tool);
};

// when the opacity slider is moved; read the new parameter,
// set the new value in the tool and redraw
var setOpacityFunction = function() {

    // recall what tool we are editing
    var tool = editCanvas.toolToEdit;

    // undo/redo
    // push data onto undo stack
    // prune undo if too long
    // reset redo stack
    tool.undoStack.push(makeToolCopy(tool, true));
    if (tool.undoStack.length > maxUndoStackSize){
        tool.undoStack.splice(0, 1);
    }
    tool.redoStack = [];

    // read the new smoothing paramter from the slider
    var opacityParam = parseFloat(document.getElementById('myOpacity').value);    
    tool.opacity = opacityParam;

    // plot the tool
    editPlot(tool);
};

// compute the distance of a point p to a line segment 
// that is given by its two endpoints u and v
var distToLineSegment = function(pX, pY, uX, uY, vX, vY) {

    var closestPoint = [];

    // w is the projection of the point p onto the line given by u and v
    var wX = ((vX-uX)*(pX-uX) + (vY-uY)*(pY-uY))*(vX-uX)/(Math.pow(vX-uX, 2)+Math.pow(vY-uY, 2)) + uX;
    var wY = ((vX-uX)*(pX-uX) + (vY-uY)*(pY-uY))*(vY-uY)/(Math.pow(vX-uX, 2)+Math.pow(vY-uY, 2)) + uY;

    // check if w lies "inside" the line segment u to v
    // by checking if the distance from w to u and 
    // the distance from w to v are both smaller than the 
    // distance from u to v
    if (Math.max(Math.pow(uX-wX, 2)+Math.pow(uY-wY, 2), Math.pow(vX-wX, 2)+Math.pow(vY-wY, 2)) <= Math.pow(uX-vX, 2)+Math.pow(uY-vY, 2)) {

        // if so, then the distance from p to the line segment
        // is the distance from p to w
        closestPoint = [Math.pow(pX-wX, 2)+Math.pow(pY-wY, 2), wX, wY];
    }
    else {

        // if not then either u or v are the points closest to w
        if (Math.pow(pX-uX, 2)+Math.pow(pY-uY, 2)< Math.pow(pX-vX, 2)+Math.pow(pY-vY, 2)) {

            closestPoint = [Math.pow(pX-uX, 2)+Math.pow(pY-uY, 2), uX, uY];
        }
        else {

            closestPoint = [Math.pow(pX-vX, 2)+Math.pow(pY-vY, 2), vX, vY];
        }
    }

    // console.log(closestPoint);
    return closestPoint;
}

// double click to delete a particular point
var myDoubleClickAfterDoubleClick = function(){
    
    var newPoint = true;
    // recall what tool we are editing
    var tool = editCanvas.toolToEdit;

    // draw the tool so that the tool center is in the center of the canvas
    // computeBoundingBox(tool);
    var centerX = editCanvas.width/2 - (tool.maxX + tool.minX)/2;
    var centerY = editCanvas.height/2 - (tool.maxY + tool.minY)/2;


    // go into the rotated and flipped space
    ctx.save();
    ctx.translate(centerX*editCanvas.scale, centerY*editCanvas.scale);
    ctx.rotate(tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip);
    ctx.translate(-tool.avgX*editCanvas.scale*tool.verticalFlip, -tool.avgY*editCanvas.scale*tool.horizontalFlip);
    ctx.scale(tool.verticalFlip*editCanvas.magnification*pxpermm,tool.horizontalFlip*editCanvas.magnification*pxpermm);        

    // go over all points defining the tool path
    for (var i=0; i<tool.editeddata.length-1; i++) {
        // define for the point a circle centered on this point
        // and with radius 3
        var path = new Path2D();
        path.arc(tool.editeddata[i][0], tool.editeddata[i][1], 3, 0, 2 * Math.PI);        
        
        // check if we are inside this point
        if (ctx.isPointInPath(path, event.offsetX-editCanvas.offsetX, event.offsetY-editCanvas.offsetY)) {

            // undo/redo
            // push data onto undo stack
            // prune undo if too long
            // reset redo stack
            tool.undoStack.push(makeToolCopy(tool, true));
            if (tool.undoStack.length > maxUndoStackSize){
                tool.undoStack.splice(0, 1);
            }
            tool.redoStack = [];

            // if so, then delete this point; check that this is not the
            // first point of the tool path; in this case just delete
            if (i>0) {

                tool.editeddata.splice(i,1);
            }
            else {
                // if it is the first point, more is needed
                // delete the first and last point and then 
                // add copy of the second point to the end of the path
                // all this is needed in order to have a closed tool path
                tool.editeddata.splice(tool.editeddata.length-1,1);
                tool.editeddata.splice(0,1);
                tool.editeddata.push(tool.editeddata[0]);
              
            }
            newPoint = false;
        }        
    }
    ctx.restore();
     
    // check if we want to add a new point or we deleted an existing point
    if (newPoint == false){

        // if we deleted an exisiting point, just create the new 
        // tool path from the editeddata
        var newString = "M ";
        for (var i=0; i<tool.editeddata.length; i++) {
            newString+= tool.editeddata[i][0].toString() + " " + tool.editeddata[i][1].toString() + " ";
        }

        // put this path into the tool
        tool.path = new Path2D(newString);        
    }
    else{ 
        // we want to add a new point; find the line segment that is closest to the mouse;
        // add the new point and connect it to the two endpoints of this closest segment 
        
        // translate the mouse coordinates into our unrotated and unflipped space
        var myangle=tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip;              
        var targetX=((event.offsetX-editCanvas.offsetX)/editCanvas.scale - centerX) * Math.cos(-myangle)*tool.verticalFlip - ((event.offsetY-editCanvas.offsetY)/editCanvas.scale  - centerY) * Math.sin(-myangle)*tool.verticalFlip;
        var targetY=((event.offsetX-editCanvas.offsetX)/editCanvas.scale - centerX) * Math.sin(-myangle)*tool.horizontalFlip + ((event.offsetY-editCanvas.offsetY)/editCanvas.scale  - centerY) * Math.cos(-myangle)*tool.horizontalFlip;
        
        // these are the coordinates
        targetX += tool.avgX;
        targetY += tool.avgY;

        // find the closest line segment
        var dist = [];
        var newdist = [];
        dist = distToLineSegment(targetX, targetY, tool.editeddata[0][0], tool.editeddata[0][1], tool.editeddata[1][0], tool.editeddata[1][1]);
       
        // the index of the "first" point of the currently best line segment
        var ind = 0;
        // go over all line segments
        for (var i = 1; i < tool.editeddata.length-1; i++) {
   
            newdist = distToLineSegment(targetX, targetY, tool.editeddata[i][0], tool.editeddata[i][1], tool.editeddata[i+1][0], tool.editeddata[i+1][1]);  

            if( newdist[0] <= dist[0]  ){                
                dist[0] = newdist[0]; 
                ind = i; 
            }
        }

        // insert the new point at the proper place
        tool.editeddata.splice(ind+1,0,[targetX,targetY]);

        // create a new path out of this
        var newString = "M ";
        for (var i=0; i<tool.editeddata.length; i++) {
            newString+= tool.editeddata[i][0].toString() + " " + tool.editeddata[i][1].toString() + " ";
        }
        // put this path into the tool
        tool.path = new Path2D(newString); 

    }
    
    // plot the tool
    editPlot(tool);
};


// show the actual tool image
var inputToolImageFunction = function(){
    
    var tool = editCanvas.toolToEdit;
    var inputToolImage = document.getElementById('inputToolImage');
    var file = inputToolImage.files;
    var reader = [];

    if (file[0].name.match('\.jpg')) {

        reader = new FileReader();

        reader.onload = function() {
            var img = new Image();

            // read the data
            img.src = reader.result;

            // store the image in the tool
            tool.img.src = img.src;
        }
        reader.readAsDataURL(file[0]);     
    }
console.log("read image");
    // plot the tool
    editPlot(tool);
    
};


// when moving the mouse, highlight the point we hover over
// var myMouseMoveAfterDoubleClick = debounce(function() {
var myMouseMoveAfterDoubleClick = function() {

    var tool = editCanvas.toolToEdit;
    tool.selectedPoint = -1;

    // computeBoundingBox(tool);
    var centerX = editCanvas.width/2 - (tool.maxX + tool.minX)/2;
    var centerY = editCanvas.height/2 - (tool.maxY + tool.minY)/2;

    // go into the rotated and flipped space
    ctx.save();
    ctx.translate(centerX*editCanvas.scale, centerY*editCanvas.scale);
    ctx.rotate(tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip);
    ctx.translate(-tool.avgX*editCanvas.scale*tool.verticalFlip, -tool.avgY*editCanvas.scale*tool.horizontalFlip);
    ctx.scale(tool.verticalFlip*editCanvas.magnification*pxpermm,tool.horizontalFlip*editCanvas.magnification*pxpermm);        

    // check if we are hovering over a point
    for (var i = 0; i < tool.editeddata.length; i++) {
        
        var path = new Path2D();
        path.arc(tool.editeddata[i][0], tool.editeddata[i][1], 3/editCanvas.magnification, 0, 2 * Math.PI);        
        
        // check if we are inside this point
        if (ctx.isPointInPath(path, event.offsetX-editCanvas.offsetX, event.offsetY-editCanvas.offsetY)) {
            tool.selectedPoint = i;
        }

    }
    ctx.restore();

    // replot the selected tool
    editPlot(tool);
};

// when dragging the mouse over a point move the point
var myMouseDownAfterDoubleClick = function() {

    var tool = editCanvas.toolToEdit;
    var initialOffsetX = event.offsetX; // x mouse position when first clicked
    var initialOffsetY= event.offsetY; // y mouse position when first clicked

    // undo/redo
    // push data onto undo stack
    // prune undo if too long
    // reset redo stack
    tool.undoStack.push(makeToolCopy(tool, true));
    if (tool.undoStack.length > maxUndoStackSize) {
        tool.undoStack.splice(0, 1);
    }
    tool.redoStack = [];

    // if we are moving and are inside a selected point, move the point
    var myMouseMoveAfterMouseDownAfterDoubleClick = function() {

        if (tool.selectedPoint>0) {

            var index = tool.selectedPoint;
        
            // the mouse movement in the mouse space
            var canvasChangeX = (event.offsetX-initialOffsetX);
            var canvasChangeY = (event.offsetY-initialOffsetY);

            var newCanvasChangeX=canvasChangeX/(tool.verticalFlip*editCanvas.magnification*pxpermm);
            var newCanvasChangeY=canvasChangeY/(tool.horizontalFlip*editCanvas.magnification*pxpermm);
        
            var myangle=tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip;
            var changeX=newCanvasChangeX  * Math.cos(-myangle)*tool.verticalFlip - newCanvasChangeY * Math.sin(-myangle)*tool.horizontalFlip;
            var changeY=newCanvasChangeX * Math.sin(-myangle)*tool.verticalFlip + newCanvasChangeY * Math.cos(-myangle)*tool.horizontalFlip;

            tool.editeddata[index][0] += changeX*tool.verticalFlip;
            tool.editeddata[index][1] += changeY*tool.horizontalFlip;;
            initialOffsetX = event.offsetX;
            initialOffsetY = event.offsetY;

            // make sure that the first and last point stay always the same
            tool.editeddata[0][0] = tool.editeddata[tool.editeddata.length-1][0];
            tool.editeddata[0][1] = tool.editeddata[tool.editeddata.length-1][1];
 
            // create a new path out of this
            var newString = "M ";
            for (var j=0; j<tool.editeddata.length; j++) {
                newString+= tool.editeddata[j][0].toString() + " " + tool.editeddata[j][1].toString() + " ";
            }

            // put this path into the tool
            tool.path = new Path2D(newString);

        }    

        editPlot(tool);

    }

    var myMouseUpAfterMouseDownAfterDoubleClick = function() {

        canvas.removeEventListener('mousemove', myMouseMoveAfterMouseDownAfterDoubleClick, false);
        canvas.removeEventListener('mouseup', myMouseUpAfterMouseDownAfterDoubleClick, false);

        canvas.addEventListener('mousemove', myMouseMoveAfterDoubleClick, false);
        canvas.addEventListener('dblclick', myDoubleClickAfterDoubleClick, false);

        editPlot(tool);
    }
    
    canvas.removeEventListener('mousemove', myMouseMoveAfterDoubleClick, false);
    canvas.removeEventListener('dblclick', myDoubleClickAfterDoubleClick, false);

    canvas.addEventListener('mousemove', myMouseMoveAfterMouseDownAfterDoubleClick, false);
    canvas.addEventListener('mouseup', myMouseUpAfterMouseDownAfterDoubleClick, false);

};


// when we are in path editing mode
var myKeyDownAfterDoubleClick = function() {
    const key = event.key; 

    if (key == "Escape") {

        // add the edit buttons on the left back to the viewing window
        // remove the toolEdit buttons
        document.getElementById('grid-item-toolEdit-buttons').style.display = "none";
        document.getElementById('grid-item-edit-buttons').style.display = "initial";
        document.getElementById('grid-item-top').style.visibility = "visible";
        document.getElementById('grid-item-empty-23').style.display = "initial";  

        document.getElementById('myCanvasWidth').value = regularCanvas.width;
        document.getElementById('myCanvasHeight').value = regularCanvas.height;
        document.getElementById('selectCustomMagnification').value = regularCanvas.magnification;

        /* ctx.canvas.width=Math.round(regularCanvas.width * regularCanvas.scale); 
        canvas.style.width=(Math.round(regularCanvas.width * regularCanvas.scale)).toString().concat("px");
        ctx.canvas.height=Math.round(regularCanvas.height * regularCanvas.scale); 
        canvas.style.height=(Math.round(regularCanvas.height * regularCanvas.scale)).toString().concat("px"); */

        // remove the event listeners invoked while editing the tool
        window.removeEventListener('keydown', myKeyDownAfterDoubleClick, false);                     
        mySmoothingParam.removeEventListener('change', function(){smoothPathOnSliderFunction(tool)}, false);
        myOpacity.removeEventListener('change', function(){setOpacityFunction(tool)}, false);
        canvas.removeEventListener('dblclick', myDoubleClickAfterDoubleClick, false);
        canvas.removeEventListener('mousemove', myMouseMoveAfterDoubleClick, false);
        canvas.removeEventListener('mousedown', myMouseDownAfterDoubleClick, false);
        inputToolImage.removeEventListener('change', inputToolImageFunction, false);
        undoEditButton.removeEventListener('click', undoEditButtonFunction, false); 
        redoEditButton.removeEventListener('click', redoEditButtonFunction, false); 

        // activate all event listeners
        // inputFileButton.addEventListener('change', function(){readNewFile(inputFileButton)}, false);
        inputFileButton.addEventListener('change', readNewFile, false);
        //inputCanvasButton.addEventListener('change', function(){readOldCanvas(inputCanvasButton)}, false);
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

        // redraw tools
        regularPlot();

    };
}