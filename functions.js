
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

// called when diameter of handle is changed
var myHandleDiameterFunction = function() {

    // read the new value from HTML
    var newHandleDiameter = document.getElementById('myHandleDiameter').value;
    handleDiameter=newHandleDiameter;

    regularCanvas.allTools.forEach((tool, index) => {

        if (tool.selected == true)
            tool.handleDiameter=newHandleDiameter;  

    });

    // redraw all tools
    regularPlot();
}

// add a tool in the shape of a rectangle
var addRectButtonFunction = function() {

    var width = document.getElementById('myDiameterX').value;
    var height = document.getElementById('myDiameterY').value;

    // place the rectangle uniformly in the canvas
    // so that the whole rectangle is inside the canvas
    var offsetX=Math.random()*(document.getElementById('myCanvasWidth').value-width)+width/2;
    var offsetY=Math.random()*(document.getElementById('myCanvasHeight').value-height)+height/2;

    // create a tool with a rectangular shape
    var tool = new Tool("rectangle");
    var path = new Path2D();
    path.rect(-width/2, -height/2, width, height);
    tool.path = path;


    // we also need to add the raw data
    tool.rawdata.push([-width/2, -height/2]);
    tool.rawdata.push([width/2, -height/2]);
    tool.rawdata.push([width/2, height/2]);
    tool.rawdata.push([-width/2, height/2]);
    tool.rawdata.push([-width/2, -height/2]);
   
    // as well as the edited data which is initially
    // equal to the raw data
    tool.editeddata.push([-width/2, -height/2]);
    tool.editeddata.push([width/2, -height/2]);
    tool.editeddata.push([width/2, height/2]);
    tool.editeddata.push([-width/2, height/2]);
    tool.editeddata.push([-width/2, -height/2]);


    tool.offsetX = offsetX;
    tool.offsetY = offsetY;
    
    tool.handleCenterX=width/2;
    tool.handleCenterY=0;

    // attach this tool to the list of tools
    regularCanvas.allTools.push(tool);  

    // push this action also onto the undo stack
    pushOntoUndoStack(regularCanvas.allTools.length-1, "c", false, true);

    // redraw all tools
    regularPlot();
}


// add a tool in the shape of an ellipse
var addEllipseButtonFunction = function(){

    // not clear why we need to parse this to a float but it works
    var diameterX = parseFloat(document.getElementById('myDiameterX').value);
    var diameterY = parseFloat(document.getElementById('myDiameterY').value);
    var offsetX=Math.random()*(document.getElementById('myCanvasWidth').value-diameterX)+diameterX;
    var offsetY=Math.random()*(document.getElementById('myCanvasHeight').value-diameterY)+diameterY;

    // add a ellipse to allTools
    var tool = new Tool("ellipse");
    var path = new Path2D();
    path.ellipse(0, 0, diameterX/2, diameterY/2, 0, 0, 2 * Math.PI);
    tool.path = path;

    // we also need to add the raw data and edited data
    // 100 points should be enough for a smooth path
    for (var i = 0; i < 101; i++) {
        tool.rawdata.push([Math.cos(Math.PI * i/50.0)*diameterX/2.0, Math.sin(Math.PI * i/50.0)*diameterY/2.0]);
        tool.editeddata.push([Math.cos(Math.PI * i/50.0)*diameterX/2.0, Math.sin(Math.PI * i/50.0)*diameterY/2.0]);
    }; 

    tool.offsetX = offsetX;
    tool.offsetY = offsetY;

    // put the tool handle center to the 
    // right of the tool
    tool.handleCenterX=diameterX/2;
    tool.handleCenterY=0;

    // attach this tool to the list of tools
    regularCanvas.allTools.push(tool);  

    // push this action also onto the undo stack
    // no need to push the tool itself onto this stack
    pushOntoUndoStack(regularCanvas.allTools.length-1, "c", false, true);

    // redraw all tools
    regularPlot();
}

// called when radii of ellipse or when the width or height of the rectangle field is changed: go over all selected
// tools; if any of those is an ellipse then change its radii; if any of those is a rectangle then change its dimension
var changeEllipseRect = function() {    

    // go over all tools
    regularCanvas.allTools.forEach((tool, index) => {

        // check if this tool is selected and an ellipse
        if ((tool.selected == true) && (tool.type == "ellipse")) {

            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);

            // read the new value from the data field
            var newDiameterX = parseFloat(document.getElementById('myDiameterX').value);
            var newDiameterY = parseFloat(document.getElementById('myDiameterY').value);
            // don't mess with this; this is NOT the same as newRectWidth<1 in case
            // the input field is empty
            if (!(newDiameterX>0)){
                document.getElementById('myDiameterX').value=1;                
                newDiameterX=1;                
            }
            if (!(newDiameterY>0)){                
                document.getElementById('myDiameterY').value=1;                
                newDiameterY=1;
            }

            // if so, get the old diameter; by our construction
            // this diameterX can be seen in the first sample of raw data
            // and diameterY to be the 25th sample y coordinate
            var oldDiameterX=tool.rawdata[0][0] * 2.0;
            var oldDiameterY=tool.rawdata[25][1] * 2.0;
            
            // make an ellipse with the new radii
            var newPath = new Path2D();
            //newPath.arc(0, 0, newDiameter, 0, 2 * Math.PI);
            newPath.ellipse(0, 0, newDiameterX/2, newDiameterY/2, 0, 0, 2 * Math.PI);
            // assign this new path to the tool
            tool.path=newPath;
 
            // we also need to add the corresponding raw data
            // do we explicitly need to delete the old memory
            tool.rawdata =[];
            tool.editeddata =[];
            for (var i = 0; i < 100; i++) {
                tool.rawdata.push([Math.cos(Math.PI * i/50.0)*newDiameterX/2.0, Math.sin(Math.PI * i/50.0)*newDiameterY/2.0]);
                tool.editeddata.push([Math.cos(Math.PI * i/50.0)*newDiameterX/2.0, Math.sin(Math.PI * i/50.0)*newDiameterY/2.0]);
            }; 

            // leave the position of the tool handle to
            // be where it was relative to the old ellipse
            tool.handleCenterX *= newDiameterX/oldDiameterX;
            tool.handleCenterY *= newDiameterY/oldDiameterY;    
        }  
        else if ((tool.selected == true) && (tool.type == "rectangle")){

            // read the new values from the data field
            var newRectWidth = parseFloat(document.getElementById('myDiameterX').value);
            var newRectHeight = parseFloat(document.getElementById('myDiameterY').value);
            // don't mess with this; this is NOT the same as newRectWidth<1 in case
            // the input field is empty
            if (!(newRectWidth>0)){
                document.getElementById('myDiameterX').value=1;
                newRectWidth=1;
            }
            
            if (!(newRectHeight>0)){
                document.getElementById('myDiameterY').value=1;
                newRectHeight=1;
            } 

            
            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);

            // if so, get the old dimensions; by our construction
            // these dimensions can be seen in the raw data
            var oldRectWidth=tool.rawdata[2][0]*2;
            var oldRectHeight=tool.rawdata[2][1]*2;
                
            // make a rectangle with the new dimensions
            var path = new Path2D();
            path.rect(-newRectWidth/2, -newRectHeight/2, newRectWidth, newRectHeight);
            // assign this new path to the tool
            tool.path=path;

            // we also need to add the raw data
            tool.rawdata=[];
            tool.rawdata.push([-newRectWidth/2, -newRectHeight/2]);
            tool.rawdata.push([newRectWidth/2, -newRectHeight/2]);
            tool.rawdata.push([newRectWidth/2, newRectHeight/2]);
            tool.rawdata.push([-newRectWidth/2, newRectHeight/2]);
            tool.rawdata.push([-newRectWidth/2, -newRectHeight/2]);

             // we also need to add the edited data
             tool.editeddata=[];
             tool.editeddata.push([-newRectWidth/2, -newRectHeight/2]);
             tool.editeddata.push([newRectWidth/2, -newRectHeight/2]);
             tool.editeddata.push([newRectWidth/2, newRectHeight/2]);
             tool.editeddata.push([-newRectWidth/2, newRectHeight/2]);
             tool.editeddata.push([-newRectWidth/2, -newRectHeight/2]);


            // leave the position of the tool handle to
            // be where it was relative to the old rectangle
            tool.handleCenterX *= newRectWidth/oldRectWidth;
            tool.handleCenterY *= newRectHeight/oldRectHeight;
        }   
    }); 
    
    // redraw all tools
    regularPlot();

}

// align selected tools horizontally on the
// average position of all cross hairs
var alignHorizontalButtonFunction = function(where) {
    var avg = 0;
    var num = 0;
    
    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true) {
            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);

            if (where == "top") {
                computeBoundingBox(tool);
                avg += tool.minY+tool.offsetY+tool.avgY;
                }
            else if (where == "center") {

                avg += tool.offsetY+tool.avgY;
            }
            else {
                computeBoundingBox(tool);
                avg += tool.maxY+tool.offsetY+tool.avgY;     
            }
            num++;
        }        
    });

    if (num>0) {
        regularCanvas.allTools.forEach((tool, index) => {
            if (tool.selected == true)
            {
                tool.offsetY = avg/num - tool.avgY;
                if (where == "top") tool.offsetY -= tool.minY;
                if (where == "bottom") tool.offsetY -= tool.maxY;
            }        
        });

        regularPlot();
    }
};

// align handles of selected tools horizontally on the
// average position of all handle centers
var alignHandleHorizontalButtonFunction = function() {
    var avgY = 0;
    var num = 0;

    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true) {
            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);
 
            // map the current tool handle center y coordinate into the flipped and rotated space
            var myangle=tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip;
            avgY += (tool.handleCenterX  - tool.avgX) * Math.sin(myangle)*tool.verticalFlip + (tool.handleCenterY - tool.avgY) * Math.cos(myangle)*tool.horizontalFlip+tool.offsetY+tool.avgY;
   
            num++;
        }        
    });

    if (num>0) {
        regularCanvas.allTools.forEach((tool, index) => {
            if (tool.selected == true)
            {
                // the value of the y coordinate is avgY/num-tool.offsetY-tool.avgY
                // the value of the x coordinate did not change
                // but we need to map these two back into the unflipped and unrotated space
                var myangle=tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip;
                var newHandleCenterX = (tool.handleCenterX  - tool.avgX) * Math.cos(myangle)*tool.verticalFlip - (tool.handleCenterY  - tool.avgY) * Math.sin(myangle)*tool.horizontalFlip+tool.avgX;
                var newHandleCenterY = avgY/num - tool.offsetY;

                // now do the mapping back
                /* tool.handleCenterX=(newHandleCenterX  - tool.avgX) * Math.cos(-myangle)*tool.verticalFlip - (newHandleCenterY  - tool.avgY) * Math.sin(-myangle)*tool.horizontalFlip+tool.avgX;
                tool.handleCenterY=(newHandleCenterX  - tool.avgX) * Math.sin(-myangle)*tool.verticalFlip + (newHandleCenterY  - tool.avgY) * Math.cos(-myangle)*tool.horizontalFlip+tool.avgY; */

                tool.handleCenterX=(newHandleCenterX  - tool.avgX) * Math.cos(-myangle)*tool.verticalFlip - (newHandleCenterY  - tool.avgY) * Math.sin(-myangle)*tool.verticalFlip+tool.avgX;
                tool.handleCenterY=(newHandleCenterX  - tool.avgX) * Math.sin(-myangle)*tool.horizontalFlip + (newHandleCenterY  - tool.avgY) * Math.cos(-myangle)*tool.horizontalFlip+tool.avgY;


                // now where we have target coordinates map those
                // back on to the tool path by finding points on the
                // the tool path that are closest to these target coordinates
                findClosestHandleCenter(tool);
 
            }        
        });

        regularPlot();
    }
};

// align handles of selected tools vertically on the
// average position of all handle centers
var alignHandleVerticalButtonFunction = function() {
    var avgX = 0;
    var num = 0;

    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true) {
            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);
 
            // map the current tool handle center y coordinate into the flipped and rotated space
            var myangle=tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip;
            avgX += (tool.handleCenterX  - tool.avgX) * Math.cos(myangle)*tool.verticalFlip - (tool.handleCenterY - tool.avgY) * Math.sin(myangle)*tool.horizontalFlip+tool.offsetX+tool.avgX;
   
            num++;
        }        
    });

    if (num>0) {
        regularCanvas.allTools.forEach((tool, index) => {
            if (tool.selected == true)
            {
                // the value of the y coordinate is avgY/num-tool.offsetY-tool.avgY
                // the value of the x coordinate does not change
                // but we need to map these two back into the unflipped and unrotated space
                var myangle=tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip;
                var newHandleCenterX = avgX/num - tool.offsetX;
                var newHandleCenterY = (tool.handleCenterX  - tool.avgX) * Math.sin(myangle)*tool.verticalFlip + (tool.handleCenterY  - tool.avgY) * Math.cos(myangle)*tool.horizontalFlip+tool.avgY;
        
                // now do the mapping back
                tool.handleCenterX=(newHandleCenterX  - tool.avgX) * Math.cos(-myangle)*tool.verticalFlip - (newHandleCenterY  - tool.avgY) * Math.sin(-myangle)*tool.verticalFlip+tool.avgX;
                tool.handleCenterY=(newHandleCenterX  - tool.avgX) * Math.sin(-myangle)*tool.horizontalFlip + (newHandleCenterY  - tool.avgY) * Math.cos(-myangle)*tool.horizontalFlip+tool.avgY;

                // now where we have target coordinates map those
                // back on to the tool path by finding points on the
                // the tool path that are closest to these target coordinates
                findClosestHandleCenter(tool);
 
            }        
        });

        regularPlot();
    }
};


// find the point on the tool outline that is closest
// to the position stored in tool.handleCenter
var findClosestHandleCenter = function (tool) {

    // find the point on the path closest to the given target
    var targetX = tool.handleCenterX;
    var targetY = tool.handleCenterY;
    // targetX = 23.5;
    // targetY = 1.7;

    var newDist = [];
    newDist = distToLineSegment(targetX, targetY, tool.editeddata[0][0], tool.editeddata[0][1], tool.editeddata[1][0], tool.editeddata[1][1]);
    var dist = newDist[0];
    for (var i = 0; i < tool.editeddata.length-1; i++) {

        // go over all line segments                    
        newDist=distToLineSegment(targetX, targetY, tool.editeddata[i][0], tool.editeddata[i][1], tool.editeddata[i+1][0], tool.editeddata[i+1][1]);
        if(newDist[0] <= dist){
    
            tool.handleCenterX = newDist[1];
            tool.handleCenterY = newDist[2];
            dist = newDist[0];  
        }
    }
}

/* var findClosestHandleCenter = function (tool) {

    // find the point on the path closest to the given target
    var targetX = tool.handleCenterX;
    var targetY = tool.handleCenterY;

    var dist = Math.pow(targetX - tool.editeddata[0][0], 2) + Math.pow(targetY - tool.editeddata[0][1], 2);
    for (var i = 0; i < tool.editeddata.length; i++) {
        // go over all points                    
        if( Math.pow(targetX - tool.editeddata[i][0],2) + Math.pow(targetY- tool.editeddata[i][1],2) <= dist  ){
            tool.handleCenterX = tool.editeddata[i][0];
            tool.handleCenterY = tool.editeddata[i][1];
            dist = Math.pow(targetX- tool.editeddata[i][0], 2) + Math.pow(targetY- tool.editeddata[i][1], 2);  
        }
    }
} */

// align selected tools vertically on the
// average position of all cross hairs
var alignVerticalButtonFunction = function(where) {
    var avg = 0;
    var num = 0;

    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true)
        {
             // push onto undo stack
             pushOntoUndoStack(index, "m", false, true);

            if (where == "left") {
                computeBoundingBox(tool);
                avg += tool.minX+tool.offsetX+tool.avgX;
                }
            else if (where == "center") {

                avg += tool.offsetX+tool.avgX;
            }
            else {
                computeBoundingBox(tool);
                avg += tool.maxX+tool.offsetX+tool.avgX;     
            }
            num++;
        }        
    });

    if (num>0) {
        regularCanvas.allTools.forEach((tool, index) => {
            if (tool.selected == true)
            {
                tool.offsetX = avg/num - tool.avgX;
                if (where == "left") tool.offsetX -= tool.minX;
                if (where == "right") tool.offsetX -= tool.maxX;
            }        
        });

        regularPlot();
    }
};

// space selected tools horizontally
var spaceHorizontalButtonFunction = function() {
    var min, max;
    var i=0, num = 0, pos;


    var oldToolOffsetX = [];  // remember the old X positions
    var toolIndex = [];       // and which tools these positions belong to
    max = 0;
    min = canvas.width*regularCanvas.unitsinmm;
    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true)
        {
             // push onto undo stack
             pushOntoUndoStack(index, "m", false, true);

            // remember old offsets and indices
            toolIndex[num] = index;
            oldToolOffsetX[num] = tool.offsetX;

            // determine minimum and maximum
            num++;
            if (tool.offsetX+tool.avgX<min)
                min = tool.offsetX+tool.avgX;

            if (tool.offsetX+tool.avgX>max)
                max = tool.offsetX+tool.avgX;
        }        
    });

    // now space the tools between these
    // min and max values equally; keep the order!!
    // currently this is done terribly inefficient;
    // must have been Shrini who programmed this :-)
    if (num>1) {
        // go over all selected tools and
        // determine the relative order
        for (i=0; i<num; i++) {
            pos=0;
            for (j=0; j<num; j++) {
                if (oldToolOffsetX[i]>=oldToolOffsetX[j] && i!=j)
                    // if two tools occupy exactly the same space
                    // break the tie in an arbitrary fashion
                    if (oldToolOffsetX[i]!=oldToolOffsetX[j] || (oldToolOffsetX[i]==oldToolOffsetX[j] && i < j))
                        pos++;
            }
            // now we know that tool i is at relative position "pos"
            // adjust its x position accordingly
            regularCanvas.allTools[toolIndex[i]].offsetX = min + (max-min)/(num-1) * pos - regularCanvas.allTools[toolIndex[i]].avgX;
        }
        regularPlot();
    }
};

// space selected tools vertically
var spaceVerticalButtonFunction = function() {
    var min, max;
    var i=0, num = 0, pos;


    var oldToolOffsetY = [];  // remember the old Y positions
    var toolIndex = [];       // and which tools these positions belong to
    max = 0;
    min = canvas.width*regularCanvas.unitsinmm;
    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true)
        {
             // push onto undo stack
             pushOntoUndoStack(index, "m", false, true);

            // remember old offsets and indices
            toolIndex[num] = index;
            oldToolOffsetY[num] = tool.offsetY;

            // determine minimum and maximum
            num++;
            if (tool.offsetY+tool.avgY<min)
                min = tool.offsetY+tool.avgY;

            if (tool.offsetY+tool.avgY>max)
                max = tool.offsetY+tool.avgY;
        }        
    });

    // now space the tools between these
    // min and max values equally; keep the order!!
    // currently this is done terribly inefficient;
    // must have been Shrini who programmed this :-)
    if (num>1) {
        // go over all selected tools and
        // determine the relative order
        for (i=0; i<num; i++) {
            pos=0;
            for (j=0; j<num; j++) {
                if (oldToolOffsetY[i]>=oldToolOffsetY[j] && i!=j)
                    // if two tools occupy exactly the same space
                    // break the tie in an arbitrary fashion
                    if (oldToolOffsetY[i]!=oldToolOffsetY[j] || (oldToolOffsetY[i]==oldToolOffsetY[j] && i < j))
                        pos++;
            }
            // now we know that tool i is at relative position "pos"
            // adjust its x position accordingly
            regularCanvas.allTools[toolIndex[i]].offsetY = min + (max-min)/(num-1) * pos - regularCanvas.allTools[toolIndex[i]].avgY;
        }
        regularPlot();
    }
};

// flip selected tools along x=0
var flipHorizontalButtonFunction = function() {
    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true) {     
            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);

            tool.horizontalFlip *= -1;
        }
    });

    regularPlot();
}

// flip selected tools along y=0
var flipVerticalButtonFunction = function() {
    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true) {
             // push onto undo stack
             pushOntoUndoStack(index, "m", false, true);

            tool.verticalFlip *= -1;
        }
    });

    regularPlot();
}


// if the rotate right button is pressed 
// rotate the selected tool by 10 degrees clockwise
var rotateRightButtonFunction = function() {
    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true) {

            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);

            // with each flip the sense of rotation flips
            if(event.shiftKey == false)
                tool.angle += 1*tool.horizontalFlip*tool.verticalFlip;
            else
                tool.angle += 10*tool.horizontalFlip*tool.verticalFlip;
        }        
    });

    // redraw all tools
    regularPlot();
};

// if the rotate right button is pressed 
// rotate the selected tool by 10 degrees anti-clockwise
var rotateLeftButtonFunction = function() {
    regularCanvas.allTools.forEach((tool, index) => {
        if (tool.selected == true) {

            // push onto undo stack
            pushOntoUndoStack(index, "m", false, true);

            // with each flip the sense of rotation flips
            if(event.shiftKey == false)
                tool.angle -= 1*tool.horizontalFlip*tool.verticalFlip;
            else
                tool.angle -= 10*tool.horizontalFlip*tool.verticalFlip;
        }    
    });

    regularPlot();
};

// if the trash can icon is pressed delete all selected tools
var deleteSelectedToolsFunction = function() {

    // go over all tools
    for (var index = regularCanvas.allTools.length-1; index>= 0; index--)
    {
        // check if this tool is selected
        if (regularCanvas.allTools[index].selected == true) {
            {
            // for a "d" action we do not need to copy the actual
            // raw data but can just copy the reference
            pushOntoUndoStack(index, "d", true, true);

            // now delete this tool
            regularCanvas.allTools.splice(index, 1);  
            } 
        }
    }

    // redraw all tools
    regularPlot();
}; 

// copy selected tools
var copySelectedToolsFunction = function() {

    // empty the copyToolsBuffer
    copyToolsBuffer = [];     
    
    // go over all tools
    for (var index = regularCanvas.allTools.length-1; index>= 0; index--)
    {

        // if a tool is selected then place a copy into the copyToolBuffer
        if (regularCanvas.allTools[index].selected == true) {                                              
            copyToolsBuffer.push(makeToolCopy(regularCanvas.allTools[index], true)); 
        }
    } 

}; 


// paste tools in the copyToolBuffer
var pasteSelectedToolsFunction = function() {

// go over the copyToolBuffer
for (var index = 0; index < copyToolsBuffer.length; index++)
{
    // offset the tool slighly from its original position
    copyToolsBuffer[index].offsetX += 10;                      
    copyToolsBuffer[index].offsetY += 10;  

    // push the tool into allTools
    regularCanvas.allTools.push(makeToolCopy(copyToolsBuffer[index], true));

    // push this action also onto the undo stack
    pushOntoUndoStack(regularCanvas.allTools.length-1, "c", false, true);

}  

// redraw tools
regularPlot();

}; 


// plot all tools
var regularPlot = function() {

    // clear everything
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // save the current context
    ctx.save();

    // offset from the paper
    ctx.translate(regularCanvas.offsetX, regularCanvas.offsetY);

    // draw the paper
    ctx.beginPath();
    ctx.rect(0, 0, regularCanvas.width * regularCanvas.scale, regularCanvas.height * regularCanvas.scale);    
    ctx.fillStyle = "white";
    ctx.fill();

    // set the clipping path
    var myClippingPath = new Path2D();
    myClippingPath.rect(0, 0, regularCanvas.width * regularCanvas.scale, regularCanvas.height * regularCanvas.scale);
    ctx.clip(myClippingPath);

    // plot the background grid
    ctx.setLineDash([1,0]);
    ctx.strokeStyle = myGridLineColor;
    ctx.lineWidth = myGridLineWidth;
    ctx.beginPath();

    for (var x = 0.5; x < regularCanvas.width * regularCanvas.scale; x += 20) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, regularCanvas.height * regularCanvas.scale);
    }
    for (var y = 0.5; y < regularCanvas.height * regularCanvas.scale; y += 20) {
        ctx.moveTo(0, y);
        ctx.lineTo(regularCanvas.width * regularCanvas.scale, y);
    }   
    ctx.stroke();


    var sameDiameterX = true;
    var sameDiameterY = true;
    var sameHandleDiameter = true;
    var sameBackgroundPaperSize = true;
    var firstHandleDiameter = -1;
    var firstDiameterX = -1;
    var firstDiameterY = -1;
    var firstBackgroundPaperSize = -1;

    regularCanvas.allTools.forEach((tool, index) => {       
                           
        if (tool.selected == true) {  
            
            if (firstBackgroundPaperSize == -1) {
                firstBackgroundPaperSize = tool.backgroundPaperSize;

                document.getElementById('backgroundPaperSize').value = tool.backgroundPaperSize;
            }
            else {

                if (tool.backgroundPaperSize != firstBackgroundPaperSize) {
                    
                    sameBackgroundPaperSize = false;
                }
            }

            if (tool.type == "ellipse") {
                document.getElementById('myDiameterX').value=tool.editeddata[0][0] * 2.0;
                document.getElementById('myDiameterY').value=tool.editeddata[25][1] * 2.0;                    
                if (firstDiameterX == -1){
                    firstDiameterX = tool.editeddata[0][0] * 2.0;
                }
                else {
                    if (tool.editeddata[0][0] != firstDiameterX) {
                        sameDiameterX = false;
                    }
                }
                if (firstDiameterY == -1){
                    firstDiameterY = tool.editeddata[25][1] * 2.0;
                }
                else {
                    if (2*tool.editeddata[25][1] != firstDiameterY) { 
                        sameDiameterY = false;
                    }
                }            
            }
            if (tool.type == "rectangle"){
                document.getElementById('myDiameterX').value=2*tool.editeddata[2][0];
                document.getElementById('myDiameterY').value=2*tool.editeddata[3][1];
                if (firstDiameterX == -1){
                    firstDiameterX = 2*tool.editeddata[2][0];
                }
                else{
                    if (2*tool.editeddata[2][0] != firstDiameterX){
                        sameDiameterX = false;
                    }
                }
                if (firstDiameterY == -1){
                    firstDiameterY = 2*tool.editeddata[3][1];
                }
                else{
                    if (2*tool.editeddata[3][1] != firstDiameterY){
                        sameDiameterY = false;
                    }
                }
            }
                                    
            document.getElementById('myHandleDiameter').value=tool.handleDiameter;                     
            // check handle radii
            if (firstHandleDiameter == -1){
                firstHandleDiameter = tool.handleDiameter;
            }
            else{
                if (tool.handleDiameter != firstHandleDiameter){
                    sameHandleDiameter = false;
                }
            }
        }                       

        if (sameHandleDiameter == true) {
            // make the text color white
            document.getElementById('myHandleDiameter').style.color = "white";
        }
        else {
            // make the text color red
            document.getElementById('myHandleDiameter').style.color = "red";
        }
        if (sameDiameterX == true) {
            // make the text color white
            document.getElementById('myDiameterX').style.color = "white";
        }
        else {
            // make the text color red
            document.getElementById('myDiameterX').style.color = "red";
        }
        if (sameDiameterY == true) {
            // make the text color white
            document.getElementById('myDiameterY').style.color = "white";
        }
        else {
            // make the text color red
            document.getElementById('myDiameterY').style.color = "red";
        }

        if (sameBackgroundPaperSize == true) {
            // make the text color white
            document.getElementById('backgroundPaperSize').style.color = "white";
        }
        else {
            // make the text color red
            document.getElementById('backgroundPaperSize').style.color = "red";
        }
                
        tool.regularPlot(ctx);
    }); 
    // :w
    // ctx.drawImage(imgNew,0,0,210,297);
    ctx.restore();
   
}

// plot the selected tool in editing mode
var editPlot = function() {

    var tool = editCanvas.toolToEdit;
    ctx.beginPath();
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // center the paper properly
    editCanvas.offsetX = Math.max(0, (canvas.width-editCanvas.width*editCanvas.scale)/2);
    editCanvas.offsetY = Math.min(50,Math.max(0, (canvas.height-editCanvas.height*editCanvas.scale)/2));

    // save the current context
    ctx.save();

    // offset from the paper
    ctx.translate(editCanvas.offsetX, editCanvas.offsetY);

     // draw the paper
     ctx.rect(0, 0, editCanvas.width * editCanvas.scale, editCanvas.height * editCanvas.scale);    
     ctx.fillStyle = "white";
     ctx.fill();

    // set the clipping path
    var myClippingPath = new Path2D();
    myClippingPath.rect(0, 0, editCanvas.width * editCanvas.scale, editCanvas.height * editCanvas.scale);
    ctx.clip(myClippingPath);

    // currently we do not plot a background grid
    // but this would be the place to do any of this
    tool.editPlot(ctx);

    ctx.restore();
}

// set toolbox
var selectToolbox = function(value){    

    // switch to the indicated regularCanvas
    if (value > 0) {

        regularCanvas = regularCanvasStack[value-1]
        regularCanvasIndex = value;
    }

    // delete the current canvas
    if (value == -1 && regularCanvasStack.length>1) {

        // remove this regularCanvas from the stack
        // NOTE: Cannot be undone!!

        if (confirm("Deleting a tool box cannot be undo! Press 'OK' to delete. Otherwise press 'Cancel'.") == true){
        
            regularCanvasStack.splice(regularCanvasIndex-1, 1);

            // get reference to select element
            var selection = document.getElementById('selectToolbox');
            selection.removeChild(selection.options[regularCanvasIndex-1]); 
            regularCanvasIndex = 1;
            regularCanvas = regularCanvasStack[0];
            // make sure that all remaining toolboxes are properly named and valued
            console.log("regularCanvasStack.length:=", regularCanvasStack.length);
            for (var i=0; i<=regularCanvasStack.length-1; i++) {

                document.getElementById('selectToolbox')[i].value = String(i+1);
                document.getElementById('selectToolbox')[i].text = "toolbox " + String(i+1);

            } 
        }
     
        document.getElementById("selectToolbox").selectedIndex = String(0);
    }

    // add a new regularCanvas
    if (value == 0) {

        // create a new regularCanvas
        var newRegularCanvas = new myRegularCanvas(document.getElementById('myCanvasWidth').value, document.getElementById('myCanvasHeight').value, document.getElementById('selectUnit').value, document.getElementById('selectCustomMagnification').value);
        // add it to the stack
        regularCanvasStack.push(newRegularCanvas);
        // make it the current stack
        regularCanvas = regularCanvasStack[regularCanvasStack.length-1];
        regularCanvasIndex = regularCanvasStack.length;

        // add this option to the selection box
        // get reference to select element
        var selection = document.getElementById('selectToolbox');
        // create new option element
        var option = document.createElement('option');
        // create text node to add to option element (option)
        option.appendChild( document.createTextNode('toolbox ' + String(regularCanvasStack.length)));
        // set value property of option
        option.value = String(regularCanvasStack.length); 
        // add opt to end of select box (sel)
        selection.insertBefore(option, selection.childNodes[regularCanvasStack.length]);
        document.getElementById("selectToolbox").selectedIndex = String(regularCanvasStack.length-1);
        }

    // regularCanvas.scale = regularCanvas.unitsinmm * regularCanvas.magnification * pxpermm;  
    regularCanvas.scale = regularCanvas.magnification * pxpermm;   

    // center the paper properly
    regularCanvas.offsetX = Math.max(0, (canvas.width-regularCanvas.width*regularCanvas.scale)/2);
    regularCanvas.offsetY = Math.min(50,Math.max(0, (canvas.height-regularCanvas.height*regularCanvas.scale)/2));

    // plot all tools
    regularPlot();
}

// set magnification for the canvas
var selectCustomMagnification = function(value){    

    regularCanvas.magnification = value;
    // regularCanvas.scale = regularCanvas.unitsinmm * regularCanvas.magnification * pxpermm;  
    regularCanvas.scale = regularCanvas.magnification * pxpermm;   

    // center the paper properly
    regularCanvas.offsetX = Math.max(0, (canvas.width-regularCanvas.width*regularCanvas.scale)/2);
    regularCanvas.offsetY = Math.min(50,Math.max(0, (canvas.height-regularCanvas.height*regularCanvas.scale)/2));

    // plot all tools
    regularPlot();
}

// set units for the canvas
var selectUnit = function(value){

    // update the numbers for the width and height of the canvas to reflect new units
    document.getElementById('myCanvasWidth').value *= (regularCanvas.unitsinmm/value);
    document.getElementById('myCanvasHeight').value *= (regularCanvas.unitsinmm/value);

    // now set the units to the new units
    regularCanvas.unitsinmm=value;
    
    // plot all tools
    regularPlot();
}



// set width of the canvas
var myCanvasWidth = function (){   

    regularCanvas.width=document.getElementById('myCanvasWidth').value;

    // center the paper properly
    regularCanvas.offsetX = Math.max(0, (canvas.width-regularCanvas.width*regularCanvas.scale)/2);
    regularCanvas.offsetY = Math.min(50,Math.max(0, (canvas.height-regularCanvas.height*regularCanvas.scale)/2));

    // plot all tools
    regularPlot();    
}

// set height of the canvas
var myCanvasHeight = function (value){    

    regularCanvas.height=document.getElementById('myCanvasHeight').value; 

    // center the paper properly
    regularCanvas.offsetX = Math.max(0, (canvas.width-regularCanvas.width*regularCanvas.scale)/2);
    regularCanvas.offsetY = Math.min(50,Math.max(0, (canvas.height-regularCanvas.height*regularCanvas.scale)/2));
    
    // plot all tools
    regularPlot();    
}

// compute the bounding box of a tool path
var computeBoundingBox = function (tool) {

    var minX, minY, maxX, maxY;

    // set initial values for the min and max
    minX = tool.editeddata[0][0];
    maxX = tool.editeddata[0][0];
    minY = tool.editeddata[0][1];
    maxY = tool.editeddata[0][1];

    var myangle=tool.angle * 2 * Math.PI / 360.0 * tool.horizontalFlip * tool.verticalFlip;
      
    // go over all points in the path
    for (var ind=0; ind < tool.editeddata.length-1; ind++){

        // take into account flip, rotation and offset
        x = (tool.editeddata[ind][0]  - tool.avgX) * Math.cos(myangle)*tool.verticalFlip - (tool.editeddata[ind][1] - tool.avgY) * Math.sin(myangle)*tool.horizontalFlip;
        y = (tool.editeddata[ind][0]  - tool.avgX) * Math.sin(myangle)*tool.verticalFlip + (tool.editeddata[ind][1]  - tool.avgY) * Math.cos(myangle)*tool.horizontalFlip;                     

        // check if any of them are smaller/larger
        // than the current minima/maxima
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    }

    // put those minima and maxima back into the tool
    tool.minX = minX;
    tool.maxX = maxX;
    tool.minY = minY;
    tool.maxY = maxY;
       
}


// convert path data into a format so that we can call
// the simplify function
function pointsConversion(points, direction){
    var cache;
    if(direction=='toObject'){
      cache = points.map(function(point){return {'y':point[0],'x':point[1]}});
    }
    else if(direction=='toArray'){
      cache = points.map(function(point){return [point.y,point.x]});
    }
   return cache;
  }

// display canvas that resizes along with the browser window
// this function is called at the beginning and any time the
// window resizes
function resizeCanvas() {
        
    // canvas is a 2 x 3 matrix; the left column is 200pts; the right 100pts
    // the middle takes up the rest; the height of the top row is 75 points
    // the rest belongs to the bottom row
    ctx.canvas.width=Math.round(0.98*window.innerWidth-360); 
    canvas.style.width=Math.round(0.98*window.innerWidth-360).toString().concat("px");
    ctx.canvas.height=Math.round(0.98*window.innerHeight - 75); 
    canvas.style.height=Math.round(0.98*window.innerHeight - 75).toString().concat("px");
    canvas.style.backgroundColor = "#535353";
    
    // our "paper" only occupies a portion of the canvas
    // the left-hand corner is at position offsetX, offsetY
    // and these values are stored in regularCanvas
    // the size of the paper is paperWidth and paperHeight
    
    // center the paper properly
    regularCanvas.offsetX = Math.max(0, (canvas.width-regularCanvas.width*regularCanvas.scale)/2);
    regularCanvas.offsetY = Math.min(50,Math.max(0, (canvas.height-regularCanvas.height*regularCanvas.scale)/2));


    // now draw the actual paper and all the tools
    regularPlot();
}

function initializeCanvas() {

    // event listener to call the resizeCanvas() function 
    // each time the window is resized.
    window.addEventListener('resize', resizeCanvas, false);

    // draw canvas and actual paper
    resizeCanvas();
 }


function anchorPointButtonFunction() {        
    
    // disable the original canvas events
    canvas.removeEventListener('mousedown', myMouseDown, false);
    canvas.removeEventListener('mouseup', myMouseUp, false);
    //canvas.removeEventListener('mousemove', myMouseMove, false);
    canvas.removeEventListener('click', myMouseClick, false);
    window.removeEventListener('keydown', myKeyDownFunction, false);       
    canvas.removeEventListener('dblclick', myDoubleClick, false);

    var anchorX = -1;
    var anchorY = -1;

    var myMouseClickAfterAnchorButton = function() {
        // draw a small cross-hair black color at mouse click        
        ctx.save();     
        regularPlot();  
        // draw only if mouse position is inside the paper 
        ctx.beginPath();
        ctx.moveTo(-10+event.offsetX, event.offsetY);
        ctx.lineTo(10+event.offsetX, event.offsetY);
        ctx.moveTo(event.offsetX, -10+event.offsetY);
        ctx.lineTo(event.offsetX, 10+event.offsetY);
        ctx.strokeStyle = "black";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();

        anchorX = event.offsetX;
        anchorY = event.offsetY;
    }

    var myMouseMoveAfterAnchorButton = function() {
        
        // display the x,y coordinates of the mouse
        //document.getElementById('mouseX').value = parseFloat((event.offsetX-regularCanvas.offsetX)/(regularCanvas.unitsinmm*regularCanvas.magnification*pxpermm)).toFixed(2);
        //document.getElementById('mouseY').value = parseFloat((event.offsetY-regularCanvas.offsetY)/(regularCanvas.unitsinmm*regularCanvas.magnification*pxpermm)).toFixed(2);

        // measure distance to anchor point
        if(anchorX > -1 && anchorY > -1){
            var x = (event.offsetX-regularCanvas.offsetX)/(regularCanvas.unitsinmm*regularCanvas.magnification*pxpermm);
            var y = (event.offsetY-regularCanvas.offsetY)/(regularCanvas.unitsinmm*regularCanvas.magnification*pxpermm);
            var dist = Math.sqrt(Math.pow(x - (anchorX-regularCanvas.offsetX)/(regularCanvas.unitsinmm*regularCanvas.magnification*pxpermm),2) + Math.pow(y - (anchorY-regularCanvas.offsetY)/(regularCanvas.unitsinmm*regularCanvas.magnification*pxpermm),2));
            
            regularPlot(); 
            // draw only if mouse position is inside the paper 
            ctx.save();     
            ctx.beginPath();
            ctx.moveTo(-10+anchorX, anchorY);
            ctx.lineTo(10+anchorX, anchorY);
            ctx.moveTo(anchorX, -10+anchorY);
            ctx.lineTo(anchorX, 10+anchorY);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 3;
            ctx.stroke();                         

            ctx.font = '14px Courier';
            ctx.fillStyle = 'black';
            var text = String(parseFloat(dist).toFixed(2));        
            ctx.fillText(text,event.offsetX,event.offsetY); 
            // draw the line
            ctx.beginPath();
            ctx.moveTo(event.offsetX, event.offsetY);
            ctx.lineTo(anchorX, anchorY);            
            ctx.strokeStyle = "lightblue";
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }
    }

    var myKeyDownAfterAnchorButton = function() {
        // capture what key was pressed
        const key = event.key;
        if (key == "Escape"){
            regularPlot();             
            canvas.removeEventListener('click', myMouseClickAfterAnchorButton, false);   
            canvas.removeEventListener('mousemove', myMouseMoveAfterAnchorButton, false);   
            window.removeEventListener('keydown', myKeyDownAfterAnchorButton, false);
            // add the original events back
            canvas.addEventListener('mousedown', myMouseDown, false);
            canvas.addEventListener('mouseup', myMouseUp, false);
            //canvas.addEventListener('mousemove', myMouseMove, false);
            canvas.addEventListener('click', myMouseClick, false);
            window.addEventListener('keydown', myKeyDownFunction, false);       
            canvas.addEventListener('dblclick', myDoubleClick, false);        
        }
    }

    // event listener to add an anchor point to the canvas and then measure distances to other points
    canvas.addEventListener('click', myMouseClickAfterAnchorButton, false); 
    canvas.addEventListener('mousemove', myMouseMoveAfterAnchorButton, false);             
    window.addEventListener('keydown', myKeyDownAfterAnchorButton, false); 
}

// if the tool was photographed on a paper size different than
// what was assumed in the pre-processing, its scaling must be changed
var backgroundPaperSize = function(value) {    


    // if the value differs from what is currently stored in the tool
    // then scale all raw data accordingly
    regularCanvas.allTools.forEach((tool, index) => { 
        // only change selected tools
        if (tool.selected == true) {

            if (tool.backgroundPaperSize != value) {
                
                // undo/redo
                // push data onto undo stack
                // prune undo if too long
                // reset redo stack
                // push this action also onto the undo stack
                // this is a modification where also the data is modified
                // hence it is "M" and not "m"
                pushOntoUndoStack(index, "M", true, true);


                var factor = value/tool.backgroundPaperSize;

                // scale the raw data
                for (var i =0; i<tool.rawdata.length; i++) {

                    tool.rawdata[i][0] *= factor;
                    tool.rawdata[i][1] *= factor;

                }

                // scale the edited data
                for (var i =0; i<tool.convexhull.length; i++) {

                    tool.convexhull[i][0] *= factor;
                    tool.convexhull[i][1] *= factor;

                }

                // scale the edited data
                for (var i =0; i<tool.editeddata.length; i++) {

                    tool.editeddata[i][0] *= factor;
                    tool.editeddata[i][1] *= factor;

                }

                tool.handleCenterX *= factor;
                tool.handleCenterY *= factor;

                tool.avgX *= factor;
                tool.avgY *= factor;

                tool.maxX *= factor;
                tool.minX *= factor;
                tool.maxY *= factor;
                tool.minY *= factor;

                // update the tool path
                var newString = "M ";
                for (var i=0; i<tool.editeddata.length; i++) {
                    newString+= tool.editeddata[i][0].toString() + " " + tool.editeddata[i][1].toString() + " ";
                }
                tool.path = new Path2D(newString);

                // now store this new value in the tool    
                tool.backgroundPaperSize = value;
                
             
            } 
        } 
    } );

    // plot all tools
    regularPlot();
    
} 


// set the opacity parameter globally for all tools depending on the slider value
var setMainCanvasOpacityFunction = function() {
    // read the new smoothing paramter from the slider
    var opacityParam = parseFloat(document.getElementById('mainCanvasOpacity').value);    
    
    regularCanvas.allTools.forEach((tool, index) => {
        tool.opacity = opacityParam;        
    });
       
    // plot all tools
    regularPlot();
}